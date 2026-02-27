import { useEffect, useState } from 'react';
import { BACKEND_URL } from '../config/contracts';

interface LeaderboardEntry {
    address:       string;
    score:         number;
    totalTxs:      number;
    deployments:   number;
    swaps:         number;
    badgeCount:    number;
    twitterHandle: string | null;
    twitterPfp:    string | null;
}

export function LeaderboardPage() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${BACKEND_URL}/api/leaderboard`)
            .then(r => r.json())
            .then((data: LeaderboardEntry[]) => setEntries(data))
            .catch(() => setEntries([]))
            .finally(() => setLoading(false));
    }, []);

    const shortAddr = (a: string) => `${a.slice(0, 10)}...${a.slice(-6)}`;

    const rankStyle = (i: number): React.CSSProperties => {
        if (i === 0) return { color: '#fbbf24', fontWeight: 700 };
        if (i === 1) return { color: '#94a3b8', fontWeight: 700 };
        if (i === 2) return { color: '#cd7f32', fontWeight: 700 };
        return { color: '#64748b' };
    };

    const rankLabel = (i: number): string => {
        if (i === 0) return '1st';
        if (i === 1) return '2nd';
        if (i === 2) return '3rd';
        return `${i + 1}th`;
    };

    const cols = '50px 1fr 90px 60px 60px 60px 60px';

    return (
        <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Courier New, monospace', fontSize: '24px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                    Leaderboard
                </h1>
                <p style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                    Ranked by on-chain activity score. Mint a badge to appear here.
                </p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'monospace', fontSize: '13px', color: '#3b82f6' }}>
                    Loading leaderboard...
                </div>
            ) : entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'monospace', fontSize: '13px', color: '#64748b' }}>
                    No entries yet. Connect your wallet and mint a badge to be the first!
                </div>
            ) : (
                <div style={{
                    background: '#141827',
                    border: '1px solid rgba(99, 130, 200, 0.12)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: cols,
                        padding: '12px 20px',
                        borderBottom: '1px solid rgba(99, 130, 200, 0.1)',
                        background: '#0f1220',
                        alignItems: 'center',
                    }}>
                        {['Rank', 'User', 'Score', 'Badges', 'TXs', 'Deploys', 'Swaps'].map(h => (
                            <span key={h} style={{
                                fontFamily: 'monospace', fontSize: '10px', fontWeight: 700,
                                color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em',
                            }}>
                                {h}
                            </span>
                        ))}
                    </div>

                    {/* Rows */}
                    {entries.map((entry, i) => (
                        <a
                            key={entry.address}
                            href={`/profile/${entry.address}`}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: cols,
                                padding: '12px 20px',
                                textDecoration: 'none',
                                borderBottom: i < entries.length - 1 ? '1px solid rgba(99, 130, 200, 0.06)' : 'none',
                                transition: 'background 0.15s',
                                alignItems: 'center',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#1a1f32')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <span style={{ fontFamily: 'monospace', fontSize: '14px', ...rankStyle(i) }}>
                                {rankLabel(i)}
                            </span>

                            {/* User column: PFP + name/address */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                {entry.twitterPfp ? (
                                    <img src={entry.twitterPfp} alt="" style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        border: '1px solid rgba(59,130,246,0.2)', flexShrink: 0,
                                    }} />
                                ) : (
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg, #1e2a4a 0%, #1a2040 100%)',
                                        border: '1px solid rgba(59,130,246,0.15)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '13px', color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700,
                                    }}>
                                        {entry.address.charAt(4).toUpperCase()}
                                    </div>
                                )}
                                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                                    {entry.twitterHandle ? (
                                        <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#e2e8f0', fontWeight: 600 }}>
                                            @{entry.twitterHandle}
                                        </div>
                                    ) : null}
                                    <div style={{
                                        fontFamily: 'monospace', fontSize: '11px',
                                        color: entry.twitterHandle ? '#64748b' : '#60a5fa',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {shortAddr(entry.address)}
                                    </div>
                                </div>
                            </div>

                            <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>
                                {entry.score.toLocaleString()}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#a78bfa', fontWeight: 600 }}>
                                {entry.badgeCount}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#94a3b8' }}>
                                {entry.totalTxs}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#94a3b8' }}>
                                {entry.deployments}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#94a3b8' }}>
                                {entry.swaps}
                            </span>
                        </a>
                    ))}
                </div>
            )}
        </main>
    );
}
