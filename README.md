# SatScore — BTC-Native Identity & Achievement Protocol

> OPNet competition entry. Every Bitcoin public key gets an on-chain identity: a reputation score derived from real on-chain activity and a collection of soulbound (non-transferable) achievement badge NFTs.

## Overview

SatScore scans your on-chain history — deployments, swaps, gas, transaction patterns — computes a reputation score, and lets you mint soulbound OP721 NFT badges that prove what you've actually done on Bitcoin.

**Key features:**
- **Fully on-chain SVG** — `tokenURI` generates badge art inside the contract, no external hosting
- **Soulbound NFTs** — all transfer/approve methods revert; badges cannot be sold
- **Extensible badge registry** — deployer can add new badge types without redeploying
- **Twitter identity** — link your X handle on-chain for the "Linked" badge (+25 pts)
- **Endorse system** — peer endorsements unlock the "Vouched" badge

---

## Badge Definitions

| ID | Name | Track | Requirement | Score |
|----|------|-------|-------------|-------|
| 1  | First Deploy | Builder | 1+ contract deployed | +100 |
| 2  | Smart Architect | Builder | 5+ contracts deployed | +250 |
| 3  | Contract Factory | Builder | 10+ contracts deployed | +500 |
| 4  | First Swap | Trader | 1+ swap on MotoSwap | +50 |
| 5  | Active Trader | Trader | 10+ swaps | +150 |
| 6  | Swap Veteran | Trader | 100+ swaps | +400 |
| 7  | Gas Burner | Gas | 50k+ sats in gas | +75 |
| 8  | Inferno | Gas | 500k+ sats in gas | +200 |
| 9  | OPNet OG | OG | First tx before block 50k | +300 |
| 10 | Early Adopter | OG | First tx before block 100k | +150 |
| 11 | Linked | Social | Twitter handle set on-chain | +25 |
| 12 | Vouched | Social | 3+ endorsements received | +100 |
| 13 | Battle Hardened | Resilience | 10+ failed txs | +50 |
| 14 | Diamond Hands | Resilience | 0 failed + 20+ successful txs | +200 |
| 15 | OPNet Legend | Master | 5+ badges held | +1000 |

---

## Project Structure

```
satscore/
├── contract/        AssemblyScript OP721 contract
│   ├── src/SatScore.ts
│   ├── deploy.mjs
│   └── build/SatScore.wasm (after build)
├── backend/         Node.js Express + chain scanner + Twitter OAuth
│   └── src/
├── frontend/        React 19 + Vite + Tailwind
│   └── src/
├── badges/          AI-generated badge images + preview.html
└── deployments.json Updated after each deployment
```

---

## Setup

### 1. Contract

```bash
cd contract
npm install
npm run build
# → build/SatScore.wasm
```

Deploy to testnet:
```bash
# Create contract/.env with: DEPLOYER_MNEMONIC="your twelve word mnemonic phrase here"
node deploy.mjs testnet
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill TWITTER_CLIENT_ID in .env
npm run dev
# → http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
# Create frontend/.env: VITE_SATSCORE_ADDRESS=opt1sq...
npm run dev
# → http://localhost:5173
```

---

## Score Formula

```
score = (deployments × 100) + (swaps × 10) + (gasSpent / 10,000)
      + (badgeCount × 50) + (hasTwitter ? 25 : 0)
```

---

## Adding New Badges

After deployment, call `_registerBadge(badgeId, scoreValue)` from the deployer address:

```typescript
// Frontend/backend call:
contract._registerBadge(BigInt(16), BigInt(300));
```

No redeploy required. The contract generates on-chain SVG for new badges using static color/icon mappings (shows "Custom Badge" for IDs > 15).

---

## Technical Details

- **Contract:** AssemblyScript → WASM, deployed on OPNet testnet (Signet fork)
- **Soulbound:** `safeTransfer`, `safeTransferFrom`, `approve`, `setApprovalForAll` all revert
- **Token URI:** fully on-chain `data:application/json;base64,...` containing embedded SVG
- **Claim key:** `sha256(address || badgeId)` — collision-resistant, supports any badgeId size
- **Network:** OPNet Testnet (`networks.opnetTestnet`, bech32 prefix `opt`)
- **SDK:** `opnet@1.8.1-rc.12`, `@btc-vision/transaction@1.8.0-rc.9`

---

## Deployed Contracts

See `deployments.json` after running deploy script.
