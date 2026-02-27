import { useState } from 'react';
import { useWalletConnect, SupportedWallets } from '@btc-vision/walletconnect';

function getChainName(address: string | undefined): string {
    if (!address) return '';
    if (address.startsWith('opt1')) return 'OPNet Testnet';
    if (address.startsWith('op1'))  return 'OPNet Mainnet';
    if (address.startsWith('bcrt1')) return 'Regtest';
    if (address.startsWith('tb1'))  return 'Testnet';
    if (address.startsWith('bc1'))  return 'Bitcoin';
    return 'Unknown';
}

export function Header() {
    const { walletAddress, connectToWallet, disconnect } = useWalletConnect();
    const [showMenu, setShowMenu] = useState(false);

    const shortAddr = walletAddress
        ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-4)}`
        : null;
    const chainName = getChainName(walletAddress);

    return (
        <header style={{
            position: 'sticky', top: 0, zIndex: 50,
            backdropFilter: 'blur(12px)',
            background: 'rgba(12,15,26,0.92)',
            borderBottom: '1px solid rgba(99,130,200,0.1)',
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Logo */}
                <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                    <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="32" r="30" fill="#0c0f1a" stroke="#3b82f6" strokeWidth="3"/>
                        <text x="32" y="42" textAnchor="middle" fill="#3b82f6" fontSize="28" fontFamily="monospace" fontWeight="bold">D</text>
                    </svg>
                    <span style={{ color: '#3b82f6', fontFamily: 'Courier New, monospace', fontSize: '20px', fontWeight: 700, letterSpacing: '0.05em', textShadow: '0 0 10px rgba(59,130,246,0.5)' }}>
                        opdev.tech
                    </span>
                </a>

                {/* Nav links */}
                <nav style={{ display: 'flex', gap: '4px' }}>
                    <a href="/leaderboard"
                        style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: '11px', padding: '6px 12px', textDecoration: 'none', letterSpacing: '0.1em' }}>
                        LEADERBOARD
                    </a>
                    <a href="https://github.com/ferrunscrypto/opdevtech" target="_blank" rel="noopener noreferrer"
                        style={{ color: '#6b7280', fontFamily: 'monospace', fontSize: '11px', padding: '6px 12px', textDecoration: 'none', letterSpacing: '0.1em' }}>
                        DOCS
                    </a>
                </nav>

                {/* Wallet */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {shortAddr ? (
                        <>
                            <span style={{
                                padding: '4px 8px', borderRadius: '6px',
                                background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
                                color: '#4ade80', fontFamily: 'monospace', fontSize: '10px',
                                fontWeight: 700, letterSpacing: '0.05em',
                            }}>
                                {chainName}
                            </span>
                            <button onClick={() => setShowMenu(v => !v)} style={{
                                color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)',
                                background: 'rgba(59,130,246,0.05)', borderRadius: '8px',
                                padding: '6px 14px', fontFamily: 'Courier New, monospace',
                                fontSize: '12px', cursor: 'pointer',
                            }}>
                                {shortAddr} ▾
                            </button>
                            {showMenu && (
                                <>
                                    <div style={{
                                        position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                                        background: '#141827', border: '1px solid rgba(99,130,200,0.12)',
                                        borderRadius: '10px', overflow: 'hidden', minWidth: '180px', zIndex: 100,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                    }}>
                                        <div style={{ padding: '8px 12px', fontSize: '11px', color: '#4b5563', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace' }}>
                                            {walletAddress?.slice(0, 14)}...
                                        </div>
                                        <button onClick={() => { disconnect(); setShowMenu(false); }} style={{
                                            width: '100%', textAlign: 'left', padding: '8px 12px',
                                            fontSize: '12px', fontWeight: 700, color: '#f87171',
                                            background: 'transparent', border: 'none', cursor: 'pointer',
                                            fontFamily: 'Courier New, monospace',
                                        }}>
                                            Disconnect
                                        </button>
                                    </div>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
                                </>
                            )}
                        </>
                    ) : (
                        <button onClick={() => connectToWallet(SupportedWallets.OP_WALLET)} style={{
                            color: '#3b82f6', border: '1px solid rgba(59,130,246,0.4)',
                            background: 'rgba(59,130,246,0.08)', borderRadius: '8px',
                            padding: '6px 16px', fontFamily: 'Courier New, monospace',
                            fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em',
                        }}>
                            Connect Wallet
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
