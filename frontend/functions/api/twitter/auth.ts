import type { Env } from '../../env';

function base64UrlEncode(buf: ArrayBuffer): string {
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const address = url.searchParams.get('address');
    const returnUrl = url.searchParams.get('returnUrl') || '/';

    if (!address) {
        return new Response(JSON.stringify({ error: 'address query param required' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    const clientId = context.env.TWITTER_CLIENT_ID;
    if (!clientId) {
        return new Response(JSON.stringify({ error: 'Twitter OAuth not configured' }), {
            status: 500, headers: { 'Content-Type': 'application/json' },
        });
    }

    const callbackUrl = context.env.TWITTER_CALLBACK_URL || `${url.origin}/api/twitter/callback`;

    // Generate PKCE code verifier + challenge
    const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
    const codeVerifier = base64UrlEncode(verifierBytes.buffer);

    const challengeHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
    const codeChallenge = base64UrlEncode(challengeHash);

    // Encode state inline — includes returnUrl so callback knows where to send user back
    const statePayload = btoa(JSON.stringify({ codeVerifier, address, returnUrl }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: callbackUrl,
        scope: 'tweet.read users.read follows.read',
        state: statePayload,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
    });

    // Use x.com (Twitter's migrated domain) — twitter.com OAuth flows get stuck in some browsers
    return Response.redirect(`https://x.com/i/oauth2/authorize?${params.toString()}`, 302);
};
