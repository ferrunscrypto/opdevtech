// ABI for dev.tech contract — keep in sync with contract build
// Selectors are computed from function names, so names must match exactly.

export const DevTechABI = [
    // Profile
    {
        name: '_setProfile',
        inputs: [
            { name: 'handle', type: 'string' },
            { name: 'pfpUrl', type: 'string' },
        ],
        outputs: [{ name: 'success', type: 'bool' }],
    },
    {
        name: '_getProfile',
        inputs: [{ name: 'addr', type: 'address' }],
        outputs: [
            { name: 'handleHash',   type: 'uint256' },
            { name: 'pfpHash',      type: 'uint256' },
            { name: 'score',        type: 'uint256' },
            { name: 'badgeCount',   type: 'uint256' },
            { name: 'endorseCount', type: 'uint256' },
        ],
    },

    // Badges
    {
        name: '_claimBadge',
        inputs: [{ name: 'badgeId', type: 'uint256' }],
        outputs: [{ name: 'tokenId', type: 'uint256' }],
    },
    {
        name: '_hasClaimed',
        inputs: [
            { name: 'addr',    type: 'address' },
            { name: 'badgeId', type: 'uint256' },
        ],
        outputs: [{ name: 'claimed', type: 'bool' }],
    },
    {
        name: '_getBadgeType',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: 'badgeId', type: 'uint256' }],
    },
    {
        name: '_getBadgeInfo',
        inputs: [{ name: 'badgeId', type: 'uint256' }],
        outputs: [
            { name: 'exists',     type: 'bool'    },
            { name: 'scoreValue', type: 'uint256' },
        ],
    },
    {
        name: '_getBadgeCount',
        inputs: [],
        outputs: [{ name: 'count', type: 'uint256' }],
    },
    {
        name: '_registerBadge',
        inputs: [
            { name: 'badgeId',    type: 'uint256' },
            { name: 'scoreValue', type: 'uint256' },
        ],
        outputs: [{ name: 'success', type: 'bool' }],
    },

    // Endorse
    {
        name: '_endorse',
        inputs: [{ name: 'target', type: 'address' }],
        outputs: [{ name: 'newCount', type: 'uint256' }],
    },

    // OP721 standard
    {
        name: 'balanceOf',
        inputs: [{ name: 'owner', type: 'address' }],
        outputs: [{ name: 'balance', type: 'uint256' }],
    },
    {
        name: 'tokenOfOwnerByIndex',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'index', type: 'uint256' },
        ],
        outputs: [{ name: 'tokenId', type: 'uint256' }],
    },
    {
        name: 'tokenURI',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: 'uri', type: 'string' }],
    },
    {
        name: 'ownerOf',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{ name: 'owner', type: 'address' }],
    },
] as const;

// Badge metadata (mirrors contract static tables)
export interface BadgeMeta {
    id: number;
    name: string;
    track: string;
    color: string;
    requirement: string;
    score: number;
}

export const BADGE_META: BadgeMeta[] = [
    { id: 1,  name: 'First Deploy',     track: 'Builder',    color: '#3b82f6', requirement: '1+ contract deployed',             score: 100  },
    { id: 2,  name: 'Smart Architect',  track: 'Builder',    color: '#3b82f6', requirement: '5+ contracts deployed',            score: 250  },
    { id: 3,  name: 'Contract Factory', track: 'Builder',    color: '#3b82f6', requirement: '10+ contracts deployed',           score: 500  },
    { id: 4,  name: 'First Swap',       track: 'Trader',     color: '#4ade80', requirement: '1+ swap on MotoSwap',              score: 50   },
    { id: 5,  name: 'Active Trader',    track: 'Trader',     color: '#4ade80', requirement: '10+ swaps',                       score: 150  },
    { id: 6,  name: 'Swap Veteran',     track: 'Trader',     color: '#4ade80', requirement: '100+ swaps',                      score: 400  },
    { id: 7,  name: 'Gas Burner',       track: 'Gas',        color: '#f97316', requirement: '50k+ sats in gas spent',          score: 75   },
    { id: 8,  name: 'Inferno',          track: 'Gas',        color: '#f97316', requirement: '500k+ sats in gas spent',         score: 200  },
    { id: 9,  name: 'OPNet OG',         track: 'OG',         color: '#eab308', requirement: 'First tx before block 50,000',    score: 300  },
    { id: 10, name: 'Early Adopter',    track: 'OG',         color: '#eab308', requirement: 'First tx before block 100,000',   score: 150  },
    { id: 11, name: 'Linked',           track: 'Social',     color: '#a855f7', requirement: 'Twitter profile set on-chain',    score: 25   },
    { id: 12, name: 'Vouched',          track: 'Social',     color: '#a855f7', requirement: 'Endorsed by 3+ other addresses',  score: 100  },
    { id: 13, name: 'Battle Hardened',  track: 'Resilience', color: '#ef4444', requirement: '10+ failed transactions',         score: 50   },
    { id: 14, name: 'Diamond Hands',    track: 'Resilience', color: '#ef4444', requirement: '0 failed txs + 20+ successful',   score: 200  },
    { id: 15, name: 'OPNet Legend',     track: 'Master',     color: '#fbbf24', requirement: '5+ different badges held',        score: 1000 },
];
