import type { Env } from '../env';

interface LeaderboardEntry {
    address:     string;
    score:       number;
    totalTxs:    number;
    deployments: number;
    swaps:       number;
    badgeCount:  number;
    lastScan:    number;
}

const KV_KEY = 'leaderboard';

async function getEntries(kv: KVNamespace): Promise<Map<string, LeaderboardEntry>> {
    const raw = await kv.get(KV_KEY, 'json') as LeaderboardEntry[] | null;
    const map = new Map<string, LeaderboardEntry>();
    if (raw) {
        for (const e of raw) map.set(e.address, e);
    }
    return map;
}

async function saveEntries(kv: KVNamespace, entries: Map<string, LeaderboardEntry>): Promise<void> {
    const arr = [...entries.values()].sort((a, b) => b.score - a.score);
    await kv.put(KV_KEY, JSON.stringify(arr));
}

// GET /api/leaderboard
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const entries = await getEntries(context.env.OPDEV_KV);
    const sorted = [...entries.values()].sort((a, b) => b.score - a.score);

    // Attach twitter info
    const result = await Promise.all(sorted.map(async (entry) => {
        const tw = await context.env.OPDEV_KV.get(`twitter:${entry.address}`, 'json') as {
            handle: string;
            pfpUrl: string;
        } | null;
        return {
            ...entry,
            twitterHandle: tw?.handle ?? null,
            twitterPfp: tw?.pfpUrl ?? null,
        };
    }));

    return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
    });
};

// POST /api/leaderboard — frontend sends scan + badgeCount
export const onRequestPost: PagesFunction<Env> = async (context) => {
    let body: { scan: Record<string, unknown>; badgeCount: number };
    try {
        body = await context.request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { scan, badgeCount } = body;
    if (!scan || typeof scan.address !== 'string') {
        return new Response(JSON.stringify({ error: 'Missing scan data' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const entries = await getEntries(context.env.OPDEV_KV);
    const count = badgeCount ?? 0;

    if (count < 1) {
        if (entries.has(scan.address as string)) {
            entries.delete(scan.address as string);
            await saveEntries(context.env.OPDEV_KV, entries);
        }
    } else {
        entries.set(scan.address as string, {
            address:     scan.address as string,
            score:       Number(scan.score ?? 0),
            totalTxs:    Number(scan.totalTxs ?? 0),
            deployments: Number(scan.deployments ?? 0),
            swaps:       Number(scan.swaps ?? 0),
            badgeCount:  count,
            lastScan:    Date.now(),
        });
        await saveEntries(context.env.OPDEV_KV, entries);
    }

    return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
};
