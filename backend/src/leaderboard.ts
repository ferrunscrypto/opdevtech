import { readFileSync, writeFileSync, existsSync } from 'fs';
import { ScanResult } from './scanner.js';

const LB_FILE = './leaderboard.json';

export interface LeaderboardEntry {
    address:     string;
    score:       number;
    totalTxs:    number;
    deployments: number;
    swaps:       number;
    badgeCount:  number;
    lastScan:    number;   // timestamp
}

// In-memory store
let entries: Map<string, LeaderboardEntry> = new Map();

// Load from disk on startup
function loadFromDisk(): void {
    if (!existsSync(LB_FILE)) return;
    try {
        const raw = readFileSync(LB_FILE, 'utf-8');
        const arr = JSON.parse(raw) as LeaderboardEntry[];
        for (const e of arr) {
            entries.set(e.address, e);
        }
        console.log(`[leaderboard] Loaded ${entries.size} entries from disk`);
    } catch {
        console.warn('[leaderboard] Could not load leaderboard file');
    }
}

function saveToDisk(): void {
    try {
        const arr = [...entries.values()];
        writeFileSync(LB_FILE, JSON.stringify(arr, null, 2));
    } catch {
        console.warn('[leaderboard] Could not save leaderboard file');
    }
}

// Call on startup
loadFromDisk();

/** Update leaderboard when a scan completes.
 *  Only addresses with badgeCount >= 1 are shown on the leaderboard.
 *  If badgeCount is 0 or not provided, the entry is removed. */
export function updateLeaderboard(scan: ScanResult, badgeCount?: number): void {
    const count = badgeCount ?? 0;

    if (count < 1) {
        // Remove from leaderboard if they have no badges
        if (entries.has(scan.address)) {
            entries.delete(scan.address);
            saveToDisk();
        }
        return;
    }

    entries.set(scan.address, {
        address:     scan.address,
        score:       scan.score,
        totalTxs:    scan.totalTxs,
        deployments: scan.deployments,
        swaps:       scan.swaps,
        badgeCount:  count,
        lastScan:    Date.now(),
    });
    saveToDisk();
}

/** Get sorted leaderboard (highest score first) */
export function getLeaderboard(): LeaderboardEntry[] {
    return [...entries.values()]
        .sort((a, b) => b.score - a.score);
}

/** Get leaderboard size */
export function getLeaderboardSize(): number {
    return entries.size;
}
