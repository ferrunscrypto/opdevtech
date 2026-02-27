import { BADGE_META } from '../abi/DevTechABI';
import { BadgeCard, BadgeStatus } from './BadgeCard';

interface BadgeGridProps {
    earnedIds:    number[];
    eligibleIds:  number[];
    mintingId:    number | null;
    onMint:       (badgeId: number) => void;
}

export function BadgeGrid({ earnedIds, eligibleIds, mintingId, onMint }: BadgeGridProps) {
    const earned    = BADGE_META.filter(b => earnedIds.includes(b.id));
    const available = BADGE_META.filter(b => !earnedIds.includes(b.id) && eligibleIds.includes(b.id));
    const locked    = BADGE_META.filter(b => !earnedIds.includes(b.id) && !eligibleIds.includes(b.id));

    const gridStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '12px',
    };

    const sectionLabel = (text: string, count: number, color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color, letterSpacing: '0.12em' }}>{text}</span>
            <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#4b5563', background: 'rgba(255,255,255,0.04)', padding: '1px 7px', borderRadius: '4px' }}>{count}</span>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {earned.length > 0 && (
                <section>
                    {sectionLabel('EARNED BADGES', earned.length, '#4ade80')}
                    <div style={gridStyle}>
                        {earned.map(b => (
                            <BadgeCard key={b.id} badge={b} status="earned" />
                        ))}
                    </div>
                </section>
            )}

            {available.length > 0 && (
                <section>
                    {sectionLabel('AVAILABLE TO CLAIM', available.length, '#3b82f6')}
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
                    {sectionLabel('LOCKED', locked.length, '#4b5563')}
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
