import { useState, useCallback } from 'react';
import { getContract } from 'opnet';
import { JSONRpcProvider } from 'opnet';
import { Network } from '@btc-vision/bitcoin';
import { DevTechABI } from '../abi/DevTechABI';
import { DEVTECH_ADDRESS, BACKEND_URL } from '../config/contracts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyContract = any;

export interface ScanResult {
    address:        string;
    deployments:    number;
    swaps:          number;
    gasSpent:       string;
    totalTxs:       number;
    failedTxs:      number;
    firstBlock:     number;
    score:          number;
    eligibleBadges: number[];
}

export interface ProfileData {
    handleHash:   bigint;
    pfpHash:      bigint;
    score:        bigint;
    badgeCount:   bigint;
    endorseCount: bigint;
}

export function useDevTech(provider: JSONRpcProvider | null, network: Network | null | undefined) {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState<string | null>(null);

    function getContractInstance(): AnyContract | null {
        if (!provider || !network) return null;
        if (!DEVTECH_ADDRESS || DEVTECH_ADDRESS.includes('TODO')) return null;
        try {
            return getContract<AnyContract>(
                DEVTECH_ADDRESS,
                DevTechABI as unknown as Parameters<typeof getContract>[1],
                provider,
                network,
            );
        } catch {
            return null;
        }
    }

    const loadScan = useCallback(async (address: string): Promise<ScanResult | null> => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/scan/${address}`);
            if (!res.ok) return null;
            return await res.json() as ScanResult;
        } catch {
            return null;
        }
    }, []);

    const loadProfile = useCallback(async (address: string): Promise<ProfileData | null> => {
        const contract = getContractInstance();
        if (!contract) return null;
        try {
            const result = await contract._getProfile(address);
            if (!result?.properties) return null;
            return {
                handleHash:   BigInt(result.properties['handleHash'] ?? 0),
                pfpHash:      BigInt(result.properties['pfpHash'] ?? 0),
                score:        BigInt(result.properties['score'] ?? 0),
                badgeCount:   BigInt(result.properties['badgeCount'] ?? 0),
                endorseCount: BigInt(result.properties['endorseCount'] ?? 0),
            };
        } catch {
            return null;
        }
    }, [provider, network]);

    const loadMintedBadges = useCallback(async (address: string): Promise<number[]> => {
        const contract = getContractInstance();
        if (!contract) return [];
        try {
            const balResult = await contract.balanceOf(address);
            const balance = Number(balResult?.properties?.['balance'] ?? 0);
            if (balance === 0) return [];

            const badges: number[] = [];
            for (let i = 0; i < balance; i++) {
                const tokResult = await contract.tokenOfOwnerByIndex(address, BigInt(i));
                const tokenId = BigInt(tokResult?.properties?.['tokenId'] ?? 0);
                const typeResult = await contract._getBadgeType(tokenId.toString());
                const badgeId = Number(typeResult?.properties?.['badgeId'] ?? 0);
                if (badgeId > 0) badges.push(badgeId);
            }
            return badges;
        } catch {
            return [];
        }
    }, [provider, network]);

    const hasClaimed = useCallback(async (address: string, badgeId: number): Promise<boolean> => {
        const contract = getContractInstance();
        if (!contract) return false;
        try {
            const result = await contract._hasClaimed(address, BigInt(badgeId));
            return Boolean(result?.properties?.['claimed']);
        } catch {
            return false;
        }
    }, [provider, network]);

    const claimBadge = useCallback(async (badgeId: number): Promise<string | null> => {
        const contract = getContractInstance();
        if (!contract) return null;
        setLoading(true);
        setError(null);
        try {
            const sim = await contract._claimBadge(BigInt(badgeId));
            if (!sim) throw new Error('Simulation failed');

            provider!.utxoManager.clean();
            const txResult = await contract.sendTransaction(sim, {
                signer: null,
                mldsaSigner: null,
            });

            return (txResult as Record<string, string>)['transactionId']
                ?? (txResult as Record<string, string>)['txid']
                ?? (txResult as Record<string, string>)['result']
                ?? null;
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return null;
        } finally {
            setLoading(false);
        }
    }, [provider, network]);

    const setProfile = useCallback(async (handle: string, pfpUrl: string): Promise<string | null> => {
        const contract = getContractInstance();
        if (!contract) return null;
        setLoading(true);
        setError(null);
        try {
            const sim = await contract._setProfile(handle, pfpUrl);
            if (!sim) throw new Error('Simulation failed');

            provider!.utxoManager.clean();
            const txResult = await contract.sendTransaction(sim, {
                signer: null,
                mldsaSigner: null,
            });

            return (txResult as Record<string, string>)['transactionId']
                ?? (txResult as Record<string, string>)['txid']
                ?? null;
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return null;
        } finally {
            setLoading(false);
        }
    }, [provider, network]);

    const endorse = useCallback(async (targetAddress: string): Promise<string | null> => {
        const contract = getContractInstance();
        if (!contract) return null;
        setLoading(true);
        setError(null);
        try {
            const sim = await contract._endorse(targetAddress);
            if (!sim) throw new Error('Simulation failed');

            provider!.utxoManager.clean();
            const txResult = await contract.sendTransaction(sim, {
                signer: null,
                mldsaSigner: null,
            });

            return (txResult as Record<string, string>)['transactionId']
                ?? (txResult as Record<string, string>)['txid']
                ?? null;
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return null;
        } finally {
            setLoading(false);
        }
    }, [provider, network]);

    return { loading, error, loadScan, loadProfile, loadMintedBadges, hasClaimed, claimBadge, setProfile, endorse };
}
