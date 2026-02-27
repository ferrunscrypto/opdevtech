import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { config, MOTOSWAP_ROUTER } from './config.js';

export interface ScanResult {
    address:       string;
    deployments:   number;
    swaps:         number;
    gasSpent:      bigint;
    totalTxs:      number;
    failedTxs:     number;
    firstBlock:    number;
    score:         number;
    eligibleBadges: number[];
}

function computeEligibleBadges(r: ScanResult): number[] {
    const eligible: number[] = [];
    if (r.deployments >= 1)  eligible.push(1);
    if (r.deployments >= 5)  eligible.push(2);
    if (r.deployments >= 10) eligible.push(3);
    if (r.swaps >= 1)   eligible.push(4);
    if (r.swaps >= 10)  eligible.push(5);
    if (r.swaps >= 100) eligible.push(6);
    if (r.gasSpent >= 5_000_000_000n)  eligible.push(7);   // ~5-10 txs worth of gas
    if (r.gasSpent >= 50_000_000_000n) eligible.push(8);  // ~50-100 txs worth of gas
    if (r.firstBlock > 0 && r.firstBlock < 50_000)  eligible.push(9);
    if (r.firstBlock > 0 && r.firstBlock < 100_000) eligible.push(10);
    if (r.failedTxs >= 5) eligible.push(13);
    if (r.failedTxs === 0 && r.totalTxs >= 20) eligible.push(14);
    return eligible;
}

function computeScore(r: Omit<ScanResult, 'score' | 'eligibleBadges'>): number {
    // gasUsed is in raw gas units (very large numbers ~500M-1B per tx)
    // Divide by 1B to normalize, so ~1 point per tx worth of gas
    return (r.deployments * 100)
        + (r.swaps * 10)
        + (r.totalTxs * 5)
        + Number(r.gasSpent / 1_000_000_000n);
}

let provider: JSONRpcProvider | null = null;

function getProvider(): JSONRpcProvider {
    if (!provider) {
        provider = new JSONRpcProvider({
            url:     config.opnetRpcUrl,
            network: networks.opnetTestnet,
        });
    }
    return provider;
}

// Cache scan results for 60s
const scanCache = new Map<string, { result: ScanResult; ts: number }>();
const CACHE_TTL = 60_000;

// Cache bech32 → hex address resolution
const hexAddrCache = new Map<string, string>();

/** Resolve a bech32 address to its OPNet hex address via getPublicKeyInfo */
async function resolveHexAddress(bech32Addr: string, isContract = false): Promise<string> {
    const cached = hexAddrCache.get(bech32Addr);
    if (cached) return cached;

    const rpc = getProvider();
    try {
        const info = await rpc.getPublicKeyInfo(bech32Addr, isContract);
        // Address object — use toHex() or toString() to get the hex representation
        const hex = (typeof info === 'string' ? info : info.toHex?.() ?? String(info)).toLowerCase();
        hexAddrCache.set(bech32Addr, hex);
        return hex;
    } catch {
        console.warn(`[scanner] Could not resolve hex address for ${bech32Addr}`);
        return '';
    }
}

/** Check if a tx was sent by the given hex address (tx.from match) */
function txFromAddress(tx: Record<string, unknown>, hexAddr: string): boolean {
    const from = String(tx.from ?? '').toLowerCase();
    return from === hexAddr;
}

/** Check if a tx involves the given bech32 address in outputs */
function txOutputsToAddress(tx: Record<string, unknown>, bech32Addr: string): boolean {
    const outputs = tx.outputs as Array<{ scriptPubKey?: { address?: string } }> | undefined;
    if (!outputs) return false;
    const addrLower = bech32Addr.toLowerCase();
    for (const out of outputs) {
        const outAddr = out.scriptPubKey?.address ?? '';
        if (outAddr.toLowerCase() === addrLower) return true;
    }
    return false;
}

export async function scanAddress(address: string): Promise<ScanResult> {
    const cached = scanCache.get(address);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return cached.result;
    }

    const rpc = getProvider();

    // Resolve bech32 → hex for matching tx.from
    const hexAddr = await resolveHexAddress(address);

    let deployments = 0;
    let swaps       = 0;
    let gasSpent    = 0n;
    let totalTxs    = 0;
    let failedTxs   = 0;
    let firstBlock  = 0;

    // Collect bech32 contract addresses from Interaction txs for post-scan swap resolution
    const interactionContracts: string[] = [];

    try {
        const currentBlock = await rpc.getBlockNumber();
        const height = Number(currentBlock);
        console.log(`[scanner] Scanning ${address.slice(0, 16)}... across ${height} blocks (hex=${hexAddr.slice(0, 18)})`);

        const BATCH = 10;
        for (let b = 1; b <= height; b += BATCH) {
            const promises: Promise<void>[] = [];

            for (let i = b; i < b + BATCH && i <= height; i++) {
                const blockNum = i;
                promises.push(
                    rpc.getBlock(BigInt(blockNum), true)
                        .then(block => {
                            if (!block?.transactions) return;
                            for (const rawTx of block.transactions) {
                                const tx = rawTx as unknown as Record<string, unknown>;
                                const opType = String(tx.OPNetType ?? '');

                                // Skip Generic (plain BTC transfers)
                                if (opType === 'Generic') continue;

                                // Match by tx.from (hex address) OR by output address (bech32)
                                const isSender = hexAddr && txFromAddress(tx, hexAddr);
                                const isRecipient = txOutputsToAddress(tx, address);
                                if (!isSender && !isRecipient) continue;

                                totalTxs++;

                                if (firstBlock === 0 || blockNum < firstBlock) {
                                    firstBlock = blockNum;
                                }

                                // Gas (only count for txs the user sent)
                                if (isSender) {
                                    const gasHex = String(tx.gasUsed ?? '0x0');
                                    gasSpent += BigInt(gasHex);
                                }

                                // Reverts
                                if (tx.revert || tx.failed) failedTxs++;

                                // Deployments
                                if (opType === 'Deployment' && isSender) {
                                    deployments++;
                                }

                                // Track Interaction contract addresses for swap detection
                                if (opType === 'Interaction' && isSender) {
                                    interactionContracts.push(String(tx.contractAddress ?? ''));
                                }
                            }
                        })
                        .catch(() => { /* skip failed block fetches */ })
                );
            }

            await Promise.all(promises);
        }

        // Resolve unique contract bech32 addresses → hex and count MotoSwap swaps
        const uniqueContracts = [...new Set(interactionContracts.filter(a => a.length > 0))];
        for (const bech32Addr of uniqueContracts) {
            const contractHex = await resolveHexAddress(bech32Addr, true);
            if (contractHex === MOTOSWAP_ROUTER.toLowerCase()) {
                swaps += interactionContracts.filter(a => a === bech32Addr).length;
            }
        }

        console.log(`[scanner] Done: txs=${totalTxs} deploys=${deployments} swaps=${swaps} gas=${gasSpent}`);
    } catch (err) {
        console.warn(`[scanner] Error scanning ${address}:`, err);
    }

    const partial = { address, deployments, swaps, gasSpent, totalTxs, failedTxs, firstBlock };
    const score   = computeScore(partial);
    const eligibleBadges = computeEligibleBadges({ ...partial, score, eligibleBadges: [] });

    const result = { ...partial, score, eligibleBadges };
    scanCache.set(address, { result, ts: Date.now() });
    return result;
}
