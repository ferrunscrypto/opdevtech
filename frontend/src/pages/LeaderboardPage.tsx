import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useProvider } from '../hooks/useProvider';
import { useDevTech } from '../hooks/useDevTech';

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

const PAGE_SIZE = 25;

export function LeaderboardPage() {
    const { walletAddress, network, address: walletAddressObj } = useWallet();
    const provider = useProvider(network);
    const { endorse } = useDevTech(provider, network, walletAddressObj ?? null, walletAddress ?? null);

    const [entries,    setEntries]    = useState<LeaderboardEntry[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [page,       setPage]       = useState(0);
    const [endorsing,  setEndorsing]  = useState<Set<string>>(new Set());
    const [endorsed,   setEndorsed]   = useState<Set<string>>(new Set());
    const [txMsg,      setTxMsg]      = useState<string | null>(null);
    const [errMsg,     setErrMsg]     = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/leaderboard')
            .then(r => r.json())
            .then((data: LeaderboardEntry[]) => setEntries(data))
            .catch(() => setEntries([]))
            .finally(() => setLoading(false));
    }, []);

    const handleEndorse = useCallback(async (address: string) => {
        if (!walletAddress || endorsing.has(address) || endorsed.has(address)) return;
        setEndorsing(prev => new Set(prev).add(address));
        setTxMsg(null);
        setErrMsg(null);
        try {
            const txId = await endorse(address);
            if (txId) {
                setEndorsed(prev => new Set(prev).add(address));
                setTxMsg(`Endorsed! TX: ${txId.slice(0, 16)}...`);
            }
        } catch (e) {
            setErrMsg(`Endorse failed: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setEndorsing(prev => { const s = new Set(prev); s.delete(address); return s; });
        }
    }, [walletAddress, endorsing, endorsed, endorse]);

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

    const totalPages = Math.ceil(entries.length / PAGE_SIZE);
    const pageEntries = entries.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const cols = '50px 1fr 90px 60px 60px 60px 60px 80px';

    return (
        <main style={{ maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontFamily: 'Courier New, monospace', fontSize: '24px', fontWeight: 700, color: '#e2e8f0', margin: 0 }}>
                    Leaderboard
                </h1>
                <p style={{ fontFamily: 'monospace', fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
                    Ranked by on-chain activity score. Mint a badge to appear here.
                </p>
            </div>

            {/* Status messages */}
            {txMsg && (
                <div style={{ marginBottom: '1rem', padding: '10px 16px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', color: '#4ade80' }}>
                    {txMsg}
                </div>
            )}
            {errMsg && (
                <div onClick={() => setErrMsg(null)} style={{ marginBottom: '1rem', padding: '10px 16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', color: '#f87171', cursor: 'pointer' }}>
                    {errMsg}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'monospace', fontSize: '14px', color: '#fb923c' }}>
                    Loading leaderboard...
                </div>
            ) : entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'monospace', fontSize: '14px', color: '#64748b' }}>
                    No entries yet. Connect your wallet and mint a badge to be the first!
                </div>
            ) : (
                <>
                    <div style={{
                        background: '#141827',
                        border: '1px solid rgba(99, 130, 200, 0.12)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: cols,
                            padding: '12px 20px',
                            borderBottom: '1px solid rgba(99, 130, 200, 0.1)',
                            background: '#0f1220', alignItems: 'center',
                        }}>
                            {['Rank', 'User', 'Score', 'Badges', 'TXs', 'Deploys', 'Swaps', ''].map((h, idx) => (
                                <span key={idx} style={{
                                    fontFamily: 'monospace', fontSize: '10px', fontWeight: 700,
                                    color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em',
                                }}>
                                    {h}
                                </span>
                            ))}
                        </div>

                        {/* Rows */}
                        {pageEntries.map((entry, i) => {
                            const globalRank = page * PAGE_SIZE + i;
                            const isOwn = walletAddress === entry.address;
                            const isEndorsing = endorsing.has(entry.address);
                            const hasEndorsed = endorsed.has(entry.address);
                            const canEndorse = !!walletAddress && !isOwn && !hasEndorsed;

                            return (
                                <div
                                    key={entry.address}
                                    style={{
                                        display: 'grid', gridTemplateColumns: cols,
                                        padding: '12px 20px',
                                        borderBottom: i < pageEntries.length - 1 ? '1px solid rgba(99, 130, 200, 0.06)' : 'none',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = '#1a1f32')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    onClick={() => { window.location.href = `/profile/${entry.address}`; }}
                                >
                                    <span style={{ fontFamily: 'monospace', fontSize: '14px', ...rankStyle(globalRank) }}>
                                        {rankLabel(globalRank)}
                                    </span>

                                    {/* User */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                        {entry.twitterPfp ? (
                                            <img src={entry.twitterPfp} alt="" style={{
                                                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                                                border: '1px solid rgba(251,146,60,0.2)',
                                            }} />
                                        ) : (
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                                                background: 'linear-gradient(135deg, #1e2a4a 0%, #1a2040 100%)',
                                                border: '1px solid rgba(251,146,60,0.15)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '14px', color: '#fdba74', fontFamily: 'monospace', fontWeight: 700,
                                            }}>
                                                {entry.address.charAt(4).toUpperCase()}
                                            </div>
                                        )}
                                        <div style={{ overflow: 'hidden', minWidth: 0 }}>
                                            {entry.twitterHandle && (
                                                <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#e2e8f0', fontWeight: 600 }}>
                                                    @{entry.twitterHandle}
                                                </div>
                                            )}
                                            <div style={{
                                                fontFamily: 'monospace', fontSize: '12px',
                                                color: entry.twitterHandle ? '#64748b' : '#fdba74',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}>
                                                {shortAddr(entry.address)}
                                            </div>
                                        </div>
                                    </div>

                                    <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#e2e8f0' }}>
                                        {entry.score.toLocaleString()}
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#a78bfa', fontWeight: 600 }}>
                                        {entry.badgeCount}
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#94a3b8' }}>
                                        {entry.totalTxs}
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#94a3b8' }}>
                                        {entry.deployments}
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontSize: '14px', color: '#94a3b8' }}>
                                        {entry.swaps}
                                    </span>

                                    {/* Endorse button */}
                                    <div onClick={e => e.stopPropagation()}>
                                        {isOwn ? (
                                            <span style={{ fontFamily: 'monospace', fontSize: '9px', color: '#374151', letterSpacing: '0.06em' }}>YOU</span>
                                        ) : canEndorse || isEndorsing || hasEndorsed ? (
                                            <button
                                                onClick={() => handleEndorse(entry.address)}
                                                disabled={isEndorsing || hasEndorsed}
                                                style={{
                                                    padding: '4px 10px',
                                                    background: hasEndorsed ? 'rgba(168,85,247,0.08)' : isEndorsing ? 'rgba(168,85,247,0.06)' : 'rgba(168,85,247,0.15)',
                                                    border: `1px solid rgba(168,85,247,${hasEndorsed || isEndorsing ? '0.15' : '0.35'})`,
                                                    borderRadius: '8px',
                                                    color: hasEndorsed ? '#7c3aed' : '#a855f7',
                                                    fontFamily: 'monospace', fontSize: '10px', fontWeight: 700,
                                                    cursor: isEndorsing || hasEndorsed ? 'default' : 'pointer',
                                                    opacity: isEndorsing ? 0.6 : 1,
                                                    transition: 'all 0.15s',
                                                    letterSpacing: '0.04em',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {hasEndorsed ? '✓ done' : isEndorsing ? '...' : '+1'}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '1.5rem' }}>
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                style={{
                                    padding: '7px 16px', background: 'rgba(99,130,200,0.08)',
                                    border: '1px solid rgba(99,130,200,0.15)', borderRadius: '8px',
                                    color: page === 0 ? '#374151' : '#94a3b8',
                                    fontFamily: 'monospace', fontSize: '12px', fontWeight: 700,
                                    cursor: page === 0 ? 'default' : 'pointer',
                                }}
                            >
                                ← Prev
                            </button>
                            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b' }}>
                                {page + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page === totalPages - 1}
                                style={{
                                    padding: '7px 16px', background: 'rgba(99,130,200,0.08)',
                                    border: '1px solid rgba(99,130,200,0.15)', borderRadius: '8px',
                                    color: page === totalPages - 1 ? '#374151' : '#94a3b8',
                                    fontFamily: 'monospace', fontSize: '12px', fontWeight: 700,
                                    cursor: page === totalPages - 1 ? 'default' : 'pointer',
                                }}
                            >
                                Next →
                            </button>
                        </div>
                    )}

                    <div style={{ marginTop: '1rem', textAlign: 'center', fontFamily: 'monospace', fontSize: '10px', color: '#374151' }}>
                        {entries.length} total entries · showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, entries.length)}
                    </div>
                </>
            )}
        </main>
    );
}
