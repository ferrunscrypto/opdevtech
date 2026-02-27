import express from 'express';
import cors from 'cors';
import { config, DEVTECH_ADDRESS } from './config.js';
import { scanAddress } from './scanner.js';
import { getTwitterAuthUrl, handleTwitterCallback, twitterProfiles } from './twitter.js';
import { updateLeaderboard, getLeaderboard } from './leaderboard.js';
import { getContract, JSONRpcProvider, ABIDataTypes, BitcoinAbiTypes } from 'opnet';
import { networks } from '@btc-vision/bitcoin';

const app = express();

app.use(express.json());
app.use(cors({
    origin: [config.frontendUrl, config.frontendUrlProd],
    credentials: true,
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns an HTML page that postMessages the result to window.opener and closes */
function popupHtml(data: { handle?: string; pfpUrl?: string; address?: string; error?: string }, frontendOrigin: string): string {
    return `<!DOCTYPE html><html><body><script>
if (window.opener) {
    window.opener.postMessage(${JSON.stringify({ type: 'twitter_oauth', ...data })}, "${frontendOrigin}");
}
window.close();
</script><p>Closing...</p></body></html>`;
}

// ── Chain scan ────────────────────────────────────────────────────────────────

app.get('/api/scan/:address', async (req, res) => {
    const { address } = req.params;
    if (!address || address.length < 10) {
        res.status(400).json({ error: 'Invalid address' });
        return;
    }
    try {
        const result = await scanAddress(address);
        // Don't auto-add to leaderboard here — frontend will POST with badgeCount
        res.json(result);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

// ── Twitter OAuth ─────────────────────────────────────────────────────────────

app.get('/api/twitter/auth', (req, res) => {
    const { address } = req.query as { address?: string };
    if (!address) {
        res.status(400).json({ error: 'address query param required' });
        return;
    }

    if (!config.twitterClientId) {
        res.status(500).json({ error: 'Twitter OAuth not configured (TWITTER_CLIENT_ID missing)' });
        return;
    }

    const authUrl = getTwitterAuthUrl(address);
    res.redirect(authUrl);
});

app.get('/api/twitter/callback', async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;

    const frontendUrl = config.frontendUrl;

    if (error) {
        res.send(popupHtml({ error }, frontendUrl));
        return;
    }

    if (!code || !state) {
        res.send(popupHtml({ error: 'Missing code or state' }, frontendUrl));
        return;
    }

    try {
        const profile = await handleTwitterCallback(code, state);
        res.send(popupHtml({ handle: profile.handle, pfpUrl: profile.pfpUrl, address: profile.address }, frontendUrl));
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.send(popupHtml({ error: msg }, frontendUrl));
    }
});

app.get('/api/twitter/profile/:address', (req, res) => {
    const profile = twitterProfiles.get(req.params.address);
    if (!profile) {
        res.status(404).json({ error: 'No Twitter profile for this address' });
        return;
    }
    res.json(profile);
});

// ── Leaderboard ──────────────────────────────────────────────────────────────

app.get('/api/leaderboard', (_req, res) => {
    const lb = getLeaderboard().map(entry => {
        const tw = twitterProfiles.get(entry.address);
        return {
            ...entry,
            twitterHandle: tw?.handle ?? null,
            twitterPfp:    tw?.pfpUrl ?? null,
        };
    });
    res.json(lb);
});

/** Frontend POSTs scan + badgeCount after reading minted badges from chain.
 *  Only addresses with badgeCount >= 1 appear on the leaderboard. */
app.post('/api/leaderboard', (req, res) => {
    const { scan, badgeCount } = req.body as { scan: Record<string, unknown>; badgeCount: number };
    if (!scan || typeof scan.address !== 'string') {
        res.status(400).json({ error: 'Missing scan data' });
        return;
    }
    updateLeaderboard(scan as unknown as import('./scanner.js').ScanResult, badgeCount ?? 0);
    res.json({ ok: true });
});

// ── NFT metadata (for OP_WALLET to resolve badge images) ─────────────────

const BADGE_NAMES: Record<number, string> = {
    1: 'First Deploy', 2: 'Smart Architect', 3: 'Contract Factory',
    4: 'First Swap', 5: 'Active Trader', 6: 'Swap Veteran',
    7: 'Gas Burner', 8: 'Inferno', 9: 'OPNet OG', 10: 'Early Adopter',
    11: 'Linked', 12: 'Vouched', 13: 'Battle Hardened', 14: 'Diamond Hands',
    15: 'OPNet Legend',
};
const BADGE_TRACKS: Record<number, string> = {
    1: 'Builder', 2: 'Builder', 3: 'Builder', 4: 'Trader', 5: 'Trader',
    6: 'Trader', 7: 'Gas', 8: 'Gas', 9: 'OG', 10: 'OG',
    11: 'Social', 12: 'Social', 13: 'Resilience', 14: 'Resilience', 15: 'Master',
};
const BADGE_SCORES: Record<number, number> = {
    1: 100, 2: 250, 3: 500, 4: 50, 5: 150, 6: 400, 7: 75, 8: 200,
    9: 300, 10: 150, 11: 25, 12: 100, 13: 50, 14: 200, 15: 1000,
};

const nftAbi = [
    {
        name: '_getBadgeType',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'badgeId', type: ABIDataTypes.UINT256 }],
    },
];

let nftProvider: JSONRpcProvider | null = null;
function getNftProvider(): JSONRpcProvider {
    if (!nftProvider) {
        nftProvider = new JSONRpcProvider({ url: config.opnetRpcUrl, network: networks.opnetTestnet });
    }
    return nftProvider;
}

/** Serves NFT metadata JSON for OP_WALLET.
 *  URL: /api/nft/:tokenId  — wallet fetches baseURI + tokenId */
app.get('/api/nft/:tokenId', async (req, res) => {
    const tokenId = req.params.tokenId;
    try {
        const provider = getNftProvider();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contract = getContract<any>(DEVTECH_ADDRESS, nftAbi as any, provider, networks.opnetTestnet);
        const result = await contract._getBadgeType(BigInt(tokenId));
        const badgeId = Number(result?.properties?.['badgeId'] ?? 0);

        if (badgeId < 1 || badgeId > 15) {
            res.status(404).json({ error: 'Unknown badge type' });
            return;
        }

        const name = BADGE_NAMES[badgeId] ?? 'Badge';
        const track = BADGE_TRACKS[badgeId] ?? 'Unknown';
        const score = BADGE_SCORES[badgeId] ?? 0;

        // Return standard NFT metadata
        res.json({
            name,
            description: `dev.tech soulbound achievement badge on Bitcoin via OPNet. Track: ${track}`,
            image: `${config.frontendUrlProd}/badges/badge_${String(badgeId).padStart(2, '0')}.svg`,
            attributes: [
                { trait_type: 'Badge ID', value: badgeId },
                { trait_type: 'Track', value: track },
                { trait_type: 'Score', value: score },
            ],
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: msg });
    }
});

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
    console.log(`dev.tech backend listening on http://localhost:${config.port}`);
});
