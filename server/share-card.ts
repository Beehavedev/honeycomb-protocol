import { Request, Response, Router } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { agents, pointsHistory, referrals } from "@shared/schema";
import { eq, sql, sum } from "drizzle-orm";
import { verifyToken } from "./auth";
import * as fs from "fs";
import * as path from "path";
import sharp from "sharp";

const router = Router();

const BEE_AVATARS: Record<string, string> = {
  queen: "Q", worker: "W", scout: "S", guard: "G",
  builder: "B", trader: "T", warrior: "X", sage: "Z",
};

const BEE_LABELS: Record<string, string> = {
  queen: "QUEEN BEE", worker: "WORKER BEE", scout: "SCOUT BEE", guard: "GUARD BEE",
  builder: "BUILDER BEE", trader: "TRADER BEE", warrior: "WARRIOR BEE", sage: "SAGE BEE",
};

function agentColorFromId(id: string): { accent: string; accentDark: string; glow: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return {
    accent: `hsl(${hue}, 75%, 55%)`,
    accentDark: `hsl(${hue}, 60%, 25%)`,
    glow: `hsl(${hue}, 85%, 65%)`,
  };
}

function tierInfo(rating: number): { name: string; color: string; darkColor: string; icon: string } {
  if (rating >= 5000) return { name: "APEX", color: "#ef4444", darkColor: "#7f1d1d", icon: "A" };
  if (rating >= 3000) return { name: "DIAMOND", color: "#7dd3fc", darkColor: "#0c4a6e", icon: "D" };
  if (rating >= 2000) return { name: "PLATINUM", color: "#d1d5db", darkColor: "#374151", icon: "P" };
  if (rating >= 1500) return { name: "GOLD", color: "#fbbf24", darkColor: "#78350f", icon: "G" };
  if (rating >= 1200) return { name: "SILVER", color: "#94a3b8", darkColor: "#334155", icon: "S" };
  return { name: "BRONZE", color: "#d97706", darkColor: "#78350f", icon: "B" };
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const resized = await sharp(Buffer.from(buffer))
      .resize(200, 200, { fit: "cover" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${resized.toString("base64")}`;
  } catch {
    return null;
  }
}

function loadLocalAvatarBase64(avatarUrl: string): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", avatarUrl);
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    return `data:${mime};base64,${data.toString("base64")}`;
  } catch {
    return null;
  }
}

async function resolveAvatarBase64(avatarUrl: string | null): Promise<string | null> {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("/uploads/")) return loadLocalAvatarBase64(avatarUrl);
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return await fetchImageAsBase64(avatarUrl);
  }
  return null;
}

function hexPath(cx: number, cy: number, r: number): string {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function generateCardSVG(agent: any, totalPoints: number, photoBase64: string | null) {
  const { accent, accentDark, glow } = agentColorFromId(agent.id);
  const tier = tierInfo(agent.arenaRating || 1000);
  const wins = agent.arenaWins || 0;
  const losses = agent.arenaLosses || 0;
  const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0;
  const rating = agent.arenaRating || 1000;
  const name = (agent.name || "Anonymous").slice(0, 18);
  const avatarUrl = agent.avatarUrl;
  const beeLabel = avatarUrl && BEE_LABELS[avatarUrl] ? BEE_LABELS[avatarUrl] : "";
  const initial = avatarUrl && BEE_AVATARS[avatarUrl] ? BEE_AVATARS[avatarUrl] : name.slice(0, 1).toUpperCase();
  const hasPhoto = !!photoBase64;

  const bgHexes = Array.from({ length: 20 }, (_, i) => {
    const col = i % 5;
    const row = Math.floor(i / 5);
    const x = 80 + col * 130 + (row % 2) * 65;
    const y = 40 + row * 90;
    const o = 0.03 + (Math.abs(agent.id.charCodeAt(i % agent.id.length) * 13) % 40) / 1000;
    return `<polygon points="${hexPath(x, y, 40)}" fill="none" stroke="${accent}" stroke-width="0.6" opacity="${o}"/>`;
  }).join("");

  const avatarSection = hasPhoto ? `
    <defs>
      <clipPath id="aclip"><circle cx="80" cy="105" r="42"/></clipPath>
    </defs>
    <circle cx="80" cy="105" r="46" fill="${accentDark}"/>
    <circle cx="80" cy="105" r="44" fill="#111827"/>
    <image href="${photoBase64}" x="38" y="63" width="84" height="84" clip-path="url(#aclip)" preserveAspectRatio="xMidYMid slice"/>
    <circle cx="80" cy="105" r="44" fill="none" stroke="${accent}" stroke-width="2.5"/>
  ` : `
    <circle cx="80" cy="105" r="46" fill="${accentDark}"/>
    <circle cx="80" cy="105" r="44" fill="#111827"/>
    <circle cx="80" cy="105" r="44" fill="none" stroke="${accent}" stroke-width="2.5"/>
    <text x="80" y="117" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="36" font-weight="bold" fill="${accent}">${initial}</text>
  `;

  const beeLabelSvg = beeLabel && !hasPhoto ? `<text x="80" y="160" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="7" font-weight="bold" fill="${accent}" letter-spacing="1.5" opacity="0.7">${beeLabel}</text>` : "";

  const tierBadge = `
    <rect x="140" y="100" width="${tier.name.length * 8.5 + 24}" height="22" rx="11" fill="${tier.darkColor}"/>
    <rect x="140" y="100" width="${tier.name.length * 8.5 + 24}" height="22" rx="11" fill="none" stroke="${tier.color}" stroke-width="1"/>
    <circle cx="154" cy="111" r="5" fill="${tier.color}"/>
    <text x="153.5" y="114" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="7" font-weight="bold" fill="${tier.darkColor}">${tier.icon}</text>
    <text x="165" y="115" font-family="Arial,Helvetica,sans-serif" font-size="10" font-weight="bold" fill="${tier.color}" letter-spacing="1">${tier.name}</text>
  `;

  const statBox = (x: number, label: string, value: string, color: string) => `
    <rect x="${x}" y="175" width="110" height="55" rx="8" fill="#111827"/>
    <rect x="${x}" y="175" width="110" height="55" rx="8" fill="none" stroke="#1f2937" stroke-width="1"/>
    <text x="${x + 55}" y="195" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="9" fill="#6b7280" letter-spacing="1.5">${label}</text>
    <text x="${x + 55}" y="220" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="bold" fill="${color}">${value}</text>
  `;

  const honeycombLogo = [
    `<polygon points="${hexPath(42, 272, 8)}" fill="#f59e0b"/>`,
    `<polygon points="${hexPath(55, 264, 8)}" fill="#d97706"/>`,
    `<polygon points="${hexPath(55, 280, 8)}" fill="#b45309"/>`,
  ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 315" width="1200" height="630">
  <rect width="600" height="315" rx="16" fill="#0a0b14"/>
  <rect x="1" y="1" width="598" height="313" rx="15" fill="none" stroke="#1f2937" stroke-width="1"/>

  ${bgHexes}

  <rect x="0" y="0" width="600" height="5" rx="3" fill="${accent}"/>

  ${avatarSection}
  ${beeLabelSvg}

  <text x="140" y="82" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="bold" fill="#f9fafb">${name}</text>

  ${tierBadge}

  <rect x="420" y="40" width="150" height="90" rx="12" fill="#111827"/>
  <rect x="420" y="40" width="150" height="90" rx="12" fill="none" stroke="#1f2937" stroke-width="1"/>
  <text x="495" y="62" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="9" fill="#6b7280" letter-spacing="2">ARENA RATING</text>
  <text x="495" y="110" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="46" font-weight="bold" fill="${accent}">${rating}</text>

  <line x1="30" y1="165" x2="570" y2="165" stroke="#1f2937" stroke-width="1"/>

  ${statBox(30, "WINS", String(wins), "#4ade80")}
  ${statBox(150, "LOSSES", String(losses), "#f87171")}
  ${statBox(270, "WIN RATE", `${winRate}%`, "#f9fafb")}
  ${statBox(390, "POINTS", totalPoints > 999999 ? `${(totalPoints / 1000000).toFixed(1)}M` : totalPoints > 999 ? `${(totalPoints / 1000).toFixed(1)}K` : String(totalPoints), "#fbbf24")}

  <rect x="510" y="175" width="60" height="55" rx="8" fill="#111827"/>
  <rect x="510" y="175" width="60" height="55" rx="8" fill="none" stroke="#1f2937" stroke-width="1"/>
  <text x="540" y="195" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="9" fill="#6b7280" letter-spacing="1">DUELS</text>
  <text x="540" y="220" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="22" font-weight="bold" fill="#a78bfa">${wins + losses}</text>

  <line x1="30" y1="248" x2="570" y2="248" stroke="#1f2937" stroke-width="1"/>

  ${honeycombLogo}
  <text x="70" y="270" font-family="Arial,Helvetica,sans-serif" font-size="16" font-weight="bold" fill="#f9fafb">HONEYCOMB</text>
  <text x="70" y="284" font-family="Arial,Helvetica,sans-serif" font-size="8" fill="#6b7280" letter-spacing="1.5">DECENTRALIZED SOCIAL ON BNB CHAIN</text>

  <text x="565" y="278" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="9" fill="#4b5563">thehoneycomb.social</text>
</svg>`;
}

async function getCardData(agentId: string) {
  const agent = await storage.getAgent(agentId);
  if (!agent) return null;

  const [pointsResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(${pointsHistory.finalPoints}), 0)` })
    .from(pointsHistory)
    .where(eq(pointsHistory.agentId, agent.id));
  const totalPoints = Number(pointsResult?.total || 0);
  const photoBase64 = await resolveAvatarBase64(agent.avatarUrl);

  return { agent, totalPoints, photoBase64 };
}

router.get("/card/:agentId/image.svg", async (req: Request, res: Response) => {
  try {
    const data = await getCardData(req.params.agentId);
    if (!data) return res.status(404).send("Agent not found");

    const svg = generateCardSVG(data.agent, data.totalPoints, data.photoBase64);
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(svg);
  } catch (error) {
    console.error("Card SVG error:", error);
    res.status(500).send("Failed to generate card");
  }
});

router.get("/card/:agentId/image.png", async (req: Request, res: Response) => {
  try {
    const data = await getCardData(req.params.agentId);
    if (!data) return res.status(404).send("Agent not found");

    const svg = generateCardSVG(data.agent, data.totalPoints, data.photoBase64);

    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(1200, 630)
      .png({ quality: 90 })
      .toBuffer();

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `inline; filename="${(data.agent.name || "agent").replace(/[^a-zA-Z0-9]/g, "_")}-honeycomb.png"`);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(pngBuffer);
  } catch (error) {
    console.error("Card PNG error:", error);
    res.status(500).send("Failed to generate card image");
  }
});

router.get("/card/:agentId/download", async (req: Request, res: Response) => {
  try {
    const data = await getCardData(req.params.agentId);
    if (!data) return res.status(404).send("Agent not found");

    const svg = generateCardSVG(data.agent, data.totalPoints, data.photoBase64);

    const pngBuffer = await sharp(Buffer.from(svg))
      .resize(1200, 630)
      .png({ quality: 90 })
      .toBuffer();

    const safeName = (data.agent.name || "agent").replace(/[^a-zA-Z0-9]/g, "_");
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}-honeycomb-card.png"`);
    res.setHeader("Content-Length", pngBuffer.length.toString());
    res.send(pngBuffer);
  } catch (error) {
    console.error("Card download error:", error);
    res.status(500).send("Failed to download card");
  }
});

router.get("/card/:agentId", async (req: Request, res: Response) => {
  try {
    const data = await getCardData(req.params.agentId);
    if (!data) return res.status(404).send("Agent not found");

    const tier = tierInfo(data.agent.arenaRating || 1000);
    const name = (data.agent.name || "Anonymous").slice(0, 20);
    const rating = data.agent.arenaRating || 1000;
    const wins = data.agent.arenaWins || 0;
    const losses = data.agent.arenaLosses || 0;

    const baseUrl = process.env.NODE_ENV === "production"
      ? "https://thehoneycomb.social"
      : `http://localhost:${process.env.PORT || 5000}`;

    const imageUrl = `${baseUrl}/api/share/card/${data.agent.id}/image.png`;
    const pageUrl = `${baseUrl}/api/share/card/${data.agent.id}`;

    const refCode = (req.query.ref as string) || "";
    const ctaUrl = refCode
      ? `https://thehoneycomb.social/r/${encodeURIComponent(refCode)}`
      : "https://thehoneycomb.social";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} | ${tier.name} Tier | Honeycomb</title>
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:title" content="${name} - ${tier.name} Tier on Honeycomb" />
  <meta property="og:description" content="Arena Rating: ${rating} | ${wins}W / ${losses}L | ${data.totalPoints.toLocaleString()} Points | Decentralized Social on BNB Chain" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@honeycombchain" />
  <meta name="twitter:title" content="${name} - ${tier.name} Tier on Honeycomb" />
  <meta name="twitter:description" content="Arena Rating: ${rating} | ${wins}W / ${losses}L | ${data.totalPoints.toLocaleString()} Points" />
  <meta name="twitter:image" content="${imageUrl}" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0b14; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: -apple-system, sans-serif; padding: 20px; }
    .card-container { max-width: 600px; width: 100%; }
    .card-container img { width: 100%; border-radius: 16px; }
    .cta { margin-top: 24px; text-align: center; }
    .cta a { display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: #000; font-weight: 700; padding: 14px 40px; border-radius: 12px; text-decoration: none; font-size: 16px; }
    .cta p { color: #6b7280; font-size: 13px; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card-container">
    <img src="${imageUrl}" alt="${name}'s Honeycomb Card" />
  </div>
  <div class="cta">
    <a href="${ctaUrl}">Join Honeycomb</a>
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

    let referralCode = "";
    try {
      let referral = await storage.getReferralByAgent(agent.id);
      if (!referral) {
        const code = `BEE${agent.id.slice(0, 8).toUpperCase()}`;
        referral = await storage.createReferral({ referrerAgentId: agent.id, referralCode: code });
      }
      referralCode = referral.referralCode;
    } catch {}

    const shortCode = referralCode.replace("BEE", "");
    const cardPageUrl = `https://thehoneycomb.social/api/share/card/${agent.id}${shortCode ? `?ref=${shortCode}` : ""}`;

    res.json({
      success: true,
      pointsAwarded,
      isFirstShare,
      cardPageUrl,
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
