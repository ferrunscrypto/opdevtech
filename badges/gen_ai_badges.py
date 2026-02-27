#!/usr/bin/env python3
"""
dev.tech AI Badge Generator
Generates badge_01.png through badge_15.png using OpenAI gpt-image-1.

Usage:
    export OPENAI_API_KEY="sk-..."
    python3 gen_ai_badges.py

The SVG fallbacks (badge_01.svg ... badge_15.svg) are already present.
This script replaces them with AI-generated PNGs for a higher-fidelity look.
After generating, copy PNGs to ../frontend/public/badges/ as well.
"""

import openai
import base64
import os
import pathlib
import time

client = openai.OpenAI()
output_dir = pathlib.Path(__file__).parent
output_dir.mkdir(parents=True, exist_ok=True)

BADGES = [
    {
        "file": "badge_01.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing electric blue (#3b82f6) border ring with neon bloom. Center: glowing circuit board deploy icon with electric blue traces. Text 'FIRST DEPLOY' in white bold at bottom. Professional crypto NFT aesthetic, dark cosmic background."
    },
    {
        "file": "badge_02.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing electric blue (#3b82f6) border ring. Center: architectural blueprint / smart contract hexagonal diagram icon in electric blue glowing lines. Text 'SMART ARCHITECT' in white bold at bottom. Professional crypto NFT aesthetic."
    },
    {
        "file": "badge_03.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing electric blue (#3b82f6) border ring. Center: interlocking gears with small factory silhouette, electric blue glow. Text 'CONTRACT FACTORY' in white bold at bottom. Professional crypto NFT aesthetic."
    },
    {
        "file": "badge_04.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing neon green (#4ade80) border ring. Center: swap/exchange arrows forming a cycle symbol in neon green glow, DeFi aesthetic. Text 'FIRST SWAP' in white bold at bottom. Professional crypto NFT aesthetic."
    },
    {
        "file": "badge_05.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing neon green (#4ade80) border ring. Center: upward-trending candlestick chart, sharp ascending line in neon green glow. Text 'ACTIVE TRADER' in white bold at bottom. Professional crypto trading NFT aesthetic."
    },
    {
        "file": "badge_06.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing neon green (#4ade80) border ring. Center: veteran trophy medal with laurel wreath in neon green glow, metallic gold cup. Text 'SWAP VETERAN' in white bold at bottom. Professional crypto NFT aesthetic."
    },
    {
        "file": "badge_07.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing orange-red (#f97316) border ring. Center: gas pump surrounded by intense flames in orange-red glow, fire licking upward. Text 'GAS BURNER' in white bold at bottom. Professional crypto NFT aesthetic."
    },
    {
        "file": "badge_08.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing orange-red (#f97316) border ring. Center: massive roaring inferno explosion, fire burst radiating outward, molten white-hot core, ember particles. Text 'INFERNO' in white bold at bottom. Professional crypto NFT aesthetic."
    },
    {
        "file": "badge_09.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing gold (#eab308) border ring. Center: royal crown with 'OG' etched in center, golden jewels, golden stars, regal glow aura. Text 'OPNET OG' in white bold at bottom. Legendary crypto NFT aesthetic."
    },
    {
        "file": "badge_10.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing gold (#eab308) border ring. Center: golden sunrise with rays spreading upward, small seedling sprout silhouette in foreground. Text 'EARLY ADOPTER' in white bold at bottom. Professional crypto NFT aesthetic."
    },
    {
        "file": "badge_11.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing purple (#a855f7) border ring. Center: Twitter/X bird combined with chain-link icon, purple neon social connection glow, particle effects. Text 'LINKED' in white bold at bottom. Professional web3/social NFT aesthetic."
    },
    {
        "file": "badge_12.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing purple (#a855f7) border ring. Center: two hands shaking with glowing verification checkmark above, purple endorsement glow. Text 'VOUCHED' in white bold at bottom. Professional web3/social NFT aesthetic."
    },
    {
        "file": "badge_13.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing red (#ef4444) border ring. Center: crossed sword and battle-scarred shield, fiery red-orange glow, ember and smoke particles. Text 'BATTLE HARDENED' in white bold at bottom. Battle-worn crypto NFT aesthetic."
    },
    {
        "file": "badge_14.png",
        "prompt": "Circular badge, dark background (#0a0b0f), glowing red (#ef4444) border ring with diamond sparkle accents. Center: brilliant-cut diamond held by glowing hands, blue-white and red prismatic facets, rainbow sparkle particles. Text 'DIAMOND HANDS' in white bold at bottom. Premium crypto NFT aesthetic."
    },
    {
        "file": "badge_15.png",
        "prompt": "Circular badge, dark background (#0a0b0f), spectacular rainbow and gold (#fbbf24) aurora border ring cycling all spectrum colors. Center: magnificent royal crown with rainbow prismatic aura, gemstones glowing in multiple colors, golden mythic rays. Text 'OPNET LEGEND' in white bold with golden shimmer at bottom. Ultimate legendary master-tier NFT badge, cosmic rainbow star particles."
    },
]


def generate(badge: dict, index: int) -> None:
    print(f"[{index+1:02d}/15] {badge['file']} ...", flush=True)
    try:
        response = client.images.generate(
            model="gpt-image-1",
            prompt=badge["prompt"],
            size="1024x1024",
            quality="medium",
            n=1,
        )
        img_bytes = base64.b64decode(response.data[0].b64_json)
        out = output_dir / badge["file"]
        out.write_bytes(img_bytes)
        kb = len(img_bytes) / 1024
        print(f"         Saved {out.name} ({kb:.0f} KB)")
    except Exception as e:
        print(f"         FAILED: {e}")


def main():
    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key or not api_key.startswith("sk-"):
        print("ERROR: Set OPENAI_API_KEY before running.")
        raise SystemExit(1)

    print(f"dev.tech AI Badge Generator — {len(BADGES)} badges")
    print(f"Output: {output_dir}\n")

    for i, badge in enumerate(BADGES):
        generate(badge, i)
        if i < len(BADGES) - 1:
            time.sleep(2)  # avoid rate limits

    print("\nDone! Copy PNGs to frontend/public/badges/ as well:")
    print("  cp badges/*.png frontend/public/badges/")


if __name__ == "__main__":
    main()
