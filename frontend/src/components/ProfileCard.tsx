import { ProfileData, ScanResult } from '../hooks/useDevTech';

interface ProfileCardProps {
    address: string;
    profile: ProfileData | null;
    scan: ScanResult | null;
    twitterHandle: string | null;
    twitterPfp: string | null;
    displayName: string | null;
    editingName: boolean;
    nameInput: string;
    onNameInputChange: (v: string) => void;
    onEditName: () => void;
    onLinkTwitter: () => void;
    onShare: () => void;
    onRescan?: () => void;
}

function scoreLevel(score: number): { level: number; label: string; next: number } {
    if (score < 100)  return { level: 1, label: 'Newcomer',    next: 100  };
    if (score < 300)  return { level: 2, label: 'Explorer',    next: 300  };
    if (score < 600)  return { level: 3, label: 'Builder',     next: 600  };
    if (score < 1000) return { level: 4, label: 'Veteran',     next: 1000 };
    if (score < 2000) return { level: 5, label: 'Expert',      next: 2000 };
    if (score < 3500) return { level: 6, label: 'Master',      next: 3500 };
    return              { level: 7, label: 'OPNet Legend', next: score };
}

export function ProfileCard({ address, profile, scan, twitterHandle, twitterPfp, displayName, editingName, nameInput, onNameInputChange, onEditName, onLinkTwitter, onShare, onRescan }: ProfileCardProps) {
    const onChainScore = profile ? Number(profile.score) : 0;
    const scanScore    = scan?.score ?? 0;
    const totalScore   = onChainScore + scanScore;
    const badgeCount   = profile ? Number(profile.badgeCount) : 0;
    const endorseCount = profile ? Number(profile.endorseCount) : 0;
    const { level, label, next } = scoreLevel(totalScore);
    const progress = next > 0 ? Math.min((totalScore / next) * 100, 100) : 100;

    const shortAddr = `${address.slice(0, 10)}...${address.slice(-6)}`;

    return (
        <div style={{
            background: 'linear-gradient(135deg, #0f1117 0%, #111827 100%)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
        }}>
            {/* Top row: PFP + identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {twitterPfp ? (
                    <img src={twitterPfp} alt="PFP" style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid rgba(59,130,246,0.4)', objectFit: 'cover' }} />
                ) : (
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', border: '2px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', color: '#3b82f6' }}>
                        {(displayName ?? address.charAt(4)).charAt(0).toUpperCase()}
                    </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {editingName ? (
                            <input
                                value={nameInput}
                                onChange={e => onNameInputChange(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') onEditName(); }}
                                autoFocus
                                style={{
                                    fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', color: '#e2e8f0',
                                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(59,130,246,0.4)',
                                    borderRadius: '4px', padding: '2px 6px', outline: 'none', width: '140px',
                                }}
                            />
                        ) : (
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', color: '#e2e8f0' }}>
                                {displayName ? (twitterHandle ? `@${displayName}` : displayName) : 'Anonymous'}
                            </span>
                        )}
                        <button onClick={onEditName} style={{
                            background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer',
                            fontFamily: 'monospace', fontSize: '11px', padding: '2px 4px',
                        }}>
                            {editingName ? 'save' : 'edit'}
                        </button>
                    </div>
                    {twitterHandle && (
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#1da1f2', marginTop: '2px' }}>
                            @{twitterHandle}
                        </div>
                    )}
                    <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b7280', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {shortAddr}
                    </div>
                    <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '4px', color: '#3b82f6', fontFamily: 'monospace' }}>
                            Lv.{level} {label}
                        </span>
                        <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '4px', color: '#4ade80', fontFamily: 'monospace' }}>
                            {badgeCount} badges
                        </span>
                        {endorseCount > 0 && (
                            <span style={{ fontSize: '10px', padding: '2px 8px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '4px', color: '#a855f7', fontFamily: 'monospace' }}>
                                {endorseCount} endorsements
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Score bar */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>Score</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#3b82f6', fontFamily: 'monospace' }}>{totalScore.toLocaleString()} pts</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '3px', transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#4b5563', fontFamily: 'monospace' }}>0</span>
                    <span style={{ fontSize: '10px', color: '#4b5563', fontFamily: 'monospace' }}>{next.toLocaleString()}</span>
                </div>
            </div>

            {/* Stats row */}
            {scan && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                    {[
                        { label: 'Deployments', value: scan.deployments },
                        { label: 'Swaps',        value: scan.swaps      },
                        { label: 'Total TXs',    value: scan.totalTxs   },
                        { label: 'First Block',  value: scan.firstBlock > 0 ? `#${scan.firstBlock.toLocaleString()}` : '—' },
                    ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: '#e2e8f0' }}>{s.value}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#6b7280', marginTop: '2px' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {!twitterHandle && (
                    <button onClick={onLinkTwitter} style={{
                        flex: 1, minWidth: '130px', padding: '8px 14px',
                        background: 'rgba(29,161,242,0.1)', border: '1px solid rgba(29,161,242,0.3)',
                        borderRadius: '8px', color: '#1da1f2', fontFamily: 'Courier New, monospace',
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em',
                    }}>
                        Link Twitter / X
                    </button>
                )}
                <button onClick={onShare} style={{
                    flex: 1, minWidth: '130px', padding: '8px 14px',
                    background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)',
                    borderRadius: '8px', color: '#3b82f6', fontFamily: 'Courier New, monospace',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em',
                }}>
                    Share Score
                </button>
                <button onClick={onRescan} style={{
                    flex: 1, minWidth: '130px', padding: '8px 14px',
                    background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
                    borderRadius: '8px', color: '#4ade80', fontFamily: 'Courier New, monospace',
                    fontSize: '11px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em',
                }}>
                    Rescan Chain
                </button>
            </div>
        </div>
    );
}
