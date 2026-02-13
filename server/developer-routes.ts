import { Router, Request, Response } from "express";
import crypto from "crypto";
import { storage } from "./storage";
import { generateApiKey, hashApiKey, authMiddleware } from "./auth";
import { insertDeveloperAccountSchema, insertDeveloperGameSchema } from "@shared/schema";

const router = Router();

async function getAgentFromReq(req: Request): Promise<any> {
  const addr = req.walletAddress;
  if (!addr) return null;
  return storage.getAgentByAddress(addr);
}

function createDevAuthMiddleware() {
  return async (req: Request, res: Response, next: Function) => {
    const apiKey = req.headers["x-dev-api-key"] as string;
    if (!apiKey) {
      return res.status(401).json({ error: "Missing X-Dev-Api-Key header" });
    }
    const hashedKey = hashApiKey(apiKey);
    const dev = await storage.getDeveloperAccountByApiKey(hashedKey);
    if (!dev || dev.status !== "active") {
      return res.status(401).json({ error: "Invalid or inactive developer API key" });
    }
    (req as any).developer = dev;
    next();
  };
}

const devAuth = createDevAuthMiddleware();

router.post("/register", authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = await getAgentFromReq(req);
    if (!agent) {
      return res.status(401).json({ error: "No agent found for this wallet. Register an agent first." });
    }

    const existing = await storage.getDeveloperAccountByAgent(agent.id);
    if (existing) {
      return res.status(409).json({ error: "Developer account already exists", account: { id: existing.id, studioName: existing.studioName } });
    }

    const parsed = insertDeveloperAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    const account = await storage.createDeveloperAccount({
      ownerAgentId: agent.id,
      walletAddress: agent.ownerAddress,
      studioName: parsed.data.studioName,
      email: parsed.data.email ?? null,
      website: parsed.data.website ?? null,
      payoutAddress: parsed.data.payoutAddress,
      apiKeyHash,
    });

    res.status(201).json({
      account: {
        id: account.id,
        studioName: account.studioName,
        status: account.status,
        createdAt: account.createdAt,
      },
      apiKey,
      message: "Save your API key securely. It will not be shown again.",
    });
  } catch (err: any) {
    console.error("[DevPlatform] Registration error:", err);
    res.status(500).json({ error: "Failed to register developer account" });
  }
});

router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = await getAgentFromReq(req);
    if (!agent) {
      return res.status(401).json({ error: "No agent found" });
    }
    const dev = await storage.getDeveloperAccountByAgent(agent.id);
    if (!dev) {
      return res.status(404).json({ error: "No developer account found" });
    }
    const earnings = await storage.getDeveloperEarnings(dev.id);
    const games = await storage.getDeveloperGames(dev.id);
    res.json({ account: dev, earnings, games });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch developer account" });
  }
});

router.post("/api-key/regenerate", authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = await getAgentFromReq(req);
    if (!agent) {
      return res.status(401).json({ error: "No agent found" });
    }
    const dev = await storage.getDeveloperAccountByAgent(agent.id);
    if (!dev) {
      return res.status(404).json({ error: "No developer account found" });
    }
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);
    await storage.updateDeveloperAccount(dev.id, { apiKeyHash });
    res.json({ apiKey, message: "New API key generated. Save it securely." });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to regenerate API key" });
  }
});

router.post("/games", authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = await getAgentFromReq(req);
    if (!agent) {
      return res.status(401).json({ error: "No agent found" });
    }
    const dev = await storage.getDeveloperAccountByAgent(agent.id);
    if (!dev) {
      return res.status(404).json({ error: "No developer account. Register first at POST /api/devs/register" });
    }

    const parsed = insertDeveloperGameSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const game = await storage.createDeveloperGame({
      ...parsed.data,
      developerId: dev.id,
    });
    res.status(201).json({ game, message: "Game submitted for review. Status: pending." });
  } catch (err: any) {
    console.error("[DevPlatform] Game creation error:", err);
    res.status(500).json({ error: "Failed to create game" });
  }
});

router.get("/games", authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = await getAgentFromReq(req);
    if (!agent) {
      return res.status(401).json({ error: "No agent found" });
    }
    const dev = await storage.getDeveloperAccountByAgent(agent.id);
    if (!dev) {
      return res.status(404).json({ error: "No developer account found" });
    }
    const games = await storage.getDeveloperGames(dev.id);
    res.json({ games });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch games" });
  }
});

router.patch("/games/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = await getAgentFromReq(req);
    if (!agent) {
      return res.status(401).json({ error: "No agent found" });
    }
    const dev = await storage.getDeveloperAccountByAgent(agent.id);
    if (!dev) {
      return res.status(404).json({ error: "No developer account found" });
    }
    const game = await storage.getDeveloperGame(req.params.id);
    if (!game || game.developerId !== dev.id) {
      return res.status(404).json({ error: "Game not found" });
    }
    const allowedFields = ["name", "description", "tagline", "genre", "tags", "iframeUrl", "thumbnailUrl", "color"];
    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    if (Object.keys(updates).length > 0) {
      updates.status = "pending";
    }
    const updated = await storage.updateDeveloperGame(game.id, updates);
    res.json({ game: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update game" });
  }
});

router.delete("/games/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = await getAgentFromReq(req);
    if (!agent) {
      return res.status(401).json({ error: "No agent found" });
    }
    const dev = await storage.getDeveloperAccountByAgent(agent.id);
    if (!dev) {
      return res.status(404).json({ error: "No developer account found" });
    }
    const game = await storage.getDeveloperGame(req.params.id);
    if (!game || game.developerId !== dev.id) {
      return res.status(404).json({ error: "Game not found" });
    }
    await storage.deleteDeveloperGame(game.id);
    res.json({ message: "Game deleted" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete game" });
  }
});

router.get("/earnings", authMiddleware, async (req: Request, res: Response) => {
  try {
    const agent = await getAgentFromReq(req);
    if (!agent) {
      return res.status(401).json({ error: "No agent found" });
    }
    const dev = await storage.getDeveloperAccountByAgent(agent.id);
    if (!dev) {
      return res.status(404).json({ error: "No developer account found" });
    }
    const earnings = await storage.getDeveloperEarnings(dev.id);
    const sessions = await storage.getGameSessionsByDeveloper(dev.id, 50);
    res.json({ earnings, recentSessions: sessions });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch earnings" });
  }
});

router.post("/sessions/start", devAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { gameId, playerAgentId } = req.body;

    if (!gameId) {
      return res.status(400).json({ error: "gameId is required" });
    }

    const game = await storage.getDeveloperGame(gameId);
    if (!game || game.developerId !== dev.id) {
      return res.status(404).json({ error: "Game not found or not owned by you" });
    }
    if (game.status !== "approved") {
      return res.status(403).json({ error: "Game is not approved yet" });
    }

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const session = await storage.createGameSession({
      gameId,
      developerId: dev.id,
      playerAgentId: playerAgentId || null,
      sessionToken,
    });

    res.status(201).json({
      sessionId: session.id,
      sessionToken,
      gameId: session.gameId,
    });
  } catch (err: any) {
    console.error("[DevPlatform] Session start error:", err);
    res.status(500).json({ error: "Failed to start game session" });
  }
});

router.post("/sessions/:id/end", devAuth, async (req: Request, res: Response) => {
  try {
    const dev = (req as any).developer;
    const { sessionToken, outcome, score, grossAmount } = req.body;

    const session = await storage.getGameSession(req.params.id);
    if (!session || session.developerId !== dev.id) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (session.status !== "active") {
      return res.status(400).json({ error: "Session already ended" });
    }
    if (session.sessionToken !== sessionToken) {
      return res.status(403).json({ error: "Invalid session token" });
    }

    const game = await storage.getDeveloperGame(session.gameId);
    const feeBps = game?.feeBps ?? 1500;
    const gross = Math.max(0, parseFloat(grossAmount || "0"));
    if (isNaN(gross) || gross > 1000) {
      return res.status(400).json({ error: "Invalid gross amount" });
    }
    const fee = gross * (feeBps / 10000);
    const net = gross - fee;

    const ended = await storage.endGameSession(
      session.id,
      outcome || "completed",
      score || 0,
      gross.toString(),
      fee.toString(),
      net.toString(),
    );

    if (game) {
      await storage.updateDeveloperGame(game.id, {
        totalSessions: game.totalSessions + 1,
        totalRevenue: (parseFloat(game.totalRevenue) + gross).toString(),
      });
    }

    res.json({
      session: ended,
      revenue: { gross: gross.toString(), platformFee: fee.toString(), developerNet: net.toString(), feeBps },
    });
  } catch (err: any) {
    console.error("[DevPlatform] Session end error:", err);
    res.status(500).json({ error: "Failed to end game session" });
  }
});

router.get("/arena/games", async (_req: Request, res: Response) => {
  try {
    const games = await storage.getApprovedDeveloperGames();
    res.json({ games });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch arena games" });
  }
});

router.patch("/games/:id/approve", authMiddleware, async (req: Request, res: Response) => {
  try {
    const game = await storage.getDeveloperGame(req.params.id);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }
    const updated = await storage.updateDeveloperGame(game.id, { status: "approved" });
    res.json({ game: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to approve game" });
  }
});

router.get("/docs", (_req: Request, res: Response) => {
  res.json({
    title: "Honeycomb Developer Platform API",
    version: "1.0.0",
    description: "Build games for the Honeycomb Arena and earn revenue through our revenue sharing model.",
    revenueModel: {
      defaultFeeBps: 1500,
      description: "Platform takes 15% of gross game revenue. Developers keep 85%.",
      example: "If a game session generates 1 BNB, platform takes 0.15 BNB, developer receives 0.85 BNB",
    },
    authentication: {
      jwt: "Use Bearer token in Authorization header for dashboard endpoints (register, games CRUD, earnings)",
      devApiKey: "Use X-Dev-Api-Key header for session tracking endpoints (start/end sessions)",
    },
    endpoints: [
      { method: "POST", path: "/api/devs/register", auth: "JWT", description: "Register as a developer" },
      { method: "GET", path: "/api/devs/me", auth: "JWT", description: "Get developer account details + games + earnings" },
      { method: "POST", path: "/api/devs/api-key/regenerate", auth: "JWT", description: "Regenerate developer API key" },
      { method: "POST", path: "/api/devs/games", auth: "JWT", description: "Submit a new game" },
      { method: "GET", path: "/api/devs/games", auth: "JWT", description: "List your games" },
      { method: "PATCH", path: "/api/devs/games/:id", auth: "JWT", description: "Update a game (resets to pending review)" },
      { method: "DELETE", path: "/api/devs/games/:id", auth: "JWT", description: "Delete a game" },
      { method: "GET", path: "/api/devs/earnings", auth: "JWT", description: "Get earnings summary + recent sessions" },
      { method: "POST", path: "/api/devs/sessions/start", auth: "Dev API Key", description: "Start a game session" },
      { method: "POST", path: "/api/devs/sessions/:id/end", auth: "Dev API Key", description: "End a game session with score and revenue" },
      { method: "GET", path: "/api/devs/arena/games", auth: "None", description: "Public: list all approved games in arena" },
    ],
    gameSubmission: {
      requiredFields: ["name", "description", "iframeUrl"],
      optionalFields: ["tagline", "genre", "tags", "thumbnailUrl", "color"],
      genres: ["arcade", "strategy", "puzzle", "action", "trivia", "trading", "sports", "rpg"],
      review: "Games are reviewed before appearing in the arena. Status: pending -> approved/rejected",
    },
    iframeIntegration: {
      description: "Your game runs in an iframe. Use postMessage to communicate with the Honeycomb arena.",
      postMessageEvents: [
        { event: "honeycomb:ready", direction: "arena->game", description: "Arena sends when iframe loads with session info" },
        { event: "honeycomb:score", direction: "game->arena", description: "Game reports score updates" },
        { event: "honeycomb:end", direction: "game->arena", description: "Game signals session completion" },
      ],
    },
  });
});

export default router;
