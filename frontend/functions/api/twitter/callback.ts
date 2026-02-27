import type { Env } from '../../env';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    let returnUrl = '/';
    let address = '';
    let codeVerifier = '';

    if (stateParam) {
        try {
            const stateJson = atob(stateParam.replace(/-/g, '+').replace(/_/g, '/'));
            const parsed = JSON.parse(stateJson) as { codeVerifier: string; address: string; returnUrl?: string };
            codeVerifier = parsed.codeVerifier ?? '';
            address = parsed.address ?? '';
            returnUrl = parsed.returnUrl ?? '/';
        } catch { /* invalid state */ }
    }

    if (error || !code || !codeVerifier || !address) {
        const msg = error || 'Missing code or state';
        return redirectWithResult({ error: msg }, returnUrl, url.origin);
    }

    try {
        const clientId = context.env.TWITTER_CLIENT_ID;
        const clientSecret = context.env.TWITTER_CLIENT_SECRET;
        const callbackUrl = context.env.TWITTER_CALLBACK_URL || `${url.origin}/api/twitter/callback`;

        const tokenHeaders: Record<string, string> = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        const tokenBodyParams: Record<string, string> = {
            code,
            grant_type: 'authorization_code',
            redirect_uri: callbackUrl,
            code_verifier: codeVerifier,
        };
        if (clientSecret) {
            tokenHeaders['Authorization'] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
        } else {
            tokenBodyParams['client_id'] = clientId;
        }

        const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: tokenHeaders,
            body: new URLSearchParams(tokenBodyParams).toString(),
        });

        if (!tokenRes.ok) {
            const txt = await tokenRes.text();
            throw new Error(`Token exchange failed: ${txt}`);
        }

        const tokenData = await tokenRes.json() as { access_token: string };

        const userRes = await fetch(
            'https://api.twitter.com/2/users/me?user.fields=profile_image_url,username',
            { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
        );

        if (!userRes.ok) {
            const txt = await userRes.text();
            throw new Error(`User fetch failed: ${txt}`);
        }

        const userData = await userRes.json() as {
            data: { id: string; username: string; profile_image_url?: string };
        };

        const handle = userData.data.username;
        const pfpUrl = userData.data.profile_image_url?.replace('_normal', '_400x400') ?? '';
        const twitterUserId = userData.data.id;

        // Check following with full pagination + error capture
        const { followsOpnet, followsCatpound, followsError } = await checkFollowing(
            tokenData.access_token,
            twitterUserId,
        );

        // Persist to KV — use waitUntil so it completes after response is sent
        context.waitUntil(Promise.all([
            // Profile data
            context.env.OPDEV_KV.put(
                `twitter:${address}`,
                JSON.stringify({ handle, pfpUrl, followsOpnet, followsCatpound }),
            ),
            // Access token for recheck (expires in 2h)
            context.env.OPDEV_KV.put(
                `twitter:token:${address}`,
                JSON.stringify({ access_token: tokenData.access_token, userId: twitterUserId }),
                { expirationTtl: 7200 },
            ),
        ]));

        const result: Record<string, string> = {
            handle, pfpUrl, address,
            followsOpnet: String(followsOpnet),
            followsCatpound: String(followsCatpound),
        };
        if (followsError) result.followsError = followsError;

        return redirectWithResult(result, returnUrl, url.origin);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return redirectWithResult({ error: msg }, returnUrl, url.origin);
    }
};

export async function checkFollowing(
    accessToken: string,
    userId: string,
): Promise<{ followsOpnet: boolean; followsCatpound: boolean; followsError?: string }> {
    try {
        // Resolve target user IDs
        const [opnetRes, catpoundRes] = await Promise.all([
            fetch('https://api.twitter.com/2/users/by/username/opnetbtc', {
                headers: { Authorization: `Bearer ${accessToken}` },
            }),
            fetch('https://api.twitter.com/2/users/by/username/catpoundfinance', {
                headers: { Authorization: `Bearer ${accessToken}` },
            }),
        ]);

        if (!opnetRes.ok) {
            const txt = await opnetRes.text();
            return { followsOpnet: false, followsCatpound: false, followsError: `opnetbtc lookup failed: ${opnetRes.status} ${txt.slice(0, 120)}` };
        }

        const opnetTarget = (await opnetRes.json() as { data?: { id: string } }).data?.id ?? null;
        const catTarget = catpoundRes.ok ? (await catpoundRes.json() as { data?: { id: string } }).data?.id ?? null : null;

        // Paginate through ALL following (max_results=1000 per page, up to 20 pages = 20k accounts)
        let followsOpnet = false;
        let followsCatpound = false;
        let nextToken: string | undefined;
        let pages = 0;

        do {
            const params = new URLSearchParams({ max_results: '1000' });
            if (nextToken) params.set('pagination_token', nextToken);

            const res = await fetch(
                `https://api.twitter.com/2/users/${userId}/following?${params.toString()}`,
                { headers: { Authorization: `Bearer ${accessToken}` } },
            );

            if (!res.ok) {
                const txt = await res.text();
                return { followsOpnet, followsCatpound, followsError: `Following fetch failed: ${res.status} ${txt.slice(0, 120)}` };
            }

            const data = await res.json() as {
                data?: Array<{ id: string }>;
                meta?: { next_token?: string };
            };

            const ids = new Set((data.data ?? []).map(u => u.id));
            if (opnetTarget && ids.has(opnetTarget)) followsOpnet = true;
            if (catTarget && ids.has(catTarget)) followsCatpound = true;

            if (followsOpnet && followsCatpound) break;

            nextToken = data.meta?.next_token;
            pages++;
        } while (nextToken && pages < 20);

        return { followsOpnet, followsCatpound };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { followsOpnet: false, followsCatpound: false, followsError: msg };
    }
}

function redirectWithResult(data: Record<string, string>, _returnUrl: string, origin: string): Response {
    const payload = JSON.stringify({ type: 'twitter_oauth', ...data });
    const isError = !!data.error;
    const msg = isError ? 'Error: ' + data.error.replace(/</g, '&lt;') : 'Twitter linked! Closing...';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Twitter OAuth</title></head><body>
<p id="s" style="font-family:monospace;padding:20px;color:#9ca3af">Processing...</p>
<script>
(function(){
    var payload = ${payload};
    if (window.opener) {
        try { window.opener.postMessage(payload, ${JSON.stringify(origin)}); } catch(e){}
    }
    try { localStorage.setItem('twitter_oauth_pending', JSON.stringify(payload)); } catch(e){}
    document.getElementById('s').textContent = ${JSON.stringify(msg)};
    setTimeout(function(){ window.close(); }, 600);
})();
</script></body></html>`;

    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
