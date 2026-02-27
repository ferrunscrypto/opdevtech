import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { WalletConnectProvider, useWalletConnect, SupportedWallets } from '@btc-vision/walletconnect';
import type { Network } from '@btc-vision/bitcoin';
import type { Address } from '@btc-vision/transaction';

interface WalletState {
    walletAddress: string | null;
    network: Network | null;
    address: Address | null;
    connectToWallet: (wallet: SupportedWallets) => void;
    disconnect: () => void;
}

const WalletCtx = createContext<WalletState>({
    walletAddress: null,
    network: null,
    address: null,
    connectToWallet: () => {},
    disconnect: () => {},
});

export function useWallet(): WalletState {
    return useContext(WalletCtx);
}

/** Bridge that reads from WalletConnectProvider and publishes to our context */
function WalletBridge({ pending, onPendingHandled, children }: {
    pending: boolean;
    onPendingHandled: () => void;
    children: ReactNode;
}) {
    const wc = useWalletConnect();

    useEffect(() => {
        if (pending) {
            wc.connectToWallet(SupportedWallets.OP_WALLET);
            onPendingHandled();
        }
    }, [pending, wc, onPendingHandled]);

    return (
        <WalletCtx.Provider value={{
            walletAddress: wc.walletAddress ?? null,
            network: (wc.network ?? null) as Network | null,
            address: (wc.address ?? null) as Address | null,
            connectToWallet: wc.connectToWallet,
            disconnect: wc.disconnect,
        }}>
            {children}
        </WalletCtx.Provider>
    );
}

/**
 * Defers mounting WalletConnectProvider until the user clicks "Connect Wallet".
 * This prevents the browser permission popup on page load.
 */
export function LazyWalletProvider({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const [pending, setPending] = useState(false);

    const connectToWallet = useCallback(() => {
        setPending(true);
        setMounted(true);
    }, []);

    const handlePendingHandled = useCallback(() => {
        setPending(false);
    }, []);

    if (!mounted) {
        return (
            <WalletCtx.Provider value={{
                walletAddress: null,
                network: null,
                address: null,
                connectToWallet,
                disconnect: () => {},
            }}>
                {children}
            </WalletCtx.Provider>
        );
    }

    return (
        <WalletConnectProvider theme="dark">
            <WalletBridge pending={pending} onPendingHandled={handlePendingHandled}>
                {children}
            </WalletBridge>
        </WalletConnectProvider>
    );
}
