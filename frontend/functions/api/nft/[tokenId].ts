import type { Env } from '../../env';

const BADGE_NAMES: Record<number, string> = {
    1: 'First Deploy', 2: 'Smart Architect', 3: 'Contract Factory',
    4: 'First Swap', 5: 'Active Trader', 6: 'Swap Veteran',
    7: 'Gas Burner', 8: 'Inferno', 9: 'OPNet OG', 10: 'Early Adopter',
    11: 'Linked', 12: 'Vouched', 13: 'Battle Hardened', 14: 'Diamond Hands',
    15: 'OPNet Legend', 16: 'OPNet Ally', 17: 'CatPound Pack',
};
const BADGE_TRACKS: Record<number, string> = {
    1: 'Builder', 2: 'Builder', 3: 'Builder', 4: 'Trader', 5: 'Trader',
    6: 'Trader', 7: 'Gas', 8: 'Gas', 9: 'OG', 10: 'OG',
    11: 'Social', 12: 'Social', 13: 'Resilience', 14: 'Resilience',
    15: 'Master', 16: 'Social', 17: 'Social',
};
const BADGE_SCORES: Record<number, number> = {
    1: 100, 2: 250, 3: 500, 4: 50, 5: 150, 6: 400, 7: 75, 8: 200,
    9: 300, 10: 150, 11: 25, 12: 100, 13: 50, 14: 200, 15: 1000,
    16: 50, 17: 50,
};

/** Serves NFT metadata JSON. OP_WALLET fetches baseURI + tokenId → this endpoint */
export const onRequestGet: PagesFunction<Env> = async (context) => {
    const tokenId = context.params.tokenId as string;
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
    };

    // Look up badgeId from KV
    const badgeIdStr = await context.env.OPDEV_KV.get(`nft:${tokenId}`);

    if (!badgeIdStr) {
        return new Response(JSON.stringify({ error: 'Unknown token' }), {
            status: 404, headers,
        });
    }

    const badgeId = Number(badgeIdStr);
    if (badgeId < 1 || badgeId > 17) {
        return new Response(JSON.stringify({ error: 'Unknown badge type' }), {
            status: 404, headers,
        });
    }

    const name = BADGE_NAMES[badgeId] ?? 'Badge';
    const track = BADGE_TRACKS[badgeId] ?? 'Unknown';
    const score = BADGE_SCORES[badgeId] ?? 0;
    const origin = new URL(context.request.url).origin;

    return new Response(JSON.stringify({
        name,
        description: `opdev.tech soulbound achievement badge on Bitcoin via OPNet. Track: ${track}`,
        image: `${origin}/badges/badge_${String(badgeId).padStart(2, '0')}.png`,
        attributes: [
            { trait_type: 'Badge ID', value: badgeId },
            { trait_type: 'Track', value: track },
            { trait_type: 'Score', value: score },
        ],
    }), { headers });
};
