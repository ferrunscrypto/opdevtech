import { JSONRpcProvider } from 'opnet';

const MOTOSWAP_ROUTER = '0x0e6ff1f2d7db7556cb37729e3738f4dae82659b984b2621fab08e1111b1b937a';

export interface ScanResult {
    address:        string;
    deployments:    number;
    swaps:          number;
    gasSpent:       bigint;
    totalTxs:       number;
    failedTxs:      number;
    firstBlock:     number;
    score:          number;
    eligibleBadges: number[];
}

function computeEligibleBadges(r: ScanResult): number[] {
    const eligible: number[] = [];
    if (r.deployments >= 1)  eligible.push(1);
    if (r.deployments >= 5)  eligible.push(2);
    if (r.deployments >= 10) eligible.push(3);
    if (r.swaps >= 1)   eligible.push(4);
    if (r.swaps >= 10)  eligible.push(5);
    if (r.swaps >= 100) eligible.push(6);
    if (r.gasSpent >= 5_000_000_000n)  eligible.push(7);
    if (r.gasSpent >= 50_000_000_000n) eligible.push(8);
    if (r.firstBlock > 0 && r.firstBlock < 500)  eligible.push(9);
    if (r.firstBlock > 0 && r.firstBlock < 1_000) eligible.push(10);
    if (r.failedTxs >= 5) eligible.push(13);
    if (r.failedTxs === 0 && r.totalTxs >= 20) eligible.push(14);
    return eligible;
}

// Cache scan results for 60s
const scanCache = new Map<string, { result: ScanResult; ts: number }>();
const CACHE_TTL = 60_000;

// Cache bech32 → hex address resolution
const hexAddrCache = new Map<string, string>();

async function resolveHexAddress(provider: JSONRpcProvider, bech32Addr: string, isContract = false): Promise<string> {
    const cached = hexAddrCache.get(bech32Addr);
    if (cached) return cached;
    try {
        const info = await provider.getPublicKeyInfo(bech32Addr, isContract);
        const hex = (typeof info === 'string' ? info : info.toHex?.() ?? String(info)).toLowerCase();
        hexAddrCache.set(bech32Addr, hex);
        return hex;
    } catch {
        console.warn(`[scanner] Could not resolve hex address for ${bech32Addr}`);
        return '';
    }
}

function txFromAddress(tx: Record<string, unknown>, hexAddr: string): boolean {
    return String(tx.from ?? '').toLowerCase() === hexAddr;
}

export async function scanAddress(
    provider: JSONRpcProvider,
    address: string,
    onProgress?: (pct: number) => void,
): Promise<ScanResult> {
    const cached = scanCache.get(address);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return cached.result;
    }

    const hexAddr = await resolveHexAddress(provider, address);
    let deployments = 0;
    let swaps       = 0;
    let gasSpent    = 0n;
    let totalTxs    = 0;
    let failedTxs   = 0;
    let firstBlock  = 0;
    const interactionContracts: string[] = [];

    try {
        const currentBlock = await provider.getBlockNumber();
        const height = Number(currentBlock);
        console.log(`[scanner] Scanning ${address.slice(0, 16)}... (${height} blocks, hex=${hexAddr.slice(0, 18)})`);

        const BATCH = 10;
        for (let b = 1; b <= height; b += BATCH) {
            const promises: Promise<void>[] = [];
            for (let i = b; i < b + BATCH && i <= height; i++) {
                const blockNum = i;
                promises.push(
                    provider.getBlock(BigInt(blockNum), true)
                        .then(block => {
                            if (!block?.transactions) return;
                            for (const rawTx of block.transactions) {
                                const tx = rawTx as unknown as Record<string, unknown>;
                                const opType = String(tx.OPNetType ?? '');
                                if (opType === 'Generic') continue;

                                const isSender = hexAddr ? txFromAddress(tx, hexAddr) : false;
                                if (!isSender) continue;

                                totalTxs++;
                                if (firstBlock === 0 || blockNum < firstBlock) firstBlock = blockNum;
                                gasSpent += BigInt(String(tx.gasUsed ?? '0x0'));
                                if (tx.revert || tx.failed) failedTxs++;
                                if (opType === 'Deployment') deployments++;
                                if (opType === 'Interaction') {
                                    interactionContracts.push(String(tx.contractAddress ?? ''));
                                }
                            }
                        })
                        .catch(() => {})
                );
            }
            await Promise.all(promises);
            onProgress?.(Math.min(100, Math.round((b / height) * 100)));
        }

        // Resolve interaction contracts to detect MotoSwap swaps
        const uniqueContracts = [...new Set(interactionContracts.filter(a => a.length > 0))];
        for (const bech32Addr of uniqueContracts) {
            const contractHex = await resolveHexAddress(provider, bech32Addr, true);
            if (contractHex === MOTOSWAP_ROUTER.toLowerCase()) {
                swaps += interactionContracts.filter(a => a === bech32Addr).length;
            }
        }

        console.log(`[scanner] Done: txs=${totalTxs} deploys=${deployments} swaps=${swaps} gas=${gasSpent}`);
    } catch (err) {
        console.warn(`[scanner] Error scanning ${address}:`, err);
    }

    const partial = { address, deployments, swaps, gasSpent, totalTxs, failedTxs, firstBlock };
    const eligibleBadges = computeEligibleBadges({ ...partial, score: 0, eligibleBadges: [] });
    const result: ScanResult = { ...partial, score: 0, eligibleBadges };

    scanCache.set(address, { result, ts: Date.now() });
    return result;
}
