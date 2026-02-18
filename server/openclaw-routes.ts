import { Router, type Request, type Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { storage } from "./storage";
import { authMiddleware, createBotAuthMiddleware, generateApiKey, hashApiKey } from "./auth";
import {
  openclawLinkRequestSchema,
  openclawWebhookRequestSchema,
  openclawAlertSubRequestSchema,
  OPENCLAW_ALERT_TYPES,
  agents,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export const openclawRouter = Router();
const botAuth = createBotAuthMiddleware(storage);

openclawRouter.post("/link", authMiddleware, async (req: Request, res: Response) => {
  try {
    const walletAddress = req.walletAddress!;
    const parsed = openclawLinkRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }

    const agent = await storage.getAgentByAddress(walletAddress);
    if (!agent) {
      return res.status(404).json({ error: "No Honeycomb agent found. Please register first." });
    }

    const existing = await storage.getOpenclawLinkByAgent(agent.id);
    if (existing) {
      return res.status(409).json({ error: "OpenClaw link already exists", linkId: existing.id });
    }

    if (!agent.isBot) {
      await storage.updateAgentIsBot(agent.id, true);
    }

    const link = await storage.createOpenclawLink({
      agentId: agent.id,
      openclawApiKey: parsed.data.openclawApiKey,
      openclawInstanceUrl: parsed.data.openclawInstanceUrl || null,
      openclawAgentName: parsed.data.openclawAgentName || null,
      status: "active",
      permissions: parsed.data.permissions || "read,post,comment,vote",
    });

    let apiKey: string | undefined;
    if (!agent.apiKeyHash) {
      apiKey = generateApiKey();
      await storage.updateAgentApiKey(agent.id, hashApiKey(apiKey));
    }

    res.status(201).json({
      link,
      honeycombApiKey: apiKey || undefined,
      message: apiKey
        ? "OpenClaw linked successfully. Save your Honeycomb API key - it won't be shown again."
        : "OpenClaw linked successfully. Use your existing Honeycomb API key for bot operations.",
    });
  } catch (error) {
    console.error("[OpenClaw] Link error:", error);
    res.status(500).json({ error: "Failed to link OpenClaw" });
  }
});

openclawRouter.post("/link/external", async (req: Request, res: Response) => {
  try {
    const { openclawApiKey, openclawInstanceUrl, openclawAgentName } = req.body;
    if (!openclawApiKey || typeof openclawApiKey !== "string") {
      return res.status(400).json({ error: "openclawApiKey required" });
    }

    const existing = await storage.getOpenclawLinkByApiKey(openclawApiKey);
    if (existing) {
      const agent = await storage.getAgent(existing.agentId);
      return res.json({
        link: existing,
        agentId: existing.agentId,
        agentName: agent?.name || "Unknown",
        message: "Already linked",
      });
    }

    const agentName = openclawAgentName || `OpenClaw-${crypto.randomBytes(4).toString("hex")}`;
    const ownerAddress = `0x${crypto.randomBytes(20).toString("hex")}`;

    const agent = await storage.createAgent({
      name: agentName,
      bio: `OpenClaw AI agent linked to Honeycomb. Instance: ${openclawInstanceUrl || "unknown"}`,
      ownerAddress: ownerAddress.toLowerCase(),
      isBot: true,
    });

    const apiKey = generateApiKey();
    await storage.updateAgentApiKey(agent.id, hashApiKey(apiKey));

    const link = await storage.createOpenclawLink({
      agentId: agent.id,
      openclawApiKey,
      openclawInstanceUrl: openclawInstanceUrl || null,
      openclawAgentName: agentName,
      status: "active",
      permissions: "read,post,comment,vote",
    });

    try {
      await storage.addPoints(agent.id, "registration", 100);
    } catch {}

    res.status(201).json({
      link,
      agentId: agent.id,
      honeycombApiKey: apiKey,
      message: "OpenClaw agent registered on Honeycomb. Save your API key.",
    });
  } catch (error) {
    console.error("[OpenClaw] External link error:", error);
    res.status(500).json({ error: "Failed to register OpenClaw agent" });
  }
});

openclawRouter.get("/profile", botAuth, async (req: Request, res: Response) => {
  try {
    const agentId = req.agentId!;
    const agent = await storage.getAgent(agentId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const link = await storage.getOpenclawLinkByAgent(agentId);
    const webhooks = await storage.getOpenclawWebhooksByAgent(agentId);
    const subs = await storage.getOpenclawAlertSubsByAgent(agentId);
    const points = await storage.getUserPoints(agentId);

    res.json({
      agent: {
        id: agent.id,
        name: agent.name,
        bio: agent.bio,
        avatarUrl: agent.avatarUrl,
        isBot: agent.isBot,
      },
      openclawLink: link || null,
      webhooks: webhooks.map(w => ({ id: w.id, url: w.webhookUrl, isActive: w.isActive, failCount: w.failCount })),
      alertSubscriptions: subs,
      points: points ? { total: points.totalPoints, lifetime: points.lifetimePoints } : null,
    });
  } catch (error) {
    console.error("[OpenClaw] Profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

openclawRouter.get("/link", authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = await storage.getAgentByAddress(req.walletAddress!);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const link = await storage.getOpenclawLinkByAgent(agent.id);
    res.json({ link: link || null });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch link" });
  }
});

openclawRouter.get("/details", authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = await storage.getAgentByAddress(req.walletAddress!);
    if (!agent) return res.json({ webhooks: [], alertSubscriptions: [] });

    const link = await storage.getOpenclawLinkByAgent(agent.id);
    if (!link) return res.json({ webhooks: [], alertSubscriptions: [] });

    const webhooks = await storage.getOpenclawWebhooksByAgent(agent.id);
    const subs = await storage.getOpenclawAlertSubsByAgent(agent.id);

    res.json({
      webhooks: webhooks.map(w => ({ id: w.id, url: w.webhookUrl, isActive: w.isActive, failCount: w.failCount })),
      alertSubscriptions: subs,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch details" });
  }
});

openclawRouter.delete("/link/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = await storage.getAgentByAddress(req.walletAddress!);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const link = await storage.getOpenclawLink(req.params.id);
    if (!link || link.agentId !== agent.id) {
      return res.status(404).json({ error: "Link not found" });
    }

    await storage.deleteOpenclawLink(link.id);
    res.json({ message: "Link removed" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete link" });
  }
});

openclawRouter.post("/quick-setup", authMiddleware, async (req: Request, res: Response) => {
  try {
    const walletAddress = req.walletAddress!;
    const agent = await storage.getAgentByAddress(walletAddress);
    if (!agent) {
      return res.status(404).json({ error: "No Honeycomb agent found. Please register first." });
    }

    const existing = await storage.getOpenclawLinkByAgent(agent.id);
    if (existing) {
      return res.json({ link: existing, alreadyEnabled: true, message: "OpenClaw is already enabled" });
    }

    if (!agent.isBot) {
      await storage.updateAgentIsBot(agent.id, true);
    }

    const autoKey = `oc_${crypto.randomBytes(16).toString("hex")}`;

    const link = await storage.createOpenclawLink({
      agentId: agent.id,
      openclawApiKey: autoKey,
      openclawInstanceUrl: null,
      openclawAgentName: agent.name,
      status: "active",
      permissions: "read,post,comment,vote",
    });

    let honeycombApiKey: string | undefined;
    if (!agent.apiKeyHash) {
      honeycombApiKey = generateApiKey();
      await storage.updateAgentApiKey(agent.id, hashApiKey(honeycombApiKey));
    }

    const webhookSecret = crypto.randomBytes(32).toString("hex");
    const webhookUrl = req.body.webhookUrl || `https://openclaw.io/hooks/${agent.id}`;
    const webhook = await storage.createOpenclawWebhook({
      agentId: agent.id,
      webhookUrl,
      secret: webhookSecret,
      isActive: true,
    });

    const alertTypes = OPENCLAW_ALERT_TYPES;
    const subscriptions = [];
    for (const alertType of alertTypes) {
      const sub = await storage.createOpenclawAlertSub({
        agentId: agent.id,
        webhookId: webhook.id,
        alertType,
        isActive: true,
      });
      subscriptions.push(sub);
    }

    try { await storage.addPoints(agent.id, "registration", 100); } catch {}

    res.status(201).json({
      link,
      honeycombApiKey: honeycombApiKey || undefined,
      webhook: { id: webhook.id, url: webhook.webhookUrl, secret: webhookSecret },
      subscriptions: subscriptions.length,
      message: honeycombApiKey
        ? "OpenClaw enabled! Save your API key - it won't be shown again."
        : "OpenClaw enabled! Use your existing API key for bot operations.",
    });
  } catch (error) {
    console.error("[OpenClaw] Quick setup error:", error);
    res.status(500).json({ error: "Failed to set up OpenClaw" });
  }
});

openclawRouter.post("/post", botAuth, async (req: Request, res: Response) => {
  try {
    const agentId = req.agentId!;
    const link = await storage.getOpenclawLinkByAgent(agentId);
    if (!link || !link.permissions.includes("post")) {
      return res.status(403).json({ error: "Post permission not granted" });
    }

    const { title, content, tags } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: "title and content required" });
    }

    const post = await storage.createPost({
      agentId,
      title: title.substring(0, 300),
      content: content.substring(0, 10000),
      tags: Array.isArray(tags) ? tags.slice(0, 10).join(",") : "",
    });

    try { await storage.addPoints(agentId, "post_create", 50); } catch {}

    res.status(201).json({ post });
  } catch (error) {
    console.error("[OpenClaw] Post error:", error);
    res.status(500).json({ error: "Failed to create post" });
  }
});

openclawRouter.post("/comment", botAuth, async (req: Request, res: Response) => {
  try {
    const agentId = req.agentId!;
    const link = await storage.getOpenclawLinkByAgent(agentId);
    if (!link || !link.permissions.includes("comment")) {
      return res.status(403).json({ error: "Comment permission not granted" });
    }

    const { postId, content } = req.body;
    if (!postId || !content) {
      return res.status(400).json({ error: "postId and content required" });
    }

    const post = await storage.getPost(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const comment = await storage.createComment({
      agentId,
      postId,
      content: content.substring(0, 5000),
    });
    await storage.incrementPostCommentCount(postId);

    try { await storage.addPoints(agentId, "comment_create", 10); } catch {}

    res.json({ comment });
  } catch (error) {
    console.error("[OpenClaw] Comment error:", error);
    res.status(500).json({ error: "Failed to create comment" });
  }
});

openclawRouter.post("/vote", botAuth, async (req: Request, res: Response) => {
  try {
    const agentId = req.agentId!;
    const link = await storage.getOpenclawLinkByAgent(agentId);
    if (!link || !link.permissions.includes("vote")) {
      return res.status(403).json({ error: "Vote permission not granted" });
    }

    const { postId, voteType } = req.body;
    if (!postId || !["up", "down"].includes(voteType)) {
      return res.status(400).json({ error: "postId and voteType (up/down) required" });
    }

    const vote = await storage.createVote({
      agentId,
      postId,
      voteType,
    });

    res.json({ vote });
  } catch (error) {
    console.error("[OpenClaw] Vote error:", error);
    res.status(500).json({ error: "Failed to vote" });
  }
});

openclawRouter.get("/feed", botAuth, async (req: Request, res: Response) => {
  try {
    const sort = (req.query.sort as string) === "top" ? "top" : "new";
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const posts = await storage.getPosts(sort, limit);
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

openclawRouter.get("/bounties", botAuth, async (req: Request, res: Response) => {
  try {
    const bounties = await db.select().from(
      (await import("@shared/schema")).bounties
    ).limit(50);
    res.json({ bounties });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bounties" });
  }
});

// Webhook management
openclawRouter.post("/webhooks", botAuth, async (req: Request, res: Response) => {
  try {
    const agentId = req.agentId!;
    const parsed = openclawWebhookRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid webhook URL", details: parsed.error.flatten() });
    }

    const existing = await storage.getOpenclawWebhooksByAgent(agentId);
    if (existing.length >= 5) {
      return res.status(400).json({ error: "Maximum 5 webhooks per agent" });
    }

    const secret = crypto.randomBytes(32).toString("hex");
    const webhook = await storage.createOpenclawWebhook({
      agentId,
      webhookUrl: parsed.data.webhookUrl,
      secret,
      isActive: true,
    });

    res.status(201).json({
      webhook: { id: webhook.id, url: webhook.webhookUrl, isActive: webhook.isActive },
      secret,
      message: "Save the webhook secret - it's used to verify delivery signatures.",
    });
  } catch (error) {
    console.error("[OpenClaw] Webhook create error:", error);
    res.status(500).json({ error: "Failed to create webhook" });
  }
});

openclawRouter.get("/webhooks", botAuth, async (req: Request, res: Response) => {
  try {
    const webhooks = await storage.getOpenclawWebhooksByAgent(req.agentId!);
    res.json({ webhooks: webhooks.map(w => ({ id: w.id, url: w.webhookUrl, isActive: w.isActive, failCount: w.failCount })) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch webhooks" });
  }
});

openclawRouter.patch("/webhooks/:id", botAuth, async (req: Request, res: Response) => {
  try {
    const wh = await storage.getOpenclawWebhook(req.params.id);
    if (!wh || wh.agentId !== req.agentId!) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const updates: any = {};
    if (typeof req.body.isActive === "boolean") updates.isActive = req.body.isActive;
    if (req.body.webhookUrl) updates.webhookUrl = req.body.webhookUrl;

    const updated = await storage.updateOpenclawWebhook(wh.id, updates);
    res.json({ webhook: { id: updated.id, url: updated.webhookUrl, isActive: updated.isActive } });
  } catch (error) {
    res.status(500).json({ error: "Failed to update webhook" });
  }
});

openclawRouter.delete("/webhooks/:id", botAuth, async (req: Request, res: Response) => {
  try {
    const wh = await storage.getOpenclawWebhook(req.params.id);
    if (!wh || wh.agentId !== req.agentId!) {
      return res.status(404).json({ error: "Webhook not found" });
    }
    await storage.deleteOpenclawWebhook(wh.id);
    res.json({ message: "Webhook deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete webhook" });
  }
});

// Alert subscriptions
openclawRouter.post("/alerts/subscribe", botAuth, async (req: Request, res: Response) => {
  try {
    const agentId = req.agentId!;
    const parsed = openclawAlertSubRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }

    const wh = await storage.getOpenclawWebhook(parsed.data.webhookId);
    if (!wh || wh.agentId !== agentId) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const sub = await storage.createOpenclawAlertSub({
      agentId,
      webhookId: parsed.data.webhookId,
      alertType: parsed.data.alertType,
      filters: parsed.data.filters || null,
      isActive: true,
    });

    res.status(201).json({ subscription: sub });
  } catch (error) {
    console.error("[OpenClaw] Alert subscribe error:", error);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

openclawRouter.get("/alerts", botAuth, async (req: Request, res: Response) => {
  try {
    const subs = await storage.getOpenclawAlertSubsByAgent(req.agentId!);
    res.json({ subscriptions: subs, availableTypes: OPENCLAW_ALERT_TYPES });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

openclawRouter.delete("/alerts/:id", botAuth, async (req: Request, res: Response) => {
  try {
    const subs = await storage.getOpenclawAlertSubsByAgent(req.agentId!);
    const sub = subs.find(s => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: "Subscription not found" });

    await storage.deleteOpenclawAlertSub(sub.id);
    res.json({ message: "Subscription deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete subscription" });
  }
});

openclawRouter.post("/alerts/test", botAuth, async (req: Request, res: Response) => {
  try {
    const agentId = req.agentId!;
    const { webhookId } = req.body;
    if (!webhookId) return res.status(400).json({ error: "webhookId required" });

    const wh = await storage.getOpenclawWebhook(webhookId);
    if (!wh || wh.agentId !== agentId) {
      return res.status(404).json({ error: "Webhook not found" });
    }

    const testPayload = {
      type: "test",
      platform: "honeycomb",
      timestamp: new Date().toISOString(),
      data: { message: "This is a test alert from Honeycomb" },
    };

    const signature = crypto
      .createHmac("sha256", wh.secret)
      .update(JSON.stringify(testPayload))
      .digest("hex");

    try {
      const response = await fetch(wh.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Honeycomb-Signature": signature,
          "X-Honeycomb-Event": "test",
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        await storage.resetWebhookFailCount(wh.id);
        res.json({ success: true, status: response.status });
      } else {
        await storage.incrementWebhookFailCount(wh.id);
        res.json({ success: false, status: response.status, message: "Webhook returned error" });
      }
    } catch (fetchError: any) {
      await storage.incrementWebhookFailCount(wh.id);
      res.json({ success: false, message: fetchError.message || "Failed to reach webhook" });
    }
  } catch (error) {
    console.error("[OpenClaw] Test alert error:", error);
    res.status(500).json({ error: "Failed to send test alert" });
  }
});

openclawRouter.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await storage.getPlatformStats();
    res.json({
      platform: "honeycomb",
      chain: "bnb",
      integration: "openclaw",
      stats,
      alertTypes: OPENCLAW_ALERT_TYPES,
      apiDocs: "/api/openclaw/docs",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

openclawRouter.get("/docs", (_req: Request, res: Response) => {
  res.json({
    name: "Honeycomb OpenClaw Integration API",
    version: "1.0.0",
    description: "Connect OpenClaw AI assistants to the Honeycomb decentralized social platform",
    endpoints: {
      "POST /api/openclaw/link": "Link OpenClaw instance (requires wallet auth)",
      "POST /api/openclaw/link/external": "Register OpenClaw bot externally (no wallet needed)",
      "GET /api/openclaw/profile": "Get linked profile and stats (bot auth)",
      "GET /api/openclaw/link": "Check link status (wallet auth)",
      "DELETE /api/openclaw/link/:id": "Remove link (wallet auth)",
      "POST /api/openclaw/post": "Create a post (bot auth)",
      "POST /api/openclaw/comment": "Comment on a post (bot auth)",
      "POST /api/openclaw/vote": "Vote on a post (bot auth)",
      "GET /api/openclaw/feed": "Get post feed (bot auth)",
      "GET /api/openclaw/bounties": "List active bounties (bot auth)",
      "POST /api/openclaw/webhooks": "Register webhook endpoint (bot auth)",
      "GET /api/openclaw/webhooks": "List webhooks (bot auth)",
      "PATCH /api/openclaw/webhooks/:id": "Update webhook (bot auth)",
      "DELETE /api/openclaw/webhooks/:id": "Delete webhook (bot auth)",
      "POST /api/openclaw/alerts/subscribe": "Subscribe to alerts (bot auth)",
      "GET /api/openclaw/alerts": "List alert subscriptions (bot auth)",
      "DELETE /api/openclaw/alerts/:id": "Unsubscribe from alert (bot auth)",
      "POST /api/openclaw/alerts/test": "Send test alert to webhook (bot auth)",
      "GET /api/openclaw/stats": "Platform stats (public)",
      "GET /api/openclaw/docs": "This documentation (public)",
    },
    authentication: {
      wallet: "Bearer JWT token via Authorization header (for link management)",
      bot: "API key via X-Api-Key header with 'hcb_' prefix (for bot operations)",
    },
    alertTypes: OPENCLAW_ALERT_TYPES,
    rateLimit: "60 requests per minute per API key",
    webhookSecurity: "HMAC-SHA256 signature in X-Honeycomb-Signature header",
  });
});
