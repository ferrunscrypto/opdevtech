// ABI for dev.tech contract — keep in sync with contract build
// Uses proper opnet ABI types for correct method proxy generation.

import { ABIDataTypes, BitcoinAbiTypes, BitcoinInterfaceAbi } from 'opnet';

export const DevTechABI: BitcoinInterfaceAbi = [
    // ── Write Methods ────────────────────────────────────────────

    // Profile
    {
        name: '_setProfile',
        type: BitcoinAbiTypes.Function,
        constant: false,
        inputs: [
            { name: 'handle', type: ABIDataTypes.STRING },
            { name: 'pfpUrl', type: ABIDataTypes.STRING },
        ],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
    },

    // Badges
    {
        name: '_claimBadge',
        type: BitcoinAbiTypes.Function,
        constant: false,
        inputs: [{ name: 'badgeId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
    },

    // Endorse
    {
        name: '_endorse',
        type: BitcoinAbiTypes.Function,
        constant: false,
        inputs: [{ name: 'target', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'newCount', type: ABIDataTypes.UINT256 }],
    },

    // Badge registry (deployer only)
    {
        name: '_registerBadge',
        type: BitcoinAbiTypes.Function,
        constant: false,
        inputs: [
            { name: 'badgeId', type: ABIDataTypes.UINT256 },
            { name: 'scoreValue', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'success', type: ABIDataTypes.BOOL }],
    },

    // ── Read Methods ─────────────────────────────────────────────

    // Profile
    {
        name: '_getProfile',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [{ name: 'addr', type: ABIDataTypes.ADDRESS }],
        outputs: [
            { name: 'handleHash', type: ABIDataTypes.UINT256 },
            { name: 'pfpHash', type: ABIDataTypes.UINT256 },
            { name: 'score', type: ABIDataTypes.UINT256 },
            { name: 'badgeCount', type: ABIDataTypes.UINT256 },
            { name: 'endorseCount', type: ABIDataTypes.UINT256 },
        ],
    },

    // Badge queries
    {
        name: '_hasClaimed',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [
            { name: 'addr', type: ABIDataTypes.ADDRESS },
            { name: 'badgeId', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'claimed', type: ABIDataTypes.BOOL }],
    },
    {
        name: '_getBadgeType',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'badgeId', type: ABIDataTypes.UINT256 }],
    },
    {
        name: '_getBadgeInfo',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [{ name: 'badgeId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'exists', type: ABIDataTypes.BOOL },
            { name: 'scoreValue', type: ABIDataTypes.UINT256 },
        ],
    },
    {
        name: '_getBadgeCount',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
    },

    // OP721 standard
    {
        name: 'balanceOf',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
        outputs: [{ name: 'balance', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'tokenOfOwnerByIndex',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [
            { name: 'owner', type: ABIDataTypes.ADDRESS },
            { name: 'index', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
    },
    {
        name: 'tokenURI',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'uri', type: ABIDataTypes.STRING }],
    },
    {
        name: 'ownerOf',
        type: BitcoinAbiTypes.Function,
        constant: true,
        inputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'owner', type: ABIDataTypes.ADDRESS }],
    },
];

// Badge metadata (mirrors contract static tables)
export interface BadgeMeta {
    id: number;
    name: string;
    track: string;
    color: string;
    requirement: string;
    score: number;
    link?: string;
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
    { id: 9,  name: 'OPNet OG',         track: 'OG',         color: '#eab308', requirement: 'First tx before block 500',      score: 300  },
    { id: 10, name: 'Early Adopter',    track: 'OG',         color: '#eab308', requirement: 'First tx before block 1,000',    score: 150  },
    { id: 11, name: 'Linked',           track: 'Social',     color: '#a855f7', requirement: 'Twitter profile set on-chain',    score: 25   },
    { id: 12, name: 'Vouched',          track: 'Social',     color: '#a855f7', requirement: 'Endorsed by 3+ other addresses',  score: 100  },
    { id: 16, name: 'OPNet Ally',       track: 'Social',     color: '#a855f7', requirement: 'Following @opnetbtc on X',         score: 50,  link: 'https://x.com/opnetbtc'        },
    { id: 17, name: 'CatPound Pack',    track: 'Social',     color: '#c084fc', requirement: 'Following @catpoundfinance on X',  score: 50, link: 'https://x.com/catpoundfinance'  },
    { id: 13, name: 'Battle Hardened',  track: 'Resilience', color: '#ef4444', requirement: '5+ failed transactions',          score: 50   },
    { id: 14, name: 'Diamond Hands',    track: 'Resilience', color: '#ef4444', requirement: '0 failed txs + 20+ successful',   score: 200  },
    { id: 15, name: 'OPNet Legend',     track: 'Master',     color: '#fbbf24', requirement: '5+ different badges held',        score: 1000 },
];
