import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { generateToken, verifyToken } from "./auth";
import { validateTelegramWebAppData, handleTelegramUpdate, setupTelegramWebhook, verifyWebhookSecret } from "./telegram-bot";
import { generateCustodialWallet } from "./custodial-wallet";
import { db } from "./db";
import {
  nfaAgents,
  nfaStats,
  nfaListings,
  aiAgentProfiles,
  aiAgentConversations,
  aiAgentMessages,
  agents,
  agentAuditLogs,
} from "@shared/schema";
import { eq, desc, and, sql, like, or, type SQL, inArray } from "drizzle-orm";
import { openaiClient } from "./ai-providers";

const router = Router();

const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || "";

router.post("/webhook", (req: Request, res: Response) => {
  const secretHeader = req.headers["x-telegram-bot-api-secret-token"] as string | undefined;
  if (!verifyWebhookSecret(secretHeader)) {
    console.warn("[TelegramBot] Webhook request with invalid secret token rejected");
    return res.sendStatus(403);
  }

  res.sendStatus(200);
  try {
    handleTelegramUpdate(req.body);
  } catch (error) {
    console.error("Telegram webhook error:", error);
  }
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

    let agent = await storage.getAgentByTelegramId(telegramId);

    if (!agent) {
      const wallet = generateCustodialWallet();

      const displayName = [result.user.first_name, result.user.last_name]
        .filter(Boolean)
        .join(" ") || `TG_${telegramId.slice(-6)}`;

      agent = await storage.createAgent({
        ownerAddress: wallet.address,
        name: displayName,
        bio: null,
        avatarUrl: result.user.photo_url || null,
        capabilities: [],
      });

      await db.update(agents)
        .set({ telegramId })
        .where(eq(agents.id, agent.id));
      agent = { ...agent, telegramId };

      await storage.saveCustodialWallet(agent.id, wallet.address, wallet.encryptedPrivateKey, wallet.iv, wallet.authTag);

      console.log(`[TG Auth] New user created: ${displayName} (tgId: ${telegramId}, agentId: ${agent.id})`);
    }

    const token = generateToken(agent.ownerAddress);

    res.json({
      token,
      agent: {
        ...agent,
        telegramId,
      },
      telegramUser: result.user,
      walletAddress: agent.ownerAddress,
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

router.get("/wallet/balance", async (req: Request, res: Response) => {
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

    const { createPublicClient, http, formatEther } = await import("viem");
    const { bsc } = await import("viem/chains");

    const client = createPublicClient({ chain: bsc, transport: http() });
    const balance = await client.getBalance({ address: agent.ownerAddress as `0x${string}` });

    res.json({ balance: formatEther(balance), balanceWei: balance.toString() });
  } catch (error) {
    console.error("Wallet balance error:", error);
    res.status(500).json({ message: "Failed to fetch balance" });
  }
});

router.post("/wallet/export-key", async (req: Request, res: Response) => {
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

    const wallet = await storage.getCustodialWallet(agent.id);
    if (!wallet) return res.status(404).json({ message: "No custodial wallet found" });

    const { decryptPrivateKey } = await import("./custodial-wallet");
    const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey, wallet.iv, wallet.authTag);

    res.json({ privateKey });
  } catch (error) {
    console.error("Export key error:", error);
    res.status(500).json({ message: "Failed to export key" });
  }
});

router.post("/wallet/withdraw", async (req: Request, res: Response) => {
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

    const { toAddress, amount } = req.body;

    if (!toAddress || typeof toAddress !== "string") {
      return res.status(400).json({ message: "Destination address is required" });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
      return res.status(400).json({ message: "Invalid BNB address format" });
    }

    if (toAddress.toLowerCase() === agent.ownerAddress?.toLowerCase()) {
      return res.status(400).json({ message: "Cannot send to your own address" });
    }

    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    if (amountNum > 100) {
      return res.status(400).json({ message: "Maximum withdrawal is 100 BNB per transaction" });
    }

    const wallet = await storage.getCustodialWallet(agent.id);
    if (!wallet) return res.status(404).json({ message: "No custodial wallet found" });

    const { decryptPrivateKey } = await import("./custodial-wallet");
    const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey, wallet.iv, wallet.authTag);

    const { createWalletClient, createPublicClient, http, parseEther, formatEther } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const { bsc } = await import("viem/chains");

    const account = privateKeyToAccount(privateKey);
    const BSC_RPC = "https://bsc-dataseed1.binance.org";

    const publicClient = createPublicClient({ chain: bsc, transport: http(BSC_RPC) });
    const walletClient = createWalletClient({ account, chain: bsc, transport: http(BSC_RPC) });

    const currentBalance = await publicClient.getBalance({ address: account.address });
    const sendAmountWei = parseEther(amount.toString());

    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: toAddress as `0x${string}`,
      value: sendAmountWei,
    });
    const gasPrice = await publicClient.getGasPrice();
    const gasCost = gasEstimate * gasPrice;

    if (currentBalance < sendAmountWei + gasCost) {
      const availableBnb = formatEther(currentBalance - gasCost > 0n ? currentBalance - gasCost : 0n);
      return res.status(400).json({
        message: `Insufficient balance. Available: ${parseFloat(availableBnb).toFixed(6)} BNB (after gas fees)`,
      });
    }

    const txHash = await walletClient.sendTransaction({
      to: toAddress as `0x${string}`,
      value: sendAmountWei,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 60_000,
    });

    if (receipt.status !== "success") {
      return res.status(500).json({ message: "Transaction failed on-chain", txHash });
    }

    const newBalance = await publicClient.getBalance({ address: account.address });

    console.log(`[Withdraw] ${agent.name} sent ${amount} BNB to ${toAddress} (tx: ${txHash})`);

    res.json({
      success: true,
      txHash,
      amount,
      toAddress,
      newBalance: formatEther(newBalance),
      explorerUrl: `https://bscscan.com/tx/${txHash}`,
    });
  } catch (error: any) {
    console.error("Withdraw error:", error);
    res.status(500).json({ message: error.message || "Failed to send transaction" });
  }
});

router.get("/bees", async (req: Request, res: Response) => {
  try {
    const sort = (req.query.sort as string) || "rating";
    const raw = Number(req.query.limit);
    const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 100) : 50;

    const { db } = await import("./db");
    const { agents } = await import("@shared/schema");
    const { desc, sql } = await import("drizzle-orm");

    let query;
    if (sort === "newest") {
      query = db.select({
        id: agents.id,
        name: agents.name,
        bio: agents.bio,
        avatarUrl: agents.avatarUrl,
        arenaWins: agents.arenaWins,
        arenaLosses: agents.arenaLosses,
        arenaRating: agents.arenaRating,
        createdAt: agents.createdAt,
      }).from(agents).orderBy(desc(agents.createdAt)).limit(limit);
    } else {
      query = db.select({
        id: agents.id,
        name: agents.name,
        bio: agents.bio,
        avatarUrl: agents.avatarUrl,
        arenaWins: agents.arenaWins,
        arenaLosses: agents.arenaLosses,
        arenaRating: agents.arenaRating,
        createdAt: agents.createdAt,
      }).from(agents).orderBy(desc(agents.arenaRating)).limit(limit);
    }

    const bees = await query;
    res.json(bees);
  } catch (error) {
    console.error("List bees error:", error);
    res.status(500).json({ message: "Failed to list bees" });
  }
});

router.patch("/profile", async (req: Request, res: Response) => {
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

    const { name, bio, avatarUrl } = req.body;
    const updates: Record<string, any> = {};

    if (name !== undefined) {
      const trimmed = (name || "").trim();
      if (trimmed.length < 2 || trimmed.length > 30) {
        return res.status(400).json({ message: "Name must be 2-30 characters" });
      }
      updates.name = trimmed;
    }
    if (bio !== undefined) updates.bio = (bio || "").trim().slice(0, 160) || null;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No updates provided" });
    }

    const updated = await storage.updateAgentProfile(agent.id, updates);
    const { apiKey, ...safeAgent } = updated;
    res.json(safeAgent);
  } catch (error) {
    console.error("Telegram profile update error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

router.get("/nfa/agents", async (req: Request, res: Response) => {
  try {
    const search = (req.query.search as string) || "";
    const sort = (req.query.sort as string) || "recent";
    const agentType = (req.query.type as string) || "";
    const raw = Number(req.query.limit);
    const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 50) : 20;

    let query = db.select().from(nfaAgents).$dynamic();

    const conditions: SQL[] = [];
    if (search) {
      const searchCondition = or(
        like(nfaAgents.name, `%${search}%`),
        like(nfaAgents.description, `%${search}%`)
      );
      if (searchCondition) conditions.push(searchCondition);
    }
    if (agentType === "LEARNING" || agentType === "STATIC") {
      conditions.push(eq(nfaAgents.agentType, agentType));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (sort === "interactions") {
      query = query.orderBy(desc(nfaAgents.interactionCount));
    } else if (sort === "name") {
      query = query.orderBy(nfaAgents.name);
    } else {
      query = query.orderBy(desc(nfaAgents.createdAt));
    }

    const results = await query.limit(limit);

    const nfaIds = results.map((r) => r.id);
    const listings = nfaIds.length > 0
      ? await db.select().from(nfaListings).where(
          and(
            sql`${nfaListings.nfaId} IN (${sql.join(nfaIds.map(id => sql`${id}`), sql`, `)})`,
            eq(nfaListings.active, true)
          )
        )
      : [];
    const listingMap = new Map(listings.map((l) => [l.nfaId, l]));

    res.json(results.map((nfa) => {
      const listing = listingMap.get(nfa.id);
      return {
        ...nfa,
        listingPrice: listing?.priceWei || null,
        listingPriceDisplay: listing?.priceDisplay || null,
        isListed: !!listing,
      };
    }));
  } catch (error) {
    console.error("TG NFA agents error:", error);
    res.status(500).json({ message: "Failed to fetch NFA agents" });
  }
});

router.get("/nfa/agents/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [agent] = await db.select().from(nfaAgents).where(eq(nfaAgents.id, id));
    if (!agent) return res.status(404).json({ message: "Agent not found" });

    const [stats] = await db.select().from(nfaStats).where(eq(nfaStats.nfaId, id));
    const [listing] = await db.select().from(nfaListings).where(
      and(eq(nfaListings.nfaId, id), eq(nfaListings.active, true))
    );

    res.json({
      agent,
      stats: stats || null,
      listing: listing ? { priceWei: listing.priceWei, priceDisplay: listing.priceDisplay, sellerAddress: listing.sellerAddress } : null,
    });
  } catch (error) {
    console.error("TG NFA agent detail error:", error);
    res.status(500).json({ message: "Failed to fetch agent" });
  }
});

router.get("/ai-agents", async (req: Request, res: Response) => {
  try {
    const sort = (req.query.sort as string) || "popular";
    const pricingFilter = (req.query.pricing as string) || "";

    const filterConditions: SQL[] = [eq(aiAgentProfiles.isActive, true)];

    if (pricingFilter === "free") {
      filterConditions.push(eq(aiAgentProfiles.pricePerUnit, "0"));
    } else if (pricingFilter === "paid") {
      filterConditions.push(sql`${aiAgentProfiles.pricePerUnit} != '0'`);
    } else if (pricingFilter === "per_message" || pricingFilter === "per_token" || pricingFilter === "per_task") {
      filterConditions.push(eq(aiAgentProfiles.pricingModel, pricingFilter));
    }

    let query = db
      .select({
        profile: aiAgentProfiles,
        agent: agents,
      })
      .from(aiAgentProfiles)
      .innerJoin(agents, eq(aiAgentProfiles.agentId, agents.id))
      .where(and(...filterConditions))
      .$dynamic();

    if (sort === "rating") {
      query = query.orderBy(
        desc(sql`CASE WHEN ${aiAgentProfiles.totalInteractions} = 0 THEN 0 ELSE CAST(${aiAgentProfiles.totalEarnings} AS NUMERIC) / ${aiAgentProfiles.totalInteractions} END`)
      );
    } else if (sort === "recent") {
      query = query.orderBy(desc(aiAgentProfiles.createdAt));
    } else if (sort === "earnings") {
      query = query.orderBy(desc(aiAgentProfiles.totalEarnings));
    } else {
      query = query.orderBy(desc(aiAgentProfiles.totalInteractions));
    }

    const profiles = await query;

    const agentIds = profiles.map((p) => p.profile.agentId);
    const linkedNfas = agentIds.length > 0
      ? await db.select({ agentId: nfaAgents.agentId, agentType: nfaAgents.agentType })
          .from(nfaAgents)
          .where(sql`${nfaAgents.agentId} IN (${sql.join(agentIds.map(id => sql`${id}`), sql`, `)})`)
      : [];
    const nfaTypeMap = new Map(linkedNfas.map((n) => [n.agentId, n.agentType]));

    const agentTypeFilter = (req.query.agentType as string) || "";

    let mapped = profiles.map((p) => ({
      id: p.profile.id,
      agentId: p.profile.agentId,
      name: p.agent.name,
      bio: p.agent.bio,
      avatarUrl: p.agent.avatarUrl,
      capabilities: p.agent.capabilities,
      pricingModel: p.profile.pricingModel,
      pricePerUnit: p.profile.pricePerUnit,
      creatorAddress: p.profile.creatorAddress,
      isActive: p.profile.isActive,
      totalInteractions: p.profile.totalInteractions,
      totalEarnings: p.profile.totalEarnings,
      createdAt: p.profile.createdAt,
      agentType: nfaTypeMap.get(p.profile.agentId) || "STATIC",
    }));

    if (agentTypeFilter === "STATIC" || agentTypeFilter === "LEARNING") {
      mapped = mapped.filter((a) => a.agentType === agentTypeFilter);
    }

    res.json(mapped);
  } catch (error) {
    console.error("TG AI agents error:", error);
    res.status(500).json({ message: "Failed to fetch AI agents" });
  }
});

router.get("/ai-agents/:agentId", async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const [result] = await db
      .select({ profile: aiAgentProfiles, agent: agents })
      .from(aiAgentProfiles)
      .innerJoin(agents, eq(aiAgentProfiles.agentId, agents.id))
      .where(eq(aiAgentProfiles.agentId, agentId));

    if (!result) return res.status(404).json({ message: "AI agent not found" });

    const [linkedNfa] = await db
      .select({ agentType: nfaAgents.agentType })
      .from(nfaAgents)
      .where(eq(nfaAgents.agentId, agentId))
      .limit(1);

    res.json({
      id: result.profile.id,
      agentId: result.profile.agentId,
      name: result.agent.name,
      bio: result.agent.bio,
      avatarUrl: result.agent.avatarUrl,
      capabilities: result.agent.capabilities,
      pricingModel: result.profile.pricingModel,
      pricePerUnit: result.profile.pricePerUnit,
      creatorAddress: result.profile.creatorAddress,
      isActive: result.profile.isActive,
      totalInteractions: result.profile.totalInteractions,
      totalEarnings: result.profile.totalEarnings,
      createdAt: result.profile.createdAt,
      agentType: linkedNfa?.agentType || "STATIC",
    });
  } catch (error) {
    console.error("TG AI agent detail error:", error);
    res.status(500).json({ message: "Failed to fetch AI agent" });
  }
});

router.get("/ai-agents/:agentId/activity", async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const [profile] = await db.select().from(aiAgentProfiles).where(eq(aiAgentProfiles.agentId, agentId));
    if (!profile) return res.status(404).json({ message: "AI agent not found" });

    const recentConversations = await db
      .select({
        id: aiAgentConversations.id,
        title: aiAgentConversations.title,
        createdAt: aiAgentConversations.createdAt,
        updatedAt: aiAgentConversations.updatedAt,
      })
      .from(aiAgentConversations)
      .where(eq(aiAgentConversations.aiAgentProfileId, profile.id))
      .orderBy(desc(aiAgentConversations.updatedAt))
      .limit(10);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiAgentConversations)
      .where(eq(aiAgentConversations.aiAgentProfileId, profile.id));

    const auditLogs = await db
      .select({
        id: agentAuditLogs.id,
        actionType: agentAuditLogs.actionType,
        result: agentAuditLogs.result,
        createdAt: agentAuditLogs.createdAt,
      })
      .from(agentAuditLogs)
      .where(eq(agentAuditLogs.agentId, agentId))
      .orderBy(desc(agentAuditLogs.createdAt))
      .limit(10);

    res.json({
      recentConversations,
      auditLogs,
      totalConversations: countResult?.count || 0,
    });
  } catch (error) {
    console.error("TG AI agent activity error:", error);
    res.status(500).json({ message: "Failed to fetch agent activity" });
  }
});

router.post("/ai-agents/:agentId/chat", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization required" });
    }
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ message: "Invalid token" });

    const tgAgent = await storage.getAgentByAddress(payload.address);
    if (!tgAgent) return res.status(404).json({ message: "Agent not found" });

    const { agentId } = req.params;
    const { message, conversationId } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const [profile] = await db
      .select({ profile: aiAgentProfiles, agent: agents })
      .from(aiAgentProfiles)
      .innerJoin(agents, eq(aiAgentProfiles.agentId, agents.id))
      .where(eq(aiAgentProfiles.agentId, agentId));

    if (!profile) return res.status(404).json({ message: "AI agent not found" });
    if (!profile.profile.isActive) return res.status(400).json({ message: "Agent is not active" });

    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
      return res.status(503).json({ message: "AI service not configured" });
    }

    let currentConversationId = conversationId;
    if (currentConversationId) {
      const [existingConv] = await db
        .select()
        .from(aiAgentConversations)
        .where(eq(aiAgentConversations.id, currentConversationId));
      if (!existingConv || existingConv.userAddress !== tgAgent.ownerAddress || existingConv.aiAgentProfileId !== profile.profile.id) {
        currentConversationId = null;
      }
    }
    if (!currentConversationId) {
      const [newConv] = await db
        .insert(aiAgentConversations)
        .values({
          aiAgentProfileId: profile.profile.id,
          userAddress: tgAgent.ownerAddress,
          title: message.substring(0, 50) + (message.length > 50 ? "..." : ""),
        })
        .returning();
      currentConversationId = newConv.id;
    }

    const history = await db
      .select()
      .from(aiAgentMessages)
      .where(eq(aiAgentMessages.conversationId, currentConversationId))
      .orderBy(aiAgentMessages.createdAt);

    const chatMessages = [
      { role: "system" as const, content: profile.profile.systemPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: message },
    ];

    await db.insert(aiAgentMessages).values({
      conversationId: currentConversationId,
      role: "user",
      content: message,
      tokenCount: 0,
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    res.write(`data: ${JSON.stringify({ type: "start", conversationId: currentConversationId })}\n\n`);

    const stream = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      max_completion_tokens: 1024,
      stream: true,
    });

    let fullResponse = "";
    let totalTokens = 0;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ type: "chunk", content })}\n\n`);
      }
      if (chunk.usage?.total_tokens) {
        totalTokens = chunk.usage.total_tokens;
      }
    }

    if (!fullResponse) fullResponse = "I couldn't generate a response.";

    await db.insert(aiAgentMessages).values({
      conversationId: currentConversationId,
      role: "assistant",
      content: fullResponse,
      tokenCount: totalTokens,
    });

    await db
      .update(aiAgentProfiles)
      .set({ totalInteractions: profile.profile.totalInteractions + 1 })
      .where(eq(aiAgentProfiles.id, profile.profile.id));

    res.write(`data: ${JSON.stringify({ type: "done", conversationId: currentConversationId, tokenCount: totalTokens })}\n\n`);
    res.end();
  } catch (error) {
    console.error("TG AI chat error:", error);
    res.status(500).json({ message: "Failed to chat with agent" });
  }
});

router.get("/ai-agents/:agentId/conversations", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization required" });
    }
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ message: "Invalid token" });

    const tgAgent = await storage.getAgentByAddress(payload.address);
    if (!tgAgent) return res.status(404).json({ message: "Agent not found" });

    const { agentId } = req.params;
    const [profile] = await db
      .select()
      .from(aiAgentProfiles)
      .where(eq(aiAgentProfiles.agentId, agentId));
    if (!profile) return res.status(404).json({ message: "AI agent not found" });

    const conversations = await db
      .select()
      .from(aiAgentConversations)
      .where(
        and(
          eq(aiAgentConversations.aiAgentProfileId, profile.id),
          eq(aiAgentConversations.userAddress, tgAgent.ownerAddress)
        )
      )
      .orderBy(desc(aiAgentConversations.updatedAt));

    res.json(conversations);
  } catch (error) {
    console.error("TG conversations error:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
});

router.get("/ai-agents/conversations/:conversationId/messages", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization required" });
    }
    const token = authHeader.split(" ")[1];
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ message: "Invalid token" });

    const tgAgent = await storage.getAgentByAddress(payload.address);
    if (!tgAgent) return res.status(404).json({ message: "Agent not found" });

    const { conversationId } = req.params;

    const [conversation] = await db
      .select()
      .from(aiAgentConversations)
      .where(eq(aiAgentConversations.id, conversationId));

    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (conversation.userAddress !== tgAgent.ownerAddress) {
      return res.status(403).json({ message: "Access denied" });
    }

    const messages = await db
      .select()
      .from(aiAgentMessages)
      .where(eq(aiAgentMessages.conversationId, conversationId))
      .orderBy(aiAgentMessages.createdAt);
    res.json(messages);
  } catch (error) {
    console.error("TG messages error:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
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

router.post("/duels/create-staked", async (req: Request, res: Response) => {
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

    const { assetSymbol, durationSeconds, direction, stakeAmount } = req.body;

    const stake = parseFloat(stakeAmount);
    if (!stakeAmount || isNaN(stake) || stake <= 0) {
      return res.status(400).json({ message: "Stake amount must be greater than 0" });
    }
    if (stake < 0.001) {
      return res.status(400).json({ message: "Minimum stake is 0.001 BNB" });
    }
    if (stake > 10) {
      return res.status(400).json({ message: "Maximum stake is 10 BNB" });
    }

    const wallet = await storage.getCustodialWallet(agent.id);
    if (!wallet) return res.status(404).json({ message: "No custodial wallet found" });

    const tournamentKey = process.env.TOURNAMENT_WALLET_PRIVATE_KEY;
    if (!tournamentKey) {
      return res.status(503).json({ message: "BNB duels are temporarily unavailable" });
    }

    const { decryptPrivateKey } = await import("./custodial-wallet");
    const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey, wallet.iv, wallet.authTag);

    const { createWalletClient, createPublicClient, http, parseEther, formatEther } = await import("viem");
    const { privateKeyToAccount } = await import("viem/accounts");
    const { bsc } = await import("viem/chains");

    const userAccount = privateKeyToAccount(privateKey);
    const formattedTournamentKey = tournamentKey.startsWith("0x")
      ? (tournamentKey as `0x${string}`)
      : (`0x${tournamentKey}` as `0x${string}`);
    const tournamentAccount = privateKeyToAccount(formattedTournamentKey);
    const BSC_RPC = "https://bsc-dataseed1.binance.org";

    const publicClient = createPublicClient({ chain: bsc, transport: http(BSC_RPC) });
    const userWalletClient = createWalletClient({ account: userAccount, chain: bsc, transport: http(BSC_RPC) });

    const stakeWei = parseEther(stakeAmount.toString());
    const userBalance = await publicClient.getBalance({ address: userAccount.address });

    const gasEstimate = await publicClient.estimateGas({
      account: userAccount.address,
      to: tournamentAccount.address,
      value: stakeWei,
    });
    const gasPrice = await publicClient.getGasPrice();
    const gasCost = gasEstimate * gasPrice;

    if (userBalance < stakeWei + gasCost) {
      const available = formatEther(userBalance - gasCost > 0n ? userBalance - gasCost : 0n);
      return res.status(400).json({
        message: `Insufficient balance. You have ${parseFloat(available).toFixed(6)} BNB available (after gas)`,
      });
    }

    const escrowTxHash = await userWalletClient.sendTransaction({
      to: tournamentAccount.address,
      value: stakeWei,
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: escrowTxHash,
      timeout: 60_000,
    });

    if (receipt.status !== "success") {
      return res.status(500).json({ message: "Escrow transaction failed on-chain", txHash: escrowTxHash });
    }

    let duelCreated = false;
    try {
      const { getRandomArenaBot, startBot } = await import("./arena-bot-engine");

      const bot = await getRandomArenaBot();
      const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      const duel = await storage.createTradingDuel({
        creatorId: agent.id,
        assetSymbol: assetSymbol || "BTCUSDT",
        potAmount: stakeAmount.toString(),
        durationSeconds: durationSeconds || 300,
        matchType: "staked",
        botDifficulty: "normal",
        botStrategy: direction === "up" ? "bearish" : "bullish",
      });
      duelCreated = true;

      await storage.updateTradingDuel(duel.id, {
        joinCode,
        txHash: escrowTxHash,
        creatorWallet: userAccount.address,
      });

      const joined = await storage.joinTradingDuel(duel.id, bot.id);
      const started = await storage.startTradingDuel(joined.id);

      startBot(started.id, bot.id, bot.style || "momentum", started.durationSeconds, "normal", direction === "up" ? "bearish" : "bullish");

      console.log(`[StakedDuel] ${agent.name} staked ${stakeAmount} BNB on ${assetSymbol} (duel: ${duel.id}, tx: ${escrowTxHash})`);

      res.status(201).json({
        ...started,
        stakeAmount: stakeAmount.toString(),
        escrowTxHash,
        direction,
        botName: bot.name,
        joinCode,
      });
    } catch (duelError: any) {
      console.error("[StakedDuel] Duel creation failed after escrow, refunding:", duelError);
      try {
        const tournamentWalletClient = createWalletClient({
          account: tournamentAccount,
          chain: bsc,
          transport: http(BSC_RPC),
        });
        const refundTx = await tournamentWalletClient.sendTransaction({
          to: userAccount.address,
          value: stakeWei,
        });
        await publicClient.waitForTransactionReceipt({ hash: refundTx, timeout: 60_000 });
        console.log(`[StakedDuel] Refunded ${stakeAmount} BNB to ${userAccount.address} (tx: ${refundTx})`);
      } catch (refundErr) {
        console.error("[StakedDuel] CRITICAL: Refund failed after duel creation error:", refundErr);
      }
      throw duelError;
    }
  } catch (error: any) {
    console.error("[StakedDuel] Create error:", error);
    res.status(500).json({ message: error.message || "Failed to create staked duel" });
  }
});

const settlingDuels = new Set<string>();

router.post("/duels/:id/settle-staked", async (req: Request, res: Response) => {
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

    const duelId = req.params.id;
    const duel = await storage.getTradingDuel(duelId);
    if (!duel) return res.status(404).json({ message: "Duel not found" });
    if (duel.status === "settled") return res.json({ alreadySettled: true, winnerId: duel.winnerId });
    if (duel.status !== "active") return res.status(400).json({ message: "Duel not active" });
    if (duel.matchType !== "staked") return res.status(400).json({ message: "Not a staked duel" });

    if (duel.creatorId !== agent.id) {
      return res.status(403).json({ message: "Only the duel creator can settle" });
    }

    if (settlingDuels.has(duelId)) {
      return res.status(409).json({ message: "Settlement already in progress" });
    }
    settlingDuels.add(duelId);

    if (duel.endsAt && new Date() < new Date(duel.endsAt)) {
      settlingDuels.delete(duelId);
      return res.status(400).json({ message: "Duel timer has not expired yet" });
    }

    const { stopBot } = await import("./arena-bot-engine");
    stopBot(duelId);

    let settlementPrice: string;
    try {
      const base = duel.assetSymbol.replace("USDT", "");
      const priceRes = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${base}&tsyms=USD`);
      const priceData = await priceRes.json();
      if (!priceData?.USD) throw new Error("No price");
      settlementPrice = priceData.USD.toString();
    } catch {
      try {
        const binRes = await fetch(`https://api.binance.us/api/v3/ticker/price?symbol=${duel.assetSymbol}`);
        const binData = await binRes.json();
        if (!binData?.price) throw new Error("No price");
        settlementPrice = binData.price;
      } catch {
        return res.status(500).json({ message: "Failed to fetch settlement price" });
      }
    }

    const calcBalance = async (agentId: string) => {
      const positions = await storage.getTradingPositions(duelId, agentId);
      const initialBal = parseFloat(duel.initialBalance);
      let total = initialBal;
      for (const p of positions) {
        if (p.isOpen) {
          const entry = parseFloat(p.entryPrice);
          const curr = parseFloat(settlementPrice);
          const size = parseFloat(p.sizeUsdt);
          let pnl: number;
          if (p.side === "long") {
            pnl = ((curr - entry) / entry) * size * p.leverage;
          } else {
            pnl = ((entry - curr) / entry) * size * p.leverage;
          }
          total += pnl;
          await storage.closeTradingPosition(p.id, settlementPrice, pnl.toFixed(2));
        } else if (p.pnl) {
          total += parseFloat(p.pnl);
        }
      }
      return total;
    };

    const creatorFinal = await calcBalance(duel.creatorId);
    const joinerFinal = duel.joinerId ? await calcBalance(duel.joinerId) : 0;

    let winnerId: string | null = null;
    if (creatorFinal > joinerFinal) winnerId = duel.creatorId;
    else if (joinerFinal > creatorFinal && duel.joinerId) winnerId = duel.joinerId;

    const settled = await storage.settleTradingDuel(duelId, winnerId, creatorFinal.toFixed(2), joinerFinal.toFixed(2));

    await storage.updateAgentArenaStats(duel.creatorId, winnerId === duel.creatorId);

    let payoutTxHash: string | null = null;
    const stakeAmount = parseFloat(duel.potAmount);

    if (winnerId === duel.creatorId && stakeAmount > 0) {
      try {
        const tournamentKey = process.env.TOURNAMENT_WALLET_PRIVATE_KEY;
        if (tournamentKey) {
          const { createWalletClient, createPublicClient, http, parseEther, formatEther } = await import("viem");
          const { privateKeyToAccount } = await import("viem/accounts");
          const { bsc } = await import("viem/chains");

          const formattedKey = tournamentKey.startsWith("0x")
            ? (tournamentKey as `0x${string}`)
            : (`0x${tournamentKey}` as `0x${string}`);
          const tournamentAccount = privateKeyToAccount(formattedKey);
          const BSC_RPC = "https://bsc-dataseed1.binance.org";

          const publicClient = createPublicClient({ chain: bsc, transport: http(BSC_RPC) });
          const walletClient = createWalletClient({ account: tournamentAccount, chain: bsc, transport: http(BSC_RPC) });

          const feePct = 5;
          const winnings = stakeAmount * 2 * (1 - feePct / 100);
          const payoutWei = parseEther(winnings.toFixed(18));

          const tournamentBalance = await publicClient.getBalance({ address: tournamentAccount.address });
          if (tournamentBalance >= payoutWei) {
            const creatorWallet = duel.creatorWallet as `0x${string}`;
            if (creatorWallet) {
              const tx = await walletClient.sendTransaction({
                to: creatorWallet,
                value: payoutWei,
              });
              await publicClient.waitForTransactionReceipt({ hash: tx, timeout: 60_000 });
              payoutTxHash = tx;
              console.log(`[StakedDuel] Paid ${winnings.toFixed(6)} BNB to ${creatorWallet} (tx: ${tx})`);
            }
          } else {
            console.error(`[StakedDuel] Tournament wallet insufficient for payout: ${formatEther(tournamentBalance)} < ${winnings}`);
          }
        }
      } catch (payoutErr) {
        console.error("[StakedDuel] Payout error:", payoutErr);
      }
    } else if (winnerId === null && stakeAmount > 0) {
      try {
        const tournamentKey = process.env.TOURNAMENT_WALLET_PRIVATE_KEY;
        if (tournamentKey) {
          const { createWalletClient, createPublicClient, http, parseEther } = await import("viem");
          const { privateKeyToAccount } = await import("viem/accounts");
          const { bsc } = await import("viem/chains");

          const formattedKey = tournamentKey.startsWith("0x")
            ? (tournamentKey as `0x${string}`)
            : (`0x${tournamentKey}` as `0x${string}`);
          const tournamentAccount = privateKeyToAccount(formattedKey);
          const BSC_RPC = "https://bsc-dataseed1.binance.org";

          const publicClient = createPublicClient({ chain: bsc, transport: http(BSC_RPC) });
          const walletClient = createWalletClient({ account: tournamentAccount, chain: bsc, transport: http(BSC_RPC) });

          const refundWei = parseEther(stakeAmount.toFixed(18));
          const creatorWallet = duel.creatorWallet as `0x${string}`;
          if (creatorWallet) {
            const tx = await walletClient.sendTransaction({
              to: creatorWallet,
              value: refundWei,
            });
            await publicClient.waitForTransactionReceipt({ hash: tx, timeout: 60_000 });
            payoutTxHash = tx;
            console.log(`[StakedDuel] Draw refund ${stakeAmount} BNB to ${creatorWallet} (tx: ${tx})`);
          }
        }
      } catch (refundErr) {
        console.error("[StakedDuel] Refund error:", refundErr);
      }
    }

    try {
      const { awardGamePoints } = await import("./points-engine");
      await awardGamePoints({
        gameType: "trading_arena",
        agentId: duel.creatorId,
        won: winnerId === duel.creatorId,
        isBotMatch: true,
        metadata: { staked: true, stakeAmount: duel.potAmount, duelId: duel.id },
      });
    } catch (pointsErr) {
      console.error("[StakedDuel] Points error:", pointsErr);
    }

    settlingDuels.delete(duelId);

    res.json({
      ...settled,
      winnerId,
      stakeAmount: duel.potAmount,
      payoutTxHash,
      userWon: winnerId === duel.creatorId,
      payout: winnerId === duel.creatorId ? (stakeAmount * 2 * 0.95).toFixed(6) : "0",
    });
  } catch (error: any) {
    settlingDuels.delete(req.params.id);
    console.error("[StakedDuel] Settle error:", error);
    res.status(500).json({ message: error.message || "Failed to settle staked duel" });
  }
});

export default router;
