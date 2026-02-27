import type { Env } from '../../env';

/** Called by the frontend after minting a badge to store tokenId→badgeId mapping */
export const onRequestPost: PagesFunction<Env> = async (context) => {
    let body: { tokenId: string; badgeId: number };
    try {
        body = await context.request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    if (!body.tokenId || !body.badgeId) {
        return new Response(JSON.stringify({ error: 'Missing tokenId or badgeId' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    await context.env.OPDEV_KV.put(`nft:${body.tokenId}`, String(body.badgeId));

    return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
};
