import { ABIDataTypes, BitcoinAbiTypes, OP_NET_ABI } from 'opnet';

export const DevTechEvents = [];

export const DevTechAbi = [
    {
        name: 'safeTransfer',
        inputs: [
            { name: 'to', type: ABIDataTypes.ADDRESS },
            { name: 'tokenId', type: ABIDataTypes.UINT256 },
            { name: 'data', type: ABIDataTypes.BYTES },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'safeTransferFrom',
        inputs: [
            { name: 'from', type: ABIDataTypes.ADDRESS },
            { name: 'to', type: ABIDataTypes.ADDRESS },
            { name: 'tokenId', type: ABIDataTypes.UINT256 },
            { name: 'data', type: ABIDataTypes.BYTES },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'approve',
        inputs: [
            { name: 'operator', type: ABIDataTypes.ADDRESS },
            { name: 'tokenId', type: ABIDataTypes.UINT256 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'setApprovalForAll',
        inputs: [
            { name: 'operator', type: ABIDataTypes.ADDRESS },
            { name: 'approved', type: ABIDataTypes.BOOL },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: 'tokenURI',
        inputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'uri', type: ABIDataTypes.STRING }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_setProfile',
        inputs: [
            { name: 'handle', type: ABIDataTypes.STRING },
            { name: 'pfpUrl', type: ABIDataTypes.STRING },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_getProfile',
        inputs: [{ name: 'addr', type: ABIDataTypes.ADDRESS }],
        outputs: [
            { name: 'handleHash', type: ABIDataTypes.UINT256 },
            { name: 'pfpHash', type: ABIDataTypes.UINT256 },
            { name: 'score', type: ABIDataTypes.UINT256 },
            { name: 'badgeCount', type: ABIDataTypes.UINT256 },
            { name: 'endorseCount', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_claimBadge',
        inputs: [{ name: 'badgeId', type: ABIDataTypes.UINT256 }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_hasClaimed',
        inputs: [
            { name: 'addr', type: ABIDataTypes.ADDRESS },
            { name: 'badgeId', type: ABIDataTypes.UINT256 },
        ],
        outputs: [{ name: 'claimed', type: ABIDataTypes.BOOL }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_getBadgeType',
        inputs: [{ name: 'tokenId', type: ABIDataTypes.UINT256 }],
        outputs: [{ name: 'badgeId', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_endorse',
        inputs: [{ name: 'target', type: ABIDataTypes.ADDRESS }],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_registerBadge',
        inputs: [
            { name: 'badgeId', type: ABIDataTypes.UINT256 },
            { name: 'scoreValue', type: ABIDataTypes.UINT256 },
        ],
        outputs: [],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_getBadgeInfo',
        inputs: [{ name: 'badgeId', type: ABIDataTypes.UINT256 }],
        outputs: [
            { name: 'exists', type: ABIDataTypes.BOOL },
            { name: 'scoreValue', type: ABIDataTypes.UINT256 },
        ],
        type: BitcoinAbiTypes.Function,
    },
    {
        name: '_getBadgeCount',
        inputs: [],
        outputs: [{ name: 'count', type: ABIDataTypes.UINT256 }],
        type: BitcoinAbiTypes.Function,
    },
    ...DevTechEvents,
    ...OP_NET_ABI,
];

export default DevTechAbi;
