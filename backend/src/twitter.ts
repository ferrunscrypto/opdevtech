import crypto from 'crypto';
import { config } from './config.js';

// In-memory state: state → { codeVerifier, address }
const pendingState = new Map<string, { codeVerifier: string; address: string }>();

// Cached tokens: address → { handle, pfpUrl }
export const twitterProfiles = new Map<string, { handle: string; pfpUrl: string }>();

function base64UrlEncode(buf: Buffer): string {
    return buf.toString('base64url');
}

function generateCodeVerifier(): string {
    return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return base64UrlEncode(hash);
}

export function getTwitterAuthUrl(address: string): string {
    const state = base64UrlEncode(crypto.randomBytes(16));
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    pendingState.set(state, { codeVerifier, address });

    // Clean up old entries after 10 minutes
    setTimeout(() => pendingState.delete(state), 10 * 60 * 1000);

    const params = new URLSearchParams({
        response_type:         'code',
        client_id:             config.twitterClientId,
        redirect_uri:          config.twitterCallbackUrl,
        scope:                 'tweet.read users.read offline.access',
        state,
        code_challenge:        codeChallenge,
        code_challenge_method: 'S256',
    });

    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
}

export async function handleTwitterCallback(
    code: string,
    state: string,
): Promise<{ handle: string; pfpUrl: string; address: string }> {
    const pending = pendingState.get(state);
    if (!pending) throw new Error('Invalid or expired OAuth state');

    pendingState.delete(state);

    // Exchange code for token — Twitter requires Basic auth header
    const credentials = config.twitterClientSecret
        ? `${config.twitterClientId}:${config.twitterClientSecret}`
        : `${config.twitterClientId}:`;
    const basicAuth = Buffer.from(credentials).toString('base64');
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
            code,
            grant_type:    'authorization_code',
            client_id:     config.twitterClientId,
            redirect_uri:  config.twitterCallbackUrl,
            code_verifier: pending.codeVerifier,
        }).toString(),
    });

    if (!tokenRes.ok) {
        const txt = await tokenRes.text();
        throw new Error(`Twitter token exchange failed: ${txt}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string };
    const accessToken = tokenData.access_token;

    // Fetch user info
    const userRes = await fetch(
        'https://api.twitter.com/2/users/me?user.fields=profile_image_url,username',
        { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!userRes.ok) {
        const txt = await userRes.text();
        throw new Error(`Twitter user fetch failed: ${txt}`);
    }

    const userData = await userRes.json() as {
        data: { username: string; profile_image_url?: string }
    };

    const handle = userData.data.username;
    const pfpUrl = userData.data.profile_image_url?.replace('_normal', '_400x400') ?? '';

    twitterProfiles.set(pending.address, { handle, pfpUrl });

    return { handle, pfpUrl, address: pending.address };
}
