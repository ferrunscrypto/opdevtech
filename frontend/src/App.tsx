import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useWallet } from './contexts/WalletContext';
import { Header } from './components/Header';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { DEVTECH_ADDRESS } from './config/contracts';

function Footer() {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(DEVTECH_ADDRESS).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <footer style={{
            borderTop: '1px solid rgba(99,130,200,0.08)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap',
        }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: '#475569', letterSpacing: '0.06em' }}>
                NFT CONTRACT
            </span>
            <code style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px',
                color: '#94a3b8',
                background: 'rgba(99,130,200,0.06)',
                border: '1px solid rgba(99,130,200,0.1)',
                borderRadius: '6px',
                padding: '3px 10px',
            }}>
                {DEVTECH_ADDRESS}
            </code>
            <button
                onClick={copy}
                style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '10px',
                    padding: '3px 10px',
                    background: copied ? 'rgba(74,222,128,0.1)' : 'rgba(99,130,200,0.08)',
                    border: `1px solid ${copied ? 'rgba(74,222,128,0.25)' : 'rgba(99,130,200,0.15)'}`,
                    borderRadius: '6px',
                    color: copied ? '#4ade80' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    letterSpacing: '0.06em',
                }}
            >
                {copied ? 'COPIED' : 'COPY'}
            </button>
        </footer>
    );
}

export function App() {
    const { walletAddress } = useWallet();

    return (
        <BrowserRouter>
            <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
                <Header />
                <div style={{ flex: 1 }}>
                    <Routes>
                        <Route path="/" element={walletAddress ? <DashboardPage /> : <LandingPage />} />
                        <Route path="/profile/:address" element={<DashboardPage />} />
                        <Route path="/leaderboard" element={<LeaderboardPage />} />
                        <Route path="*" element={walletAddress ? <DashboardPage /> : <LandingPage />} />
                    </Routes>
                </div>
                <Footer />
            </div>
        </BrowserRouter>
    );
}
