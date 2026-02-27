import { useMemo } from 'react';
import { JSONRpcProvider } from 'opnet';
import { networks, Network } from '@btc-vision/bitcoin';
import { getRpcUrl } from '../config/networks';

const providerCache = new Map<string, JSONRpcProvider>();

// Always returns a provider — falls back to OPNet testnet for read-only calls
// when no wallet is connected (so other-profile views still work).
export function useProvider(network: Network | null | undefined): JSONRpcProvider {
    return useMemo(() => {
        const net = network ?? (networks as unknown as Record<string, Network>)['opnetTestnet'];
        try {
            const rpcUrl = getRpcUrl(net);
            if (!providerCache.has(rpcUrl)) {
                providerCache.set(rpcUrl, new JSONRpcProvider({ url: rpcUrl, network: net }));
            }
            return providerCache.get(rpcUrl)!;
        } catch {
            // Hard fallback — should never happen
            const rpcUrl = 'https://testnet.opnet.org';
            if (!providerCache.has(rpcUrl)) {
                providerCache.set(rpcUrl, new JSONRpcProvider({ url: rpcUrl, network: net }));
            }
            return providerCache.get(rpcUrl)!;
        }
    }, [network]);
}
