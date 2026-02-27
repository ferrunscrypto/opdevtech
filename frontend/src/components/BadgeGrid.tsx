import { BADGE_META } from '../abi/DevTechABI';
import { BadgeCard, BadgeStatus } from './BadgeCard';

interface BadgeGridProps {
    earnedIds:    number[];
    eligibleIds:  number[];
    mintingId:    number | null;
    onMint:       (badgeId: number) => void;
    isOwnProfile: boolean;
}

export function BadgeGrid({ earnedIds, eligibleIds, mintingId, onMint, isOwnProfile }: BadgeGridProps) {
    const earned    = BADGE_META.filter(b => earnedIds.includes(b.id));
    const available = isOwnProfile ? BADGE_META.filter(b => !earnedIds.includes(b.id) && eligibleIds.includes(b.id)) : [];
    const locked    = isOwnProfile ? BADGE_META.filter(b => !earnedIds.includes(b.id) && !eligibleIds.includes(b.id)) : [];

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '14px',
    };

    const sectionLabel = (text: string, count: number, color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color, letterSpacing: '0.12em' }}>{text}</span>
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#374151', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>{count}</span>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {earned.length > 0 && (
                <section>
                    {sectionLabel('EARNED', earned.length, '#4ade80')}
                    <div style={gridStyle}>
                        {earned.map(b => (
                            <BadgeCard key={b.id} badge={b} status="earned" />
                        ))}
                    </div>
                </section>
            )}

            {available.length > 0 && (
                <section>
                    {sectionLabel('AVAILABLE', available.length, '#fb923c')}
                    <div style={gridStyle}>
                        {available.map(b => (
                            <BadgeCard
                                key={b.id}
                                badge={b}
                                status="available"
                                onMint={() => onMint(b.id)}
                                minting={mintingId === b.id}
                            />
                        ))}
                    </div>
                </section>
            )}

            {locked.length > 0 && (
                <section>
                    {sectionLabel('LOCKED', locked.length, '#374151')}
                    <div style={gridStyle}>
                        {locked.map(b => (
                            <BadgeCard key={b.id} badge={b} status="locked" />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
