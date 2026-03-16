import { Request, Response, Router } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { agents, pointsHistory } from "@shared/schema";
import { eq, sql, sum } from "drizzle-orm";
import { verifyToken } from "./auth";

const router = Router();

function agentColorFromId(id: string): { h: number; accent: string; glow: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return {
    h: hue,
    accent: `hsl(${hue}, 80%, 60%)`,
    glow: `hsl(${hue}, 90%, 50%)`,
  };
}

function tierFromRating(rating: number): { name: string; color: string; bg: string } {
  if (rating >= 5000) return { name: "APEX", color: "#ff4444", bg: "#ff444420" };
  if (rating >= 3000) return { name: "DIAMOND", color: "#b9f2ff", bg: "#b9f2ff20" };
  if (rating >= 2000) return { name: "PLATINUM", color: "#e5e4e2", bg: "#e5e4e220" };
  if (rating >= 1500) return { name: "GOLD", color: "#fbbf24", bg: "#fbbf2420" };
  if (rating >= 1200) return { name: "SILVER", color: "#94a3b8", bg: "#94a3b820" };
  return { name: "BRONZE", color: "#cd7f32", bg: "#cd7f3220" };
}

function generateCardSVG(agent: any, totalPoints: number) {
  const { accent, glow, h } = agentColorFromId(agent.id);
  const tier = tierFromRating(agent.arenaRating || 1000);
  const wins = agent.arenaWins || 0;
  const losses = agent.arenaLosses || 0;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const rating = agent.arenaRating || 1000;
  const bapVerified = agent.bap578Status === "registered";
  const ercVerified = agent.erc8004Status === "registered";
  const name = (agent.name || "Anonymous").slice(0, 20);
  const initial = name.slice(0, 1).toUpperCase();

  const hexPatterns = Array.from({ length: 12 }, (_, i) => {
    const x = 50 + (i % 4) * 140 + ((Math.floor(i / 4) % 2) * 70);
    const y = 30 + Math.floor(i / 4) * 120;
    const opacity = 0.03 + (Math.abs(((agent.id.charCodeAt(i % agent.id.length) * 7) % 100)) / 1000);
    return `<polygon points="${x},${y - 30} ${x + 26},${y - 15} ${x + 26},${y + 15} ${x},${y + 30} ${x - 26},${y + 15} ${x - 26},${y - 15}" fill="none" stroke="${accent}" stroke-width="0.5" opacity="${opacity}" />`;
  }).join("\n");

  const scanLines = Array.from({ length: 8 }, (_, i) => {
    const y = 80 + i * 50;
    return `<line x1="0" y1="${y}" x2="600" y2="${y}" stroke="${accent}" stroke-width="0.3" opacity="0.04" />`;
  }).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 315" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a1a"/>
      <stop offset="50%" stop-color="#0d0d24"/>
      <stop offset="100%" stop-color="#0a0a1a"/>
    </linearGradient>
    <linearGradient id="card-border" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="${glow}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.6"/>
    </linearGradient>
    <linearGradient id="accent-grad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${glow}"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-strong">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="card-clip">
      <rect x="10" y="10" width="580" height="295" rx="16"/>
    </clipPath>
  </defs>

  <rect width="600" height="315" fill="url(#bg)" rx="16"/>

  <g clip-path="url(#card-clip)">
    ${hexPatterns}
    ${scanLines}

    <rect x="10" y="10" width="580" height="295" rx="16" fill="none" stroke="url(#card-border)" stroke-width="1.5"/>

    <rect x="10" y="10" width="580" height="4" fill="url(#accent-grad)" opacity="0.8" rx="2"/>
  </g>

  <circle cx="75" cy="100" r="36" fill="${accent}" opacity="0.12"/>
  <circle cx="75" cy="100" r="36" fill="none" stroke="${accent}" stroke-width="1.5" opacity="0.6"/>
  <text x="75" y="108" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="${accent}">${initial}</text>

  <text x="125" y="88" font-family="Arial,sans-serif" font-size="22" font-weight="bold" fill="white">${name}</text>

  ${bapVerified ? `
  <rect x="125" y="96" width="50" height="18" rx="9" fill="#fbbf2420" stroke="#fbbf24" stroke-width="0.8"/>
  <text x="150" y="109" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="bold" fill="#fbbf24">NFA ✓</text>
  ` : ""}
  ${ercVerified ? `
  <rect x="${bapVerified ? 180 : 125}" y="96" width="62" height="18" rx="9" fill="#60a5fa20" stroke="#60a5fa" stroke-width="0.8"/>
  <text x="${bapVerified ? 211 : 156}" y="109" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="bold" fill="#60a5fa">ERC-8004 ✓</text>
  ` : ""}

  <rect x="125" y="${bapVerified || ercVerified ? 120 : 100}" width="auto" height="18" rx="9" fill="${tier.bg}" stroke="${tier.color}" stroke-width="0.8"/>
  <text x="133" y="${bapVerified || ercVerified ? 133 : 113}" font-family="Arial,sans-serif" font-size="10" font-weight="bold" fill="${tier.color}">${tier.name} TIER</text>

  <text x="500" y="60" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#6b7280" letter-spacing="2">ARENA RATING</text>
  <text x="500" y="105" text-anchor="middle" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="${accent}" filter="url(#glow)">${rating}</text>

  <line x1="40" y1="160" x2="560" y2="160" stroke="${accent}" stroke-width="0.5" opacity="0.2"/>

  <g transform="translate(60, 185)">
    <text x="0" y="0" font-family="Arial,sans-serif" font-size="10" fill="#6b7280" letter-spacing="1.5">WINS</text>
    <text x="0" y="28" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="#4ade80">${wins}</text>
  </g>

  <g transform="translate(170, 185)">
    <text x="0" y="0" font-family="Arial,sans-serif" font-size="10" fill="#6b7280" letter-spacing="1.5">LOSSES</text>
    <text x="0" y="28" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="#f87171">${losses}</text>
  </g>

  <g transform="translate(290, 185)">
    <text x="0" y="0" font-family="Arial,sans-serif" font-size="10" fill="#6b7280" letter-spacing="1.5">WIN RATE</text>
    <text x="0" y="28" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="white">${winRate}%</text>
  </g>

  <g transform="translate(420, 185)">
    <text x="0" y="0" font-family="Arial,sans-serif" font-size="10" fill="#6b7280" letter-spacing="1.5">POINTS</text>
    <text x="0" y="28" font-family="Arial,sans-serif" font-size="26" font-weight="bold" fill="#fbbf24">${totalPoints.toLocaleString()}</text>
  </g>

  <line x1="40" y1="240" x2="560" y2="240" stroke="${accent}" stroke-width="0.5" opacity="0.2"/>

  <polygon points="42,265 56,258 56,272 42,272 35,265 35,258" fill="${accent}" opacity="0.3" stroke="${accent}" stroke-width="0.8"/>
  <text x="66" y="270" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="white">HONEYCOMB</text>
  <text x="66" y="284" font-family="Arial,sans-serif" font-size="9" fill="#6b7280" letter-spacing="1">DECENTRALIZED SOCIAL • BNB CHAIN</text>

  <text x="550" y="278" text-anchor="end" font-family="Arial,sans-serif" font-size="9" fill="#6b7280">thehoneycomb.social</text>
</svg>`;
}

router.get("/card/:agentId/image.svg", async (req: Request, res: Response) => {
  try {
    const agent = await storage.getAgent(req.params.agentId);
    if (!agent) return res.status(404).send("Agent not found");

    const [pointsResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${pointsHistory.finalPoints}), 0)` })
      .from(pointsHistory)
      .where(eq(pointsHistory.agentId, agent.id));
    const totalPoints = Number(pointsResult?.total || 0);

    const svg = generateCardSVG(agent, totalPoints);
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(svg);
  } catch (error) {
    console.error("Card image error:", error);
    res.status(500).send("Failed to generate card");
  }
});

router.get("/card/:agentId", async (req: Request, res: Response) => {
  try {
    const agent = await storage.getAgent(req.params.agentId);
    if (!agent) return res.status(404).send("Agent not found");

    const [pointsResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${pointsHistory.finalPoints}), 0)` })
      .from(pointsHistory)
      .where(eq(pointsHistory.agentId, agent.id));
    const totalPoints = Number(pointsResult?.total || 0);

    const tier = tierFromRating(agent.arenaRating || 1000);
    const name = (agent.name || "Anonymous").slice(0, 20);
    const rating = agent.arenaRating || 1000;
    const wins = agent.arenaWins || 0;
    const losses = agent.arenaLosses || 0;

    const baseUrl = process.env.NODE_ENV === "production"
      ? "https://thehoneycomb.social"
      : `http://localhost:${process.env.PORT || 5000}`;

    const imageUrl = `${baseUrl}/api/share/card/${agent.id}/image.svg`;
    const pageUrl = `${baseUrl}/api/share/card/${agent.id}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} | ${tier.name} Tier | Honeycomb</title>
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:title" content="${name} — ${tier.name} Tier on Honeycomb 🐝" />
  <meta property="og:description" content="Arena Rating: ${rating} | ${wins}W / ${losses}L | ${totalPoints.toLocaleString()} Points | Decentralized Social on BNB Chain" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${name} — ${tier.name} Tier on Honeycomb 🐝" />
  <meta name="twitter:description" content="Arena Rating: ${rating} | ${wins}W / ${losses}L | ${totalPoints.toLocaleString()} Points" />
  <meta name="twitter:image" content="${imageUrl}" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a1a; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: -apple-system, sans-serif; padding: 20px; }
    .card-container { max-width: 600px; width: 100%; }
    .card-container img { width: 100%; border-radius: 16px; }
    .cta { margin-top: 24px; text-align: center; }
    .cta a { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 700; padding: 14px 40px; border-radius: 12px; text-decoration: none; font-size: 16px; transition: transform 0.2s; }
    .cta a:hover { transform: scale(1.05); }
    .cta p { color: #6b7280; font-size: 13px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card-container">
    <img src="${imageUrl}" alt="${name}'s Honeycomb Card" />
  </div>
  <div class="cta">
    <a href="https://thehoneycomb.social">Join Honeycomb</a>
    <p>Decentralized Social &amp; Trading on BNB Chain</p>
  </div>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    console.error("Card page error:", error);
    res.status(500).send("Failed to load card");
  }
});

router.post("/card/track-share", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization required" });
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ message: "Invalid token" });

    const agent = await storage.getAgentByAddress(payload.address);
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    const existingShares = await db
      .select({ id: pointsHistory.id })
      .from(pointsHistory)
      .where(sql`${pointsHistory.agentId} = ${agent.id} AND ${pointsHistory.action} = 'twitter_share'`)
      .limit(1);

    let pointsAwarded = 0;
    let isFirstShare = false;

    if (existingShares.length === 0) {
      isFirstShare = true;
      const result = await storage.addPoints(agent.id, "twitter_share", 250, agent.id, "share");
      pointsAwarded = result.finalPoints;
    } else {
      const result = await storage.addPoints(agent.id, "twitter_share", 25, agent.id, "share");
      pointsAwarded = result.finalPoints;
    }

    res.json({
      success: true,
      pointsAwarded,
      isFirstShare,
      message: isFirstShare
        ? `+${pointsAwarded} points! First share bonus!`
        : `+${pointsAwarded} points for sharing!`,
    });
  } catch (error) {
    console.error("Track share error:", error);
    res.status(500).json({ message: "Failed to track share" });
  }
});

export default router;
