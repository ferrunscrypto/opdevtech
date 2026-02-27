import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useWalletConnect } from '@btc-vision/walletconnect';
import { useProvider } from '../hooks/useProvider';
import { useDevTech, ProfileData, ScanResult } from '../hooks/useDevTech';
import { ProfileCard } from '../components/ProfileCard';
import { BadgeGrid } from '../components/BadgeGrid';
import { BADGE_META } from '../abi/DevTechABI';
import { BACKEND_URL } from '../config/contracts';

export function DashboardPage() {
    const { address: paramAddress } = useParams<{ address?: string }>();
    const { walletAddress, network, address: walletAddressObj } = useWalletConnect();
    const viewAddress = paramAddress ?? walletAddress ?? '';

    const provider = useProvider(network);
    const { loading, error, loadScan, loadProfile, loadMintedBadges, claimBadge, setProfile, endorse } = useDevTech(provider, network, walletAddressObj ?? null, walletAddress ?? null);

    const [scan,        setScan]        = useState<ScanResult | null>(null);
    const [profile,     setProfileData] = useState<ProfileData | null>(null);
    const [earnedIds,   setEarnedIds]   = useState<number[]>([]);
    const [mintingId,   setMintingId]   = useState<number | null>(null);
    const [txMsg,       setTxMsg]       = useState<string | null>(null);
    const [errMsg,      setErrMsg]      = useState<string | null>(null);
    const [twitterHandle, setTwitterHandle] = useState<string | null>(null);
    const [twitterPfp,    setTwitterPfp]    = useState<string | null>(null);
    const [displayName,   setDisplayName]   = useState<string | null>(null);
    const [editingName,   setEditingName]   = useState(false);
    const [nameInput,     setNameInput]     = useState('');
    const [refreshTick,   setRefreshTick]   = useState(0);
    const [scanning,      setScanning]      = useState(false);
    const [endorsing,     setEndorsing]     = useState(false);

    // Load everything when address changes
    useEffect(() => {
        if (!viewAddress) return;

        async function load() {
            setScanning(true);
            try {
                const [scanData, profileData, mintedBadges] = await Promise.all([
                    loadScan(viewAddress),
                    loadProfile(viewAddress),
                    loadMintedBadges(viewAddress),
                ]);
                setScan(scanData);
                setProfileData(profileData);
                setEarnedIds(mintedBadges);

                // Update leaderboard — only addresses with minted badges appear
                if (scanData && mintedBadges.length > 0) {
                    fetch(`${BACKEND_URL}/api/leaderboard`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ scan: scanData, badgeCount: mintedBadges.length }),
                    }).catch(() => {});
                }
            } finally {
                setScanning(false);
            }
        }
        void load();
    }, [viewAddress, provider, refreshTick]);

    // Listen for postMessage from Twitter OAuth popup
    useEffect(() => {
        function onMessage(e: MessageEvent) {
            if (e.data?.type !== 'twitter_oauth') return;

            if (e.data.error) {
                setErrMsg(`Twitter error: ${e.data.error}`);
                return;
            }

            const { handle, pfpUrl, address } = e.data as { handle: string; pfpUrl: string; address: string };
            if (handle && address) {
                localStorage.setItem('devtech_twitter_profile', JSON.stringify({ handle, pfpUrl, address }));
                setTwitterHandle(handle);
                setTwitterPfp(pfpUrl ?? '');
                setDisplayName(handle);
                setTxMsg(`Twitter linked: @${handle}`);
            }
        }

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, []);

    // Load Twitter profile from localStorage or backend when address is known
    useEffect(() => {
        if (!viewAddress) return;

        // Check saved display name
        const savedName = localStorage.getItem(`devtech_name_${viewAddress}`);
        if (savedName) setDisplayName(savedName);

        // If already set from URL params, skip
        if (twitterHandle) return;

        // Check localStorage
        const stored = localStorage.getItem('devtech_twitter_profile');
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as { handle: string; pfpUrl: string; address: string };
                if (parsed.address === viewAddress) {
                    setTwitterHandle(parsed.handle);
                    setTwitterPfp(parsed.pfpUrl);
                    if (!savedName) setDisplayName(parsed.handle);
                    return;
                }
            } catch { /* ignore */ }
        }

        // Check backend
        fetch(`${BACKEND_URL}/api/twitter/profile/${viewAddress}`)
            .then(r => r.ok ? r.json() : null)
            .then((d: { handle: string; pfpUrl: string } | null) => {
                if (d) {
                    setTwitterHandle(d.handle);
                    setTwitterPfp(d.pfpUrl);
                    if (!savedName) setDisplayName(d.handle);
                }
            })
            .catch(() => null);
    }, [viewAddress, twitterHandle]);

    const handleLinkTwitter = useCallback(() => {
        const url = `${BACKEND_URL}/api/twitter/auth?address=${encodeURIComponent(viewAddress)}`;
        const w = 500, h = 650;
        const left = window.screenX + (window.outerWidth - w) / 2;
        const top = window.screenY + (window.outerHeight - h) / 2;
        window.open(url, 'twitter_oauth', `width=${w},height=${h},left=${left},top=${top}`);
    }, [viewAddress]);

    const handleEditName = useCallback(() => {
        if (editingName) {
            // Save
            const trimmed = nameInput.trim();
            if (trimmed) {
                setDisplayName(trimmed);
                localStorage.setItem(`devtech_name_${viewAddress}`, trimmed);
            }
            setEditingName(false);
        } else {
            setNameInput(displayName ?? '');
            setEditingName(true);
        }
    }, [editingName, nameInput, displayName, viewAddress]);

    const handleShare = useCallback(() => {
        const score = (profile ? Number(profile.score) : 0) + (scan?.score ?? 0);
        const count = earnedIds.length;
        const tweet = `I scored ${score.toLocaleString()} pts on opdev.tech!\n\n`
            + `Badges collected: ${count}/15\n\n`
            + `Verify on-chain: https://opdev-tech.pages.dev/profile/${viewAddress}\n\n`
            + `#Bitcoin #OPNet #opdevtech`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`, '_blank');
    }, [profile, scan, earnedIds, viewAddress]);

    const handleMint = useCallback(async (badgeId: number) => {
        if (!walletAddress) {
            setErrMsg('Connect your wallet first to mint badges.');
            return;
        }
        if (walletAddress !== viewAddress) {
            setErrMsg('Connect the wallet that owns this profile to mint badges.');
            return;
        }
        setMintingId(badgeId);
        setTxMsg(null);
        setErrMsg(null);
        try {
            const txId = await claimBadge(badgeId);
            if (txId) {
                const badgeName = BADGE_META.find(b => b.id === badgeId)?.name ?? `Badge #${badgeId}`;
                setTxMsg(`"${badgeName}" minted! TX: ${txId.slice(0, 16)}...`);
                setTimeout(() => setRefreshTick(t => t + 1), 4000);
            }
            // error is displayed via the hook's error state
        } catch (e) {
            setErrMsg(`Mint error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setMintingId(null);
        }
    }, [walletAddress, viewAddress, claimBadge]);

    const handleEndorse = useCallback(async () => {
        if (!walletAddress || walletAddress === viewAddress) return;
        setEndorsing(true);
        setTxMsg(null);
        try {
            const txId = await endorse(viewAddress);
            if (txId) {
                setTxMsg(`Endorsed! TX: ${txId.slice(0, 16)}...`);
                setTimeout(() => setRefreshTick(t => t + 1), 4000);
            }
        } finally {
            setEndorsing(false);
        }
    }, [walletAddress, viewAddress, endorse]);

    const isOwnProfile = walletAddress === viewAddress;

    // Merge backend eligibility with on-chain endorsement check (badge 12)
    const eligibleIds = (() => {
        const ids = [...(scan?.eligibleBadges ?? [])];
        const endorseCount = profile ? Number(profile.endorseCount) : 0;
        if (endorseCount >= 3 && !ids.includes(12)) ids.push(12);
        return ids;
    })();

    if (!viewAddress) {
        return (
            <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', padding: '0 1.5rem' }}>
                <div style={{ fontFamily: 'monospace', color: '#6b7280' }}>Connect wallet to view your profile.</div>
            </div>
        );
    }

    return (
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
            {/* Status messages */}
            {txMsg && (
                <div style={{ marginBottom: '1rem', padding: '10px 16px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', color: '#4ade80' }}>
                    {txMsg}
                </div>
            )}
            {errMsg && (
                <div style={{ marginBottom: '1rem', padding: '10px 16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', color: '#f87171', cursor: 'pointer' }} onClick={() => setErrMsg(null)}>
                    {errMsg}
                </div>
            )}
            {error && (
                <div style={{ marginBottom: '1rem', padding: '10px 16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', color: '#f87171' }}>
                    Error: {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 340px) 1fr', gap: '28px', alignItems: 'start' }}>
                {/* Left: Profile card */}
                <div>
                    <ProfileCard
                        address={viewAddress}
                        profile={profile}
                        scan={scan}
                        twitterHandle={twitterHandle}
                        twitterPfp={twitterPfp}
                        displayName={displayName}
                        editingName={editingName}
                        nameInput={nameInput}
                        onNameInputChange={setNameInput}
                        onEditName={handleEditName}
                        onLinkTwitter={handleLinkTwitter}
                        onShare={handleShare}
                        onRescan={() => setRefreshTick(t => t + 1)}
                        scanning={scanning}
                        isOwnProfile={isOwnProfile}
                        onEndorse={handleEndorse}
                        endorsing={endorsing}
                    />

                    {/* Loading indicator */}
                    {loading && (
                        <div style={{ marginTop: '12px', textAlign: 'center', fontFamily: 'monospace', fontSize: '11px', color: '#3b82f6', opacity: 0.7 }}>
                            scanning chain...
                        </div>
                    )}
                </div>

                {/* Right: Badges */}
                <div>
                    <BadgeGrid
                        earnedIds={earnedIds}
                        eligibleIds={eligibleIds}
                        mintingId={mintingId}
                        onMint={handleMint}
                    />
                </div>
            </div>
        </main>
    );
}
