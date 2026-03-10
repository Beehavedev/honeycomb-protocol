import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { generateToken, verifyToken } from "./auth";
import { validateTelegramWebAppData, handleTelegramUpdate, setupTelegramWebhook } from "./telegram-bot";
import crypto from "crypto";

const router = Router();

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || "";

router.post("/webhook", async (req: Request, res: Response) => {
  try {
    await handleTelegramUpdate(req.body);
  } catch (error) {
    console.error("Telegram webhook error:", error);
  }
  res.sendStatus(200);
});

router.post("/auth", async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;
    if (!initData || typeof initData !== "string") {
      return res.status(400).json({ message: "initData required" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ message: "Telegram bot not configured" });
    }

    const result = validateTelegramWebAppData(initData, botToken);
    if (!result.valid || !result.user) {
      return res.status(401).json({ message: "Invalid Telegram data" });
    }

    const telegramId = result.user.id.toString();
    const pseudoAddress = "0x" + crypto
      .createHash("sha256")
      .update("telegram:" + telegramId)
      .digest("hex")
      .slice(0, 40);

    let agent = await storage.getAgentByTelegramId(telegramId);

    if (!agent) {
      agent = await storage.getAgentByAddress(pseudoAddress);
    }

    if (!agent) {
      const displayName = [result.user.first_name, result.user.last_name]
        .filter(Boolean)
        .join(" ") || `TG_${telegramId.slice(-6)}`;

      agent = await storage.createAgent({
        ownerAddress: pseudoAddress,
        name: displayName,
        bio: null,
        avatarUrl: result.user.photo_url || null,
        capabilities: [],
      });
    }

    if (!agent.telegramId) {
      await storage.updateAgentTelegramId(agent.id, telegramId);
    }

    const token = generateToken(agent.ownerAddress);

    res.json({
      token,
      agent: {
        ...agent,
        telegramId,
      },
      telegramUser: result.user,
    });
  } catch (error) {
    console.error("Telegram auth error:", error);
    res.status(500).json({ message: "Authentication failed" });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization required" });
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const agent = await storage.getAgentByAddress(payload.address);
    if (!agent) {
      return res.status(404).json({ message: "Agent not found" });
    }

    const { apiKey, ...safeAgent } = agent;
    res.json(safeAgent);
  } catch (error) {
    console.error("Telegram me error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

router.post("/setup-webhook", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization required" });
    }

    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    if (!ADMIN_ADDRESS || payload.address.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { webhookUrl } = req.body;
    if (!webhookUrl || typeof webhookUrl !== "string") {
      return res.status(400).json({ message: "webhookUrl required" });
    }

    const result = await setupTelegramWebhook(webhookUrl);
    res.json(result);
  } catch (error) {
    console.error("Setup webhook error:", error);
    res.status(500).json({ message: "Failed to setup webhook" });
  }
});

export default router;
