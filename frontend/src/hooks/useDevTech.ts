import { useState, useCallback } from 'react';
import { getContract, JSONRpcProvider } from 'opnet';
import type { BitcoinInterfaceAbi } from 'opnet';
import { networks, Network } from '@btc-vision/bitcoin';
import type { Address } from '@btc-vision/transaction';
import { DevTechABI } from '../abi/DevTechABI';
import { DEVTECH_ADDRESS } from '../config/contracts';
import { scanAddress, type ScanResult as ScannerResult } from '../utils/scanner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyContract = any;

export type ScanResult = {
    address:        string;
    deployments:    number;
    swaps:          number;
    gasSpent:       string;
    totalTxs:       number;
    failedTxs:      number;
    firstBlock:     number;
    score:          number;
    eligibleBadges: number[];
};

export interface ProfileData {
    handleHash:   bigint;
    pfpHash:      bigint;
    score:        bigint;
    badgeCount:   bigint;
    endorseCount: bigint;
}

export function useDevTech(
    provider: JSONRpcProvider,
    network: Network | null | undefined,
    senderAddress: Address | null,
    walletAddress: string | null,
) {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    /** Resolve a bech32 address string to an Address object via RPC */
    async function resolveAddress(bech32: string, isContract = false): Promise<Address> {
        return provider!.getPublicKeyInfo(bech32, isContract);
    }

    /** Read-only contract instance — uses testnet as fallback when no wallet connected */
    function getReadContract(): AnyContract | null {
        if (!DEVTECH_ADDRESS || DEVTECH_ADDRESS.includes('TODO')) return null;
        const readNetwork = network ?? (networks as unknown as Record<string, Network>)['opnetTestnet'];
        try {
            return getContract<AnyContract>(
                DEVTECH_ADDRESS,
                DevTechABI as BitcoinInterfaceAbi,
                provider,
                readNetwork,
            );
        } catch {
            return null;
        }
    }

    /** Write contract instance — includes sender so Blockchain.tx.sender is set during simulation */
    function getWriteContract(): AnyContract | null {
        if (!network || !senderAddress) return null;
        if (!DEVTECH_ADDRESS || DEVTECH_ADDRESS.includes('TODO')) return null;
        try {
            return getContract<AnyContract>(
                DEVTECH_ADDRESS,
                DevTechABI as BitcoinInterfaceAbi,
                provider,
                network,
                senderAddress,
            );
        } catch {
            return null;
        }
    }

    /** Send a simulation result as a real transaction via the wallet */
    async function sendSimulation(simulation: AnyContract): Promise<string | null> {
        if (!network || !walletAddress) throw new Error('Wallet not connected');

        if (simulation.revert) {
            throw new Error(`Transaction would revert: ${simulation.revert}`);
        }

        provider!.utxoManager.clean();

        const txResult = await simulation.sendTransaction({
            signer: null,
            mldsaSigner: null,
            refundTo: walletAddress,
            maximumAllowedSatToSpend: 100_000n,
            network,
        });

        return (txResult as Record<string, string>)['transactionId']
            ?? (txResult as Record<string, string>)['txid']
            ?? (txResult as Record<string, string>)['result']
            ?? null;
    }

    const loadScan = useCallback(async (address: string): Promise<ScanResult | null> => {
        try {
            const result: ScannerResult = await scanAddress(provider, address);
            return {
                ...result,
                gasSpent: result.gasSpent.toString(),
            };
        } catch (e) {
            console.error('[loadScan] Error:', e);
            return null;
        }
    }, [provider]);

    const loadProfile = useCallback(async (address: string): Promise<ProfileData | null> => {
        const contract = getReadContract();
        if (!contract) return null;
        try {
            const addrObj = await resolveAddress(address, false);
            const result = await contract._getProfile(addrObj);
            if (!result?.properties) return null;
            return {
                handleHash:   BigInt(result.properties['handleHash'] ?? 0),
                pfpHash:      BigInt(result.properties['pfpHash'] ?? 0),
                score:        BigInt(result.properties['score'] ?? 0),
                badgeCount:   BigInt(result.properties['badgeCount'] ?? 0),
                endorseCount: BigInt(result.properties['endorseCount'] ?? 0),
            };
        } catch (e) {
            console.error('[loadProfile] Error:', e);
            return null;
        }
    }, [provider, network]);

    const loadMintedBadges = useCallback(async (address: string): Promise<number[]> => {
        const contract = getReadContract();
        if (!contract) return [];
        try {
            const addrObj = await resolveAddress(address, false);
            const balResult = await contract.balanceOf(addrObj);
            const balance = Number(balResult?.properties?.['balance'] ?? 0);
            if (balance === 0) return [];

            const badges: number[] = [];
            for (let i = 0; i < balance; i++) {
                const tokResult = await contract.tokenOfOwnerByIndex(addrObj, BigInt(i));
                const tokenId = BigInt(tokResult?.properties?.['tokenId'] ?? 0);
                const typeResult = await contract._getBadgeType(tokenId);
                const badgeId = Number(typeResult?.properties?.['badgeId'] ?? 0);
                if (badgeId > 0) {
                    badges.push(badgeId);
                    // Keep KV in sync — re-register every load so missed mints get fixed
                    fetch('/api/nft/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tokenId: String(tokenId), badgeId }),
                    }).catch(() => {});
                }
            }
            return badges;
        } catch (e) {
            console.error('[loadMintedBadges] Error:', e);
            return [];
        }
    }, [provider, network]);

    const hasClaimed = useCallback(async (address: string, badgeId: number): Promise<boolean> => {
        const contract = getReadContract();
        if (!contract) return false;
        try {
            const addrObj = await resolveAddress(address, false);
            const result = await contract._hasClaimed(addrObj, BigInt(badgeId));
            return Boolean(result?.properties?.['claimed']);
        } catch {
            return false;
        }
    }, [provider, network]);

    const claimBadge = useCallback(async (badgeId: number): Promise<string | null> => {
        const contract = getWriteContract();
        if (!contract) {
            setError('Contract not available — connect wallet first');
            console.error('[claimBadge] getWriteContract() returned null', {
                provider: !!provider,
                network: network?.bech32 ?? null,
                senderAddress: senderAddress?.toString() ?? null,
                DEVTECH_ADDRESS,
            });
            return null;
        }
        setLoading(true);
        setError(null);
        try {
            console.log(`[claimBadge] Simulating _claimBadge(${badgeId}) from ${senderAddress?.toString()}...`);
            const simulation = await contract._claimBadge(BigInt(badgeId));
            if (!simulation) throw new Error('Simulation returned empty result');

            console.log('[claimBadge] Simulation OK, sending tx...');
            const txId = await sendSimulation(simulation);
            console.log('[claimBadge] TX sent:', txId);

            // Register tokenId→badgeId mapping for NFT metadata
            try {
                const tokenId = String(simulation.properties?.['tokenId'] ?? '0');
                fetch('/api/nft/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tokenId, badgeId }),
                }).catch(() => {});
            } catch { /* non-critical */ }

            return txId;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('[claimBadge] Error:', msg, e);
            setError(msg);
            return null;
        } finally {
            setLoading(false);
        }
    }, [provider, network, senderAddress, walletAddress]);

    const setProfile = useCallback(async (handle: string, pfpUrl: string): Promise<string | null> => {
        const contract = getWriteContract();
        if (!contract) return null;
        setLoading(true);
        setError(null);
        try {
            const simulation = await contract._setProfile(handle, pfpUrl);
            if (!simulation) throw new Error('Simulation failed');
            return await sendSimulation(simulation);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return null;
        } finally {
            setLoading(false);
        }
    }, [provider, network, senderAddress, walletAddress]);

    const endorse = useCallback(async (targetAddress: string): Promise<string | null> => {
        const contract = getWriteContract();
        if (!contract) return null;
        setLoading(true);
        setError(null);
        try {
            const addrObj = await resolveAddress(targetAddress, false);
            const simulation = await contract._endorse(addrObj);
            if (!simulation) throw new Error('Simulation failed');
            return await sendSimulation(simulation);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return null;
        } finally {
            setLoading(false);
        }
    }, [provider, network, senderAddress, walletAddress]);

    return { loading, error, loadScan, loadProfile, loadMintedBadges, hasClaimed, claimBadge, setProfile, endorse };
}
