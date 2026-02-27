import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useProvider } from '../hooks/useProvider';
import { useDevTech, ProfileData, ScanResult } from '../hooks/useDevTech';
import { ProfileCard } from '../components/ProfileCard';
import { BadgeGrid } from '../components/BadgeGrid';
import { BADGE_META } from '../abi/DevTechABI';

export function DashboardPage() {
    const { address: paramAddress } = useParams<{ address?: string }>();
    const { walletAddress, network, address: walletAddressObj } = useWallet();
    const viewAddress = paramAddress ?? walletAddress ?? '';

    const provider = useProvider(network);
    const { loading, error, loadScan, loadProfile, loadMintedBadges, claimBadge, setProfile, endorse } = useDevTech(provider, network, walletAddressObj ?? null, walletAddress ?? null);

    const [scan,        setScan]        = useState<ScanResult | null>(null);
    const [profile,     setProfileData] = useState<ProfileData | null>(null);
    const [earnedIds,   setEarnedIds]   = useState<number[]>([]);
    const [mintingId,   setMintingId]   = useState<number | null>(null);
    const [txMsg,       setTxMsg]       = useState<string | null>(null);
    const [errMsg,      setErrMsg]      = useState<string | null>(null);
    const [twitterHandle,     setTwitterHandle]     = useState<string | null>(null);
    const [twitterPfp,        setTwitterPfp]        = useState<string | null>(null);
    const [followsOpnet,      setFollowsOpnet]      = useState(false);
    const [followsCatpound,   setFollowsCatpound]   = useState(false);
    const [displayName,   setDisplayName]   = useState<string | null>(null);
    const [editingName,   setEditingName]   = useState(false);
    const [nameInput,     setNameInput]     = useState('');
    const [refreshTick,   setRefreshTick]   = useState(0);
    const [scanning,      setScanning]      = useState(false);
    const [endorsing,     setEndorsing]     = useState(false);
    const [recheckingFollow, setRecheckingFollow] = useState(false);
    // Track which address we've loaded Twitter data for, to avoid redundant fetches
    const twitterLoadedForRef = useRef<string>('');


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

                // Always update leaderboard — backend removes entry when badgeCount=0,
                // which handles contract redeployments and clears stale entries.
                // Use on-chain badge score (not activity score) as the leaderboard rank.
                if (scanData) {
                    const badgeScore = profileData ? Number(profileData.score) : 0;
                    fetch('/api/leaderboard', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            scan: { ...scanData, score: badgeScore },
                            badgeCount: mintedBadges.length,
                        }),
                    }).catch(() => {});
                }
            } finally {
                setScanning(false);
            }
        }
        void load();
    }, [viewAddress, provider, refreshTick]);

    const handleOAuthResult = useCallback((data: Record<string, unknown>) => {
        if (data.type !== 'twitter_oauth') return;
        if (data.error) {
            setErrMsg(`Twitter error: ${data.error}`);
            return;
        }
        const handle = data.handle as string | undefined;
        const pfpUrl = data.pfpUrl as string | undefined;
        const address = data.address as string | undefined;
        if (handle && address) {
            const fo = data.followsOpnet === true || data.followsOpnet === 'true';
            const fc = data.followsCatpound === true || data.followsCatpound === 'true';
            localStorage.setItem('devtech_twitter_profile', JSON.stringify({ handle, pfpUrl: pfpUrl ?? '', address, followsOpnet: fo, followsCatpound: fc }));
            setTwitterHandle(handle);
            setTwitterPfp(pfpUrl ?? '');
            setDisplayName(handle);
            setFollowsOpnet(fo);
            setFollowsCatpound(fc);
            if (data.followsError) {
                setTxMsg(`Twitter linked: @${handle} (following check error: ${data.followsError})`);
            } else {
                setTxMsg(`Twitter linked: @${handle}${fo || fc ? ' — follow badges unlocked!' : ''}`);
            }
        }
    }, []);

    // Listen for OAuth result: popup postMessage + localStorage storage event + mount check
    useEffect(() => {
        // Check on mount (covers any pending result from a previous redirect)
        const raw = localStorage.getItem('twitter_oauth_pending');
        if (raw) {
            localStorage.removeItem('twitter_oauth_pending');
            try { handleOAuthResult(JSON.parse(raw)); } catch { /* ignore */ }
        }

        function onMessage(e: MessageEvent) {
            if (e.data?.type === 'twitter_oauth') handleOAuthResult(e.data);
        }
        function onStorage(e: StorageEvent) {
            if (e.key !== 'twitter_oauth_pending' || !e.newValue) return;
            localStorage.removeItem('twitter_oauth_pending');
            try { handleOAuthResult(JSON.parse(e.newValue)); } catch { /* ignore */ }
        }
        window.addEventListener('message', onMessage);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener('message', onMessage);
            window.removeEventListener('storage', onStorage);
        };
    }, [handleOAuthResult]);

    // Reset Twitter state whenever the viewed address changes
    useEffect(() => {
        if (!viewAddress) return;
        if (twitterLoadedForRef.current === viewAddress) return;

        // Clear stale state from previous wallet
        twitterLoadedForRef.current = viewAddress;
        setTwitterHandle(null);
        setTwitterPfp(null);
        setFollowsOpnet(false);
        setFollowsCatpound(false);
        setDisplayName(null);

        // Check saved display name for this address
        const savedName = localStorage.getItem(`devtech_name_${viewAddress}`);
        if (savedName) setDisplayName(savedName);

        // Check localStorage (keyed by address)
        const stored = localStorage.getItem('devtech_twitter_profile');
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as { handle: string; pfpUrl: string; address: string; followsOpnet?: boolean; followsCatpound?: boolean };
                if (parsed.address === viewAddress) {
                    setTwitterHandle(parsed.handle);
                    setTwitterPfp(parsed.pfpUrl);
                    if (!savedName) setDisplayName(parsed.handle);
                    setFollowsOpnet(parsed.followsOpnet ?? false);
                    setFollowsCatpound(parsed.followsCatpound ?? false);
                    return;
                }
            } catch { /* ignore */ }
        }

        // Fall back to backend KV
        fetch(`/api/twitter/profile/${viewAddress}`)
            .then(r => r.ok ? r.json() : null)
            .then((d: { handle: string; pfpUrl: string; followsOpnet?: boolean; followsCatpound?: boolean } | null) => {
                if (d) {
                    setTwitterHandle(d.handle);
                    setTwitterPfp(d.pfpUrl);
                    if (!savedName) setDisplayName(d.handle);
                    setFollowsOpnet(d.followsOpnet ?? false);
                    setFollowsCatpound(d.followsCatpound ?? false);
                }
            })
            .catch(() => null);
    }, [viewAddress]);

    const handleLinkTwitter = useCallback(() => {
        const returnUrl = window.location.pathname + window.location.search;
        const url = `/api/twitter/auth?address=${encodeURIComponent(viewAddress)}&returnUrl=${encodeURIComponent(returnUrl)}`;
        const w = 500, h = 680;
        const left = window.screenX + (window.outerWidth - w) / 2;
        const top  = window.screenY + (window.outerHeight - h) / 2;
        window.open(url, 'twitter_oauth', `width=${w},height=${h},left=${left},top=${top},noopener=no`);
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
            + `Verify @opnetbtc on-chain activity: https://opdev-tech.pages.dev/profile/${viewAddress}\n\n`
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
                setTxMsg(`"${badgeName}" confirming... TX: ${txId.slice(0, 16)}...`);

                // Poll for on-chain confirmation (up to 3 minutes)
                let confirmed = false;
                const deadline = Date.now() + 180_000;
                while (!confirmed && Date.now() < deadline) {
                    await new Promise(r => setTimeout(r, 6_000));
                    try {
                        const receipt = await provider.getTransactionReceipt(txId);
                        if (receipt) confirmed = true;
                    } catch { /* keep polling */ }
                }

                setTxMsg(`"${badgeName}" minted! TX: ${txId.slice(0, 16)}...`);
                setRefreshTick(t => t + 1);
            }
        } catch (e) {
            setErrMsg(`Mint error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setMintingId(null);
        }
    }, [walletAddress, viewAddress, claimBadge, provider]);

    const handleRecheckFollowing = useCallback(async () => {
        if (!viewAddress || recheckingFollow) return;
        setRecheckingFollow(true);
        setTxMsg(null);
        setErrMsg(null);
        try {
            const res = await fetch(`/api/twitter/recheck/${encodeURIComponent(viewAddress)}`);
            const data = await res.json() as { followsOpnet?: boolean; followsCatpound?: boolean; followsError?: string; error?: string };
            if (data.error) {
                setErrMsg(data.error);
                return;
            }
            const fo = data.followsOpnet ?? false;
            const fc = data.followsCatpound ?? false;
            setFollowsOpnet(fo);
            setFollowsCatpound(fc);
            // Update localStorage
            const stored = localStorage.getItem('devtech_twitter_profile');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    localStorage.setItem('devtech_twitter_profile', JSON.stringify({ ...parsed, followsOpnet: fo, followsCatpound: fc }));
                } catch { /* ignore */ }
            }
            if (data.followsError) {
                setErrMsg(`Following check error: ${data.followsError}`);
            } else {
                setTxMsg(`Following status refreshed${fo || fc ? ' — follow badges unlocked!' : ' — no follow badges found'}`);
            }
        } catch {
            setErrMsg('Failed to recheck following status');
        } finally {
            setRecheckingFollow(false);
        }
    }, [viewAddress, recheckingFollow]);

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

    // Merge all eligibility sources
    const eligibleIds = (() => {
        const ids = [...(scan?.eligibleBadges ?? [])];
        const endorseCount = profile ? Number(profile.endorseCount) : 0;
        if (endorseCount >= 3 && !ids.includes(12)) ids.push(12);
        // Badges 16 & 17: eligible whenever X is linked.
        // Twitter API /following requires paid tier so server-side check isn't reliable;
        // the contract doesn't verify following on-chain.
        if (twitterHandle && !ids.includes(16)) ids.push(16);
        if (twitterHandle && !ids.includes(17)) ids.push(17);
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
                <div style={{ marginBottom: '1rem', padding: '10px 16px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', color: '#4ade80' }}>
                    {txMsg}
                </div>
            )}
            {errMsg && (
                <div style={{ marginBottom: '1rem', padding: '10px 16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', color: '#f87171', cursor: 'pointer' }} onClick={() => setErrMsg(null)}>
                    {errMsg}
                </div>
            )}
            {error && (
                <div style={{ marginBottom: '1rem', padding: '10px 16px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '8px', fontFamily: 'monospace', fontSize: '13px', color: '#f87171' }}>
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
                        onRecheckFollowing={twitterHandle ? handleRecheckFollowing : undefined}
                        recheckingFollow={recheckingFollow}
                    />

                    {/* Loading indicator */}
                    {loading && (
                        <div style={{ marginTop: '12px', textAlign: 'center', fontFamily: 'monospace', fontSize: '12px', color: '#fb923c', opacity: 0.7 }}>
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
                        isOwnProfile={isOwnProfile}
                    />
                </div>
            </div>
        </main>
    );
}
