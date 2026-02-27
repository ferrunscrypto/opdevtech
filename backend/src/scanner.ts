import { JSONRpcProvider } from 'opnet';
import { networks } from '@btc-vision/bitcoin';
import { config, MOTOSWAP_ROUTER } from './config.js';

export interface ScanResult {
    address:       string;
    deployments:   number;
    swaps:         number;
    gasSpent:      bigint;
    totalTxs:      number;
    failedTxs:     number;
    firstBlock:    number;
    score:         number;
    eligibleBadges: number[];
}

// Badge requirement checks
function computeEligibleBadges(r: ScanResult): number[] {
    const eligible: number[] = [];

    // Builder
    if (r.deployments >= 1)  eligible.push(1);
    if (r.deployments >= 5)  eligible.push(2);
    if (r.deployments >= 10) eligible.push(3);

    // Trader
    if (r.swaps >= 1)   eligible.push(4);
    if (r.swaps >= 10)  eligible.push(5);
    if (r.swaps >= 100) eligible.push(6);

    // Gas
    if (r.gasSpent >= 50_000n)  eligible.push(7);
    if (r.gasSpent >= 500_000n) eligible.push(8);

    // OG
    if (r.firstBlock > 0 && r.firstBlock < 50_000)  eligible.push(9);
    if (r.firstBlock > 0 && r.firstBlock < 100_000) eligible.push(10);

    // Social (11 requires on-chain profile set — checked separately)
    // Vouched (12) requires endorsements — not scannable here

    // Resilience
    if (r.failedTxs >= 10) eligible.push(13);
    if (r.failedTxs == 0 && r.totalTxs >= 20) eligible.push(14);

    return eligible;
}

function computeScore(r: Omit<ScanResult, 'score' | 'eligibleBadges'>): number {
    return (r.deployments * 100)
        + (r.swaps * 10)
        + Number(r.gasSpent / 10_000n);
}

let provider: JSONRpcProvider | null = null;

function getProvider(): JSONRpcProvider {
    if (!provider) {
        provider = new JSONRpcProvider({
            url:     config.opnetRpcUrl,
            network: networks.opnetTestnet,
        });
    }
    return provider;
}

export async function scanAddress(address: string): Promise<ScanResult> {
    const rpc = getProvider();

    let deployments = 0;
    let swaps       = 0;
    let gasSpent    = 0n;
    let totalTxs    = 0;
    let failedTxs   = 0;
    let firstBlock  = 0;

    try {
        // Fetch transaction history
        const txHistory = await rpc.getTransactionsByAddress(address, 0, 500).catch(() => null);

        if (txHistory && Array.isArray(txHistory)) {
            for (const tx of txHistory) {
                totalTxs++;

                const blockNum = Number(tx.blockHeight ?? tx.blockNumber ?? 0);
                if (blockNum > 0 && (firstBlock === 0 || blockNum < firstBlock)) {
                    firstBlock = blockNum;
                }

                if (tx.revert || tx.status === 'failed' || tx.status === false) {
                    failedTxs++;
                }

                // Accumulate gas (stored as sats)
                const gas = BigInt(tx.gasFee ?? tx.fee ?? 0);
                gasSpent += gas;

                // Detect deployments: tx.type === 'deployment' or contractAddress differs
                if (tx.type === 'deployment' || tx.isDeployment === true) {
                    deployments++;
                }

                // Detect swaps: interaction with MotoSwap router
                const to = (tx.to ?? '').toLowerCase();
                if (to === MOTOSWAP_ROUTER.toLowerCase() ||
                    to === MOTOSWAP_ROUTER.toLowerCase().replace('0x', '')) {
                    swaps++;
                }
            }
        }
    } catch (err) {
        console.warn(`[scanner] Error scanning ${address}:`, err);
    }

    // Fallback: try getTransactions if getTransactionsByAddress unavailable
    if (totalTxs === 0) {
        try {
            const altHistory = await (rpc as unknown as Record<string, (addr: string) => Promise<unknown[]>>)
                .getTransactions(address).catch(() => []);
            totalTxs = altHistory.length;
        } catch {
            // silent
        }
    }

    const partial = { address, deployments, swaps, gasSpent, totalTxs, failedTxs, firstBlock };
    const score   = computeScore(partial);
    const eligibleBadges = computeEligibleBadges({ ...partial, score, eligibleBadges: [] });

    return { ...partial, score, eligibleBadges };
}
