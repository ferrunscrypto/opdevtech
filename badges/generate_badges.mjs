/**
 * dev.tech NFT Badge Generator
 * Run: OPENAI_API_KEY=sk-... node generate_badges.mjs
 *
 * Requires: node-fetch (or Node 18+ built-in fetch)
 * Saves badge_01.png through badge_05.png in the same directory.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = __dirname;

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("ERROR: Set OPENAI_API_KEY environment variable before running.");
  process.exit(1);
}

const BADGES = [
  {
    filename: "badge_01.png",
    prompt:
      "Circular badge design, very dark background (#0a0b0f near-black), glowing electric blue (#3b82f6) border ring around the circle edge with light bloom effect. In the center, a stylized glowing circuit board icon with electric blue traces and nodes, rendered in a flat crypto/web3 aesthetic. At the bottom inside the circle, the text \"FIRST DEPLOY\" in clean white sans-serif uppercase letters. Overall look: professional NFT badge, dark crypto aesthetic, electric blue glow effects radiating from center. No other text, no watermarks, no extra labels.",
  },
  {
    filename: "badge_02.png",
    prompt:
      "Circular badge design, very dark background (#0a0b0f near-black), glowing electric blue (#3b82f6) border ring around the circle edge with light bloom effect. In the center, a stylized glowing architectural blueprint or smart contract diagram icon — geometric lines forming a hexagonal structure or layered contract diagram, rendered in electric blue on dark, flat crypto/web3 aesthetic. At the bottom inside the circle, the text \"SMART ARCHITECT\" in clean white sans-serif uppercase letters. Overall look: professional NFT badge, dark crypto aesthetic, electric blue glow effects. No other text, no watermarks, no extra labels.",
  },
  {
    filename: "badge_03.png",
    prompt:
      "Circular badge design, very dark background (#0a0b0f near-black), glowing electric blue (#3b82f6) border ring around the circle edge with light bloom effect. In the center, a stylized glowing factory and gear assembly icon — interlocking gears with small factory silhouette, rendered in electric blue glowing lines, flat crypto/web3 aesthetic. At the bottom inside the circle, the text \"CONTRACT FACTORY\" in clean white sans-serif uppercase letters. Overall look: professional NFT badge, dark crypto aesthetic, electric blue glow effects radiating outward. No other text, no watermarks, no extra labels.",
  },
  {
    filename: "badge_04.png",
    prompt:
      "Circular badge design, very dark background (#0a0b0f near-black), glowing neon green (#4ade80) border ring around the circle edge with light bloom effect. In the center, a stylized glowing swap/exchange icon — two curved arrows forming a cycle or exchange symbol, rendered in neon green glowing lines, flat crypto/web3 DeFi aesthetic. At the bottom inside the circle, the text \"FIRST SWAP\" in clean white sans-serif uppercase letters. Overall look: professional NFT badge, dark crypto aesthetic, neon green glow effects. No other text, no watermarks, no extra labels.",
  },
  {
    filename: "badge_05.png",
    prompt:
      "Circular badge design, very dark background (#0a0b0f near-black), glowing neon green (#4ade80) border ring around the circle edge with light bloom effect. In the center, a stylized glowing upward-trending candlestick or line chart icon — sharp upward diagonal line or ascending bar chart, rendered in neon green glowing lines, flat crypto/web3 trading aesthetic. At the bottom inside the circle, the text \"ACTIVE TRADER\" in clean white sans-serif uppercase letters. Overall look: professional NFT badge, dark crypto aesthetic, neon green glow effects radiating from the chart. No other text, no watermarks, no extra labels.",
  },
];

async function generateBadge(badge, index) {
  console.log(`[${index + 1}/5] Generating ${badge.filename} ...`);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: badge.prompt,
      n: 1,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error for ${badge.filename}: ${err}`);
  }

  const data = await response.json();

  // gpt-image-1 returns base64 in data[0].b64_json
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error(`No image data returned for ${badge.filename}: ${JSON.stringify(data)}`);
  }

  const buf = Buffer.from(b64, "base64");
  const outPath = path.join(OUTPUT_DIR, badge.filename);
  fs.writeFileSync(outPath, buf);
  console.log(`  Saved: ${outPath} (${(buf.length / 1024).toFixed(1)} KB)`);
  return outPath;
}

async function main() {
  console.log("dev.tech Badge Generator");
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log("Generating 5 badges sequentially (to avoid rate limits)...\n");

  const results = [];
  for (let i = 0; i < BADGES.length; i++) {
    try {
      const outPath = await generateBadge(BADGES[i], i);
      results.push({ ok: true, file: outPath });
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      results.push({ ok: false, file: BADGES[i].filename, error: err.message });
    }
  }

  console.log("\n--- Results ---");
  for (const r of results) {
    if (r.ok) {
      console.log(`  OK  ${r.file}`);
    } else {
      console.log(`  ERR ${r.file}: ${r.error}`);
    }
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
