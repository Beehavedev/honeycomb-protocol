import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql, eq, desc } from "drizzle-orm";
import { getRandomArenaBot, startBot, stopBot, isArenaBotAgent } from "./arena-bot-engine";
import { launchTokens, launchTrades, supportedChains, crossChainAgents, aiAgentVerifications, agents, enableHeartbeatRequestSchema, updateLaunchAlertConfigSchema } from "@shared/schema";
import { 
  generateToken, 
  verifyWalletSignature, 
  generateNonce, 
  authMiddleware, 
  optionalAuthMiddleware,
  generateApiKey,
  hashApiKey,
  createBotAuthMiddleware
} from "./auth";
import { registerHiveRoutes } from "./hive-routes";
import { registerChatRoutes } from "./replit_integrations/chat/routes";
import { registerAiAgentRoutes } from "./ai-agent-routes";
import { registerDuelsRoutes } from "./duels-routes";
import { registerTriviaRoutes } from "./trivia-routes";
import { registerFighterRoutes } from "./fighter-routes";
import { registerHoneyRoutes } from "./honey-routes";
import { registerTwitterRoutes } from "./twitter-routes";
import { registerAutonomousAgentRoutes } from "./autonomous-agent-routes";
import beepayRoutes from "./beepay-routes";
import { nfaRouter } from "./nfa-routes";
import { giveawayRouter, seedGiveawayCampaign } from "./giveaway-routes";
import crmRoutes from "./crm-routes";
import gameHubRoutes from "./game-hub/routes";
import developerRoutes from "./developer-routes";
import { openclawRouter } from "./openclaw-routes";
import web4Router from "./web4-routes";
import presaleRouter from "./presale-routes";
import { startAlertProcessor } from "./alert-dispatcher";
import { registerNfaTunnelRoutes } from "./nfa-tunnel-routes";
import {
  registerAgentRequestSchema,
  createPostRequestSchema,
  createCommentRequestSchema,
  voteRequestSchema,
  createBountyRequestSchema,
  submitSolutionRequestSchema,
  awardSolutionRequestSchema,
  tokenMetadataRequestSchema,
  prepareCreateTokenRequestSchema,
  prepareBuyRequestSchema,
  prepareSellRequestSchema,
  tradingDuels,
} from "@shared/schema";
import { encodeFunctionData, createWalletClient, http, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: fileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/contract-export/:name", (req, res) => {
    const name = req.params.name.replace(/[^a-zA-Z0-9_.-]/g, "");
    const filePath = path.join(process.cwd(), "public", name);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.setHeader("Content-Type", "text/plain");
    res.sendFile(filePath);
  });

  // Auto-seed points config if empty (prevents points system from silently failing)
  try {
    const existingConfigs = await storage.getAllPointsConfig();
    if (existingConfigs.length === 0) {
      console.log("[Points] Seeding default points configuration...");
      const defaultConfigs = [
        { action: "registration", basePoints: 100, dailyCap: null, description: "Account registration bonus", isActive: true },
        { action: "referral_made", basePoints: 50, dailyCap: null, description: "Successfully referred a new user", isActive: true },
        { action: "referral_received", basePoints: 25, dailyCap: null, description: "Joined via referral link", isActive: true },
        { action: "post", basePoints: 10, dailyCap: 100, description: "Create a new post", isActive: true },
        { action: "comment", basePoints: 5, dailyCap: 50, description: "Leave a comment", isActive: true },
        { action: "bounty_complete", basePoints: 50, dailyCap: null, description: "Complete a bounty", isActive: true },
        { action: "daily_login", basePoints: 5, dailyCap: 5, description: "Daily login bonus", isActive: true },
        { action: "achievement", basePoints: 25, dailyCap: null, description: "Unlock an achievement", isActive: true },
        { action: "create_agent", basePoints: 100, dailyCap: null, description: "Create an AI agent", isActive: true },
        { action: "launch_token", basePoints: 200, dailyCap: null, description: "Launch a token in The Hatchery", isActive: true },
        { action: "game_honey_runner", basePoints: 20, dailyCap: 500, description: "Play HoneyRunner (base 20 + score/1000 skill bonus up to 40)", isActive: true },
        { action: "game_trading_arena", basePoints: 60, dailyCap: 500, description: "Complete a Trading Arena duel (base 60 + 40 win bonus + 10 clutch)", isActive: true },
        { action: "game_trivia_battle", basePoints: 30, dailyCap: 500, description: "Complete a Trivia Battle (base 30 + 20 win bonus + 15 perfect)", isActive: true },
        { action: "game_crypto_fighters", basePoints: 30, dailyCap: 500, description: "Complete a Crypto Fighters duel (base 30 + 20 win bonus + 15 flawless)", isActive: true },
      ];
      for (const config of defaultConfigs) {
        await storage.upsertPointsConfig(config);
      }
      console.log("[Points] Default points configuration seeded successfully");
    }

    // Retroactively award registration points to agents without user_points records
    const { db: dbInstance } = await import("./db");
    const { agents: agentsTable, userPoints: userPointsTable, pointsHistory: pointsHistoryTable } = await import("@shared/schema");
    const { sql } = await import("drizzle-orm");
    const missingAgents = await dbInstance.execute(sql`
      SELECT a.id FROM agents a
      LEFT JOIN user_points up ON a.id = up.agent_id
      WHERE up.id IS NULL
    `);
    if (missingAgents.rows && missingAgents.rows.length > 0) {
      console.log(`[Points] Awarding retroactive registration points to ${missingAgents.rows.length} agents...`);
      for (const row of missingAgents.rows) {
        const agentId = row.id as string;
        await storage.addPoints(agentId, "registration", 100);
      }
      console.log("[Points] Retroactive registration points awarded successfully");
    }
  } catch (err) {
    console.error("[Points] Failed to auto-seed points config:", err);
  }

  // Fix any incorrect Twitter handle in bot config (one-time migration)
  try {
    const { db: dbFix } = await import("./db");
    const { sql: sqlFix } = await import("drizzle-orm");
    await dbFix.execute(sqlFix`
      UPDATE twitter_bot_config 
      SET system_prompt = REPLACE(system_prompt, '@HoneycombSocial', '@honeycombchain')
      WHERE system_prompt LIKE '%@HoneycombSocial%'
    `);
  } catch (err) {
    console.error("[Twitter] Failed to fix bot config handle:", err);
  }

  // Serve uploaded files statically
  const express = await import("express");
  app.use("/uploads", express.default.static(uploadDir));

  // File upload endpoint with error handling
  app.post("/api/upload", (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File too large. Maximum size is 5MB" });
          }
          return res.status(400).json({ message: `Upload error: ${err.message}` });
        }
        return res.status(400).json({ message: err.message || "Invalid file" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ url: fileUrl });
    });
  });

  // Auth endpoints
  app.post("/api/auth/nonce", async (req, res) => {
    try {
      const { address } = req.body;
      if (!address || typeof address !== "string") {
        return res.status(400).json({ message: "Address required" });
      }

      const nonce = generateNonce();
      await storage.createNonce({ 
        address: address.toLowerCase(), 
        nonce 
      });

      res.json({ nonce });
    } catch (error) {
      console.error("Nonce error:", error);
      res.status(500).json({ message: "Failed to generate nonce" });
    }
  });

  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { address, signature, nonce } = req.body;
      
      if (!address || !signature || !nonce) {
        return res.status(400).json({ message: "Address, signature, and nonce required" });
      }

      // Verify nonce exists and is not used
      const storedNonce = await storage.getNonce(address.toLowerCase(), nonce);
      if (!storedNonce) {
        return res.status(400).json({ message: "Invalid or expired nonce" });
      }

      // Verify signature
      const message = `Sign this message to authenticate with Honeycomb.\n\nNonce: ${nonce}`;
      const isValid = await verifyWalletSignature(address, message, signature);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      // Invalidate nonce
      await storage.invalidateNonce(storedNonce.id);

      // Generate JWT
      const token = generateToken(address);

      // Check if user has an agent, auto-create one if not
      let agent = await storage.getAgentByAddress(address);
      if (!agent) {
        const shortAddr = address.slice(0, 6) + "..." + address.slice(-4);
        agent = await storage.createAgent({
          ownerAddress: address,
          name: `Bee_${shortAddr}`,
          bio: null,
          avatarUrl: null,
          capabilities: [],
        });
      }

      res.json({ token, agent });
    } catch (error) {
      console.error("Verify error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Agent endpoints
  app.post("/api/agents/register", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;

      // Check if already registered
      const existing = await storage.getAgentByAddress(walletAddress);
      if (existing) {
        return res.status(400).json({ message: "Already registered as a Bee" });
      }

      // Validate request body
      const parseResult = registerAgentRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { name, bio, avatarUrl, capabilities } = parseResult.data;

      const agent = await storage.createAgent({
        ownerAddress: walletAddress,
        name,
        bio: bio || null,
        avatarUrl: avatarUrl || null,
        capabilities: capabilities || [],
      });

      // Award registration points
      const regConfig = await storage.getPointsConfig("registration");
      if (regConfig?.isActive) {
        await storage.addPoints(agent.id, "registration", regConfig.basePoints);
      }

      // Auto-create referral entry for new user (so they appear on leaderboard)
      const referralCode = `BEE${agent.id.substring(0, 11).toUpperCase().replace(/-/g, "")}`;
      await storage.createReferral({
        referrerAgentId: agent.id,
        referralCode,
      });

      res.status(201).json({ agent });
    } catch (error) {
      console.error("Register agent error:", error);
      res.status(500).json({ message: "Failed to register agent" });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const agent = await storage.getAgent(id);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const posts = await storage.getPostsByAgent(id);
      const postsWithAgent = posts.map(post => ({ ...post, agent }));
      const commentCount = await storage.getCommentCountByAgent(id);
      const totalUpvotes = await storage.getUpvoteCountByAgent(id);

      res.json({
        agent,
        posts: postsWithAgent,
        stats: {
          postCount: posts.length,
          commentCount,
          totalUpvotes,
        },
      });
    } catch (error) {
      console.error("Get agent error:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  app.get("/api/agents/by-address/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const agent = await storage.getAgentByAddress(address);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json(agent);
    } catch (error) {
      console.error("Get agent by address error:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  // Update agent profile
  app.patch("/api/agents/profile", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const agent = await storage.getAgentByAddress(walletAddress);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found. Register first." });
      }

      const { updateAgentRequestSchema } = await import("@shared/schema");
      const parsed = updateAgentRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
      }

      const updates: Record<string, any> = {};
      if (parsed.data.name !== undefined) updates.name = parsed.data.name;
      if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio || null;
      if (parsed.data.avatarUrl !== undefined) updates.avatarUrl = parsed.data.avatarUrl || null;
      if (parsed.data.twitterHandle !== undefined) {
        // Clean up Twitter handle - remove @ if present
        const handle = parsed.data.twitterHandle?.replace(/^@/, '') || null;
        updates.twitterHandle = handle;
      }
      if (parsed.data.capabilities !== undefined) updates.capabilities = parsed.data.capabilities || [];

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No updates provided" });
      }

      const updated = await storage.updateAgentProfile(agent.id, updates);
      res.json(updated);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Bot API endpoints
  const botAuthMiddleware = createBotAuthMiddleware(storage);

  // Enable bot mode for current agent
  app.post("/api/agents/enable-bot", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const agent = await storage.getAgentByAddress(walletAddress);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found. Register first." });
      }

      if (agent.isBot) {
        return res.status(400).json({ message: "Already a bot account" });
      }

      await storage.updateAgentIsBot(agent.id, true);
      res.json({ message: "Bot mode enabled", isBot: true });
    } catch (error) {
      console.error("Enable bot error:", error);
      res.status(500).json({ message: "Failed to enable bot mode" });
    }
  });

  // Generate or regenerate API key for bot
  app.post("/api/agents/api-key", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const agent = await storage.getAgentByAddress(walletAddress);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      if (!agent.isBot) {
        return res.status(400).json({ message: "Enable bot mode first" });
      }

      const apiKey = generateApiKey();
      const hashedKey = hashApiKey(apiKey);
      
      await storage.updateAgentApiKey(agent.id, hashedKey);
      
      // Return the raw key only once - it cannot be retrieved again
      res.json({ 
        apiKey,
        message: "Save this API key securely. It cannot be retrieved again.",
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Generate API key error:", error);
      res.status(500).json({ message: "Failed to generate API key" });
    }
  });

  // Check API key status (without revealing the key)
  app.get("/api/agents/api-key/status", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const agent = await storage.getAgentByAddress(walletAddress);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      res.json({
        isBot: agent.isBot,
        hasApiKey: !!agent.apiKey,
        apiKeyCreatedAt: agent.apiKeyCreatedAt
      });
    } catch (error) {
      console.error("API key status error:", error);
      res.status(500).json({ message: "Failed to check API key status" });
    }
  });

  // === Bot API Routes (authenticated via API key) ===
  
  // Bot: Create post
  app.post("/api/bot/posts", botAuthMiddleware, async (req, res) => {
    try {
      const agentId = req.agentId!;
      const { title, body, tags } = req.body;

      if (!title || !body) {
        return res.status(400).json({ message: "Title and body required" });
      }

      const post = await storage.createPost({
        agentId,
        title,
        body,
        tags: tags || [],
      });

      res.status(201).json({ post });
    } catch (error) {
      console.error("Bot create post error:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Bot: Create comment
  app.post("/api/bot/posts/:postId/comments", botAuthMiddleware, async (req, res) => {
    try {
      const agentId = req.agentId!;
      const { postId } = req.params;
      const { body } = req.body;

      if (!body) {
        return res.status(400).json({ message: "Comment body required" });
      }

      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const comment = await storage.createComment({
        postId,
        agentId,
        body,
      });

      await storage.incrementPostCommentCount(postId);
      res.status(201).json({ comment });
    } catch (error) {
      console.error("Bot create comment error:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Bot: Vote on post
  app.post("/api/bot/posts/:postId/vote", botAuthMiddleware, async (req, res) => {
    try {
      const agentId = req.agentId!;
      const { postId } = req.params;
      const { direction } = req.body;

      if (!direction || !["up", "down"].includes(direction)) {
        return res.status(400).json({ message: "Direction must be 'up' or 'down'" });
      }

      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const existingVote = await storage.getVote(postId, agentId);
      let vote;

      if (existingVote) {
        if (existingVote.direction === direction) {
          return res.json({ vote: existingVote, message: "Already voted" });
        }
        vote = await storage.updateVote(existingVote.id, direction);
      } else {
        vote = await storage.createVote({ postId, agentId, direction });
      }

      const counts = await storage.countVotesForPost(postId);
      await storage.updatePostVotes(postId, counts.upvotes, counts.downvotes);

      res.json({ vote });
    } catch (error) {
      console.error("Bot vote error:", error);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  // Bot: Get feed
  app.get("/api/bot/feed", botAuthMiddleware, async (req, res) => {
    try {
      const sort = (req.query.sort as "new" | "top") || "new";
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const posts = await storage.getPosts(sort, limit);
      const agentIds = [...new Set(posts.map(p => p.agentId))];
      const agents = await storage.getAgentsByIds(agentIds);
      const agentMap = new Map(agents.map(a => [a.id, a]));

      const postsWithAgents = posts.map(post => ({
        ...post,
        agent: agentMap.get(post.agentId),
      }));

      res.json({ posts: postsWithAgents });
    } catch (error) {
      console.error("Bot feed error:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  // Bot: Get post with comments
  app.get("/api/bot/posts/:id", botAuthMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const post = await storage.getPost(id);
      
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const agent = await storage.getAgent(post.agentId);
      const comments = await storage.getCommentsByPost(id);
      
      const commentAgentIds = [...new Set(comments.map(c => c.agentId))];
      const commentAgents = await storage.getAgentsByIds(commentAgentIds);
      const agentMap = new Map(commentAgents.map(a => [a.id, a]));

      const commentsWithAgents = comments.map(comment => ({
        ...comment,
        agent: agentMap.get(comment.agentId),
      }));

      res.json({
        post: { ...post, agent },
        comments: commentsWithAgents,
      });
    } catch (error) {
      console.error("Bot get post error:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  // Bot: Get my agent info
  app.get("/api/bot/me", botAuthMiddleware, async (req, res) => {
    try {
      const agentId = req.agentId!;
      const agent = await storage.getAgent(agentId);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      // Don't expose API key
      const { apiKey, ...safeAgent } = agent;
      res.json({ agent: safeAgent });
    } catch (error) {
      console.error("Bot get me error:", error);
      res.status(500).json({ message: "Failed to fetch agent" });
    }
  });

  // Post endpoints
  app.post("/api/posts", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = createPostRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { agentId, title, body, tags } = parseResult.data;

      // Verify ownership
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      if (agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Not authorized to post as this agent" });
      }

      const post = await storage.createPost({
        agentId,
        title,
        body,
        tags: tags || [],
      });

      // Award post points
      const postConfig = await storage.getPointsConfig("post");
      if (postConfig?.isActive) {
        await storage.addPoints(agentId, "post", postConfig.basePoints, post.id, "post");
      }

      res.status(201).json({ post: { ...post, agent } });
    } catch (error) {
      console.error("Create post error:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.get("/api/posts/:id", optionalAuthMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const walletAddress = req.walletAddress;

      const post = await storage.getPost(id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const agent = await storage.getAgent(post.agentId);
      const comments = await storage.getCommentsByPost(id);
      
      // Get agents for comments
      const commentAgentIds = [...new Set(comments.map(c => c.agentId))];
      const commentAgents = await storage.getAgentsByIds(commentAgentIds);
      const agentMap = new Map(commentAgents.map(a => [a.id, a]));
      
      const commentsWithAgents = comments.map(comment => ({
        ...comment,
        agent: agentMap.get(comment.agentId),
      }));

      // Get user vote if authenticated
      let userVote = null;
      if (walletAddress) {
        const userAgent = await storage.getAgentByAddress(walletAddress);
        if (userAgent) {
          userVote = await storage.getVote(id, userAgent.id);
        }
      }

      res.json({
        post: { ...post, agent },
        comments: commentsWithAgents,
        userVote,
      });
    } catch (error) {
      console.error("Get post error:", error);
      res.status(500).json({ message: "Failed to fetch post" });
    }
  });

  // Feed endpoint
  app.get("/api/feed", optionalAuthMiddleware, async (req, res) => {
    try {
      const sort = (req.query.sort as "new" | "top") || "new";
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const walletAddress = req.walletAddress;

      const posts = await storage.getPosts(sort, limit);
      
      // Get agents for posts
      const agentIds = [...new Set(posts.map(p => p.agentId))];
      const agents = await storage.getAgentsByIds(agentIds);
      const agentMap = new Map(agents.map(a => [a.id, a]));

      const postsWithAgents = posts.map(post => ({
        ...post,
        agent: agentMap.get(post.agentId),
      }));

      // Get user votes if authenticated
      let userVotes: any[] = [];
      if (walletAddress) {
        const userAgent = await storage.getAgentByAddress(walletAddress);
        if (userAgent) {
          const postIds = posts.map(p => p.id);
          userVotes = await storage.getVotesByPosts(postIds, userAgent.id);
        }
      }

      res.json({ posts: postsWithAgents, userVotes });
    } catch (error) {
      console.error("Feed error:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  // Comment endpoints
  app.post("/api/posts/:postId/comments", authMiddleware, async (req, res) => {
    try {
      const { postId } = req.params;
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = createCommentRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { agentId, body } = parseResult.data;

      // Verify post exists
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Verify ownership
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      if (agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Not authorized to comment as this agent" });
      }

      const comment = await storage.createComment({
        postId,
        agentId,
        body,
      });

      await storage.incrementPostCommentCount(postId);

      // Award comment points
      const commentConfig = await storage.getPointsConfig("comment");
      if (commentConfig?.isActive) {
        await storage.addPoints(agentId, "comment", commentConfig.basePoints, comment.id, "comment");
      }

      res.status(201).json({ comment: { ...comment, agent } });
    } catch (error) {
      console.error("Create comment error:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  // Vote endpoints
  app.post("/api/posts/:postId/vote", authMiddleware, async (req, res) => {
    try {
      const { postId } = req.params;
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = voteRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { agentId, direction } = parseResult.data;

      // Verify post exists
      const post = await storage.getPost(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Verify ownership
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      if (agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Not authorized to vote as this agent" });
      }

      // Check for existing vote
      const existingVote = await storage.getVote(postId, agentId);
      
      let vote;
      if (existingVote) {
        // Update existing vote
        vote = await storage.updateVote(existingVote.id, direction);
      } else {
        // Create new vote
        vote = await storage.createVote({
          postId,
          agentId,
          direction,
        });
      }

      // Recalculate vote counts
      const voteCounts = await storage.countVotesForPost(postId);
      await storage.updatePostVotes(postId, voteCounts.upvotes, voteCounts.downvotes);

      res.json({ vote });
    } catch (error) {
      console.error("Vote error:", error);
      res.status(500).json({ message: "Failed to vote" });
    }
  });

  // ============ BOUNTY ENDPOINTS ============

  // Create bounty
  app.post("/api/bounties", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = createBountyRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { agentId, title, body, tags, rewardAmount, rewardDisplay, deadlineHours } = parseResult.data;

      // Verify ownership
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      if (agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Not authorized to create bounty as this agent" });
      }

      // Calculate deadline
      const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

      const bounty = await storage.createBounty({
        agentId,
        title,
        body,
        tags: tags || [],
        rewardAmount,
        rewardDisplay,
        deadline,
      });

      res.status(201).json({ bounty: { ...bounty, agent } });
    } catch (error) {
      console.error("Create bounty error:", error);
      res.status(500).json({ message: "Failed to create bounty" });
    }
  });

  // List bounties
  app.get("/api/bounties", async (req, res) => {
    try {
      const status = (req.query.status as "open" | "awarded" | "expired" | "all") || "open";
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      // Mark expired bounties first
      await storage.markExpiredBounties();

      const bounties = await storage.getBounties(status, limit);
      
      // Get agents for bounties
      const agentIds = [...new Set(bounties.map(b => b.agentId))];
      const agents = await storage.getAgentsByIds(agentIds);
      const agentMap = new Map(agents.map(a => [a.id, a]));

      const bountiesWithAgents = bounties.map(bounty => ({
        ...bounty,
        agent: agentMap.get(bounty.agentId),
        isExpired: new Date(bounty.deadline) < new Date() && bounty.status === "open",
      }));

      res.json({ bounties: bountiesWithAgents });
    } catch (error) {
      console.error("List bounties error:", error);
      res.status(500).json({ message: "Failed to fetch bounties" });
    }
  });

  // Get single bounty with solutions
  app.get("/api/bounties/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const bounty = await storage.getBounty(id);
      if (!bounty) {
        return res.status(404).json({ message: "Bounty not found" });
      }

      const agent = await storage.getAgent(bounty.agentId);
      const solutions = await storage.getSolutionsByBounty(id);
      
      // Get agents for solutions
      const solutionAgentIds = [...new Set(solutions.map(s => s.agentId))];
      const solutionAgents = await storage.getAgentsByIds(solutionAgentIds);
      const agentMap = new Map(solutionAgents.map(a => [a.id, a]));
      
      const solutionsWithAgents = solutions.map(solution => ({
        ...solution,
        agent: agentMap.get(solution.agentId),
      }));

      const isExpired = new Date(bounty.deadline) < new Date() && bounty.status === "open";

      res.json({
        bounty: { ...bounty, agent, isExpired },
        solutions: solutionsWithAgents,
      });
    } catch (error) {
      console.error("Get bounty error:", error);
      res.status(500).json({ message: "Failed to fetch bounty" });
    }
  });

  // Submit solution
  app.post("/api/bounties/:bountyId/solutions", authMiddleware, async (req, res) => {
    try {
      const { bountyId } = req.params;
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = submitSolutionRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { agentId, body, attachments } = parseResult.data;

      // Verify bounty exists and is open
      const bounty = await storage.getBounty(bountyId);
      if (!bounty) {
        return res.status(404).json({ message: "Bounty not found" });
      }
      if (bounty.status !== "open") {
        return res.status(400).json({ message: "Bounty is no longer accepting solutions" });
      }
      if (new Date(bounty.deadline) < new Date()) {
        return res.status(400).json({ message: "Bounty deadline has passed" });
      }

      // Verify ownership
      const agent = await storage.getAgent(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      if (agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Not authorized to submit solution as this agent" });
      }

      // Check if already submitted
      const existingSolution = await storage.getSolutionByBountyAndAgent(bountyId, agentId);
      if (existingSolution) {
        return res.status(400).json({ message: "You have already submitted a solution to this bounty" });
      }

      // Cannot submit to own bounty
      if (bounty.agentId === agentId) {
        return res.status(400).json({ message: "Cannot submit a solution to your own bounty" });
      }

      const solution = await storage.createSolution({
        bountyId,
        agentId,
        body,
        attachments: attachments || [],
      });

      await storage.incrementBountySolutionCount(bountyId);

      res.status(201).json({ solution: { ...solution, agent } });
    } catch (error) {
      console.error("Submit solution error:", error);
      res.status(500).json({ message: "Failed to submit solution" });
    }
  });

  // Award solution
  app.post("/api/bounties/:bountyId/award", authMiddleware, async (req, res) => {
    try {
      const { bountyId } = req.params;
      const walletAddress = req.walletAddress!;

      // Validate request body
      const parseResult = awardSolutionRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { solutionId } = parseResult.data;

      // Verify bounty exists
      const bounty = await storage.getBounty(bountyId);
      if (!bounty) {
        return res.status(404).json({ message: "Bounty not found" });
      }
      if (bounty.status !== "open") {
        return res.status(400).json({ message: "Bounty has already been awarded or cancelled" });
      }

      // Verify ownership - only bounty creator can award
      const agent = await storage.getAgent(bounty.agentId);
      if (!agent || agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Only the bounty creator can award solutions" });
      }

      // Verify solution exists and belongs to this bounty
      const solution = await storage.getSolution(solutionId);
      if (!solution) {
        return res.status(404).json({ message: "Solution not found" });
      }
      if (solution.bountyId !== bountyId) {
        return res.status(400).json({ message: "Solution does not belong to this bounty" });
      }

      // Mark solution as winner and update bounty status
      await storage.markSolutionAsWinner(solutionId);
      const updatedBounty = await storage.updateBountyStatus(bountyId, "awarded", solutionId);

      // Get winner agent
      const winnerAgent = await storage.getAgent(solution.agentId);

      res.json({ 
        bounty: updatedBounty,
        winningSolution: { ...solution, agent: winnerAgent },
      });
    } catch (error) {
      console.error("Award solution error:", error);
      res.status(500).json({ message: "Failed to award solution" });
    }
  });

  // Cancel bounty
  app.post("/api/bounties/:bountyId/cancel", authMiddleware, async (req, res) => {
    try {
      const { bountyId } = req.params;
      const walletAddress = req.walletAddress!;

      // Verify bounty exists
      const bounty = await storage.getBounty(bountyId);
      if (!bounty) {
        return res.status(404).json({ message: "Bounty not found" });
      }
      if (bounty.status !== "open") {
        return res.status(400).json({ message: "Bounty has already been awarded or cancelled" });
      }

      // Verify ownership - only bounty creator can cancel
      const agent = await storage.getAgent(bounty.agentId);
      if (!agent || agent.ownerAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Only the bounty creator can cancel the bounty" });
      }

      const updatedBounty = await storage.updateBountyStatus(bountyId, "cancelled");

      res.json({ bounty: updatedBounty });
    } catch (error) {
      console.error("Cancel bounty error:", error);
      res.status(500).json({ message: "Failed to cancel bounty" });
    }
  });

  // ========================================
  // LAUNCHPAD ENDPOINTS
  // ========================================

  // Store token metadata and return CID (simulated for now)
  app.post("/api/launch/storage/token-metadata", authMiddleware, async (req, res) => {
    try {
      const parseResult = tokenMetadataRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const { name, symbol, description, imageUrl, links, creatorBeeId } = parseResult.data;
      
      // In production, this would upload to IPFS and return a real CID
      // For now, create a deterministic mock CID from the content
      const content = JSON.stringify({ name, symbol, description, imageUrl, links, creatorBeeId });
      const mockCID = `Qm${Buffer.from(content).toString('base64').slice(0, 44).replace(/[+/=]/g, 'x')}`;

      res.json({ metadataCID: mockCID });
    } catch (error) {
      console.error("Token metadata storage error:", error);
      res.status(500).json({ message: "Failed to store token metadata" });
    }
  });

  // Get all launch tokens
  app.get("/api/launch/tokens", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const graduated = req.query.graduated === "true" ? true : req.query.graduated === "false" ? false : undefined;
      
      const tokens = await storage.getLaunchTokens(limit, graduated);
      res.json({ tokens });
    } catch (error) {
      console.error("Get launch tokens error:", error);
      res.status(500).json({ message: "Failed to get tokens" });
    }
  });

  // Admin: Clear all launch tokens (admin only)
  app.delete("/api/launch/tokens/clear-all", authMiddleware, async (req, res) => {
    try {
      const ADMIN_ADDRESS = "0xed72f8286e28d4f2aeb52d59385d1ff3bc9d81d7".toLowerCase();
      const userAddress = req.walletAddress?.toLowerCase();
      
      if (userAddress !== ADMIN_ADDRESS) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Clear all launch trades first (foreign key constraint)
      await db.delete(launchTrades);
      // Clear all launch tokens
      const result = await db.delete(launchTokens);
      
      res.json({ success: true, message: "All launch tokens cleared" });
    } catch (error) {
      console.error("Clear tokens error:", error);
      res.status(500).json({ message: "Failed to clear tokens" });
    }
  });

  // Get single token
  app.get("/api/launch/tokens/:address", async (req, res) => {
    try {
      const token = await storage.getLaunchToken(req.params.address);
      if (!token) {
        return res.status(404).json({ message: "Token not found" });
      }

      const trades = await storage.getLaunchTradesByToken(req.params.address, 50);
      res.json({ token, trades });
    } catch (error) {
      console.error("Get token error:", error);
      res.status(500).json({ message: "Failed to get token" });
    }
  });

  // Record a new token (called after on-chain creation event)
  app.post("/api/launch/tokens", authMiddleware, async (req, res) => {
    try {
      const { tokenAddress, name, symbol, metadataCID, description, imageUrl, creatorBeeId } = req.body;
      const walletAddress = req.walletAddress!;

      if (!tokenAddress || !name || !symbol || !metadataCID) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const token = await storage.createLaunchToken({
        tokenAddress,
        creatorAddress: walletAddress,
        creatorBeeId: creatorBeeId || null,
        name,
        symbol,
        metadataCID,
        description,
        imageUrl,
      });
      
      // Record launch activity
      const agent = await storage.getAgentByAddress(walletAddress);
      await storage.createLaunchActivity({
        type: 'launch',
        tokenAddress,
        tokenName: name,
        tokenSymbol: symbol,
        tokenImage: imageUrl || null,
        actorAddress: walletAddress,
        actorName: agent?.name || null,
        nativeAmount: null,
        tokenAmount: null,
        txHash: null,
      });

      res.json({ token });
    } catch (error) {
      console.error("Create token error:", error);
      res.status(500).json({ message: "Failed to record token" });
    }
  });

  // Record a trade (called after on-chain trade event)
  app.post("/api/launch/trades", async (req, res) => {
    try {
      const { tokenAddress, trader, isBuy, nativeAmount, tokenAmount, feeNative, priceAfter, txHash } = req.body;

      if (!tokenAddress || !trader || isBuy === undefined || !nativeAmount || !tokenAmount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const trade = await storage.createLaunchTrade({
        tokenAddress,
        trader,
        isBuy,
        nativeAmount,
        tokenAmount,
        feeNative: feeNative || "0",
        priceAfter: priceAfter || "0",
        txHash,
      });

      // Get token info and update stats
      const token = await storage.getLaunchToken(tokenAddress);
      if (token) {
        // Update token stats
        if (isBuy) {
          const newTotalRaised = (BigInt(token.totalRaisedNative) + BigInt(nativeAmount) - BigInt(feeNative || "0")).toString();
          await storage.updateLaunchToken(tokenAddress, { 
            totalRaisedNative: newTotalRaised,
            lastTradeAt: new Date(),
          });
        }
        
        // Record activity
        const agent = await storage.getAgentByAddress(trader);
        await storage.createLaunchActivity({
          type: isBuy ? 'buy' : 'sell',
          tokenAddress,
          tokenName: token.name,
          tokenSymbol: token.symbol,
          tokenImage: token.imageUrl || null,
          actorAddress: trader,
          actorName: agent?.name || null,
          nativeAmount,
          tokenAmount,
          txHash,
        });
      }

      res.json({ trade });
    } catch (error) {
      console.error("Record trade error:", error);
      res.status(500).json({ message: "Failed to record trade" });
    }
  });
  
  // Get activity feed (recent trades, launches, migrations)
  app.get("/api/launch/activity", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const activity = await storage.getLaunchActivity(limit);
      res.json({ activity });
    } catch (error) {
      console.error("Get activity error:", error);
      res.status(500).json({ message: "Failed to get activity" });
    }
  });
  
  // Get trending tokens (King of the Hill)
  app.get("/api/launch/trending", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const tokens = await storage.getTrendingTokens(limit);
      res.json({ tokens });
    } catch (error) {
      console.error("Get trending error:", error);
      res.status(500).json({ message: "Failed to get trending tokens" });
    }
  });
  
  // Search tokens
  app.get("/api/launch/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const limit = parseInt(req.query.limit as string) || 20;
      
      if (!query.trim()) {
        return res.json({ tokens: [] });
      }
      
      const tokens = await storage.searchLaunchTokens(query, limit);
      res.json({ tokens });
    } catch (error) {
      console.error("Search tokens error:", error);
      res.status(500).json({ message: "Failed to search tokens" });
    }
  });
  
  // Get comments for a token
  app.get("/api/launch/tokens/:address/comments", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const comments = await storage.getLaunchComments(req.params.address, limit);
      res.json({ comments });
    } catch (error) {
      console.error("Get comments error:", error);
      res.status(500).json({ message: "Failed to get comments" });
    }
  });
  
  // Post a comment on a token
  app.post("/api/launch/tokens/:address/comments", authMiddleware, async (req, res) => {
    try {
      const { content } = req.body;
      const walletAddress = req.walletAddress!;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Content is required" });
      }
      
      if (content.length > 500) {
        return res.status(400).json({ message: "Comment too long (max 500 characters)" });
      }
      
      const agent = await storage.getAgentByAddress(walletAddress);
      
      const comment = await storage.createLaunchComment({
        tokenAddress: req.params.address,
        agentId: agent?.id || null,
        walletAddress,
        content: content.trim(),
      });
      
      res.json({ comment });
    } catch (error) {
      console.error("Post comment error:", error);
      res.status(500).json({ message: "Failed to post comment" });
    }
  });

  // Mark token as graduated
  app.post("/api/launch/tokens/:address/graduate", async (req, res) => {
    try {
      const token = await storage.updateLaunchToken(req.params.address, { graduated: true });
      res.json({ token });
    } catch (error) {
      console.error("Graduate token error:", error);
      res.status(500).json({ message: "Failed to graduate token" });
    }
  });

  // Record migration event
  app.post("/api/launch/tokens/:address/migrate", async (req, res) => {
    try {
      const { address } = req.params;
      const { pairAddress, lpAmount, lpLockAddress, txHash } = req.body;

      const token = await storage.updateLaunchToken(address, { 
        migrated: true,
        graduated: true,
        pairAddress: pairAddress?.toLowerCase(),
        lpAmount: lpAmount?.toString(),
        lpLockAddress: lpLockAddress?.toLowerCase(),
        migrationTxHash: txHash,
        migratedAt: new Date(),
      });

      res.json({ token });
    } catch (error) {
      console.error("Record migration error:", error);
      res.status(500).json({ message: "Failed to record migration" });
    }
  });

  // TX Preparation endpoints - return unsigned transaction data
  const TokenFactoryABI = [
    {
      name: "createToken",
      type: "function",
      inputs: [
        { name: "name", type: "string" },
        { name: "symbol", type: "string" },
        { name: "metadataCID", type: "string" },
        { name: "creatorBeeId", type: "uint256" }
      ],
      outputs: [{ name: "tokenAddress", type: "address" }]
    }
  ] as const;

  const BondingCurveMarketABI = [
    {
      name: "buy",
      type: "function",
      inputs: [
        { name: "token", type: "address" },
        { name: "minTokensOut", type: "uint256" }
      ],
      outputs: [{ name: "tokensOut", type: "uint256" }]
    },
    {
      name: "sell",
      type: "function",
      inputs: [
        { name: "token", type: "address" },
        { name: "tokenAmountIn", type: "uint256" },
        { name: "minNativeOut", type: "uint256" }
      ],
      outputs: [{ name: "nativeOut", type: "uint256" }]
    }
  ] as const;

  // Prepare create token transaction
  app.post("/api/tx/prepare/launch/create-token", authMiddleware, async (req, res) => {
    try {
      const parseResult = prepareCreateTokenRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const { creatorBeeId, metadataCID, name, symbol } = parseResult.data;
      const chainId = parseInt(req.query.chainId as string) || 97;

      // AI-Only Launch Enforcement: All token creation requires verified AI agent status
      // This matches competitive platforms like Clawnch where only verified AI agents can launch tokens
      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found. Please register first." });
      }

      const [verification] = await db.select()
        .from(aiAgentVerifications)
        .where(eq(aiAgentVerifications.agentId, agent.id))
        .limit(1);

      if (!verification?.isVerifiedAI || !verification?.canLaunchTokens) {
        return res.status(403).json({ 
          message: "Token launches require verified AI agent status with launch privileges. Request AI verification first.",
          verificationStatus: verification?.verificationType || "NONE",
          requirement: "AI_VERIFIED or FULL verification level with canLaunchTokens=true"
        });
      }

      // Get factory address for chain
      const factoryAddress = getContractAddress(chainId, "tokenFactory");
      if (!factoryAddress) {
        return res.status(400).json({ message: "Unsupported chain" });
      }

      const data = encodeFunctionData({
        abi: TokenFactoryABI,
        functionName: "createToken",
        args: [name, symbol, metadataCID, BigInt(creatorBeeId || "0")]
      });

      res.json({
        to: factoryAddress,
        data,
        value: "0",
        chainId
      });
    } catch (error) {
      console.error("Prepare create token error:", error);
      res.status(500).json({ message: "Failed to prepare transaction" });
    }
  });

  // Prepare buy transaction
  app.post("/api/tx/prepare/launch/buy", authMiddleware, async (req, res) => {
    try {
      const parseResult = prepareBuyRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const { token, nativeValueWei, minTokensOut } = parseResult.data;
      const chainId = parseInt(req.query.chainId as string) || 97;

      const marketAddress = getContractAddress(chainId, "bondingCurveMarket");
      if (!marketAddress) {
        return res.status(400).json({ message: "Unsupported chain" });
      }

      const data = encodeFunctionData({
        abi: BondingCurveMarketABI,
        functionName: "buy",
        args: [token as `0x${string}`, BigInt(minTokensOut)]
      });

      res.json({
        to: marketAddress,
        data,
        value: nativeValueWei,
        chainId
      });
    } catch (error) {
      console.error("Prepare buy error:", error);
      res.status(500).json({ message: "Failed to prepare transaction" });
    }
  });

  // Prepare sell transaction
  app.post("/api/tx/prepare/launch/sell", authMiddleware, async (req, res) => {
    try {
      const parseResult = prepareSellRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const { token, tokenAmountIn, minNativeOut } = parseResult.data;
      const chainId = parseInt(req.query.chainId as string) || 97;

      const marketAddress = getContractAddress(chainId, "bondingCurveMarket");
      if (!marketAddress) {
        return res.status(400).json({ message: "Unsupported chain" });
      }

      const data = encodeFunctionData({
        abi: BondingCurveMarketABI,
        functionName: "sell",
        args: [token as `0x${string}`, BigInt(tokenAmountIn), BigInt(minNativeOut)]
      });

      res.json({
        to: marketAddress,
        data,
        value: "0",
        chainId
      });
    } catch (error) {
      console.error("Prepare sell error:", error);
      res.status(500).json({ message: "Failed to prepare transaction" });
    }
  });

  // Migration ABI
  const MigrationABI = [
    {
      name: "migrate",
      type: "function",
      inputs: [{ name: "token", type: "address" }],
      outputs: []
    }
  ] as const;

  // Prepare migrate transaction
  app.post("/api/tx/prepare/launch/migrate", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Token address required" });
      }

      const chainId = parseInt(req.query.chainId as string) || 97;

      const migrationAddress = getContractAddress(chainId, "migration");
      if (!migrationAddress || migrationAddress === "0x0000000000000000000000000000000000000000") {
        return res.status(400).json({ message: "Migration not supported on this chain" });
      }

      const data = encodeFunctionData({
        abi: MigrationABI,
        functionName: "migrate",
        args: [token as `0x${string}`]
      });

      res.json({
        to: migrationAddress,
        data,
        value: "0",
        chainId
      });
    } catch (error) {
      console.error("Prepare migrate error:", error);
      res.status(500).json({ message: "Failed to prepare transaction" });
    }
  });

  // Helper function to get contract addresses
  function getContractAddress(chainId: number, contract: string): string | null {
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    
    const addresses: Record<number, Record<string, string>> = {
      31337: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
        migration: ZERO_ADDRESS,
      },
      97: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
        migration: ZERO_ADDRESS,
      },
      56: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
        migration: ZERO_ADDRESS,
      },
      5611: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
        migration: ZERO_ADDRESS,
      },
      204: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
        migration: ZERO_ADDRESS,
      },
      // Base Mainnet
      8453: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
        migration: ZERO_ADDRESS,
      },
      // Base Sepolia Testnet
      84532: {
        agentRegistry: ZERO_ADDRESS,
        bountyEscrow: ZERO_ADDRESS,
        postBond: ZERO_ADDRESS,
        reputation: ZERO_ADDRESS,
        feeVault: ZERO_ADDRESS,
        tokenFactory: ZERO_ADDRESS,
        bondingCurveMarket: ZERO_ADDRESS,
        migration: ZERO_ADDRESS,
      },
    };

    return addresses[chainId]?.[contract] || null;
  }

  // Contract configuration endpoint
  // Returns contract addresses for the requested chain
  app.get("/api/contracts/:chainId", (req, res) => {
    const chainId = parseInt(req.params.chainId);
    
    const addresses = {
      agentRegistry: getContractAddress(chainId, "agentRegistry"),
      bountyEscrow: getContractAddress(chainId, "bountyEscrow"),
      postBond: getContractAddress(chainId, "postBond"),
      reputation: getContractAddress(chainId, "reputation"),
      feeVault: getContractAddress(chainId, "feeVault"),
      tokenFactory: getContractAddress(chainId, "tokenFactory"),
      bondingCurveMarket: getContractAddress(chainId, "bondingCurveMarket"),
    };

    if (!addresses.agentRegistry) {
      return res.status(404).json({ 
        message: "Unsupported chain ID", 
        supportedChains: [31337, 97, 56, 5611, 204, 8453, 84532]
      });
    }

    res.json({ chainId, addresses });
  });

  // Register Hive feature routes (channels, bot follows, memory, webhooks, skills, verification)
  registerHiveRoutes(app);

  // Register AI chat routes
  registerChatRoutes(app);

  // Register paid AI agent marketplace routes
  registerAiAgentRoutes(app);
  
  registerDuelsRoutes(app);
  registerTriviaRoutes(app);
  registerFighterRoutes(app);

  registerHoneyRoutes(app);

  // Register Twitter automation routes
  registerTwitterRoutes(app);

  // Register autonomous AI agent routes
  registerAutonomousAgentRoutes(app);

  // Register BeePay settlement layer routes
  app.use("/api/beepay", beepayRoutes);

  // Register BAP-578 NFA (Non-Fungible Agent) routes
  app.use("/api/nfa", nfaRouter);

  // Register Giveaway campaign routes
  app.use("/api/giveaways", giveawayRouter);
  seedGiveawayCampaign();

  // Register CRM routes
  app.use("/api/crm", crmRoutes);

  // Register Game Hub routes
  app.use("/api/hub", gameHubRoutes);
  app.use("/api/devs", developerRoutes);

  // Register NFA Tunnel Dash routes
  registerNfaTunnelRoutes(app);

  // Register OpenClaw integration routes
  app.use("/api/openclaw", openclawRouter);
  app.use("/api/web4", web4Router);
  app.use("/api/presale", presaleRouter);
  startAlertProcessor();

  // Admin endpoint to set cooldown to 0 (requires DEPLOYER_PRIVATE_KEY)
  app.post("/api/admin/set-cooldown", async (req, res) => {
    try {
      const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
      if (!privateKey) {
        return res.status(500).json({ message: "Deployer private key not configured" });
      }

      const cooldownSeconds = req.body.cooldownSeconds ?? 0;
      const marketAddress = "0x960518eC278b5a78bD1B5fC1b2E22abC5DB1A167" as `0x${string}`;

      const account = privateKeyToAccount(privateKey.startsWith("0x") ? privateKey as `0x${string}` : `0x${privateKey}`);
      
      const walletClient = createWalletClient({
        account,
        chain: bsc,
        transport: http("https://bsc-dataseed1.binance.org"),
      });

      const setCooldownAbi = [{
        type: "function",
        name: "setCooldownSeconds",
        inputs: [{ name: "_cooldown", type: "uint256" }],
        outputs: [],
        stateMutability: "nonpayable",
      }] as const;

      const hash = await walletClient.writeContract({
        address: marketAddress,
        abi: setCooldownAbi,
        functionName: "setCooldownSeconds",
        args: [BigInt(cooldownSeconds)],
      });

      res.json({ success: true, hash, cooldownSeconds });
    } catch (error: any) {
      console.error("Failed to set cooldown:", error);
      res.status(500).json({ message: error.message || "Failed to set cooldown" });
    }
  });

  // Public landing page stats (no auth required)
  app.get("/api/landing-stats", async (req, res) => {
    try {
      const usersResult = await db.execute(sql`SELECT COUNT(*) as count FROM agents`);
      const nfasResult = await db.execute(sql`SELECT COUNT(*) as count FROM nfa_agents`);
      const volumeResult = await db.execute(sql`SELECT COALESCE(SUM(CAST(price_wei AS DECIMAL) / 1e18), 0) as volume FROM nfa_listings WHERE active = false`);
      
      const users = (usersResult as any).rows?.[0]?.count || (usersResult as any)[0]?.count || 0;
      const nfas = (nfasResult as any).rows?.[0]?.count || (nfasResult as any)[0]?.count || 0;
      const volume = (volumeResult as any).rows?.[0]?.volume || (volumeResult as any)[0]?.volume || "0";
      
      res.json({
        totalUsers: Number(users),
        totalNfas: Number(nfas),
        totalVolume: parseFloat(volume).toFixed(2),
      });
    } catch (error: any) {
      console.error("Failed to get landing stats:", error);
      res.json({ totalUsers: 0, totalNfas: 0, totalVolume: "0" });
    }
  });

  // Platform stats endpoint (admin only)
  const ADMIN_ADDRESS = "0xed72f8286e28d4f2aeb52d59385d1ff3bc9d81d7".toLowerCase();
  app.get("/api/stats", authMiddleware, async (req, res) => {
    try {
      const userAddress = req.walletAddress?.toLowerCase();
      if (userAddress !== ADMIN_ADDRESS) {
        return res.status(403).json({ message: "Unauthorized" });
      }
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Failed to get platform stats:", error);
      res.status(500).json({ message: error.message || "Failed to get stats" });
    }
  });

  // ============ GROWTH & GAMIFICATION ============

  // Get or create referral link for current user
  app.get("/api/referrals/my-link", authMiddleware, async (req, res) => {
    try {
      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      let referral = await storage.getReferralByAgent(agent.id);
      if (!referral) {
        const code = `BEE${agent.id.slice(0, 8).toUpperCase()}`;
        referral = await storage.createReferral({
          referrerAgentId: agent.id,
          referralCode: code,
        });
      }

      res.json(referral);
    } catch (error: any) {
      console.error("Failed to get referral link:", error);
      res.status(500).json({ message: error.message || "Failed to get referral link" });
    }
  });

  // Get referral stats for current user
  app.get("/api/referrals/stats", authMiddleware, async (req, res) => {
    try {
      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const referral = await storage.getReferralByAgent(agent.id);
      if (!referral) {
        return res.json({ referralCount: 0, tier: "newcomer", conversions: [] });
      }

      const conversions = await storage.getReferralConversions(referral.id);
      res.json({
        ...referral,
        conversions,
      });
    } catch (error: any) {
      console.error("Failed to get referral stats:", error);
      res.status(500).json({ message: error.message || "Failed to get referral stats" });
    }
  });

  // Process referral on signup
  app.post("/api/referrals/apply", authMiddleware, async (req, res) => {
    try {
      const { referralCode } = req.body;
      if (!referralCode) {
        return res.status(400).json({ message: "Referral code required" });
      }

      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const alreadyReferred = await storage.isAlreadyReferred(agent.id);
      if (alreadyReferred) {
        return res.status(400).json({ message: "Already used a referral code" });
      }

      const referral = await storage.getReferralByCode(referralCode.toUpperCase());
      if (!referral) {
        return res.status(404).json({ message: "Invalid referral code" });
      }

      if (referral.referrerAgentId === agent.id) {
        return res.status(400).json({ message: "Cannot refer yourself" });
      }

      await storage.createReferralConversion({
        referralId: referral.id,
        referredAgentId: agent.id,
        rewardAmount: "0",
      });

      const updated = await storage.incrementReferralCount(referral.id);

      let newTier = "newcomer";
      if (updated.referralCount >= 500) newTier = "queen";
      else if (updated.referralCount >= 100) newTier = "gold";
      else if (updated.referralCount >= 25) newTier = "silver";
      else if (updated.referralCount >= 5) newTier = "bronze";

      if (newTier !== updated.tier) {
        await storage.updateReferralTier(referral.id, newTier);
      }

      // Award referral points to both parties
      const referralMadeConfig = await storage.getPointsConfig("referral_made");
      if (referralMadeConfig?.isActive) {
        await storage.addPoints(referral.referrerAgentId, "referral_made", referralMadeConfig.basePoints, referral.id, "referral");
      }
      const referralReceivedConfig = await storage.getPointsConfig("referral_received");
      if (referralReceivedConfig?.isActive) {
        await storage.addPoints(agent.id, "referral_received", referralReceivedConfig.basePoints, referral.id, "referral");
      }

      res.json({ success: true, message: "Referral applied successfully" });
    } catch (error: any) {
      console.error("Failed to apply referral:", error);
      res.status(500).json({ message: error.message || "Failed to apply referral" });
    }
  });

  // Get top referrers leaderboard
  app.get("/api/leaderboards/referrers", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const referrers = await storage.getTopReferrers(limit);

      const enriched = await Promise.all(referrers.map(async (r) => {
        const agent = await storage.getAgent(r.referrerAgentId);
        return {
          ...r,
          agent: agent ? { id: agent.id, name: agent.name, avatarUrl: agent.avatarUrl } : null,
        };
      }));

      res.json({ leaderboard: enriched });
    } catch (error: any) {
      console.error("Failed to get referrer leaderboard:", error);
      res.status(500).json({ message: error.message || "Failed to get leaderboard" });
    }
  });

  // Get all achievements
  app.get("/api/achievements", async (req, res) => {
    try {
      const achievements = await storage.getAchievementDefs();
      res.json({ achievements });
    } catch (error: any) {
      console.error("Failed to get achievements:", error);
      res.status(500).json({ message: error.message || "Failed to get achievements" });
    }
  });

  // Get user's achievements
  app.get("/api/achievements/my", authMiddleware, async (req, res) => {
    try {
      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const userAchievements = await storage.getUserAchievements(agent.id);
      const allAchievements = await storage.getAchievementDefs();

      const merged = allAchievements.map((def) => {
        const userProgress = userAchievements.find((ua) => ua.achievementId === def.id);
        return {
          ...def,
          progress: userProgress?.progress || 0,
          completed: userProgress?.completed || false,
          completedAt: userProgress?.completedAt,
        };
      });

      res.json({ achievements: merged });
    } catch (error: any) {
      console.error("Failed to get user achievements:", error);
      res.status(500).json({ message: error.message || "Failed to get user achievements" });
    }
  });

  // Get early adopter status
  app.get("/api/early-adopter", authMiddleware, async (req, res) => {
    try {
      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const earlyAdopter = await storage.getEarlyAdopter(agent.id);
      const totalCount = await storage.getEarlyAdopterCount();

      res.json({
        isEarlyAdopter: !!earlyAdopter,
        badgeNumber: earlyAdopter?.badgeNumber,
        rewardMultiplier: earlyAdopter?.rewardMultiplier,
        totalEarlyAdopters: totalCount,
        maxEarlyAdopters: 10000,
      });
    } catch (error: any) {
      console.error("Failed to get early adopter status:", error);
      res.status(500).json({ message: error.message || "Failed to get early adopter status" });
    }
  });

  // Get combined growth leaderboards
  app.get("/api/leaderboards", async (req, res) => {
    try {
      const referrers = await storage.getTopReferrers(10);
      const enrichedReferrers = await Promise.all(referrers.map(async (r) => {
        const agent = await storage.getAgent(r.referrerAgentId);
        return {
          ...r,
          agent: agent ? { id: agent.id, name: agent.name, avatarUrl: agent.avatarUrl } : null,
        };
      }));

      res.json({
        topReferrers: enrichedReferrers,
      });
    } catch (error: any) {
      console.error("Failed to get leaderboards:", error);
      res.status(500).json({ message: error.message || "Failed to get leaderboards" });
    }
  });

  // Seed default achievements (admin only)
  app.post("/api/admin/seed-achievements", authMiddleware, async (req, res) => {
    try {
      const userAddress = req.walletAddress?.toLowerCase();
      if (userAddress !== ADMIN_ADDRESS) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const defaultAchievements = [
        { slug: "first_post", name: "First Buzz", nameZh: "首次发帖", description: "Create your first post", descriptionZh: "发布你的第一篇帖子", icon: "FileText", category: "social", requirement: 1 },
        { slug: "first_comment", name: "First Reply", nameZh: "首次评论", description: "Leave your first comment", descriptionZh: "发表你的第一条评论", icon: "MessageSquare", category: "social", requirement: 1 },
        { slug: "first_bounty", name: "Bounty Hunter", nameZh: "赏金猎人", description: "Complete your first bounty", descriptionZh: "完成你的第一个赏金任务", icon: "Coins", category: "bounty", requirement: 1 },
        { slug: "first_referral", name: "Hive Builder", nameZh: "蜂巢建设者", description: "Refer your first friend", descriptionZh: "邀请你的第一位朋友", icon: "Users", category: "referral", requirement: 1 },
        { slug: "bronze_referrer", name: "Bronze Bee", nameZh: "青铜蜜蜂", description: "Refer 5 friends", descriptionZh: "邀请5位朋友", icon: "Award", category: "referral", requirement: 5 },
        { slug: "silver_referrer", name: "Silver Bee", nameZh: "白银蜜蜂", description: "Refer 25 friends", descriptionZh: "邀请25位朋友", icon: "Award", category: "referral", requirement: 25 },
        { slug: "gold_referrer", name: "Gold Bee", nameZh: "黄金蜜蜂", description: "Refer 100 friends", descriptionZh: "邀请100位朋友", icon: "Award", category: "referral", requirement: 100 },
        { slug: "queen_referrer", name: "Queen Bee", nameZh: "蜂后", description: "Refer 500 friends", descriptionZh: "邀请500位朋友", icon: "Crown", category: "referral", requirement: 500 },
        { slug: "create_agent", name: "Agent Creator", nameZh: "代理创建者", description: "Create your first AI agent", descriptionZh: "创建你的第一个AI代理", icon: "Bot", category: "agent", requirement: 1 },
        { slug: "early_adopter", name: "Early Adopter", nameZh: "早期采用者", description: "One of the first 10,000 Bees", descriptionZh: "前10,000名蜜蜂之一", icon: "Star", category: "special", requirement: 1 },
      ];

      for (const achievement of defaultAchievements) {
        const existing = await storage.getAchievementBySlug(achievement.slug);
        if (!existing) {
          await storage.createAchievementDef(achievement);
        }
      }

      res.json({ success: true, message: "Achievements seeded" });
    } catch (error: any) {
      console.error("Failed to seed achievements:", error);
      res.status(500).json({ message: error.message || "Failed to seed achievements" });
    }
  });

  // === Points System Routes ===

  // Get user's points
  app.get("/api/points/my", authMiddleware, async (req, res) => {
    try {
      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      let points = await storage.getUserPoints(agent.id);
      if (!points) {
        points = await storage.createUserPoints(agent.id);
      }

      res.json({ points });
    } catch (error: any) {
      console.error("Failed to get points:", error);
      res.status(500).json({ message: error.message || "Failed to get points" });
    }
  });

  // Get user's points history
  app.get("/api/points/history", authMiddleware, async (req, res) => {
    try {
      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getPointsHistory(agent.id, limit);

      res.json({ history });
    } catch (error: any) {
      console.error("Failed to get points history:", error);
      res.status(500).json({ message: error.message || "Failed to get points history" });
    }
  });

  // Get points leaderboard
  app.get("/api/points/leaderboard", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const pointsLeaderboard = await storage.getPointsLeaderboard(limit);

      // Enrich with agent info
      const agentIds = pointsLeaderboard.map(p => p.agentId);
      const agents = await storage.getAgentsByIds(agentIds);
      const agentMap = new Map(agents.map(a => [a.id, a]));

      const leaderboard = pointsLeaderboard.map((p, index) => {
        const agent = agentMap.get(p.agentId);
        return {
          rank: index + 1,
          agentId: p.agentId,
          name: agent?.name || "Unknown Bee",
          avatarUrl: agent?.avatarUrl,
          totalPoints: p.totalPoints,
          lifetimePoints: p.lifetimePoints,
        };
      });

      res.json({ leaderboard });
    } catch (error: any) {
      console.error("Failed to get points leaderboard:", error);
      res.status(500).json({ message: error.message || "Failed to get points leaderboard" });
    }
  });

  // Get points config (public - shows what actions earn points)
  app.get("/api/points/config", async (_req, res) => {
    try {
      const configs = await storage.getAllPointsConfig();
      res.json({ configs });
    } catch (error: any) {
      console.error("Failed to get points config:", error);
      res.status(500).json({ message: error.message || "Failed to get points config" });
    }
  });

  // Get game rewards info and tokenomics (public)
  app.get("/api/points/game-rewards", async (_req, res) => {
    try {
      const { getGameRewards, getPointsCaps, TOKENOMICS } = await import("./points-engine");
      res.json({
        rewards: getGameRewards(),
        caps: getPointsCaps(),
        tokenomics: TOKENOMICS,
      });
    } catch (error: any) {
      console.error("Failed to get game rewards:", error);
      res.status(500).json({ message: error.message || "Failed to get game rewards" });
    }
  });

  // Submit HoneyRunner game session for points
  app.post("/api/points/game/honey-runner", authMiddleware, async (req, res) => {
    try {
      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) return res.status(404).json({ message: "Agent not found" });

      const { score, duration } = req.body;
      if (typeof score !== "number" || score < 0) {
        return res.status(400).json({ message: "Invalid score" });
      }
      if (typeof duration !== "number" || duration < 15) {
        return res.status(400).json({ message: "Session too short (minimum 15 seconds)" });
      }

      const { awardGamePoints } = await import("./points-engine");
      const result = await awardGamePoints({
        gameType: "honey_runner",
        agentId: agent.id,
        score,
        isBotMatch: false,
        metadata: { duration },
      });

      res.json(result);
    } catch (error: any) {
      console.error("Failed to award HoneyRunner points:", error);
      res.status(500).json({ message: error.message || "Failed to award points" });
    }
  });

  // Seed default points config (admin only)
  app.post("/api/admin/seed-points-config", authMiddleware, async (req, res) => {
    try {
      const userAddress = req.walletAddress?.toLowerCase();
      if (userAddress !== ADMIN_ADDRESS) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const defaultConfigs = [
        { action: "registration", basePoints: 100, dailyCap: null, description: "Account registration bonus", isActive: true },
        { action: "referral_made", basePoints: 50, dailyCap: null, description: "Successfully referred a new user", isActive: true },
        { action: "referral_received", basePoints: 25, dailyCap: null, description: "Joined via referral link", isActive: true },
        { action: "post", basePoints: 10, dailyCap: 100, description: "Create a new post", isActive: true },
        { action: "comment", basePoints: 5, dailyCap: 50, description: "Leave a comment", isActive: true },
        { action: "bounty_complete", basePoints: 50, dailyCap: null, description: "Complete a bounty", isActive: true },
        { action: "daily_login", basePoints: 5, dailyCap: 5, description: "Daily login bonus", isActive: true },
        { action: "achievement", basePoints: 25, dailyCap: null, description: "Unlock an achievement", isActive: true },
        { action: "create_agent", basePoints: 100, dailyCap: null, description: "Create an AI agent", isActive: true },
        { action: "launch_token", basePoints: 200, dailyCap: null, description: "Launch a token in The Hatchery", isActive: true },
      ];

      for (const config of defaultConfigs) {
        await storage.upsertPointsConfig(config);
      }

      res.json({ success: true, message: "Points config seeded" });
    } catch (error: any) {
      console.error("Failed to seed points config:", error);
      res.status(500).json({ message: error.message || "Failed to seed points config" });
    }
  });

  // ============ COMPETITIVE FEATURES ============
  // Import services
  const { heartbeatService } = await import("./heartbeat-service");
  const { launchAlertService } = await import("./launch-alert-service");

  // Start background services
  heartbeatService.start();
  launchAlertService.start();

  // --- Agent Heartbeat Routes ---
  
  // Get heartbeat status for an agent
  app.get("/api/heartbeat/:agentId", authMiddleware, async (req, res) => {
    try {
      const { agentId } = req.params;
      const status = await heartbeatService.getHeartbeatStatus(agentId);
      res.json({ heartbeat: status });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get heartbeat status" });
    }
  });

  // Enable heartbeat for an agent
  app.post("/api/heartbeat/enable", authMiddleware, async (req, res) => {
    try {
      const parseResult = enableHeartbeatRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      if (!agent.isBot) {
        return res.status(400).json({ message: "Heartbeat is only available for bot accounts" });
      }

      const { intervalMinutes, maxDailyPosts, topics, personality, targetChannelId, postTemplate } = parseResult.data;
      
      await heartbeatService.enableHeartbeat(agent.id, {
        intervalMinutes,
        maxDailyPosts,
        topics,
        personality,
        targetChannelId,
        postTemplate,
      });

      res.json({ success: true, message: "Heartbeat enabled" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to enable heartbeat" });
    }
  });

  // Disable heartbeat for an agent
  app.post("/api/heartbeat/disable", authMiddleware, async (req, res) => {
    try {
      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      await heartbeatService.disableHeartbeat(agent.id);
      res.json({ success: true, message: "Heartbeat disabled" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to disable heartbeat" });
    }
  });

  // Get heartbeat logs
  app.get("/api/heartbeat/:agentId/logs", authMiddleware, async (req, res) => {
    try {
      const { agentId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const logs = await heartbeatService.getHeartbeatLogs(agentId, limit);
      res.json({ logs });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get heartbeat logs" });
    }
  });

  // Bot API: Enable heartbeat via API key
  app.post("/api/bot/heartbeat/enable", botAuthMiddleware, async (req, res) => {
    try {
      const parseResult = enableHeartbeatRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const agent = req.bot;
      if (!agent) {
        return res.status(404).json({ message: "Bot not found" });
      }

      const { intervalMinutes, maxDailyPosts, topics, personality, targetChannelId, postTemplate } = parseResult.data;
      
      await heartbeatService.enableHeartbeat(agent.id, {
        intervalMinutes,
        maxDailyPosts,
        topics,
        personality,
        targetChannelId,
        postTemplate,
      });

      res.json({ success: true, message: "Heartbeat enabled" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to enable heartbeat" });
    }
  });

  // Bot API: Disable heartbeat via API key
  app.post("/api/bot/heartbeat/disable", botAuthMiddleware, async (req, res) => {
    try {
      const agent = req.bot;
      if (!agent) {
        return res.status(404).json({ message: "Bot not found" });
      }

      await heartbeatService.disableHeartbeat(agent.id);
      res.json({ success: true, message: "Heartbeat disabled" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to disable heartbeat" });
    }
  });

  // --- Launch Alerts Routes ---

  // Get launch alert config (admin only)
  app.get("/api/launch-alerts/config", authMiddleware, async (req, res) => {
    try {
      const userAddress = req.walletAddress?.toLowerCase();
      if (userAddress !== ADMIN_ADDRESS) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const config = await launchAlertService.getConfig();
      res.json({ config });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get alert config" });
    }
  });

  // Update launch alert config (admin only)
  app.patch("/api/launch-alerts/config", authMiddleware, async (req, res) => {
    try {
      const parseResult = updateLaunchAlertConfigSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: parseResult.error.errors });
      }

      const userAddress = req.walletAddress?.toLowerCase();
      if (userAddress !== ADMIN_ADDRESS) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await launchAlertService.updateConfig(parseResult.data);
      res.json({ success: true, message: "Alert config updated" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update alert config" });
    }
  });

  // Get recent launch alerts (public - for transparency)
  app.get("/api/launch-alerts", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const alerts = await launchAlertService.getRecentAlerts(limit);
      res.json({ alerts });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get alerts" });
    }
  });

  // --- Multi-Chain Routes ---

  // Get supported chains
  app.get("/api/chains", async (_req, res) => {
    try {
      const chains = await db.select().from(supportedChains).where(eq(supportedChains.isActive, true));
      res.json({ chains });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get chains" });
    }
  });

  // Get cross-chain deployments for an agent
  app.get("/api/agents/:agentId/chains", async (req, res) => {
    try {
      const { agentId } = req.params;
      const deployments = await db.select()
        .from(crossChainAgents)
        .where(eq(crossChainAgents.agentId, agentId));
      res.json({ deployments });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get chain deployments" });
    }
  });

  // --- AI Verification Routes ---

  // Get AI verification status for an agent
  app.get("/api/agents/:agentId/ai-verification", async (req, res) => {
    try {
      const { agentId } = req.params;
      const [verification] = await db.select()
        .from(aiAgentVerifications)
        .where(eq(aiAgentVerifications.agentId, agentId))
        .limit(1);
      res.json({ verification: verification || null });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get verification" });
    }
  });

  // Request AI verification (for bots)
  app.post("/api/agents/request-ai-verification", authMiddleware, async (req, res) => {
    try {
      const agent = await storage.getAgentByAddress(req.walletAddress!);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      if (!agent.isBot || !agent.apiKey) {
        return res.status(400).json({ message: "AI verification requires bot mode with API key" });
      }

      const [existing] = await db.select()
        .from(aiAgentVerifications)
        .where(eq(aiAgentVerifications.agentId, agent.id))
        .limit(1);

      if (existing) {
        return res.json({ verification: existing, message: "Verification already exists" });
      }

      const [verification] = await db.insert(aiAgentVerifications).values({
        agentId: agent.id,
        verificationType: "BASIC",
        isVerifiedAI: true,
        verificationMethod: "api_key",
        canAutoPost: true,
        canLaunchTokens: false,
        verifiedAt: new Date(),
      }).returning();

      res.json({ verification, message: "AI verification granted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to request verification" });
    }
  });

  // Admin: Grant full AI verification
  app.post("/api/admin/grant-ai-verification", authMiddleware, async (req, res) => {
    try {
      const userAddress = req.walletAddress?.toLowerCase();
      if (userAddress !== ADMIN_ADDRESS) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { agentId, canLaunchTokens, canAutoPost, badge } = req.body;

      const [existing] = await db.select()
        .from(aiAgentVerifications)
        .where(eq(aiAgentVerifications.agentId, agentId))
        .limit(1);

      if (existing) {
        await db.update(aiAgentVerifications)
          .set({
            verificationType: "FULL",
            isVerifiedAI: true,
            verificationMethod: "manual",
            verifiedBy: userAddress,
            verifiedAt: new Date(),
            canLaunchTokens: canLaunchTokens ?? true,
            canAutoPost: canAutoPost ?? true,
            badge: badge || "Verified AI Agent",
            updatedAt: new Date(),
          })
          .where(eq(aiAgentVerifications.agentId, agentId));
      } else {
        await db.insert(aiAgentVerifications).values({
          agentId,
          verificationType: "FULL",
          isVerifiedAI: true,
          verificationMethod: "manual",
          verifiedBy: userAddress,
          verifiedAt: new Date(),
          canLaunchTokens: canLaunchTokens ?? true,
          canAutoPost: canAutoPost ?? true,
          badge: badge || "Verified AI Agent",
        });
      }

      res.json({ success: true, message: "AI verification granted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to grant verification" });
    }
  });

  // Post announcement thread to Twitter (admin only)
  app.post("/api/admin/twitter/post-announcement", authMiddleware, async (req, res) => {
    try {
      const userAddress = req.walletAddress?.toLowerCase();
      if (userAddress !== ADMIN_ADDRESS) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const { tweets } = req.body;
      if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
        return res.status(400).json({ message: "tweets array is required" });
      }

      const { TwitterService } = await import("./twitter-service");
      const twitterService = new TwitterService();

      if (!twitterService.isConfigured()) {
        return res.status(500).json({ message: "Twitter API not configured" });
      }

      const result = await twitterService.postThread(tweets, true);

      if (result.success) {
        res.json({ 
          success: true, 
          message: `Thread posted successfully with ${result.tweetIds?.length} tweets`,
          tweetIds: result.tweetIds,
          threadUrl: `https://twitter.com/honeycombchain/status/${result.tweetIds?.[0]}`
        });
      } else {
        res.status(500).json({ message: result.error || "Failed to post thread" });
      }
    } catch (error: any) {
      console.error("Post announcement error:", error);
      res.status(500).json({ message: error.message || "Failed to post announcement" });
    }
  });

  // ============ ARENA CHAT ROUTES ============

  app.get("/api/arena-chat", async (req, res) => {
    try {
      const { getChatHistory } = await import("./arena-chat");
      const scopeType = (req.query.scopeType as string) || "lobby";
      const scopeId = req.query.scopeId as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const messages = await getChatHistory(scopeType, scopeId, limit);
      res.json({ messages: messages.reverse() });
    } catch (error: any) {
      res.json({ messages: [] });
    }
  });

  // ============ TRADING SKILL GAME ROUTES ============

  app.get("/api/trading-duels", async (req, res) => {
    try {
      const status = (req.query.status as string) || "all";
      const limit = parseInt(req.query.limit as string) || 20;
      const matchType = req.query.matchType as string | undefined;
      let duels = await storage.getTradingDuels(status, limit);
      if (matchType) {
        duels = duels.filter(d => d.matchType === matchType);
      }
      res.json(duels);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const arenaPriceCache = new Map<string, { price: number; timestamp: number }>();
  const ARENA_CACHE_TTL = 800;

  const SYMBOL_TO_BASE: Record<string, string> = {
    BTCUSDT: "BTC", ETHUSDT: "ETH", BNBUSDT: "BNB", SOLUSDT: "SOL",
    DOGEUSDT: "DOGE", XRPUSDT: "XRP", ADAUSDT: "ADA", AVAXUSDT: "AVAX",
    MATICUSDT: "MATIC", LINKUSDT: "LINK", PEPEUSDT: "PEPE", SHIBUSDT: "SHIB",
  };

  const KRAKEN_MAP: Record<string, string> = {
    BTC: "XBTUSD", ETH: "ETHUSD", SOL: "SOLUSD", BNB: "BNBUSD",
    DOGE: "DOGEUSD", XRP: "XRPUSD", ADA: "ADAUSD", AVAX: "AVAXUSD",
    LINK: "LINKUSD",
  };

  const COINGECKO_ID: Record<string, string> = {
    BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana",
    DOGE: "dogecoin", XRP: "ripple", ADA: "cardano", AVAX: "avalanche-2",
  };

  async function fetchFromSource(url: string, timeoutMs = 3000): Promise<Response> {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);
      return res;
    } catch (e) {
      clearTimeout(t);
      throw e;
    }
  }

  async function fetchArenaPrice(symbol: string): Promise<number> {
    const cached = arenaPriceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < ARENA_CACHE_TTL) {
      return cached.price;
    }

    const base = SYMBOL_TO_BASE[symbol] || symbol.replace("USDT", "");
    const setCache = (price: number) => {
      arenaPriceCache.set(symbol, { price, timestamp: Date.now() });
      return price;
    };

    try {
      const res = await fetchFromSource(`https://min-api.cryptocompare.com/data/price?fsym=${base}&tsyms=USD`);
      const data = await res.json();
      if (data?.USD) return setCache(data.USD);
    } catch {}

    const krakenSym = KRAKEN_MAP[base];
    if (krakenSym) {
      try {
        const res = await fetchFromSource(`https://api.kraken.com/0/public/Ticker?pair=${krakenSym}`);
        const data = await res.json();
        const pair = Object.keys(data.result || {})[0];
        if (pair && data.result[pair]?.c?.[0]) {
          return setCache(parseFloat(data.result[pair].c[0]));
        }
      } catch {}
    }

    const geckoId = COINGECKO_ID[base];
    if (geckoId) {
      try {
        const res = await fetchFromSource(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`);
        const data = await res.json();
        if (data?.[geckoId]?.usd) return setCache(data[geckoId].usd);
      } catch {}
    }

    if (cached) return cached.price;

    throw new Error("Failed to fetch price from any exchange");
  }

  app.get("/api/trading-duels/binance/klines", async (req, res) => {
    try {
      const { symbol, interval, limit: klimit } = req.query;
      const sym = (symbol as string) || "BTCUSDT";
      const intv = (interval as string) || "1m";
      const lim = (klimit as string) || "100";
      const base = SYMBOL_TO_BASE[sym] || sym.replace("USDT", "");

      const ccIntervalMap: Record<string, string> = {
        "1m": "histominute", "5m": "histominute", "15m": "histominute",
        "1h": "histohour", "4h": "histohour", "1d": "histoday",
      };
      const ccAggMap: Record<string, number> = {
        "1m": 1, "5m": 5, "15m": 15, "1h": 1, "4h": 4, "1d": 1,
      };
      const ccEndpoint = ccIntervalMap[intv] || "histominute";
      const ccAgg = ccAggMap[intv] || 1;

      try {
        const response = await fetchFromSource(
          `https://min-api.cryptocompare.com/data/v2/${ccEndpoint}?fsym=${base}&tsym=USD&limit=${lim}&aggregate=${ccAgg}`
        );
        const data = await response.json();
        if (data?.Data?.Data && Array.isArray(data.Data.Data)) {
          const klines = data.Data.Data.map((k: any) => [
            k.time * 1000,
            k.open.toString(),
            k.high.toString(),
            k.low.toString(),
            k.close.toString(),
            k.volumefrom?.toString() || "0",
            (k.time + ccAgg * 60) * 1000,
            k.close.toString(),
            "0", "0", "0", "0"
          ]);
          return res.json(klines);
        }
      } catch {}

      const krakenSym = KRAKEN_MAP[base];
      if (krakenSym) {
        const intervalMap: Record<string, number> = { "1m": 1, "5m": 5, "15m": 15, "1h": 60, "4h": 240, "1d": 1440 };
        const krakenInterval = intervalMap[intv] || 1;
        try {
          const response = await fetchFromSource(`https://api.kraken.com/0/public/OHLC?pair=${krakenSym}&interval=${krakenInterval}`);
          const data = await response.json();
          const pair = Object.keys(data.result || {}).find(k => k !== "last");
          if (pair && data.result[pair]) {
            const klines = data.result[pair].slice(-parseInt(lim)).map((k: any) => [
              k[0] * 1000, k[1], k[2], k[3], k[4], k[6], k[0] * 1000 + krakenInterval * 60000, k[4], "0", "0", "0", "0"
            ]);
            return res.json(klines);
          }
        } catch {}
      }

      res.status(500).json({ message: "Failed to fetch chart data from any exchange" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-duels/binance/ticker", async (req, res) => {
    try {
      const { symbol } = req.query;
      const sym = (symbol as string) || "BTCUSDT";
      try {
        const price = await fetchArenaPrice(sym);
        res.json({ symbol: sym, price: price.toString() });
      } catch {
        const cached = arenaPriceCache.get(sym);
        if (cached) {
          res.json({ symbol: sym, price: cached.price.toString(), stale: true });
        } else {
          res.status(500).json({ message: "Price unavailable" });
        }
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-duels/my-duels/:agentId", async (req, res) => {
    try {
      const duels = await storage.getTradingDuelsByAgent(req.params.agentId);
      res.json(duels);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-duels/leaderboard", async (req, res) => {
    try {
      const period = (req.query.period as string) || "all";

      if (period === "all") {
        const topPlayers = await db.select({
          id: agents.id,
          name: agents.name,
          avatarUrl: agents.avatarUrl,
          arenaWins: agents.arenaWins,
          arenaLosses: agents.arenaLosses,
          arenaWinStreak: agents.arenaWinStreak,
          arenaBestStreak: agents.arenaBestStreak,
          arenaRating: agents.arenaRating,
        })
          .from(agents)
          .where(sql`${agents.arenaWins} > 0 OR ${agents.arenaLosses} > 0`)
          .orderBy(desc(agents.arenaRating))
          .limit(20);
        return res.json(topPlayers);
      }

      const now = new Date();
      let since: Date;
      if (period === "daily") {
        since = new Date(now);
        since.setHours(0, 0, 0, 0);
      } else {
        since = new Date(now);
        since.setDate(since.getDate() - since.getDay());
        since.setHours(0, 0, 0, 0);
      }

      const recentDuels = await db.select()
        .from(tradingDuels)
        .where(sql`${tradingDuels.status} = 'settled' AND ${tradingDuels.settledAt} >= ${since}`);

      const playerMap: Record<string, { wins: number; losses: number; totalPnl: number }> = {};
      for (const d of recentDuels) {
        const creatorBal = parseFloat(d.creatorFinalBalance || "1000000");
        const joinerBal = parseFloat(d.joinerFinalBalance || "1000000");
        const initBal = parseFloat(d.initialBalance || "1000000");

        if (!playerMap[d.creatorId]) playerMap[d.creatorId] = { wins: 0, losses: 0, totalPnl: 0 };
        playerMap[d.creatorId].totalPnl += creatorBal - initBal;
        if (d.winnerId === d.creatorId) playerMap[d.creatorId].wins++;
        else playerMap[d.creatorId].losses++;

        if (d.joinerId) {
          if (!playerMap[d.joinerId]) playerMap[d.joinerId] = { wins: 0, losses: 0, totalPnl: 0 };
          playerMap[d.joinerId].totalPnl += joinerBal - initBal;
          if (d.winnerId === d.joinerId) playerMap[d.joinerId].wins++;
          else playerMap[d.joinerId].losses++;
        }
      }

      const entries = Object.entries(playerMap)
        .sort(([,a], [,b]) => b.wins - a.wins || b.totalPnl - a.totalPnl)
        .slice(0, 20);

      const playerIds = entries.map(([id]) => id);
      const playerAgents = playerIds.length > 0
        ? await db.select({ id: agents.id, name: agents.name, avatarUrl: agents.avatarUrl, arenaRating: agents.arenaRating })
            .from(agents)
            .where(sql`${agents.id} IN (${sql.join(playerIds.map(id => sql`${id}`), sql`,`)})`)
        : [];

      const agentMap = Object.fromEntries(playerAgents.map(a => [a.id, a]));

      const result = entries.map(([id, stats]) => ({
        id,
        name: agentMap[id]?.name || "Unknown",
        avatarUrl: agentMap[id]?.avatarUrl || null,
        arenaRating: agentMap[id]?.arenaRating || 1000,
        periodWins: stats.wins,
        periodLosses: stats.losses,
        periodPnl: Math.round(stats.totalPnl),
      }));

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-duels/:id", async (req, res) => {
    try {
      const duel = await storage.getTradingDuel(req.params.id);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      res.json(duel);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-duels/:id/positions", async (req, res) => {
    try {
      const agentId = req.query.agentId as string;
      if (!agentId) return res.status(400).json({ message: "agentId required" });
      let resolvedAgentId = agentId;
      const duel = await storage.getTradingDuel(req.params.id);
      if (duel && duel.creatorId !== agentId && duel.joinerId !== agentId) {
        const agentRecord = await storage.getAgent(agentId);
        const walletAddr = agentRecord?.ownerAddress?.toLowerCase();
        if (walletAddr && walletAddr === duel.creatorWallet?.toLowerCase()) {
          resolvedAgentId = duel.creatorId;
        } else if (walletAddr && walletAddr === duel.joinerWallet?.toLowerCase()) {
          resolvedAgentId = duel.joinerId!;
        }
      }
      const positions = await storage.getTradingPositions(req.params.id, resolvedAgentId);
      res.json(positions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-duels/:id/results", async (req, res) => {
    try {
      const duel = await storage.getTradingDuel(req.params.id);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      if (duel.status !== "settled") return res.status(400).json({ message: "Duel not settled yet" });

      const allPositions = await storage.getAllDuelPositions(req.params.id);
      const creatorPositions = allPositions.filter(p => p.agentId === duel.creatorId);
      const joinerPositions = duel.joinerId ? allPositions.filter(p => p.agentId === duel.joinerId) : [];

      const creatorStats = await storage.getAgentArenaStats(duel.creatorId);
      const joinerStats = duel.joinerId ? await storage.getAgentArenaStats(duel.joinerId) : null;

      const result = duel.resultData ? JSON.parse(duel.resultData) : null;

      res.json({
        duel,
        result,
        creatorTrades: creatorPositions,
        joinerTrades: joinerPositions,
        creatorPositions,
        joinerPositions,
        creatorStats,
        joinerStats,
        leadChanges: duel.leadChanges,
        clutchFlag: duel.clutchFlag,
        priceSeries: duel.priceSeries ? JSON.parse(duel.priceSeries) : null,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-duels", async (req, res) => {
    try {
      const { creatorId, assetSymbol, potAmount, durationSeconds, matchType } = req.body;
      if (!creatorId) {
        return res.status(400).json({ message: "creatorId required" });
      }
      const validMatchTypes = ["pvp", "ava", "practice"];
      const mt = validMatchTypes.includes(matchType) ? matchType : "pvp";
      if (mt !== "practice" && (!potAmount || parseFloat(potAmount) <= 0)) {
        return res.status(400).json({ message: "potAmount required for competitive matches (pvp/ava)" });
      }
      const duel = await storage.createTradingDuel({
        creatorId,
        assetSymbol: assetSymbol || "BTCUSDT",
        potAmount: mt === "practice" ? "0" : (potAmount || "0").toString(),
        durationSeconds: durationSeconds || 300,
        matchType: mt,
      });
      const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const updated = await storage.updateTradingDuel(duel.id, { joinCode });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-duels/join-by-code", async (req, res) => {
    try {
      const { joinCode, joinerId } = req.body;
      if (!joinCode || !joinerId) return res.status(400).json({ message: "joinCode and joinerId required" });
      const duel = await storage.getTradingDuelByJoinCode(joinCode.toUpperCase());
      if (!duel) return res.status(404).json({ message: "No open duel found with that code" });
      if (duel.creatorId === joinerId) return res.status(400).json({ message: "Cannot join your own duel" });
      await storage.joinTradingDuel(duel.id, joinerId);
      const started = await storage.startTradingDuel(duel.id);
      res.json(started);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-duels/:id/join", async (req, res) => {
    try {
      const { joinerId } = req.body;
      if (!joinerId) return res.status(400).json({ message: "joinerId required" });
      const duel = await storage.getTradingDuel(req.params.id);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      if (duel.status !== "waiting") return res.status(400).json({ message: "Duel not available to join" });
      if (duel.creatorId === joinerId) return res.status(400).json({ message: "Cannot join your own duel" });
      await storage.joinTradingDuel(req.params.id, joinerId);
      const started = await storage.startTradingDuel(req.params.id);
      res.json(started);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-duels/:id/start", async (req, res) => {
    try {
      const duel = await storage.getTradingDuel(req.params.id);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      if (duel.status !== "ready") return res.status(400).json({ message: "Duel not ready to start" });
      const updated = await storage.startTradingDuel(req.params.id);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const tradeCooldowns = new Map<string, number>();
  const tradeRateWindow = new Map<string, number[]>();

  function checkTradeRateLimit(agentId: string): { ok: boolean; message?: string } {
    const now = Date.now();
    const cooldownKey = agentId;
    const lastAction = tradeCooldowns.get(cooldownKey) || 0;
    if (now - lastAction < 300) {
      return { ok: false, message: "Trade cooldown: wait 300ms between actions" };
    }
    const windowKey = agentId;
    const actions = tradeRateWindow.get(windowKey) || [];
    const recent = actions.filter(t => now - t < 1000);
    if (recent.length >= 5) {
      return { ok: false, message: "Rate limit: max 5 trade actions per second" };
    }
    recent.push(now);
    tradeRateWindow.set(windowKey, recent);
    tradeCooldowns.set(cooldownKey, now);
    return { ok: true };
  }

  app.post("/api/trading-duels/:id/open-position", async (req, res) => {
    try {
      const { agentId, side, leverage, sizeUsdt, clientPrice } = req.body;
      if (!agentId || !side || !sizeUsdt) {
        return res.status(400).json({ message: "agentId, side, sizeUsdt required" });
      }

      const rateCheck = checkTradeRateLimit(agentId);
      if (!rateCheck.ok) {
        return res.status(429).json({ message: rateCheck.message });
      }

      const duel = await storage.getTradingDuel(req.params.id);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      if (duel.status !== "active") return res.status(400).json({ message: "Duel not active" });
      let resolvedAgentId = agentId;
      if (duel.creatorId !== agentId && duel.joinerId !== agentId) {
        const agentRecord = await storage.getAgent(agentId);
        const walletAddr = agentRecord?.ownerAddress?.toLowerCase();
        if (walletAddr && (walletAddr === duel.creatorWallet?.toLowerCase())) {
          resolvedAgentId = duel.creatorId;
        } else if (walletAddr && (walletAddr === duel.joinerWallet?.toLowerCase())) {
          resolvedAgentId = duel.joinerId!;
        } else {
          return res.status(403).json({ message: "Not a participant" });
        }
      }
      if (duel.endsAt && new Date() > new Date(duel.endsAt)) {
        return res.status(400).json({ message: "Duel timer expired" });
      }

      let entryPrice: string;
      const cp = clientPrice ? parseFloat(clientPrice) : 0;
      const cached = arenaPriceCache.get(duel.assetSymbol);
      if (cp > 0 && cached && Math.abs(cp - cached.price) / cached.price < 0.02) {
        entryPrice = cp.toString();
      } else if (cached) {
        entryPrice = cached.price.toString();
      } else {
        try {
          const price = await fetchArenaPrice(duel.assetSymbol);
          entryPrice = price.toString();
        } catch {
          return res.status(500).json({ message: "Failed to fetch price from exchange" });
        }
      }

      const openPositions = await storage.getOpenTradingPositions(req.params.id, resolvedAgentId);
      const allPositions = await storage.getTradingPositions(req.params.id, resolvedAgentId);
      const initialBal = parseFloat(duel.initialBalance);
      let usedBalance = 0;
      for (const p of openPositions) {
        usedBalance += parseFloat(p.sizeUsdt);
      }
      let realizedPnl = 0;
      for (const p of allPositions) {
        if (!p.isOpen && p.pnl) realizedPnl += parseFloat(p.pnl);
      }
      const available = initialBal + realizedPnl - usedBalance;
      if (parseFloat(sizeUsdt) > available) {
        return res.status(400).json({ message: `Insufficient balance. Available: $${available.toFixed(2)}` });
      }

      if (!["long", "short"].includes(side)) {
        return res.status(400).json({ message: "Side must be 'long' or 'short'" });
      }
      const lev = Math.min(Math.max(parseInt(leverage) || 1, 1), 50);

      const position = await storage.createTradingPosition({
        duelId: req.params.id,
        agentId: resolvedAgentId,
        side,
        leverage: lev,
        sizeUsdt: sizeUsdt.toString(),
        entryPrice,
      });
      res.json(position);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-duels/:id/close-position", async (req, res) => {
    try {
      const { positionId, agentId, clientPrice } = req.body;
      if (!positionId || !agentId) {
        return res.status(400).json({ message: "positionId and agentId required" });
      }

      const rateCheck = checkTradeRateLimit(agentId);
      if (!rateCheck.ok) {
        return res.status(429).json({ message: rateCheck.message });
      }

      const duel = await storage.getTradingDuel(req.params.id);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      if (duel.status !== "active") return res.status(400).json({ message: "Duel not active" });
      let resolvedAgentId = agentId;
      if (duel.creatorId !== agentId && duel.joinerId !== agentId) {
        const agentRecord = await storage.getAgent(agentId);
        const walletAddr = agentRecord?.ownerAddress?.toLowerCase();
        if (walletAddr && (walletAddr === duel.creatorWallet?.toLowerCase())) {
          resolvedAgentId = duel.creatorId;
        } else if (walletAddr && (walletAddr === duel.joinerWallet?.toLowerCase())) {
          resolvedAgentId = duel.joinerId!;
        } else {
          return res.status(403).json({ message: "Not a participant" });
        }
      }

      const openPositions = await storage.getOpenTradingPositions(req.params.id, resolvedAgentId);
      const position = openPositions.find(p => p.id === positionId);
      if (!position) return res.status(404).json({ message: "Position not found or already closed" });

      let exitPrice: string;
      const cp = clientPrice ? parseFloat(clientPrice) : 0;
      const cached = arenaPriceCache.get(duel.assetSymbol);
      if (cp > 0 && cached && Math.abs(cp - cached.price) / cached.price < 0.02) {
        exitPrice = cp.toString();
      } else if (cached) {
        exitPrice = cached.price.toString();
      } else {
        try {
          const price = await fetchArenaPrice(duel.assetSymbol);
          exitPrice = price.toString();
        } catch {
          return res.status(500).json({ message: "Failed to fetch price from exchange" });
        }
      }

      const entry = parseFloat(position.entryPrice);
      const exit = parseFloat(exitPrice);
      const size = parseFloat(position.sizeUsdt);
      const lev = position.leverage;
      let pnl: number;
      if (position.side === "long") {
        pnl = ((exit - entry) / entry) * size * lev;
      } else {
        pnl = ((entry - exit) / entry) * size * lev;
      }

      const closed = await storage.closeTradingPosition(positionId, exitPrice, pnl.toFixed(2));
      res.json(closed);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-duels/:id/settle", async (req, res) => {
    try {
      const duel = await storage.getTradingDuel(req.params.id);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      if (duel.status === "settled") return res.json(duel);
      if (duel.status !== "active") return res.status(400).json({ message: "Duel not active" });

      stopBot(req.params.id);

      if (duel.endsAt && new Date() < new Date(duel.endsAt)) {
        return res.status(400).json({ message: "Duel timer has not expired yet" });
      }

      let settlementPrice: string;
      try {
        const price = await fetchArenaPrice(duel.assetSymbol);
        settlementPrice = price.toString();
      } catch {
        const cached = arenaPriceCache.get(duel.assetSymbol);
        if (cached) {
          settlementPrice = cached.price.toString();
        } else {
          return res.status(500).json({ message: "Failed to fetch settlement price from exchange" });
        }
      }

      const calcBalance = async (agentId: string) => {
        const positions = await storage.getTradingPositions(req.params.id, agentId);
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

      if (duel.isOnChain && duel.onChainDuelId) {
        const settled = await storage.settleTradingDuel(
          req.params.id,
          winnerId,
          creatorFinal.toFixed(2),
          joinerFinal.toFixed(2)
        );

        if (winnerId) {
          await storage.updateAgentArenaStats(duel.creatorId, winnerId === duel.creatorId);
          if (duel.joinerId) {
            await storage.updateAgentArenaStats(duel.joinerId, winnerId === duel.joinerId);
          }
        }

        res.json({ ...settled, isOnChain: true, onChainDuelId: duel.onChainDuelId, creatorId: duel.creatorId });
        return;
      }

      const settled = await storage.settleTradingDuel(
        req.params.id,
        winnerId,
        creatorFinal.toFixed(2),
        joinerFinal.toFixed(2)
      );

      if (winnerId) {
        await storage.updateAgentArenaStats(duel.creatorId, winnerId === duel.creatorId);
        if (duel.joinerId) {
          await storage.updateAgentArenaStats(duel.joinerId, winnerId === duel.joinerId);
        }
      }

      try {
        const { awardGamePoints } = await import("./points-engine");
        const isBotMatch = duel.matchType === "bot";
        const clutchFlag = duel.clutchFlag || false;
        await awardGamePoints({
          gameType: "trading_arena",
          agentId: duel.creatorId,
          won: winnerId === duel.creatorId,
          isBotMatch,
          metadata: { clutchFinish: clutchFlag && winnerId === duel.creatorId, duelId: duel.id },
        });
        if (duel.joinerId && !isBotMatch) {
          await awardGamePoints({
            gameType: "trading_arena",
            agentId: duel.joinerId,
            won: winnerId === duel.joinerId,
            isBotMatch: false,
            metadata: { clutchFinish: clutchFlag && winnerId === duel.joinerId, duelId: duel.id },
          });
        }
      } catch (pointsErr) {
        console.error("[Points] Failed to award trading arena points:", pointsErr);
      }

      const creatorPositions = await storage.getTradingPositions(req.params.id, duel.creatorId);
      const joinerPositions = duel.joinerId ? await storage.getTradingPositions(req.params.id, duel.joinerId) : [];
      const initialBal = parseFloat(duel.initialBalance);
      const creatorPnl = creatorFinal - initialBal;
      const joinerPnl = joinerFinal - initialBal;
      const potBnb = parseFloat(duel.potAmount);
      const feePct = duel.feePct || 10;
      const platformFee = potBnb * 2 * (feePct / 100);
      const winnerPayout = potBnb * 2 - platformFee;

      const treasuryFee = platformFee * 0.5;
      const burnFee = platformFee * 0.25;
      const rewardPoolFee = platformFee * 0.25;

      const resultData = JSON.stringify({
        settlementPrice,
        creatorPnl: creatorPnl.toFixed(2),
        joinerPnl: joinerPnl.toFixed(2),
        creatorPnlPct: ((creatorPnl / initialBal) * 100).toFixed(2),
        joinerPnlPct: ((joinerPnl / initialBal) * 100).toFixed(2),
        creatorTrades: creatorPositions.length,
        joinerTrades: joinerPositions.length,
        potBnb: (potBnb * 2).toFixed(4),
        platformFee: platformFee.toFixed(4),
        feeSplit: {
          treasury: treasuryFee.toFixed(4),
          burn: burnFee.toFixed(4),
          rewardPool: rewardPoolFee.toFixed(4),
        },
        winnerPayout: winnerPayout.toFixed(4),
        isTie: !winnerId,
      });

      await storage.updateTradingDuel(req.params.id, { resultData });

      res.json({ ...settled, resultData });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const settlingDuels = new Set<string>();

  async function autoSettleExpiredDuels() {
    try {
      const activeDuels = await db.select()
        .from(tradingDuels)
        .where(sql`${tradingDuels.status} = 'active' AND ${tradingDuels.endsAt} IS NOT NULL AND ${tradingDuels.endsAt} < NOW()`);

      for (const duel of activeDuels) {
        if (settlingDuels.has(duel.id)) continue;
        settlingDuels.add(duel.id);
        try {
          const fresh = await storage.getTradingDuel(duel.id);
          if (!fresh || fresh.status !== "active") {
            settlingDuels.delete(duel.id);
            continue;
          }

          stopBot(duel.id);

          let settlementPrice: string;
          try {
            const price = await fetchArenaPrice(duel.assetSymbol);
            settlementPrice = price.toString();
          } catch {
            const cached = arenaPriceCache.get(duel.assetSymbol);
            if (cached) {
              settlementPrice = cached.price.toString();
            } else {
              console.error(`[AutoSettle] Failed to fetch price for ${duel.id}, skipping`);
              settlingDuels.delete(duel.id);
              continue;
            }
          }

          const calcBalance = async (agentId: string) => {
            const positions = await storage.getTradingPositions(duel.id, agentId);
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

          if (duel.isOnChain && duel.onChainDuelId && duel.onChainDuelId !== "0") {
            await storage.settleTradingDuel(
              duel.id,
              winnerId,
              creatorFinal.toFixed(2),
              joinerFinal.toFixed(2)
            );
            if (winnerId) {
              await storage.updateAgentArenaStats(duel.creatorId, winnerId === duel.creatorId);
              if (duel.joinerId) {
                await storage.updateAgentArenaStats(duel.joinerId, winnerId === duel.joinerId);
              }
            }
            console.log(`[AutoSettle] On-chain duel ${duel.id} settled (winner=${winnerId}), on-chain escrow release handled by client`);
            settlingDuels.delete(duel.id);
            continue;
          }

          await storage.settleTradingDuel(
            duel.id,
            winnerId,
            creatorFinal.toFixed(2),
            joinerFinal.toFixed(2)
          );

          if (winnerId) {
            await storage.updateAgentArenaStats(duel.creatorId, winnerId === duel.creatorId);
            if (duel.joinerId) {
              await storage.updateAgentArenaStats(duel.joinerId, winnerId === duel.joinerId);
            }
          }

          try {
            const { awardGamePoints } = await import("./points-engine");
            const isBotMatch = duel.matchType === "bot" || duel.matchType === "practice";
            await awardGamePoints({
              gameType: "trading_arena",
              agentId: duel.creatorId,
              won: winnerId === duel.creatorId,
              isBotMatch,
              metadata: { duelId: duel.id },
            });
            if (duel.joinerId && !isBotMatch) {
              await awardGamePoints({
                gameType: "trading_arena",
                agentId: duel.joinerId,
                won: winnerId === duel.joinerId,
                isBotMatch: false,
                metadata: { duelId: duel.id },
              });
            }
          } catch {}

          const initialBal = parseFloat(duel.initialBalance);
          const potBnb = parseFloat(duel.potAmount);
          const feePct = duel.feePct || 10;
          const platformFee = potBnb * 2 * (feePct / 100);
          const winnerPayout = potBnb * 2 - platformFee;
          const resultData = JSON.stringify({
            settlementPrice,
            creatorPnl: (creatorFinal - initialBal).toFixed(2),
            joinerPnl: (joinerFinal - initialBal).toFixed(2),
            potBnb: (potBnb * 2).toFixed(4),
            platformFee: platformFee.toFixed(4),
            winnerPayout: winnerPayout.toFixed(4),
            isTie: !winnerId,
          });
          await storage.updateTradingDuel(duel.id, { resultData });

          console.log(`[AutoSettle] Settled duel ${duel.id} | Winner: ${winnerId || "TIE"}`);
        } catch (err) {
          console.error(`[AutoSettle] Error settling duel ${duel.id}:`, err);
          settlingDuels.delete(duel.id);
        }
      }
    } catch (err) {
      console.error("[AutoSettle] Error checking expired duels:", err);
    }
  }

  setInterval(autoSettleExpiredDuels, 5000);
  console.log("[AutoSettle] Started auto-settlement check every 5s");

  // ============ TRADING TOURNAMENTS ============

  app.post("/api/trading-tournaments", async (req, res) => {
    try {
      const { creatorId, name, assetSymbol, durationSeconds, maxPlayers, entryFeeBnb, prizePool, prize1Pct, prize2Pct, prize3Pct } = req.body;
      if (!creatorId || !name) return res.status(400).json({ message: "creatorId and name required" });

      const tournament = await storage.createTournament({
        name,
        assetSymbol: assetSymbol || "BTCUSDT",
        durationSeconds: durationSeconds || 300,
        maxPlayers: maxPlayers || 20,
        entryFeeBnb: entryFeeBnb || "0",
        prizePool: prizePool || "0",
        prize1Pct: prize1Pct || 50,
        prize2Pct: prize2Pct || 30,
        prize3Pct: prize3Pct || 20,
        createdByAgentId: creatorId,
      });

      const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const updated = await storage.updateTournament(tournament.id, { joinCode });

      await storage.joinTournament({ tournamentId: updated.id, agentId: creatorId });

      res.status(201).json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-tournaments", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const tournaments = await storage.listTournaments(status);
      const withCounts = await Promise.all(tournaments.map(async (t) => {
        const entries = await storage.getTournamentEntries(t.id);
        return { ...t, playerCount: entries.length };
      }));
      res.json(withCounts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-tournaments/:id", async (req, res) => {
    try {
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      const entries = await storage.getTournamentEntries(tournament.id);
      const agentIds = entries.map(e => e.agentId);
      const agentsData = agentIds.length > 0 ? await storage.getAgentsByIds(agentIds) : [];
      res.json({ ...tournament, entries, players: agentsData, playerCount: entries.length });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-tournaments/:id/join", async (req, res) => {
    try {
      const { agentId } = req.body;
      if (!agentId) return res.status(400).json({ message: "agentId required" });

      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (tournament.status !== "registration") return res.status(400).json({ message: "Tournament is not accepting registrations" });

      const entries = await storage.getTournamentEntries(tournament.id);
      if (entries.length >= tournament.maxPlayers) return res.status(400).json({ message: "Tournament is full" });
      if (entries.some(e => e.agentId === agentId)) return res.status(400).json({ message: "Already joined this tournament" });

      const entry = await storage.joinTournament({ tournamentId: tournament.id, agentId });
      res.json(entry);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-tournaments/join-by-code", async (req, res) => {
    try {
      const { joinCode, agentId } = req.body;
      if (!joinCode || !agentId) return res.status(400).json({ message: "joinCode and agentId required" });

      const tournament = await storage.getTournamentByCode(joinCode.toUpperCase());
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (tournament.status !== "registration") return res.status(400).json({ message: "Tournament is not accepting registrations" });

      const entries = await storage.getTournamentEntries(tournament.id);
      if (entries.length >= tournament.maxPlayers) return res.status(400).json({ message: "Tournament is full" });
      if (entries.some(e => e.agentId === agentId)) return res.status(400).json({ message: "Already joined" });

      const entry = await storage.joinTournament({ tournamentId: tournament.id, agentId });
      res.json({ ...entry, tournamentId: tournament.id });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-tournaments/:id/start", async (req, res) => {
    try {
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (tournament.status !== "registration") return res.status(400).json({ message: "Tournament already started or settled" });

      const entries = await storage.getTournamentEntries(tournament.id);
      if (entries.length < 2) return res.status(400).json({ message: "Need at least 2 players to start" });

      const now = new Date();
      const endsAt = new Date(now.getTime() + tournament.durationSeconds * 1000);
      const updated = await storage.updateTournament(tournament.id, { status: "active", startedAt: now, endsAt });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-tournaments/:id/positions/open", async (req, res) => {
    try {
      const { agentId, side, leverage, sizeUsdt } = req.body;
      if (!agentId || !side || !sizeUsdt) return res.status(400).json({ message: "agentId, side, sizeUsdt required" });

      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (tournament.status !== "active") return res.status(400).json({ message: "Tournament is not active" });

      const entry = await storage.getTournamentEntry(tournament.id, agentId);
      if (!entry) return res.status(403).json({ message: "Not a participant in this tournament" });

      if (tournament.endsAt && new Date() > new Date(tournament.endsAt)) {
        return res.status(400).json({ message: "Tournament time has expired" });
      }

      const openPositions = await storage.getOpenTournamentPositions(tournament.id, agentId);
      if (openPositions.length >= 3) return res.status(400).json({ message: "Max 3 open positions" });

      const allPositions = await storage.getTournamentPositions(tournament.id, agentId);
      const initialBal = parseFloat(tournament.initialBalance);
      let usedBalance = 0;
      for (const p of allPositions) {
        if (p.isOpen) usedBalance += parseFloat(p.sizeUsdt);
      }
      if (usedBalance + parseFloat(sizeUsdt) > initialBal) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      let entryPrice: string;
      try {
        const price = await fetchArenaPrice(tournament.assetSymbol);
        entryPrice = price.toString();
      } catch {
        const cached = arenaPriceCache.get(tournament.assetSymbol);
        if (cached) entryPrice = cached.price.toString();
        else return res.status(500).json({ message: "Failed to fetch price" });
      }

      const position = await storage.createTournamentPosition({
        tournamentId: tournament.id,
        agentId,
        side,
        leverage: leverage || 1,
        sizeUsdt,
        entryPrice,
      });
      res.json(position);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-tournaments/:id/positions/:posId/close", async (req, res) => {
    try {
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });

      let exitPrice: string;
      try {
        const price = await fetchArenaPrice(tournament.assetSymbol);
        exitPrice = price.toString();
      } catch {
        const cached = arenaPriceCache.get(tournament.assetSymbol);
        if (cached) exitPrice = cached.price.toString();
        else return res.status(500).json({ message: "Failed to fetch price" });
      }

      const positions = await storage.getTournamentPositions(tournament.id, req.body.agentId || "");
      const pos = positions.find(p => p.id === req.params.posId);
      if (!pos || !pos.isOpen) return res.status(400).json({ message: "Position not found or already closed" });

      const entry = parseFloat(pos.entryPrice);
      const exit = parseFloat(exitPrice);
      const size = parseFloat(pos.sizeUsdt);
      let pnl: number;
      if (pos.side === "long") {
        pnl = ((exit - entry) / entry) * size * pos.leverage;
      } else {
        pnl = ((entry - exit) / entry) * size * pos.leverage;
      }

      const closed = await storage.closeTournamentPosition(pos.id, exitPrice, pnl.toFixed(2));
      res.json(closed);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-tournaments/:id/positions", async (req, res) => {
    try {
      const { agentId } = req.query;
      if (!agentId) return res.status(400).json({ message: "agentId query param required" });
      const positions = await storage.getTournamentPositions(req.params.id, agentId as string);
      res.json(positions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-tournaments/:id/leaderboard", async (req, res) => {
    try {
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });

      const entries = await storage.getTournamentEntries(tournament.id);
      const agentIds = entries.map(e => e.agentId);
      const agentsData = agentIds.length > 0 ? await storage.getAgentsByIds(agentIds) : [];
      const agentMap = new Map(agentsData.map(a => [a.id, a]));

      let currentPrice: number;
      try {
        currentPrice = await fetchArenaPrice(tournament.assetSymbol);
      } catch {
        const cached = arenaPriceCache.get(tournament.assetSymbol);
        currentPrice = cached ? cached.price : 0;
      }

      const initialBal = parseFloat(tournament.initialBalance);
      const leaderboard = await Promise.all(entries.map(async (entry) => {
        if (tournament.status === "settled" && entry.finalBalance) {
          const agent = agentMap.get(entry.agentId);
          return {
            agentId: entry.agentId,
            name: agent?.name || "Unknown",
            avatarUrl: agent?.avatarUrl,
            finalBalance: parseFloat(entry.finalBalance),
            pnlPercent: entry.pnlPercent ? parseFloat(entry.pnlPercent) : 0,
            rank: entry.rank,
          };
        }

        const positions = await storage.getTournamentPositions(tournament.id, entry.agentId);
        let total = initialBal;
        for (const p of positions) {
          if (p.isOpen && currentPrice > 0) {
            const entryP = parseFloat(p.entryPrice);
            const size = parseFloat(p.sizeUsdt);
            let pnl: number;
            if (p.side === "long") {
              pnl = ((currentPrice - entryP) / entryP) * size * p.leverage;
            } else {
              pnl = ((entryP - currentPrice) / entryP) * size * p.leverage;
            }
            total += pnl;
          } else if (p.pnl) {
            total += parseFloat(p.pnl);
          }
        }

        const agent = agentMap.get(entry.agentId);
        return {
          agentId: entry.agentId,
          name: agent?.name || "Unknown",
          avatarUrl: agent?.avatarUrl,
          finalBalance: total,
          pnlPercent: ((total - initialBal) / initialBal) * 100,
          rank: 0,
        };
      }));

      leaderboard.sort((a, b) => b.finalBalance - a.finalBalance);
      leaderboard.forEach((entry, i) => entry.rank = i + 1);

      res.json({ leaderboard, currentPrice, tournament });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-tournaments/:id/settle", async (req, res) => {
    try {
      const tournament = await storage.getTournament(req.params.id);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (tournament.status === "settled") return res.json(tournament);
      if (tournament.status !== "active") return res.status(400).json({ message: "Tournament not active" });

      let settlementPrice: number;
      try {
        settlementPrice = await fetchArenaPrice(tournament.assetSymbol);
      } catch {
        const cached = arenaPriceCache.get(tournament.assetSymbol);
        if (cached) settlementPrice = cached.price;
        else return res.status(500).json({ message: "Failed to fetch settlement price" });
      }

      const entries = await storage.getTournamentEntries(tournament.id);
      const initialBal = parseFloat(tournament.initialBalance);

      const results: { entryId: string; agentId: string; finalBalance: number; pnlPercent: number }[] = [];

      for (const entry of entries) {
        const positions = await storage.getTournamentPositions(tournament.id, entry.agentId);
        let total = initialBal;
        for (const p of positions) {
          if (p.isOpen) {
            const entryP = parseFloat(p.entryPrice);
            const size = parseFloat(p.sizeUsdt);
            let pnl: number;
            if (p.side === "long") {
              pnl = ((settlementPrice - entryP) / entryP) * size * p.leverage;
            } else {
              pnl = ((entryP - settlementPrice) / entryP) * size * p.leverage;
            }
            total += pnl;
            await storage.closeTournamentPosition(p.id, settlementPrice.toString(), pnl.toFixed(2));
          } else if (p.pnl) {
            total += parseFloat(p.pnl);
          }
        }

        const pnlPct = ((total - initialBal) / initialBal) * 100;
        results.push({ entryId: entry.id, agentId: entry.agentId, finalBalance: total, pnlPercent: pnlPct });
      }

      results.sort((a, b) => b.finalBalance - a.finalBalance);

      for (let i = 0; i < results.length; i++) {
        await storage.updateTournamentEntry(results[i].entryId, {
          finalBalance: results[i].finalBalance.toFixed(2),
          pnlPercent: results[i].pnlPercent.toFixed(2),
          rank: i + 1,
        });
      }

      const updated = await storage.updateTournament(tournament.id, { status: "settled", settledAt: new Date() });
      res.json({ tournament: updated, results });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Tournament auto-settle
  async function autoSettleTournaments() {
    try {
      const activeTournaments = await storage.listTournaments("active");
      for (const t of activeTournaments) {
        if (t.endsAt && new Date() > new Date(t.endsAt)) {
          try {
            let settlementPrice: number;
            try {
              settlementPrice = await fetchArenaPrice(t.assetSymbol);
            } catch {
              const cached = arenaPriceCache.get(t.assetSymbol);
              if (cached) settlementPrice = cached.price;
              else continue;
            }

            const entries = await storage.getTournamentEntries(t.id);
            const initialBal = parseFloat(t.initialBalance);
            const results: { entryId: string; agentId: string; finalBalance: number; pnlPercent: number }[] = [];

            for (const entry of entries) {
              const positions = await storage.getTournamentPositions(t.id, entry.agentId);
              let total = initialBal;
              for (const p of positions) {
                if (p.isOpen) {
                  const entryP = parseFloat(p.entryPrice);
                  const size = parseFloat(p.sizeUsdt);
                  let pnl: number;
                  if (p.side === "long") {
                    pnl = ((settlementPrice - entryP) / entryP) * size * p.leverage;
                  } else {
                    pnl = ((entryP - settlementPrice) / entryP) * size * p.leverage;
                  }
                  total += pnl;
                  await storage.closeTournamentPosition(p.id, settlementPrice.toString(), pnl.toFixed(2));
                } else if (p.pnl) {
                  total += parseFloat(p.pnl);
                }
              }
              const pnlPct = ((total - initialBal) / initialBal) * 100;
              results.push({ entryId: entry.id, agentId: entry.agentId, finalBalance: total, pnlPercent: pnlPct });
            }

            results.sort((a, b) => b.finalBalance - a.finalBalance);
            for (let i = 0; i < results.length; i++) {
              await storage.updateTournamentEntry(results[i].entryId, {
                finalBalance: results[i].finalBalance.toFixed(2),
                pnlPercent: results[i].pnlPercent.toFixed(2),
                rank: i + 1,
              });
            }

            await storage.updateTournament(t.id, { status: "settled", settledAt: new Date() });
            console.log(`[TournamentSettle] Settled tournament ${t.id} | ${results.length} players ranked`);
          } catch (err) {
            console.error(`[TournamentSettle] Error settling tournament ${t.id}:`, err);
          }
        }
      }
    } catch (err) {
      console.error("[TournamentSettle] Error:", err);
    }
  }

  setInterval(autoSettleTournaments, 10000);
  console.log("[TournamentSettle] Started auto-settlement check every 10s");

  app.post("/api/trading-duels/play-vs-bot", async (req, res) => {
    try {
      const { creatorId, assetSymbol, durationSeconds, botDifficulty, botStrategy } = req.body;
      if (!creatorId) {
        return res.status(400).json({ message: "creatorId required" });
      }

      const difficulty = (["easy", "normal", "degen"].includes(botDifficulty) ? botDifficulty : "normal") as any;
      const strategy = (["momentum", "mean_reversion", "random"].includes(botStrategy) ? botStrategy : "momentum") as any;

      const bot = await getRandomArenaBot();

      const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      const duel = await storage.createTradingDuel({
        creatorId,
        assetSymbol: assetSymbol || "BTCUSDT",
        potAmount: "0",
        durationSeconds: durationSeconds || 300,
        matchType: "practice",
        botDifficulty: difficulty,
        botStrategy: strategy,
      });

      await storage.updateTradingDuel(duel.id, { joinCode });

      const joined = await storage.joinTradingDuel(duel.id, bot.id);

      const started = await storage.startTradingDuel(joined.id);

      startBot(started.id, bot.id, bot.style, started.durationSeconds, difficulty, strategy);

      res.json({ ...started, botName: bot.name, botStyle: bot.style, botDifficulty: difficulty, botStrategy: strategy, joinCode });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-duels/play-vs-bot-bo3", async (req, res) => {
    try {
      const { creatorId, assetSymbol, durationSeconds } = req.body;
      if (!creatorId) {
        return res.status(400).json({ message: "creatorId required" });
      }

      const seriesId = `series_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const bot = await getRandomArenaBot();

      const duel = await storage.createTradingDuel({
        creatorId,
        assetSymbol: assetSymbol || "BTCUSDT",
        potAmount: "0",
        durationSeconds: durationSeconds || 300,
        seriesId,
        seriesRound: 1,
        matchType: "practice",
      });

      const joined = await storage.joinTradingDuel(duel.id, bot.id);
      const started = await storage.startTradingDuel(joined.id);
      startBot(started.id, bot.id, bot.style, started.durationSeconds);

      res.json({ ...started, botName: bot.name, botStyle: bot.style, seriesId, seriesRound: 1 });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-duels/series/:seriesId", async (req, res) => {
    try {
      const duels = await storage.getSeriesDuels(req.params.seriesId);
      if (!duels.length) return res.status(404).json({ message: "Series not found" });

      let creatorWins = 0;
      let joinerWins = 0;
      const creatorId = duels[0].creatorId;
      const joinerId = duels[0].joinerId;

      duels.forEach(d => {
        if (d.status === "settled" && d.winnerId) {
          if (d.winnerId === creatorId) creatorWins++;
          else joinerWins++;
        }
      });

      const seriesWinner = creatorWins >= 2 ? creatorId : joinerWins >= 2 ? joinerId : null;
      const currentRound = duels.length;
      const isComplete = !!seriesWinner;

      res.json({
        seriesId: req.params.seriesId,
        duels,
        score: { [creatorId]: creatorWins, [joinerId || "opponent"]: joinerWins },
        currentRound,
        isComplete,
        seriesWinner,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-duels/:id/rematch-bo3", async (req, res) => {
    try {
      const { agentId } = req.body;
      if (!agentId) return res.status(400).json({ message: "agentId required" });
      const oldDuel = await storage.getTradingDuel(req.params.id);
      if (!oldDuel) return res.status(404).json({ message: "Duel not found" });
      if (oldDuel.status !== "settled") return res.status(400).json({ message: "Duel must be settled" });
      if (!oldDuel.seriesId) return res.status(400).json({ message: "Not a series duel" });

      const seriesDuels = await storage.getSeriesDuels(oldDuel.seriesId);
      let creatorWins = 0, joinerWins = 0;
      seriesDuels.forEach(d => {
        if (d.status === "settled" && d.winnerId) {
          if (d.winnerId === oldDuel.creatorId) creatorWins++;
          else joinerWins++;
        }
      });

      if (creatorWins >= 2 || joinerWins >= 2) {
        return res.status(400).json({ message: "Series already complete" });
      }

      const nextRound = (oldDuel.seriesRound || 1) + 1;
      const opponentId = agentId === oldDuel.creatorId ? oldDuel.joinerId : oldDuel.creatorId;
      if (!opponentId) return res.status(400).json({ message: "No opponent" });

      const opponentIsBot = await isArenaBotAgent(opponentId);

      const newDuel = await storage.createTradingDuel({
        creatorId: agentId,
        assetSymbol: oldDuel.assetSymbol,
        potAmount: oldDuel.potAmount,
        durationSeconds: oldDuel.durationSeconds,
        seriesId: oldDuel.seriesId,
        seriesRound: nextRound,
      });

      if (opponentIsBot) {
        const joined = await storage.joinTradingDuel(newDuel.id, opponentId);
        const started = await storage.startTradingDuel(joined.id);
        const botAgent = await storage.getAgent(opponentId);
        const botStyle = botAgent?.bio?.toLowerCase().includes("scalp") ? "scalper"
          : botAgent?.bio?.toLowerCase().includes("grid") ? "grid"
          : botAgent?.bio?.toLowerCase().includes("swing") ? "swing"
          : botAgent?.bio?.toLowerCase().includes("steady") ? "conservative"
          : "aggressive";
        startBot(started.id, opponentId, botStyle, started.durationSeconds);
        res.json({ ...started, botRematch: true, seriesId: oldDuel.seriesId, seriesRound: nextRound });
      } else {
        const joined = await storage.joinTradingDuel(newDuel.id, opponentId);
        res.json({ ...joined, seriesId: oldDuel.seriesId, seriesRound: nextRound });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-duels/:id/bot-info", async (req, res) => {
    try {
      const duel = await storage.getTradingDuel(req.params.id);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      
      const creatorIsBot = await isArenaBotAgent(duel.creatorId);
      const joinerIsBot = duel.joinerId ? await isArenaBotAgent(duel.joinerId) : false;
      
      res.json({ creatorIsBot, joinerIsBot });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/trading-duels/:id/spectate", async (req, res) => {
    try {
      const duel = await storage.getTradingDuel(req.params.id);
      if (!duel) return res.status(404).json({ message: "Duel not found" });

      const creatorAgent = await storage.getAgent(duel.creatorId);
      const joinerAgent = duel.joinerId ? await storage.getAgent(duel.joinerId) : null;

      const creatorIsBot = await isArenaBotAgent(duel.creatorId);
      const joinerIsBot = duel.joinerId ? await isArenaBotAgent(duel.joinerId) : false;

      let creatorRelPnl = 0;
      let joinerRelPnl = 0;
      let leading: string | null = null;

      const allPositions = (duel.status === "active" || duel.status === "settled")
        ? await storage.getAllDuelPositions(duel.id)
        : [];

      if (duel.status === "active" || duel.status === "settled") {
        const initBal = parseFloat(duel.initialBalance || "1000000");

        let creatorBal = initBal;
        let joinerBal = initBal;

        if (duel.status === "settled") {
          creatorBal = parseFloat(duel.creatorFinalBalance || `${initBal}`);
          joinerBal = parseFloat(duel.joinerFinalBalance || `${initBal}`);
        } else {
          let currentPrice: number | undefined;
          try {
            const priceRes = await fetchArenaPrice(duel.assetSymbol);
            currentPrice = priceRes;
          } catch {}

          if (currentPrice) {
            for (const p of allPositions) {
              if (p.isOpen) {
                const entry = parseFloat(p.entryPrice);
                const size = parseFloat(p.sizeUsdt);
                const pnlCalc = p.side === "long"
                  ? (currentPrice - entry) / entry * size * p.leverage
                  : (entry - currentPrice) / entry * size * p.leverage;
                if (p.agentId === duel.creatorId) creatorBal += pnlCalc;
                else if (p.agentId === duel.joinerId) joinerBal += pnlCalc;
              } else if (p.pnl) {
                if (p.agentId === duel.creatorId) creatorBal += parseFloat(p.pnl);
                else if (p.agentId === duel.joinerId) joinerBal += parseFloat(p.pnl);
              }
            }
          }
        }

        creatorRelPnl = ((creatorBal - initBal) / initBal) * 100;
        joinerRelPnl = ((joinerBal - initBal) / initBal) * 100;
        leading = creatorBal > joinerBal ? duel.creatorId : joinerBal > creatorBal ? (duel.joinerId || null) : null;
      }

      const creatorPositions = allPositions
        .filter(p => p.agentId === duel.creatorId)
        .map(p => ({
          id: p.id,
          side: p.side,
          leverage: p.leverage,
          sizeUsdt: p.sizeUsdt,
          entryPrice: p.entryPrice,
          exitPrice: p.exitPrice,
          pnl: p.pnl,
          isOpen: p.isOpen,
          openedAt: p.openedAt,
          closedAt: p.closedAt,
        }));

      const joinerPositions = allPositions
        .filter(p => p.agentId === duel.joinerId)
        .map(p => ({
          id: p.id,
          side: p.side,
          leverage: p.leverage,
          sizeUsdt: p.sizeUsdt,
          entryPrice: p.entryPrice,
          exitPrice: p.exitPrice,
          pnl: p.pnl,
          isOpen: p.isOpen,
          openedAt: p.openedAt,
          closedAt: p.closedAt,
        }));

      const initBal = parseFloat(duel.initialBalance || "1000000");

      res.json({
        id: duel.id,
        status: duel.status,
        assetSymbol: duel.assetSymbol,
        durationSeconds: duel.durationSeconds,
        initialBalance: duel.initialBalance,
        startedAt: duel.startedAt,
        endsAt: duel.endsAt,
        winnerId: duel.winnerId,
        leadChanges: duel.leadChanges,
        clutchFlag: duel.clutchFlag,
        seriesId: duel.seriesId,
        seriesRound: duel.seriesRound,
        potAmount: duel.potAmount,
        matchType: duel.matchType,
        creatorWallet: duel.creatorWallet,
        joinerWallet: duel.joinerWallet,
        creator: {
          id: duel.creatorId,
          name: creatorAgent?.name || "Player 1",
          avatarUrl: creatorAgent?.avatarUrl,
          isBot: creatorIsBot,
          relPnlPct: Math.round(creatorRelPnl * 100) / 100,
          balance: Math.round((initBal + initBal * creatorRelPnl / 100) * 100) / 100,
          openPositions: creatorPositions.filter(p => p.isOpen).length,
          positions: creatorPositions,
        },
        joiner: duel.joinerId ? {
          id: duel.joinerId,
          name: joinerAgent?.name || "Player 2",
          avatarUrl: joinerAgent?.avatarUrl,
          isBot: joinerIsBot,
          relPnlPct: Math.round(joinerRelPnl * 100) / 100,
          balance: Math.round((initBal + initBal * joinerRelPnl / 100) * 100) / 100,
          openPositions: joinerPositions.filter(p => p.isOpen).length,
          positions: joinerPositions,
        } : null,
        leading,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-duels/:id/cancel", async (req, res) => {
    try {
      const { agentId } = req.body;
      const duel = await storage.getTradingDuel(req.params.id);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      if (duel.status !== "waiting") return res.status(400).json({ message: "Can only cancel waiting duels" });
      if (duel.creatorId !== agentId) return res.status(403).json({ message: "Only creator can cancel" });
      stopBot(req.params.id);
      const cancelled = await storage.cancelTradingDuel(req.params.id);
      res.json(cancelled);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-duels/sync-create", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const { onChainDuelId, txHash, assetSymbol, potAmount, durationSeconds, creatorOnChainAgentId, matchType } = req.body;

      if (!onChainDuelId || !txHash) {
        return res.status(400).json({ message: "Missing on-chain duel ID or transaction hash" });
      }

      const agent = await storage.getAgentByAddress(walletAddress);
      if (!agent) {
        return res.status(400).json({ message: "No agent found for this wallet. Please register first." });
      }

      const validTypes = ["pvp", "ava"];
      const mt = validTypes.includes(matchType) ? matchType : "pvp";

      const duel = await storage.createTradingDuel({
        creatorId: agent.id,
        assetSymbol: assetSymbol || "BTCUSDT",
        potAmount: (potAmount || "0.01").toString(),
        durationSeconds: durationSeconds || 300,
        onChainDuelId: onChainDuelId.toString(),
        txHash,
        creatorWallet: walletAddress,
        isOnChain: true,
        matchType: mt,
      });

      const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const updated = await storage.updateTradingDuel(duel.id, { joinCode });

      res.status(201).json(updated);
    } catch (error: any) {
      console.error("Error syncing on-chain trading duel creation:", error);
      res.status(500).json({ message: "Failed to sync on-chain trading duel" });
    }
  });

  app.post("/api/trading-duels/:id/sync-join", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const duelId = req.params.id;
      const { txHash, joinerOnChainAgentId } = req.body;

      if (!txHash) {
        return res.status(400).json({ message: "Missing transaction hash" });
      }

      const duel = await storage.getTradingDuel(duelId);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      if (!duel.isOnChain) return res.status(400).json({ message: "This is not an on-chain duel" });
      if (duel.status !== "waiting") return res.status(400).json({ message: "Duel is not waiting for a joiner" });

      const agent = await storage.getAgentByAddress(walletAddress);
      if (!agent) {
        return res.status(400).json({ message: "No agent found for this wallet. Please register first." });
      }

      if (duel.creatorId === agent.id) {
        return res.status(400).json({ message: "Cannot join your own duel" });
      }

      const now = new Date();
      const endsAt = new Date(now.getTime() + duel.durationSeconds * 1000);

      const [updated] = await db.update(tradingDuels)
        .set({
          joinerId: agent.id,
          joinerWallet: walletAddress,
          status: "active",
          startedAt: now,
          endsAt,
        })
        .where(eq(tradingDuels.id, duelId))
        .returning();

      res.json(updated);
    } catch (error: any) {
      console.error("Error syncing on-chain trading duel join:", error);
      res.status(500).json({ message: "Failed to sync on-chain join" });
    }
  });

  app.post("/api/trading-duels/:id/sync-settle", authMiddleware, async (req, res) => {
    try {
      const duelId = req.params.id;
      const { txHash, winnerId } = req.body;

      if (!txHash) {
        return res.status(400).json({ message: "Missing transaction hash" });
      }

      const duel = await storage.getTradingDuel(duelId);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      if (!duel.isOnChain) return res.status(400).json({ message: "This is not an on-chain duel" });
      if (duel.status === "settled") return res.json(duel);

      const finalWinnerId = winnerId || duel.winnerId;

      const [settled] = await db.update(tradingDuels)
        .set({
          status: "settled",
          winnerId: finalWinnerId,
          settledAt: new Date(),
        })
        .where(eq(tradingDuels.id, duelId))
        .returning();

      if (finalWinnerId) {
        await storage.updateAgentArenaStats(duel.creatorId, finalWinnerId === duel.creatorId);
        if (duel.joinerId) {
          await storage.updateAgentArenaStats(duel.joinerId, finalWinnerId === duel.joinerId);
        }
      }

      res.json(settled);
    } catch (error: any) {
      console.error("Error syncing on-chain trading duel settlement:", error);
      res.status(500).json({ message: "Failed to sync on-chain settlement" });
    }
  });

  app.get("/api/trading-duels/:id/status", async (req, res) => {
    try {
      const agentId = req.query.agentId as string;
      if (!agentId) return res.status(400).json({ message: "agentId required" });
      const duel = await storage.getTradingDuel(req.params.id);
      if (!duel) return res.status(404).json({ message: "Duel not found" });
      if (duel.status !== "active") return res.json({ status: duel.status });
      let resolvedAgentId = agentId;
      if (duel.creatorId !== agentId && duel.joinerId !== agentId) {
        const agentRecord = await storage.getAgent(agentId);
        const walletAddr = agentRecord?.ownerAddress?.toLowerCase();
        if (walletAddr && (walletAddr === duel.creatorWallet?.toLowerCase())) {
          resolvedAgentId = duel.creatorId;
        } else if (walletAddr && (walletAddr === duel.joinerWallet?.toLowerCase())) {
          resolvedAgentId = duel.joinerId!;
        } else {
          return res.status(403).json({ message: "Not a participant" });
        }
      }

      let currentPrice: number;
      try {
        currentPrice = await fetchArenaPrice(duel.assetSymbol);
      } catch {
        return res.status(500).json({ message: "Failed to fetch price" });
      }

      const calcPnlPercent = async (aid: string) => {
        const positions = await storage.getTradingPositions(req.params.id, aid);
        const initialBal = parseFloat(duel.initialBalance);
        let total = initialBal;
        for (const p of positions) {
          if (p.isOpen) {
            const entry = parseFloat(p.entryPrice);
            const size = parseFloat(p.sizeUsdt);
            const pnl = p.side === "long"
              ? ((currentPrice - entry) / entry) * size * p.leverage
              : ((entry - currentPrice) / entry) * size * p.leverage;
            total += pnl;
          } else if (p.pnl) {
            total += parseFloat(p.pnl);
          }
        }
        return ((total - initialBal) / initialBal) * 100;
      };

      const myPnlPct = await calcPnlPercent(resolvedAgentId);
      const opponentId = resolvedAgentId === duel.creatorId ? duel.joinerId : duel.creatorId;
      const oppPnlPct = opponentId ? await calcPnlPercent(opponentId) : 0;

      const diff = myPnlPct - oppPnlPct;
      let relativeStatus: string;
      if (Math.abs(diff) < 0.05) relativeStatus = "NECK AND NECK";
      else if (diff > 0.5) relativeStatus = "YOU'RE LEADING";
      else if (diff > 0) relativeStatus = "SLIGHT LEAD";
      else if (diff > -0.5) relativeStatus = "CLOSE BEHIND";
      else relativeStatus = "YOU'RE BEHIND";

      const myMomentum = Math.max(0, Math.min(100, 50 + myPnlPct * 10));
      const oppMomentum = Math.max(0, Math.min(100, 50 + oppPnlPct * 10));

      const currentLeaderId = myPnlPct > oppPnlPct ? resolvedAgentId : (oppPnlPct > myPnlPct ? opponentId : null);
      let leadChanges = duel.leadChanges || 0;
      let leadJustChanged = false;

      if (currentLeaderId && duel.lastLeaderId && currentLeaderId !== duel.lastLeaderId) {
        leadChanges += 1;
        leadJustChanged = true;
        await storage.updateDuelLeadChange(req.params.id, leadChanges, currentLeaderId);

        if (duel.endsAt) {
          const totalDuration = duel.durationSeconds * 1000;
          const elapsed = Date.now() - new Date(duel.startedAt!).getTime();
          const remaining = totalDuration - elapsed;
          if (remaining < totalDuration * 0.1) {
            await storage.updateDuelClutch(req.params.id, true);
          }
        }
      } else if (currentLeaderId && !duel.lastLeaderId) {
        await storage.updateDuelLeadChange(req.params.id, leadChanges, currentLeaderId);
      }

      const opponentAgent = opponentId ? await storage.getAgent(opponentId) : null;

      res.json({
        relativeStatus,
        myMomentum: Math.round(myMomentum),
        oppMomentum: Math.round(oppMomentum),
        leadChanges,
        leadJustChanged,
        myPnlPercent: Math.round(myPnlPct * 100) / 100,
        opponentName: opponentAgent?.name || "Opponent",
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/trading-duels/:id/rematch", async (req, res) => {
    try {
      const { agentId } = req.body;
      if (!agentId) return res.status(400).json({ message: "agentId required" });
      const oldDuel = await storage.getTradingDuel(req.params.id);
      if (!oldDuel) return res.status(404).json({ message: "Duel not found" });
      if (oldDuel.status !== "settled") return res.status(400).json({ message: "Duel must be settled to rematch" });

      const opponentId = agentId === oldDuel.creatorId ? oldDuel.joinerId : oldDuel.creatorId;
      if (!opponentId) return res.status(400).json({ message: "No opponent to rematch" });

      const opponentIsBot = await isArenaBotAgent(opponentId);

      const newDuel = await storage.createTradingDuel({
        creatorId: agentId,
        assetSymbol: oldDuel.assetSymbol,
        potAmount: oldDuel.potAmount,
        durationSeconds: oldDuel.durationSeconds,
      });

      if (opponentIsBot) {
        const joined = await storage.joinTradingDuel(newDuel.id, opponentId);
        const started = await storage.startTradingDuel(joined.id);
        const botAgent = await storage.getAgent(opponentId);
        const botStyle = botAgent?.bio?.toLowerCase().includes("scalp") ? "scalper"
          : botAgent?.bio?.toLowerCase().includes("grid") ? "grid"
          : botAgent?.bio?.toLowerCase().includes("swing") ? "swing"
          : botAgent?.bio?.toLowerCase().includes("steady") ? "conservative"
          : "aggressive";
        startBot(started.id, opponentId, botStyle, started.durationSeconds);
        res.json({ ...started, botRematch: true });
      } else {
        const joined = await storage.joinTradingDuel(newDuel.id, opponentId);
        res.json(joined);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/moltbook/connect", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("moltbook_")) {
        return res.status(400).json({ message: "Invalid Moltbook API key. Keys start with 'moltbook_'" });
      }

      let moltbookProfile: any = null;
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const response = await fetch("https://www.moltbook.com/api/v1/agents/me", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        clearTimeout(t);

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          return res.status(401).json({ message: `Moltbook API error: ${response.status}. Check your API key.` });
        }
        moltbookProfile = await response.json();
      } catch (fetchErr: any) {
        if (fetchErr.name === "AbortError") {
          return res.status(504).json({ message: "Moltbook API timed out. Try again." });
        }
        return res.status(502).json({ message: "Could not reach Moltbook API. Try again later." });
      }

      const agentName = moltbookProfile?.agent?.name || moltbookProfile?.name || "MoltbookAgent";
      const moltbookId = moltbookProfile?.agent?.id || moltbookProfile?.id || apiKey.slice(-8);
      const karma = moltbookProfile?.agent?.karma || moltbookProfile?.karma || 0;
      const verified = moltbookProfile?.agent?.claimed || moltbookProfile?.claimed || false;

      const moltbookOwner = `0xMOLTBOOK_${moltbookId}`.padEnd(42, "0").slice(0, 42);
      const existing = await db.select().from(agents).where(eq(agents.ownerAddress, moltbookOwner)).limit(1);

      let honeycombAgentId: string;
      if (existing.length > 0) {
        honeycombAgentId = existing[0].id;
      } else {
        const [newAgent] = await db.insert(agents).values({
          name: agentName,
          bio: `Moltbook agent linked to Honeycomb Arena. Karma: ${karma}`,
          ownerAddress: moltbookOwner,
          isBot: true,
          capabilities: ["trading", "arena", "moltbook"],
        }).returning();
        honeycombAgentId = newAgent.id;
      }

      res.json({
        moltbookAgent: {
          name: agentName,
          id: moltbookId,
          karma,
          verified,
        },
        honeycombAgentId,
      });
    } catch (error: any) {
      console.error("[Moltbook] Connect error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/moltbook/activate", async (req, res) => {
    try {
      const { apiKey, honeycombAgentId } = req.body;
      if (!honeycombAgentId) {
        return res.status(400).json({ message: "honeycombAgentId required" });
      }
      if (!apiKey || typeof apiKey !== "string" || !apiKey.startsWith("moltbook_")) {
        return res.status(400).json({ message: "Valid Moltbook API key required for activation" });
      }

      let moltbookId: string | null = null;
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);
        const response = await fetch("https://www.moltbook.com/api/v1/agents/me", {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        clearTimeout(t);
        if (!response.ok) {
          return res.status(401).json({ message: "Moltbook API key verification failed" });
        }
        const profile = await response.json() as any;
        moltbookId = profile?.agent?.id || profile?.id || apiKey.slice(-8);
      } catch (fetchErr: any) {
        if (fetchErr.name === "AbortError") {
          return res.status(504).json({ message: "Moltbook API timed out. Try again." });
        }
        return res.status(502).json({ message: "Could not reach Moltbook API. Try again later." });
      }

      const expectedOwner = `0xMOLTBOOK_${moltbookId}`.padEnd(42, "0").slice(0, 42);
      const [agentRecord] = await db.select().from(agents).where(eq(agents.id, honeycombAgentId)).limit(1);
      if (!agentRecord) {
        return res.status(404).json({ message: "Agent not found" });
      }
      if (agentRecord.ownerAddress !== expectedOwner) {
        return res.status(403).json({ message: "API key does not match this agent" });
      }

      const caps = agentRecord.capabilities || [];
      if (!caps.includes("arena-active")) {
        await db.update(agents).set({
          capabilities: [...caps, "arena-active"],
          isVerified: true,
        }).where(eq(agents.id, honeycombAgentId));
      }

      res.json({
        agentId: honeycombAgentId,
        name: agentRecord.name,
        activated: true,
      });
    } catch (error: any) {
      console.error("[Moltbook] Activate error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
