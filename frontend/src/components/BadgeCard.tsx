import { BadgeMeta } from '../abi/DevTechABI';

export type BadgeStatus = 'earned' | 'available' | 'locked';

interface BadgeCardProps {
    badge: BadgeMeta;
    status: BadgeStatus;
    onMint?: () => void;
    minting?: boolean;
}

const BADGE_IMG: Record<number, string> = {};
for (let i = 1; i <= 17; i++) {
    BADGE_IMG[i] = `/badges/badge_${String(i).padStart(2, '0')}.svg`;
}

export function BadgeCard({ badge, status, onMint, minting }: BadgeCardProps) {
    const isLocked = status === 'locked';
    const isEarned = status === 'earned';
    const isAvailable = status === 'available';

    const borderColor = isEarned
        ? badge.color + '45'
        : isAvailable
            ? badge.color + '30'
            : 'rgba(99, 130, 200, 0.1)';

    return (
        <div style={{
            background: '#141827',
            border: `1px solid ${borderColor}`,
            borderRadius: '14px',
            padding: '18px 14px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            boxShadow: isEarned
                ? `0 0 24px ${badge.color}15`
                : 'none',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Top accent line for earned */}
            {isEarned && (
                <div style={{
                    position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px',
                    background: `linear-gradient(90deg, transparent, ${badge.color}50, transparent)`,
                }} />
            )}

            {/* Badge image */}
            <div style={{
                width: '110px', height: '110px', borderRadius: '50%', overflow: 'hidden',
                border: `2px solid ${isLocked ? 'rgba(99,130,200,0.08)' : badge.color + '30'}`,
                flexShrink: 0,
                filter: isLocked ? 'saturate(0.15) brightness(0.45)' : 'none',
                position: 'relative',
            }}>
                <img
                    src={BADGE_IMG[badge.id] ?? ''}
                    alt={badge.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                />
                <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: `radial-gradient(circle, ${badge.color}10 0%, transparent 70%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: -1,
                }}>
                    <span style={{ color: badge.color, fontFamily: 'monospace', fontWeight: 700, fontSize: '14px', opacity: 0.4 }}>
                        {badge.id}
                    </span>
                </div>
            </div>

            {/* Track tag */}
            <span style={{
                fontSize: '9px', padding: '2px 10px',
                background: isLocked ? 'rgba(99,130,200,0.04)' : `${badge.color}0c`,
                border: `1px solid ${isLocked ? 'rgba(99,130,200,0.08)' : badge.color + '25'}`,
                borderRadius: '10px',
                color: isLocked ? '#64748b' : badge.color,
                fontFamily: 'monospace', letterSpacing: '0.1em', fontWeight: 600,
            }}>
                {badge.track.toUpperCase()}
            </span>

            {/* Name */}
            <div style={{
                fontFamily: 'monospace', fontSize: '13px', fontWeight: 700,
                color: isLocked ? '#94a3b8' : '#e2e8f0',
                textAlign: 'center', lineHeight: 1.3,
            }}>
                {badge.name}
            </div>

            {/* Requirement */}
            <div style={{
                fontSize: '10px', color: isLocked ? '#64748b' : '#94a3b8',
                textAlign: 'center', fontFamily: 'monospace', lineHeight: 1.4, minHeight: '28px',
            }}>
                {badge.link ? (
                    <a href={badge.link} target="_blank" rel="noopener noreferrer" style={{
                        color: isLocked ? '#64748b' : badge.color,
                        textDecoration: 'underline',
                        textDecorationColor: isLocked ? '#374151' : badge.color + '60',
                    }}>
                        {badge.requirement}
                    </a>
                ) : badge.requirement}
            </div>

            {/* Score */}
            <div style={{
                fontSize: '13px', fontWeight: 700, fontFamily: 'monospace',
                color: isLocked ? '#475569' : badge.color,
            }}>
                +{badge.score} pts
            </div>

            {/* Status */}
            {isEarned && (
                <div style={{
                    padding: '5px 14px', background: `${badge.color}12`,
                    border: `1px solid ${badge.color}25`, borderRadius: '10px',
                    fontSize: '9px', color: badge.color, fontFamily: 'monospace',
                    fontWeight: 700, letterSpacing: '0.1em',
                }}>
                    EARNED
                </div>
            )}
            {isAvailable && (
                <button
                    onClick={onMint}
                    disabled={minting}
                    className="mint-btn"
                    style={{
                        width: '100%', padding: '9px', borderRadius: '10px',
                        background: minting ? 'rgba(255,255,255,0.03)' : `${badge.color}28`,
                        border: `1px solid ${minting ? badge.color + '15' : badge.color + '50'}`,
                        color: minting ? '#64748b' : badge.color,
                        fontFamily: 'monospace', fontSize: '12px', fontWeight: 700,
                        cursor: minting ? 'not-allowed' : 'pointer', letterSpacing: '0.06em',
                        opacity: minting ? 0.6 : 1,
                        transition: 'all 0.15s ease',
                    }}
                >
                    {minting ? 'MINTING...' : 'MINT BADGE'}
                </button>
            )}
            {isLocked && (
                <div style={{
                    padding: '4px 12px',
                    background: 'rgba(99,130,200,0.04)',
                    border: '1px solid rgba(99,130,200,0.06)',
                    borderRadius: '10px',
                    fontSize: '9px', color: '#475569', fontFamily: 'monospace',
                    letterSpacing: '0.1em', fontWeight: 600,
                }}>
                    LOCKED
                </div>
            )}
        </div>
    );
}
