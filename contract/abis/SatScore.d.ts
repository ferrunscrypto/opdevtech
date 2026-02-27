import { Address, AddressMap, ExtendedAddressMap, SchnorrSignature } from '@btc-vision/transaction';
import { CallResult, OPNetEvent, IOP_NETContract } from 'opnet';

// ------------------------------------------------------------------
// Event Definitions
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Call Results
// ------------------------------------------------------------------

/**
 * @description Represents the result of the safeTransfer function call.
 */
export type SafeTransfer = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the safeTransferFrom function call.
 */
export type SafeTransferFrom = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the approve function call.
 */
export type Approve = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the setApprovalForAll function call.
 */
export type SetApprovalForAll = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the tokenURI function call.
 */
export type TokenURI = CallResult<
    {
        uri: string;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the _setProfile function call.
 */
export type setProfile = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the _getProfile function call.
 */
export type getProfile = CallResult<
    {
        handleHash: bigint;
        pfpHash: bigint;
        score: bigint;
        badgeCount: bigint;
        endorseCount: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the _claimBadge function call.
 */
export type claimBadge = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the _hasClaimed function call.
 */
export type hasClaimed = CallResult<
    {
        claimed: boolean;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the _getBadgeType function call.
 */
export type getBadgeType = CallResult<
    {
        badgeId: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the _endorse function call.
 */
export type endorse = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the _registerBadge function call.
 */
export type registerBadge = CallResult<{}, OPNetEvent<never>[]>;

/**
 * @description Represents the result of the _getBadgeInfo function call.
 */
export type getBadgeInfo = CallResult<
    {
        exists: boolean;
        scoreValue: bigint;
    },
    OPNetEvent<never>[]
>;

/**
 * @description Represents the result of the _getBadgeCount function call.
 */
export type getBadgeCount = CallResult<
    {
        count: bigint;
    },
    OPNetEvent<never>[]
>;

// ------------------------------------------------------------------
// ISatScore
// ------------------------------------------------------------------
export interface ISatScore extends IOP_NETContract {
    safeTransfer(to: Address, tokenId: bigint, data: Uint8Array): Promise<SafeTransfer>;
    safeTransferFrom(from: Address, to: Address, tokenId: bigint, data: Uint8Array): Promise<SafeTransferFrom>;
    approve(operator: Address, tokenId: bigint): Promise<Approve>;
    setApprovalForAll(operator: Address, approved: boolean): Promise<SetApprovalForAll>;
    tokenURI(tokenId: bigint): Promise<TokenURI>;
    _setProfile(handle: string, pfpUrl: string): Promise<setProfile>;
    _getProfile(addr: Address): Promise<getProfile>;
    _claimBadge(badgeId: bigint): Promise<claimBadge>;
    _hasClaimed(addr: Address, badgeId: bigint): Promise<hasClaimed>;
    _getBadgeType(tokenId: bigint): Promise<getBadgeType>;
    _endorse(target: Address): Promise<endorse>;
    _registerBadge(badgeId: bigint, scoreValue: bigint): Promise<registerBadge>;
    _getBadgeInfo(badgeId: bigint): Promise<getBadgeInfo>;
    _getBadgeCount(): Promise<getBadgeCount>;
}
