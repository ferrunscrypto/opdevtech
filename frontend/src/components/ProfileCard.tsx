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
    scanning?: boolean;
    isOwnProfile?: boolean;
    onEndorse?: () => void;
    endorsing?: boolean;
    onRecheckFollowing?: () => void;
    recheckingFollow?: boolean;
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

const card = {
    background: '#141827',
    border: '1px solid rgba(99, 130, 200, 0.12)',
    borderRadius: '16px',
};

export function ProfileCard({ address, profile, scan, twitterHandle, twitterPfp, displayName, editingName, nameInput, onNameInputChange, onEditName, onLinkTwitter, onShare, onRescan, scanning, isOwnProfile, onEndorse, endorsing, onRecheckFollowing, recheckingFollow }: ProfileCardProps) {
    // Score = badge points only (accumulated on-chain when badges are minted)
    const totalScore = profile ? Number(profile.score) : 0;
    const badgeCount   = profile ? Number(profile.badgeCount) : 0;
    const endorseCount = profile ? Number(profile.endorseCount) : 0;
    const { level, label, next } = scoreLevel(totalScore);
    const progress = next > 0 ? Math.min((totalScore / next) * 100, 100) : 100;

    const shortAddr = `${address.slice(0, 10)}...${address.slice(-6)}`;

    return (
        <div style={{
            ...card,
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
        }}>
            {/* Top row: PFP + identity */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {twitterPfp ? (
                    <img src={twitterPfp} alt="PFP" style={{ width: '72px', height: '72px', borderRadius: '50%', border: '2px solid rgba(251,146,60,0.25)', objectFit: 'cover' }} />
                ) : (
                    <div style={{
                        width: '72px', height: '72px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #1e2a4a 0%, #1a2040 100%)',
                        border: '2px solid rgba(251,146,60,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '28px', color: '#fdba74',
                    }}>
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
                                    background: '#0f1220', border: '1px solid rgba(251,146,60,0.3)',
                                    borderRadius: '6px', padding: '3px 8px', outline: 'none', width: '140px',
                                }}
                            />
                        ) : (
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', color: '#f1f5f9' }}>
                                {displayName ? (twitterHandle ? `@${displayName}` : displayName) : 'Anonymous'}
                            </span>
                        )}
                        <button onClick={onEditName} style={{
                            background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                            fontFamily: 'monospace', fontSize: '12px', padding: '2px 4px',
                        }}>
                            {editingName ? 'save' : 'edit'}
                        </button>
                    </div>
                    {twitterHandle && (
                        <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#1da1f2', marginTop: '2px' }}>
                            @{twitterHandle}
                        </div>
                    )}
                    <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {shortAddr}
                    </div>
                    <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', padding: '2px 10px', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: '10px', color: '#fdba74', fontFamily: 'monospace' }}>
                            Lv.{level} {label}
                        </span>
                        <span style={{ fontSize: '10px', padding: '2px 10px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px', color: '#4ade80', fontFamily: 'monospace' }}>
                            {badgeCount} badges
                        </span>
                        {endorseCount > 0 && (
                            <span style={{ fontSize: '10px', padding: '2px 10px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '10px', color: '#a855f7', fontFamily: 'monospace' }}>
                                {endorseCount} endorsements
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Score bar */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>Score</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#fdba74', fontFamily: 'monospace' }}>{totalScore.toLocaleString()} pts</span>
                </div>
                <div style={{ height: '5px', background: '#0f1220', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #fb923c, #818cf8)', borderRadius: '3px', transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>0</span>
                    <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>{next.toLocaleString()}</span>
                </div>
            </div>

            {/* Stats row */}
            {scan && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                    {[
                        { label: 'Deploys', value: scan.deployments },
                        { label: 'Swaps',   value: scan.swaps      },
                        { label: 'TXs',     value: scan.totalTxs   },
                        { label: 'Block',   value: scan.firstBlock > 0 ? `#${scan.firstBlock.toLocaleString()}` : '—' },
                    ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center', padding: '10px 4px', background: '#0f1220', borderRadius: '10px' }}>
                            <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 700, color: '#e2e8f0' }}>{s.value}</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#64748b', marginTop: '3px' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {twitterHandle && onRecheckFollowing && (
                    <button
                        onClick={onRecheckFollowing}
                        disabled={recheckingFollow}
                        className="profile-btn"
                        style={{
                            flex: 1, minWidth: '100px', padding: '10px 14px',
                            background: recheckingFollow ? 'rgba(29,161,242,0.06)' : 'rgba(29,161,242,0.12)',
                            border: `1px solid rgba(29,161,242,${recheckingFollow ? '0.15' : '0.3'})`,
                            borderRadius: '10px', color: '#1da1f2', fontFamily: 'monospace',
                            fontSize: '12px', fontWeight: 700,
                            cursor: recheckingFollow ? 'wait' : 'pointer',
                            opacity: recheckingFollow ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {recheckingFollow ? 'Checking...' : 'Refresh X'}
                    </button>
                )}
                {!twitterHandle && (
                    <button
                        onClick={onLinkTwitter}
                        className="profile-btn"
                        style={{
                            flex: 1, minWidth: '100px', padding: '10px 14px',
                            background: 'rgba(29,161,242,0.18)', border: '1px solid rgba(29,161,242,0.4)',
                            borderRadius: '10px', color: '#1da1f2', fontFamily: 'monospace',
                            fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                            transition: 'all 0.15s ease',
                        }}
                    >
                        Link X
                    </button>
                )}
                <button
                    onClick={onShare}
                    className="profile-btn"
                    style={{
                        flex: 1, minWidth: '100px', padding: '10px 14px',
                        background: 'rgba(251,146,60,0.18)', border: '1px solid rgba(251,146,60,0.4)',
                        borderRadius: '10px', color: '#fdba74', fontFamily: 'monospace',
                        fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                >
                    Share
                </button>
                <button
                    onClick={onRescan}
                    disabled={scanning}
                    className="profile-btn"
                    style={{
                        flex: 1, minWidth: '100px', padding: '10px 14px',
                        background: scanning ? 'rgba(74,222,128,0.1)' : 'rgba(74,222,128,0.18)',
                        border: `1px solid rgba(74,222,128,${scanning ? '0.2' : '0.4'})`,
                        borderRadius: '10px', color: '#4ade80', fontFamily: 'monospace',
                        fontSize: '12px', fontWeight: 700,
                        cursor: scanning ? 'wait' : 'pointer',
                        opacity: scanning ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                    }}
                >
                    {scanning ? 'Scanning...' : 'Rescan'}
                </button>
                {!isOwnProfile && onEndorse && (
                    <button
                        onClick={onEndorse}
                        disabled={endorsing}
                        className="profile-btn"
                        style={{
                            flex: 1, minWidth: '100px', padding: '10px 14px',
                            background: endorsing ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.18)',
                            border: `1px solid rgba(168,85,247,${endorsing ? '0.2' : '0.4'})`,
                            borderRadius: '10px', color: '#a855f7', fontFamily: 'monospace',
                            fontSize: '12px', fontWeight: 700,
                            cursor: endorsing ? 'wait' : 'pointer',
                            opacity: endorsing ? 0.6 : 1,
                            transition: 'all 0.15s ease',
                        }}
                    >
                        {endorsing ? 'Endorsing...' : 'Endorse'}
                    </button>
                )}
            </div>
        </div>
    );
}
