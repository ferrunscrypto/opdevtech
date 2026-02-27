import { useWalletConnect, SupportedWallets } from '@btc-vision/walletconnect';
import { BADGE_META } from '../abi/DevTechABI'; // DevTechABI re-exports BADGE_META

export function LandingPage() {
    const { connectToWallet } = useWalletConnect();

    return (
        <main style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 1.5rem' }}>
            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                <div style={{ marginBottom: '1rem', display: 'inline-block', padding: '4px 14px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '20px', fontSize: '11px', color: '#3b82f6', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                    BITCOIN L1 · OPNET · SOULBOUND NFTS
                </div>
                <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 700, fontFamily: 'Courier New, monospace', color: '#e2e8f0', lineHeight: 1.15, margin: '0.75rem 0' }}>
                    Your Bitcoin Identity
                    <br />
                    <span style={{ color: '#3b82f6', textShadow: '0 0 30px rgba(59,130,246,0.4)' }}>On-Chain</span>
                </h1>
                <p style={{ maxWidth: '560px', margin: '1rem auto', color: '#9ca3af', fontFamily: 'Courier New, monospace', fontSize: '14px', lineHeight: 1.7 }}>
                    Earn soulbound achievement badges from your real on-chain activity. Deployments, swaps,
                    gas spent, OG status — everything verifiable, nothing faked.
                </p>
                <button
                    onClick={() => connectToWallet(SupportedWallets.OP_WALLET)}
                    style={{
                        marginTop: '2rem', padding: '14px 36px',
                        background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                        border: '1px solid #3b82f6', borderRadius: '10px',
                        color: '#fff', fontFamily: 'Courier New, monospace',
                        fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                        letterSpacing: '0.1em', boxShadow: '0 0 30px rgba(59,130,246,0.3)',
                    }}
                >
                    Connect OP_WALLET
                </button>
            </div>

            {/* Badge preview grid */}
            <div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b7280', letterSpacing: '0.12em' }}>
                        15 ACHIEVEMENT BADGES · FULLY ON-CHAIN SVG
                    </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                    {BADGE_META.map(b => (
                        <div key={b.id} style={{
                            background: '#0f1117',
                            border: `1px solid ${b.color}25`,
                            borderRadius: '12px',
                            padding: '16px 10px',
                            textAlign: 'center',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                        }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLDivElement).style.borderColor = `${b.color}60`;
                                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 16px ${b.color}20`;
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLDivElement).style.borderColor = `${b.color}25`;
                                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                            }}
                        >
                            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: `${b.color}15`, border: `1px solid ${b.color}30`, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img
                                    src={`/badges/badge_${String(b.id).padStart(2, '0')}.svg`}
                                    alt={b.name}
                                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                />
                            </div>
                            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#9ca3af', fontWeight: 700, lineHeight: 1.3 }}>
                                {b.name}
                            </div>
                            <div style={{ fontSize: '9px', fontFamily: 'monospace', color: b.color, marginTop: '4px' }}>
                                +{b.score}pts
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Features */}
            <div style={{ marginTop: '4rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {[
                    { title: 'Soulbound NFTs',       desc: 'Badges are non-transferable. Your achievements cannot be bought or sold.',      color: '#3b82f6' },
                    { title: 'Fully On-Chain SVG',    desc: 'Badge images are generated by the contract itself. Zero external hosting.',     color: '#4ade80' },
                    { title: 'Real Activity',         desc: 'Score is derived from actual deployments, swaps, and gas — not speculation.',  color: '#eab308' },
                    { title: 'Extensible Registry',   desc: 'New badges can be added by the deployer without redeploying the contract.',    color: '#a855f7' },
                ].map(f => (
                    <div key={f.title} style={{ background: '#0f1117', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px', color: f.color, marginBottom: '8px' }}>{f.title}</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b7280', lineHeight: 1.6 }}>{f.desc}</div>
                    </div>
                ))}
            </div>
        </main>
    );
}
