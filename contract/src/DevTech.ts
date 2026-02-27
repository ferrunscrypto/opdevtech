import { u256 } from '@btc-vision/as-bignum/assembly';
import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    OP721,
    OP721InitParameters,
    Revert,
    SafeMath,
    StoredU256,
    EMPTY_POINTER,
} from '@btc-vision/btc-runtime/runtime';
import { AddressMemoryMap } from '@btc-vision/btc-runtime/runtime/memory/AddressMemoryMap';
import { StoredMapU256 } from '@btc-vision/btc-runtime/runtime/storage/maps/StoredMapU256';
import { NetEvent } from '@btc-vision/btc-runtime/runtime/events/NetEvent';
import { sha256 } from '@btc-vision/btc-runtime/runtime/env/global';

// ── Events ────────────────────────────────────────────────────────────────────

class ProfileSetEvent extends NetEvent {
    constructor(caller: Address, handle: string, pfpUrl: string) {
        const handleBytes = String.UTF8.byteLength(handle);
        const pfpBytes = String.UTF8.byteLength(pfpUrl);
        const data = new BytesWriter(32 + 4 + handleBytes + 4 + pfpBytes);
        data.writeAddress(caller);
        data.writeStringWithLength(handle);
        data.writeStringWithLength(pfpUrl);
        super('ProfileSet', data);
    }
}

class BadgeClaimedEvent extends NetEvent {
    constructor(caller: Address, tokenId: u256, badgeId: u256) {
        const data = new BytesWriter(32 + 32 + 32);
        data.writeAddress(caller);
        data.writeU256(tokenId);
        data.writeU256(badgeId);
        super('BadgeClaimed', data);
    }
}

class EndorsedEvent extends NetEvent {
    constructor(caller: Address, target: Address, newCount: u256) {
        const data = new BytesWriter(32 + 32 + 32);
        data.writeAddress(caller);
        data.writeAddress(target);
        data.writeU256(newCount);
        super('Endorsed', data);
    }
}

class BadgeRegisteredEvent extends NetEvent {
    constructor(badgeId: u256, scoreValue: u256) {
        const data = new BytesWriter(32 + 32);
        data.writeU256(badgeId);
        data.writeU256(scoreValue);
        super('BadgeRegistered', data);
    }
}

// ── Storage pointers (declared at module level, AFTER OP721 consumes its pointers) ──
const profileHandlePointer: u16 = Blockchain.nextPointer;
const profilePfpPointer: u16    = Blockchain.nextPointer;
const scorePointer: u16         = Blockchain.nextPointer;
const endorseCountPointer: u16  = Blockchain.nextPointer;
const claimedPointer: u16       = Blockchain.nextPointer;
const badgeTypePointer: u16     = Blockchain.nextPointer;
const badgeScorePointer: u16    = Blockchain.nextPointer;
const badgeExistsPointer: u16   = Blockchain.nextPointer;
const badgeCountStoragePointer: u16 = Blockchain.nextPointer;
const profileHasTwitterPointer: u16 = Blockchain.nextPointer;

// ── Base64 encoder ────────────────────────────────────────────────────────────

// ── Static badge metadata (name, track color) ────────────────────────────────

function getBadgeName(badgeId: u32): string {
    if (badgeId == 1)  return 'First Deploy';
    if (badgeId == 2)  return 'Smart Architect';
    if (badgeId == 3)  return 'Contract Factory';
    if (badgeId == 4)  return 'First Swap';
    if (badgeId == 5)  return 'Active Trader';
    if (badgeId == 6)  return 'Swap Veteran';
    if (badgeId == 7)  return 'Gas Burner';
    if (badgeId == 8)  return 'Inferno';
    if (badgeId == 9)  return 'OPNet OG';
    if (badgeId == 10) return 'Early Adopter';
    if (badgeId == 11) return 'Linked';
    if (badgeId == 12) return 'Vouched';
    if (badgeId == 13) return 'Battle Hardened';
    if (badgeId == 14) return 'Diamond Hands';
    if (badgeId == 15) return 'OPNet Legend';
    if (badgeId == 16) return 'OPNet Ally';
    if (badgeId == 17) return 'CatPound Pack';
    return 'Custom Badge';
}

function getBadgeColor(badgeId: u32): string {
    if (badgeId >= 1 && badgeId <= 3)  return '#3b82f6'; // Builder: blue
    if (badgeId >= 4 && badgeId <= 6)  return '#4ade80'; // Trader: green
    if (badgeId >= 7 && badgeId <= 8)  return '#f97316'; // Gas: orange
    if (badgeId >= 9 && badgeId <= 10) return '#eab308'; // OG: gold
    if (badgeId == 11 || badgeId == 12 || badgeId == 16) return '#a855f7'; // Social: purple
    if (badgeId == 17) return '#c084fc'; // Social high-value: light purple
    if (badgeId >= 13 && badgeId <= 14) return '#ef4444'; // Resilience: red
    if (badgeId == 15) return '#fbbf24'; // Master: gold
    return '#6b7280'; // Unknown: gray
}

// ── Initial badge scores ──────────────────────────────────────────────────────

function getInitialScore(badgeId: u32): u64 {
    if (badgeId == 1)  return 100;
    if (badgeId == 2)  return 250;
    if (badgeId == 3)  return 500;
    if (badgeId == 4)  return 50;
    if (badgeId == 5)  return 150;
    if (badgeId == 6)  return 400;
    if (badgeId == 7)  return 75;
    if (badgeId == 8)  return 200;
    if (badgeId == 9)  return 300;
    if (badgeId == 10) return 150;
    if (badgeId == 11) return 25;
    if (badgeId == 12) return 100;
    if (badgeId == 13) return 50;
    if (badgeId == 14) return 200;
    if (badgeId == 15) return 1000;
    if (badgeId == 16) return 50;
    if (badgeId == 17) return 50;
    return 0;
}

// ── DevTech contract ──────────────────────────────────────────────────────────

export class DevTech extends OP721 {

    // Per-address profile data
    private readonly _profileHandle: StoredMapU256;  // addr_u256 → sha256(handle)
    private readonly _profilePfp:    StoredMapU256;  // addr_u256 → sha256(pfpUrl)
    private readonly _score:         AddressMemoryMap;
    private readonly _endorseCount:  AddressMemoryMap;
    private readonly _hasTwitter:    StoredMapU256;  // addr_u256 → 1 if twitter set

    // Badge data
    private readonly _claimed:        StoredMapU256;  // claimKey → 1
    private readonly _badgeType:      StoredMapU256;  // tokenId → badgeId

    // Badge registry (deployer-controlled)
    private readonly _badgeScoreMap:  StoredMapU256;  // badgeId → score
    private readonly _badgeExists:    StoredMapU256;  // badgeId → 1
    private readonly _badgeCount:     StoredU256;

    constructor() {
        super();
        this._profileHandle = new StoredMapU256(profileHandlePointer);
        this._profilePfp    = new StoredMapU256(profilePfpPointer);
        this._score         = new AddressMemoryMap(scorePointer);
        this._endorseCount  = new AddressMemoryMap(endorseCountPointer);
        this._hasTwitter    = new StoredMapU256(profileHasTwitterPointer);
        this._claimed       = new StoredMapU256(claimedPointer);
        this._badgeType     = new StoredMapU256(badgeTypePointer);
        this._badgeScoreMap = new StoredMapU256(badgeScorePointer);
        this._badgeExists   = new StoredMapU256(badgeExistsPointer);
        this._badgeCount    = new StoredU256(badgeCountStoragePointer, EMPTY_POINTER);
    }

    public override onDeployment(_calldata: Calldata): void {
        this.instantiate(new OP721InitParameters(
            'opdev.tech',
            'OPDEV',
            'https://opdev-tech.pages.dev/badges/',
            u256.fromU64(999999),
            'https://opdev-tech.pages.dev/banner.png',
            'https://opdev-tech.pages.dev/icon.png',
            'https://opdev-tech.pages.dev',
            'Bitcoin on-chain identity & achievement badges',
        ));

        // Seed the badge registry with all 17 initial badges
        for (let i: u32 = 1; i <= 17; i++) {
            const badgeId = u256.fromU32(i);
            const scoreVal = u256.fromU64(getInitialScore(i));
            this._badgeScoreMap.set(badgeId, scoreVal);
            this._badgeExists.set(badgeId, u256.One);
            this._badgeCount.value = SafeMath.add(this._badgeCount.value, u256.One);
            this.emitEvent(new BadgeRegisteredEvent(badgeId, scoreVal));
        }
    }

    // ── Soulbound overrides ───────────────────────────────────────────────────

    @method(
        { name: 'to', type: ABIDataTypes.ADDRESS },
        { name: 'tokenId', type: ABIDataTypes.UINT256 },
        { name: 'data', type: ABIDataTypes.BYTES },
    )
    public override safeTransfer(_: Calldata): BytesWriter {
        throw new Revert('Soulbound: non-transferable');
    }

    @method(
        { name: 'from', type: ABIDataTypes.ADDRESS },
        { name: 'to', type: ABIDataTypes.ADDRESS },
        { name: 'tokenId', type: ABIDataTypes.UINT256 },
        { name: 'data', type: ABIDataTypes.BYTES },
    )
    public override safeTransferFrom(_: Calldata): BytesWriter {
        throw new Revert('Soulbound: non-transferable');
    }

    @method(
        { name: 'operator', type: ABIDataTypes.ADDRESS },
        { name: 'tokenId', type: ABIDataTypes.UINT256 },
    )
    public override approve(_: Calldata): BytesWriter {
        throw new Revert('Soulbound: non-transferable');
    }

    @method(
        { name: 'operator', type: ABIDataTypes.ADDRESS },
        { name: 'approved', type: ABIDataTypes.BOOL },
    )
    public override setApprovalForAll(_: Calldata): BytesWriter {
        throw new Revert('Soulbound: non-transferable');
    }

    // ── tokenURI: returns HTTPS metadata URL (wallet-compatible) ─────────────

    @method({ name: 'tokenId', type: ABIDataTypes.UINT256 })
    @returns({ name: 'uri', type: ABIDataTypes.STRING })
    public override tokenURI(calldata: Calldata): BytesWriter {
        const tokenId = calldata.readU256();
        if (!this._exists(tokenId)) throw new Revert('Token does not exist');

        const uri = 'https://opdev-tech.pages.dev/api/nft/' + tokenId.toString();

        const w = new BytesWriter(String.UTF8.byteLength(uri) + 4);
        w.writeStringWithLength(uri);
        return w;
    }

    // ── Profile ───────────────────────────────────────────────────────────────

    @method(
        { name: 'handle', type: ABIDataTypes.STRING },
        { name: 'pfpUrl', type: ABIDataTypes.STRING },
    )
    public _setProfile(calldata: Calldata): BytesWriter {
        const handle = calldata.readStringWithLength();
        const pfpUrl = calldata.readStringWithLength();

        if (handle.length == 0) throw new Revert('Handle cannot be empty');

        const caller = Blockchain.tx.sender;
        const addrU256 = u256.fromUint8ArrayBE(caller);

        // Store hashes
        const handleBytes = Uint8Array.wrap(String.UTF8.encode(handle));
        const pfpBytes    = Uint8Array.wrap(String.UTF8.encode(pfpUrl));
        this._profileHandle.set(addrU256, u256.fromUint8ArrayBE(sha256(handleBytes)));
        this._profilePfp.set(addrU256, u256.fromUint8ArrayBE(sha256(pfpBytes)));

        // Award +25 score if first time linking Twitter
        if (this._hasTwitter.get(addrU256).isZero()) {
            this._hasTwitter.set(addrU256, u256.One);
            const current = this._score.get(caller);
            this._score.set(caller, SafeMath.add(current, u256.fromU64(25)));
        }

        this.emitEvent(new ProfileSetEvent(caller, handle, pfpUrl));

        const w = new BytesWriter(1);
        w.writeBoolean(true);
        return w;
    }

    @method({ name: 'addr', type: ABIDataTypes.ADDRESS })
    @returns(
        { name: 'handleHash',   type: ABIDataTypes.UINT256 },
        { name: 'pfpHash',      type: ABIDataTypes.UINT256 },
        { name: 'score',        type: ABIDataTypes.UINT256 },
        { name: 'badgeCount',   type: ABIDataTypes.UINT256 },
        { name: 'endorseCount', type: ABIDataTypes.UINT256 },
    )
    public _getProfile(calldata: Calldata): BytesWriter {
        const addr = calldata.readAddress();
        const addrU256 = u256.fromUint8ArrayBE(addr);

        const handleHash   = this._profileHandle.get(addrU256);
        const pfpHash      = this._profilePfp.get(addrU256);
        const score        = this._score.get(addr);
        const badgeCount   = this._balanceOf(addr);
        const endorseCount = this._endorseCount.get(addr);

        const w = new BytesWriter(32 * 5);
        w.writeU256(handleHash);
        w.writeU256(pfpHash);
        w.writeU256(score);
        w.writeU256(badgeCount);
        w.writeU256(endorseCount);
        return w;
    }

    // ── Badge claiming ────────────────────────────────────────────────────────

    @method({ name: 'badgeId', type: ABIDataTypes.UINT256 })
    public _claimBadge(calldata: Calldata): BytesWriter {
        const badgeId = calldata.readU256();

        // Validate badge exists in registry
        if (this._badgeExists.get(badgeId).isZero()) {
            throw new Revert('Badge does not exist');
        }

        const caller = Blockchain.tx.sender;
        const key    = this._claimKey(caller, badgeId);

        // Check not already claimed
        if (!this._claimed.get(key).isZero()) {
            throw new Revert('Badge already claimed');
        }

        const badgeIdU32 = badgeId.toU32();

        // Badge-specific checks
        if (badgeIdU32 == 11) {
            // Linked: require Twitter handle set
            const addrU256 = u256.fromUint8ArrayBE(caller);
            if (this._profileHandle.get(addrU256).isZero()) {
                throw new Revert('Linked: set profile first');
            }
        }

        if (badgeIdU32 == 15) {
            // OPNet Legend: require 5+ badges already held
            const balance = this._balanceOf(caller);
            if (balance < u256.fromU64(5)) {
                throw new Revert('Legend: need 5+ badges first');
            }
        }

        // Mint NFT
        const tokenId = this._nextTokenId.value;
        this._mint(caller, tokenId);
        this._nextTokenId.value = SafeMath.add(tokenId, u256.One);

        // Record badge type
        this._badgeType.set(tokenId, badgeId);

        // Mark as claimed
        this._claimed.set(key, u256.One);

        // Update score
        const badgeScore = this._badgeScoreMap.get(badgeId);
        const current    = this._score.get(caller);
        this._score.set(caller, SafeMath.add(current, badgeScore));

        this.emitEvent(new BadgeClaimedEvent(caller, tokenId, badgeId));

        const w = new BytesWriter(32);
        w.writeU256(tokenId);
        return w;
    }

    @method(
        { name: 'addr', type: ABIDataTypes.ADDRESS },
        { name: 'badgeId', type: ABIDataTypes.UINT256 },
    )
    @returns({ name: 'claimed', type: ABIDataTypes.BOOL })
    public _hasClaimed(calldata: Calldata): BytesWriter {
        const addr    = calldata.readAddress();
        const badgeId = calldata.readU256();
        const key     = this._claimKey(addr, badgeId);
        const claimed = !this._claimed.get(key).isZero();
        const w = new BytesWriter(1);
        w.writeBoolean(claimed);
        return w;
    }

    @method({ name: 'tokenId', type: ABIDataTypes.UINT256 })
    @returns({ name: 'badgeId', type: ABIDataTypes.UINT256 })
    public _getBadgeType(calldata: Calldata): BytesWriter {
        const tokenId = calldata.readU256();
        const badgeId = this._badgeType.get(tokenId);
        const w = new BytesWriter(32);
        w.writeU256(badgeId);
        return w;
    }

    // ── Endorse ───────────────────────────────────────────────────────────────

    @method({ name: 'target', type: ABIDataTypes.ADDRESS })
    public _endorse(calldata: Calldata): BytesWriter {
        const target = calldata.readAddress();
        const caller = Blockchain.tx.sender;

        if (caller === target) throw new Revert('Cannot endorse yourself');

        const current = this._endorseCount.get(target);
        const newCount = SafeMath.add(current, u256.One);
        this._endorseCount.set(target, newCount);

        this.emitEvent(new EndorsedEvent(caller, target, newCount));

        const w = new BytesWriter(32);
        w.writeU256(newCount);
        return w;
    }

    // ── Badge registry (deployer-controlled) ──────────────────────────────────

    @method(
        { name: 'badgeId',    type: ABIDataTypes.UINT256 },
        { name: 'scoreValue', type: ABIDataTypes.UINT256 },
    )
    public _registerBadge(calldata: Calldata): BytesWriter {
        this.onlyDeployer(Blockchain.tx.sender);

        const badgeId    = calldata.readU256();
        const scoreValue = calldata.readU256();

        if (badgeId.isZero())    throw new Revert('badgeId cannot be zero');
        if (scoreValue.isZero()) throw new Revert('scoreValue cannot be zero');

        const isNew = this._badgeExists.get(badgeId).isZero();
        this._badgeScoreMap.set(badgeId, scoreValue);
        this._badgeExists.set(badgeId, u256.One);
        if (isNew) {
            this._badgeCount.value = SafeMath.add(this._badgeCount.value, u256.One);
        }

        this.emitEvent(new BadgeRegisteredEvent(badgeId, scoreValue));

        const w = new BytesWriter(1);
        w.writeBoolean(true);
        return w;
    }

    @method({ name: 'badgeId', type: ABIDataTypes.UINT256 })
    @returns(
        { name: 'exists',     type: ABIDataTypes.BOOL    },
        { name: 'scoreValue', type: ABIDataTypes.UINT256 },
    )
    public _getBadgeInfo(calldata: Calldata): BytesWriter {
        const badgeId    = calldata.readU256();
        const exists     = !this._badgeExists.get(badgeId).isZero();
        const scoreValue = this._badgeScoreMap.get(badgeId);

        const w = new BytesWriter(1 + 32);
        w.writeBoolean(exists);
        w.writeU256(scoreValue);
        return w;
    }

    @method()
    @returns({ name: 'count', type: ABIDataTypes.UINT256 })
    public _getBadgeCount(_: Calldata): BytesWriter {
        const w = new BytesWriter(32);
        w.writeU256(this._badgeCount.value);
        return w;
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private _claimKey(addr: Address, badgeId: u256): u256 {
        const w = new BytesWriter(32 + 32);
        w.writeAddress(addr);
        w.writeU256(badgeId);
        return u256.fromUint8ArrayBE(sha256(w.getBuffer()));
    }
}
