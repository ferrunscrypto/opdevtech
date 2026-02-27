# opdev.tech — OPNet Identity & Achievement Badges

> OPNet competition entry. Every Bitcoin address gets an on-chain identity: a reputation score derived from real on-chain activity and a collection of soulbound (non-transferable) achievement badge NFTs minted on Bitcoin via OPNet.

**Live:** https://opdev-tech.pages.dev

---

## Overview

opdev.tech scans your on-chain history — deployments, swaps, gas spent, transaction patterns — computes a reputation score, and lets you mint soulbound OP721 NFT badges that prove what you've actually done on Bitcoin.

**Key features:**
- **Soulbound NFTs** — all transfer/approve methods revert; badges cannot be sold or moved
- **Real on-chain scan** — eligibility computed from live block-by-block RPC data, not self-reported
- **Extensible badge registry** — deployer can add new badge types without redeploying
- **Twitter/X identity** — link your X handle via OAuth for the "Linked" badge
- **Endorse system** — peer endorsements unlock the "Vouched" badge
- **Leaderboard** — ranked by badge score with per-entry endorse button
- **Wallet-compatible metadata** — `tokenURI` returns HTTPS URL with PNG image (renders in OP_WALLET)
- **Profile sharing** — pre-filled tweet with on-chain verification link

---

## Badge Definitions (17 total)

| ID | Name | Track | Requirement | Score |
|----|------|-------|-------------|-------|
| 1  | First Deploy | Builder | 1+ contract deployed | +100 |
| 2  | Smart Architect | Builder | 5+ contracts deployed | +250 |
| 3  | Contract Factory | Builder | 10+ contracts deployed | +500 |
| 4  | First Swap | Trader | 1+ swap on MotoSwap | +50 |
| 5  | Active Trader | Trader | 10+ swaps | +150 |
| 6  | Swap Veteran | Trader | 100+ swaps | +400 |
| 7  | Gas Burner | Gas | 50k+ sats in gas spent | +75 |
| 8  | Inferno | Gas | 500k+ sats in gas spent | +200 |
| 9  | OPNet OG | OG | First tx before block 500 | +300 |
| 10 | Early Adopter | OG | First tx before block 1,000 | +150 |
| 11 | Linked | Social | Twitter profile linked via OAuth | +25 |
| 12 | Vouched | Social | 3+ endorsements received | +100 |
| 13 | Battle Hardened | Resilience | 5+ failed transactions | +50 |
| 14 | Diamond Hands | Resilience | 0 failed + 20+ successful txs | +200 |
| 15 | OPNet Legend | Master | 5+ different badges held | +1000 |
| 16 | OPNet Ally | Social | Following [@opnetbtc](https://x.com/opnetbtc) on X | +50 |
| 17 | CatPound Pack | Social | Following [@catpoundfinance](https://x.com/catpoundfinance) on X | +50 |

---

## Project Structure

```
opdevtech/
├── contract/
│   ├── src/DevTech.ts       OP721 soulbound contract (AssemblyScript)
│   ├── deploy.mjs           Deployment script
│   ├── build/DevTech.wasm   Compiled contract
│   └── .env                 DEPLOYER_MNEMONIC (gitignored)
├── frontend/
│   ├── src/
│   │   ├── abi/DevTechABI.ts      Contract ABI + badge metadata
│   │   ├── components/            ProfileCard, BadgeCard, BadgeGrid, Header
│   │   ├── contexts/              WalletContext (OP_WALLET integration)
│   │   ├── hooks/                 useDevTech, useProvider
│   │   ├── pages/                 DashboardPage, LeaderboardPage, LandingPage
│   │   ├── utils/scanner.ts       On-chain activity scanner
│   │   └── config/                networks.ts, contracts.ts
│   ├── functions/api/             Cloudflare Pages Functions (serverless)
│   │   ├── leaderboard.ts         GET/POST leaderboard (KV-backed)
│   │   ├── nft/[tokenId].ts       NFT metadata endpoint
│   │   ├── nft/register.ts        tokenId→badgeId KV registration
│   │   └── twitter/               OAuth2 PKCE flow + profile + recheck
│   ├── public/badges/             badge_01–17.svg + badge_01–17.png
│   └── wrangler.toml              Cloudflare Pages config
└── deployments.json               Deployment history
```

---

## Deployed Contracts (OPNet Testnet)

| Address | Status |
|---------|--------|
| `opt1sqry9v4jmavvlju2znyvw59v2khlymrx9usfargz5` | **Active** |
| `opt1sqzrv3vdawhvf0yyytjw5h7rq6vuhlzv7wv05eqew` | Superseded |
| `opt1sqr6x7mejkufn7n9xkue6k6s9xlq2xvxkzvv3w8ap` | Superseded |

Deployer: `opt1pq45c7qx5snvrgfv9drnlaspf2thzmrhzj5gr6cuk289n7dekaukqe7ps2r`

---

## Setup

### Contract

```bash
cd contract
npm install
npm run build
# → build/DevTech.wasm
```

Deploy to testnet:
```bash
# Create contract/.env: DEPLOYER_MNEMONIC="twelve word mnemonic"
node deploy.mjs
```

### Frontend (local dev)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
# /api routes proxy to https://opdev-tech.pages.dev
```

### Deploy to Cloudflare Pages

```bash
cd frontend
npm run build
npx wrangler pages deploy dist --project-name opdev-tech --branch main
```

---

## Technical Details

- **Contract:** AssemblyScript → WASM, deployed on OPNet testnet (Signet fork)
- **Standard:** OP721 (soulbound — all transfer methods revert)
- **tokenURI:** returns `https://opdev-tech.pages.dev/api/nft/{tokenId}` → JSON with PNG image
- **Badge images:** SVG (icon-only, emoji) for the web app; PNG (256×256, Chrome-rendered) for wallets
- **Eligibility:** computed client-side by scanning every block via `provider.getBlock()` batched in groups of 10
- **Metadata storage:** Cloudflare KV (`tokenId → badgeId` mapping, leaderboard, Twitter profiles)
- **Twitter OAuth:** OAuth2 PKCE — stateless state param encodes address + returnUrl + codeVerifier
- **Network:** OPNet Testnet (`networks.opnetTestnet`, bech32 prefix `opt`)
- **SDK:** `opnet@1.8.1-rc.14`, `@btc-vision/transaction@1.8.0-rc.9`
- **Frontend:** React 19 + Vite + Tailwind CSS 4, deployed on Cloudflare Pages

---

## Adding New Badges

Call `_registerBadge(badgeId, scoreValue)` from the deployer address — no redeploy needed:

```typescript
// via frontend contract call:
contract._registerBadge(BigInt(18), BigInt(200));
```

Then add the badge metadata to `frontend/src/abi/DevTechABI.ts` and a badge image to `public/badges/`.
