import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { SupportedWallets } from '@btc-vision/walletconnect';
import { useWallet } from '../contexts/WalletContext';

export function Header() {
    const { walletAddress, connectToWallet, disconnect } = useWallet();
    const [showMenu, setShowMenu] = useState(false);

    const shortAddr = walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : null;

    const navLinkStyle = ({ isActive }: { isActive: boolean }): React.CSSProperties => ({
        padding: '6px 16px',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        textDecoration: 'none',
        borderBottom: isActive ? '2px solid #fb923c' : '2px solid transparent',
        color: isActive ? '#fb923c' : '#9ca3af',
        fontFamily: 'Courier New, monospace',
        transition: 'color 0.2s, border-color 0.2s',
    });

    const profileHref = walletAddress ? `/profile/${walletAddress}` : '/';

    return (
        <header style={{
            position: 'sticky', top: 0, zIndex: 50,
            backdropFilter: 'blur(12px)',
            background: 'rgba(3,7,18,0.95)',
            borderBottom: '1px solid rgba(251,146,60,0.2)',
        }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem', height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>

                {/* Logo */}
                <NavLink to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', flexShrink: 0 }}>
                    <svg width="42" height="42" viewBox="0 0 64 64" fill="none">
                        <defs>
                            <linearGradient id="opnet-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#fb923c"/>
                                <stop offset="100%" stopColor="#f97316"/>
                            </linearGradient>
                            <linearGradient id="opnet-grad-lo" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                                <stop offset="0%" stopColor="#fb923c" stopOpacity="0.65"/>
                                <stop offset="100%" stopColor="#ea580c" stopOpacity="0.65"/>
                            </linearGradient>
                        </defs>
                        {/* Left upper wing */}
                        <path d="M32 34 C28 22, 10 14, 12 28 C13 36, 24 38, 32 34Z" fill="url(#opnet-grad)"/>
                        {/* Right upper wing */}
                        <path d="M32 34 C36 22, 54 14, 52 28 C51 36, 40 38, 32 34Z" fill="url(#opnet-grad)"/>
                        {/* Left lower wing */}
                        <path d="M32 36 C26 44, 12 46, 14 38 C16 32, 26 32, 32 36Z" fill="url(#opnet-grad-lo)"/>
                        {/* Right lower wing */}
                        <path d="M32 36 C38 44, 52 46, 50 38 C48 32, 38 32, 32 36Z" fill="url(#opnet-grad-lo)"/>
                        {/* Center body */}
                        <ellipse cx="32" cy="35" rx="2.5" ry="4.5" fill="#fed7aa"/>
                    </svg>
                    <span style={{ color: '#fb923c', fontFamily: 'Courier New, monospace', fontSize: '22px', fontWeight: 700, letterSpacing: '0.05em', textShadow: '0 0 14px rgba(251,146,60,0.55)' }}>
                        opdev.tech
                    </span>
                </NavLink>

                {/* Nav */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <NavLink to="/leaderboard" style={navLinkStyle}>
                        Leaderboard
                    </NavLink>
                    <NavLink to={profileHref} style={navLinkStyle}>
                        Profile
                    </NavLink>
                </nav>

                {/* Wallet */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {shortAddr ? (
                        <>
                            <button onClick={() => setShowMenu(v => !v)} style={{
                                color: '#fb923c',
                                border: '1px solid rgba(251,146,60,0.35)',
                                background: 'rgba(251,146,60,0.07)',
                                borderRadius: '8px',
                                padding: '7px 16px',
                                fontFamily: 'Courier New, monospace',
                                fontSize: '13px',
                                cursor: 'pointer',
                                fontWeight: 700,
                            }}>
                                {shortAddr} ▾
                            </button>
                            {showMenu && (
                                <>
                                    <div style={{
                                        position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                                        background: '#0f172a',
                                        border: '1px solid rgba(251,146,60,0.2)',
                                        borderRadius: '10px', overflow: 'hidden',
                                        minWidth: '180px', zIndex: 100,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                    }}>
                                        <div style={{ padding: '8px 12px', fontSize: '12px', color: '#4b5563', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: 'monospace' }}>
                                            {walletAddress?.slice(0, 14)}...
                                        </div>
                                        <NavLink
                                            to={profileHref}
                                            onClick={() => setShowMenu(false)}
                                            style={{ display: 'block', padding: '8px 12px', fontSize: '13px', fontWeight: 700, color: '#fb923c', textDecoration: 'none', fontFamily: 'Courier New, monospace' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(251,146,60,0.08)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            My Profile
                                        </NavLink>
                                        <button
                                            onClick={() => { disconnect(); setShowMenu(false); }}
                                            style={{
                                                width: '100%', textAlign: 'left', padding: '8px 12px',
                                                fontSize: '13px', fontWeight: 700, color: '#f87171',
                                                background: 'transparent', border: 'none', cursor: 'pointer',
                                                fontFamily: 'Courier New, monospace',
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowMenu(false)} />
                                </>
                            )}
                        </>
                    ) : (
                        <button onClick={() => connectToWallet(SupportedWallets.OP_WALLET)} style={{
                            color: '#fb923c',
                            border: '1px solid rgba(251,146,60,0.45)',
                            background: 'rgba(251,146,60,0.08)',
                            borderRadius: '8px',
                            padding: '7px 18px',
                            fontFamily: 'Courier New, monospace',
                            fontSize: '13px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em',
                        }}>
                            Connect Wallet
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
