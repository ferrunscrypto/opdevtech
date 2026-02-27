import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { scanAddress } from './scanner.js';
import { getTwitterAuthUrl, handleTwitterCallback, twitterProfiles } from './twitter.js';

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

// ── Health ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// ── Start ─────────────────────────────────────────────────────────────────────

app.listen(config.port, () => {
    console.log(`dev.tech backend listening on http://localhost:${config.port}`);
});
