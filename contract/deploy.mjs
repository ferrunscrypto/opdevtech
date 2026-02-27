/**
 * dev.tech Deploy Script — OPNet Testnet
 *
 * Usage:
 *   1. Fill contract/.env: DEPLOYER_MNEMONIC
 *   2. Build WASM: cd contract && npm run build
 *   3. Run: node deploy.mjs [testnet|regtest]
 *
 * After deployment, update frontend/src/config/contracts.ts with the contract address.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { networks } from '@btc-vision/bitcoin';
import {
    TransactionFactory,
    Mnemonic,
    MLDSASecurityLevel,
    AddressTypes,
} from '@btc-vision/transaction';
import { JSONRpcProvider } from 'opnet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env') });

const networkArg = process.argv.find(a => ['testnet', 'regtest', 'mainnet'].includes(a)) ?? 'testnet';

const NETWORK_MAP = {
    regtest: networks.regtest,
    testnet: networks.opnetTestnet,
    mainnet: networks.bitcoin,
};

const RPC_MAP = {
    regtest: 'https://regtest.opnet.org',
    testnet: 'https://testnet.opnet.org',
    mainnet: 'https://mainnet.opnet.org',
};

async function main() {
    console.log(`\ndev.tech Deployment — OPNet (${networkArg})`);
    console.log('─'.repeat(50));

    const NETWORK = NETWORK_MAP[networkArg];
    const RPC_URL = RPC_MAP[networkArg];

    const mnemonicPhrase = process.env['DEPLOYER_MNEMONIC'];
    if (!mnemonicPhrase) throw new Error('DEPLOYER_MNEMONIC not set in contract/.env');

    const mnemonic = new Mnemonic(mnemonicPhrase, '', NETWORK, MLDSASecurityLevel.LEVEL2);
    const wallet   = mnemonic.deriveOPWallet(AddressTypes.P2TR, 0);
    console.log(`\nWallet (P2TR): ${wallet.p2tr}`);

    const provider = new JSONRpcProvider({ url: RPC_URL, network: NETWORK });
    const factory  = new TransactionFactory();

    const wasmPath = resolve(__dirname, 'build', 'DevTech.wasm');
    if (!existsSync(wasmPath)) throw new Error(`WASM not found: ${wasmPath}\nRun: npm run build`);
    const wasm = readFileSync(wasmPath);
    console.log(`\nWASM: ${wasm.length} bytes`);

    const utxos = await provider.utxoManager.getUTXOs({ address: wallet.p2tr });
    if (utxos.length === 0) {
        throw new Error(`No UTXOs. Fund wallet first: ${wallet.p2tr}\nFaucet: https://faucet.opnet.org`);
    }
    console.log(`UTXOs: ${utxos.length}`);

    const challenge = await provider.getChallenge();

    const deployment = await factory.signDeployment({
        from:                        wallet.p2tr,
        utxos,
        signer:                      wallet.keypair,
        mldsaSigner:                 wallet.mldsaKeypair,
        network:                     NETWORK,
        feeRate:                     5,
        priorityFee:                 0n,
        gasSatFee:                   100_000n,
        bytecode:                    new Uint8Array(wasm),
        calldata:                    new Uint8Array(0),
        challenge,
        linkMLDSAPublicKeyToAddress: true,
        revealMLDSAPublicKey:        true,
    });

    console.log(`\nContract address: ${deployment.contractAddress}`);

    await provider.sendRawTransaction(deployment.transaction[0]);
    console.log('TX[0] broadcast (funding)');
    await new Promise(r => setTimeout(r, 3000));

    await provider.sendRawTransaction(deployment.transaction[1]);
    console.log('TX[1] broadcast (reveal)');

    // Save deployment record
    const recordPath = resolve(__dirname, '..', 'deployments.json');
    const existing = existsSync(recordPath)
        ? JSON.parse(readFileSync(recordPath, 'utf8'))
        : [];

    existing.push({
        network:         networkArg,
        contract:        'DevTech',
        contractAddress: deployment.contractAddress,
        deployer:        wallet.p2tr,
        deployedAt:      new Date().toISOString(),
    });
    writeFileSync(recordPath, JSON.stringify(existing, null, 2));

    console.log('\n─'.repeat(50));
    console.log('Deployment complete!');
    console.log(`\n  dev.tech: ${deployment.contractAddress}`);
    console.log(`\nUpdate frontend/src/config/contracts.ts:`);
    console.log(`  VITE_DEVTECH_ADDRESS=${deployment.contractAddress}`);
    console.log(`\nOr set the env var in frontend/.env:`);
    console.log(`  VITE_DEVTECH_ADDRESS=${deployment.contractAddress}`);
    console.log('\n─'.repeat(50));
}

main().catch(err => {
    console.error(`\nDeployment failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
});
