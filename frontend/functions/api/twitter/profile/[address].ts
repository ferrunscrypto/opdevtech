import type { Env } from '../../../env';

export const onRequestGet: PagesFunction<Env> = async (context) => {
    const address = context.params.address as string;
    if (!address) {
        return new Response(JSON.stringify({ error: 'Address required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const profile = await context.env.OPDEV_KV.get(`twitter:${address}`, 'json') as {
        handle: string;
        pfpUrl: string;
    } | null;

    if (!profile) {
        return new Response(JSON.stringify({ error: 'No Twitter profile for this address' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(profile), {
        headers: { 'Content-Type': 'application/json' },
    });
};
