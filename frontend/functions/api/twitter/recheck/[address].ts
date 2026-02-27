import type { Env } from '../../../env';
import { checkFollowing } from '../callback';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const address = context.params.address as string;
    if (!address) {
        return new Response(JSON.stringify({ error: 'Address required' }), {
            status: 400, headers: { 'Content-Type': 'application/json' },
        });
    }

    const tokenData = await context.env.OPDEV_KV.get(`twitter:token:${address}`, 'json') as {
        access_token: string;
        userId: string;
    } | null;

    if (!tokenData) {
        return new Response(JSON.stringify({ error: 'No stored token — please re-link your X account.' }), {
            status: 404, headers: { 'Content-Type': 'application/json' },
        });
    }

    const { followsOpnet, followsCatpound, followsError } = await checkFollowing(
        tokenData.access_token,
        tokenData.userId,
    );

    // Update profile in KV with fresh following flags
    const existing = await context.env.OPDEV_KV.get(`twitter:${address}`, 'json') as {
        handle: string; pfpUrl: string;
    } | null;

    if (existing) {
        context.waitUntil(
            context.env.OPDEV_KV.put(
                `twitter:${address}`,
                JSON.stringify({ ...existing, followsOpnet, followsCatpound }),
            ),
        );
    }

    return new Response(JSON.stringify({ followsOpnet, followsCatpound, followsError }), {
        headers: { 'Content-Type': 'application/json' },
    });
};
