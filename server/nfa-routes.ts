import { Router, Request, Response } from "express";
import { db } from "./db";
import { 
  nfaAgents, 
  nfaMemory, 
  nfaTrainingHistory, 
  nfaInteractions, 
  nfaListings, 
  nfaVerifications, 
  nfaStats, 
  nfaRatings,
  insertNfaAgentSchema,
  insertNfaMemorySchema,
  insertNfaInteractionSchema,
  insertNfaListingSchema,
  insertNfaRatingSchema
} from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { authMiddleware, optionalAuthMiddleware } from "./auth";

export const nfaRouter = Router();

function generateProofOfPrompt(systemPrompt: string, modelType: string): string {
  const data = `${systemPrompt}:${modelType}:${Date.now()}`;
  return "0x" + crypto.createHash("sha256").update(data).digest("hex");
}

function generateMemoryRoot(memoryData: Record<string, string>): string {
  const data = JSON.stringify(memoryData);
  return "0x" + crypto.createHash("sha256").update(data).digest("hex");
}

// ==================== NFA Agents ====================

nfaRouter.get("/agents", async (req: Request, res: Response) => {
  try {
    const { category, status, agentType, owner, limit = "20", offset = "0" } = req.query;

    let agents = await db
      .select()
      .from(nfaAgents)
      .orderBy(desc(nfaAgents.createdAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    if (category) {
      agents = agents.filter(a => a.category === category);
    }
    if (status) {
      agents = agents.filter(a => a.status === status);
    }
    if (agentType) {
      agents = agents.filter(a => a.agentType === agentType);
    }
    if (owner) {
      agents = agents.filter(a => a.ownerAddress.toLowerCase() === (owner as string).toLowerCase());
    }

    res.json({ agents, total: agents.length });
  } catch (error) {
    console.error("Error fetching NFA agents:", error);
    res.json({ agents: [], total: 0 });
  }
});

nfaRouter.get("/agents/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agents = await db.select().from(nfaAgents).where(eq(nfaAgents.id, id));
    if (agents.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }
    const agent = agents[0];

    const stats = await db.select().from(nfaStats).where(eq(nfaStats.nfaId, id));
    const verification = await db.select().from(nfaVerifications).where(eq(nfaVerifications.nfaId, id));
    const listing = await db.select().from(nfaListings).where(eq(nfaListings.nfaId, id));

    res.json({
      agent,
      stats: stats[0] || { totalInteractions: 0, totalRevenue: "0", rating: 0, ratingCount: 0 },
      verification: verification[0] || { status: "UNVERIFIED" },
      listing: listing[0]?.active ? listing[0] : null
    });
  } catch (error) {
    console.error("Error fetching NFA agent:", error);
    res.status(500).json({ error: "Failed to fetch agent" });
  }
});

nfaRouter.get("/agents/token/:tokenId", async (req: Request, res: Response) => {
  try {
    const tokenId = parseInt(req.params.tokenId);

    const agents = await db.select().from(nfaAgents).where(eq(nfaAgents.tokenId, tokenId));
    if (agents.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }

    res.json({ agent: agents[0] });
  } catch (error) {
    console.error("Error fetching NFA agent:", error);
    res.status(500).json({ error: "Failed to fetch agent" });
  }
});

nfaRouter.post("/agents/mint", authMiddleware, async (req: Request, res: Response) => {
  try {
    const validated = insertNfaAgentSchema.parse(req.body);
    
    // Verify the wallet address matches the authenticated user
    if (validated.ownerAddress.toLowerCase() !== req.walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: "Cannot mint NFA for a different wallet" });
    }
    
    const proofOfPrompt = validated.proofOfPrompt || 
      generateProofOfPrompt(validated.systemPrompt || "", validated.modelType);

    const memoryRoot = validated.memoryRoot || generateMemoryRoot({});

    const result = await db.insert(nfaAgents).values({
      tokenId: validated.tokenId,
      ownerAddress: validated.ownerAddress.toLowerCase(),
      agentId: validated.agentId,
      name: validated.name,
      description: validated.description,
      modelType: validated.modelType,
      agentType: validated.agentType || "STATIC",
      proofOfPrompt,
      memoryRoot,
      metadataUri: validated.metadataUri,
      category: validated.category,
      systemPrompt: validated.systemPrompt,
    }).returning();

    const agent = result[0];

    await db.insert(nfaStats).values({
      nfaId: agent.id,
      totalInteractions: 0,
      totalRevenue: "0",
      rating: 0,
      ratingCount: 0,
      weeklyInteractions: 0,
      monthlyInteractions: 0,
    });

    await db.insert(nfaVerifications).values({
      nfaId: agent.id,
      status: "UNVERIFIED",
    });

    res.json({ agent, proofOfPrompt, memoryRoot });
  } catch (error) {
    console.error("Error minting NFA agent:", error);
    res.status(500).json({ error: "Failed to mint agent" });
  }
});

nfaRouter.patch("/agents/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, category, status, memoryRoot } = req.body;

    // Verify ownership
    const agents = await db.select().from(nfaAgents).where(eq(nfaAgents.id, id));
    if (agents.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }
    if (agents[0].ownerAddress.toLowerCase() !== req.walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: "Only the owner can update this agent" });
    }

    const updateData: any = { lastActiveAt: new Date() };
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (category) updateData.category = category;
    if (status) updateData.status = status;
    if (memoryRoot) updateData.memoryRoot = memoryRoot;

    const result = await db
      .update(nfaAgents)
      .set(updateData)
      .where(eq(nfaAgents.id, id))
      .returning();

    res.json({ agent: result[0] });
  } catch (error) {
    console.error("Error updating NFA agent:", error);
    res.status(500).json({ error: "Failed to update agent" });
  }
});

// ==================== Memory Vault ====================

nfaRouter.get("/agents/:id/memory", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const memory = await db
      .select()
      .from(nfaMemory)
      .where(eq(nfaMemory.nfaId, id))
      .orderBy(desc(nfaMemory.updatedAt));

    res.json({ memory });
  } catch (error) {
    console.error("Error fetching memory:", error);
    res.json({ memory: [] });
  }
});

nfaRouter.post("/agents/:id/memory", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = insertNfaMemorySchema.parse({ ...req.body, nfaId: id });

    // Verify ownership
    const agents = await db.select().from(nfaAgents).where(eq(nfaAgents.id, id));
    if (agents.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }
    if (agents[0].ownerAddress.toLowerCase() !== req.walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: "Only the owner can update memory" });
    }

    const existing = await db
      .select()
      .from(nfaMemory)
      .where(and(eq(nfaMemory.nfaId, id), eq(nfaMemory.memoryKey, validated.memoryKey)));

    let memory;
    if (existing.length > 0) {
      const result = await db
        .update(nfaMemory)
        .set({
          memoryValue: validated.memoryValue,
          version: existing[0].version + 1,
          updatedAt: new Date(),
        })
        .where(eq(nfaMemory.id, existing[0].id))
        .returning();
      memory = result[0];
    } else {
      const result = await db.insert(nfaMemory).values({
        nfaId: validated.nfaId,
        memoryKey: validated.memoryKey,
        memoryValue: validated.memoryValue,
      }).returning();
      memory = result[0];
    }

    const allMemory = await db.select().from(nfaMemory).where(eq(nfaMemory.nfaId, id));
    const memoryObj: Record<string, string> = {};
    allMemory.forEach(m => { memoryObj[m.memoryKey] = m.memoryValue; });
    const newMemoryRoot = generateMemoryRoot(memoryObj);

    await db
      .update(nfaAgents)
      .set({ memoryRoot: newMemoryRoot, lastActiveAt: new Date() })
      .where(eq(nfaAgents.id, id));

    res.json({ memory, memoryRoot: newMemoryRoot });
  } catch (error) {
    console.error("Error updating memory:", error);
    res.status(500).json({ error: "Failed to update memory" });
  }
});

// ==================== Training ====================

nfaRouter.get("/agents/:id/training", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const history = await db
      .select()
      .from(nfaTrainingHistory)
      .where(eq(nfaTrainingHistory.nfaId, id))
      .orderBy(desc(nfaTrainingHistory.version));

    res.json({ history });
  } catch (error) {
    console.error("Error fetching training history:", error);
    res.json({ history: [] });
  }
});

nfaRouter.post("/agents/:id/training", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { trainingData } = req.body;

    const agents = await db.select().from(nfaAgents).where(eq(nfaAgents.id, id));
    if (agents.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }
    const agent = agents[0];

    if (agent.agentType !== "LEARNING") {
      return res.status(400).json({ error: "Agent is not a learning agent" });
    }

    const newVersion = agent.trainingVersion + 1;
    const trainingHash = "0x" + crypto.createHash("sha256").update(trainingData || "").digest("hex");

    const result = await db.insert(nfaTrainingHistory).values({
      nfaId: id,
      version: newVersion,
      trainingHash,
      trainingData,
    }).returning();

    await db
      .update(nfaAgents)
      .set({ trainingVersion: newVersion, lastActiveAt: new Date() })
      .where(eq(nfaAgents.id, id));

    res.json({ training: result[0] });
  } catch (error) {
    console.error("Error updating training:", error);
    res.status(500).json({ error: "Failed to update training" });
  }
});

// ==================== Interactions ====================

nfaRouter.post("/agents/:id/interact", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = insertNfaInteractionSchema.parse({ ...req.body, nfaId: id });

    const result = await db.insert(nfaInteractions).values({
      nfaId: validated.nfaId,
      callerAddress: validated.callerAddress.toLowerCase(),
      interactionType: validated.interactionType,
      inputHash: validated.inputHash,
      outputHash: validated.outputHash,
      tokensUsed: validated.tokensUsed,
      cost: validated.cost,
    }).returning();

    await db
      .update(nfaAgents)
      .set({ 
        interactionCount: sql`${nfaAgents.interactionCount} + 1`,
        lastActiveAt: new Date() 
      })
      .where(eq(nfaAgents.id, id));

    await db
      .update(nfaStats)
      .set({
        totalInteractions: sql`${nfaStats.totalInteractions} + 1`,
        weeklyInteractions: sql`${nfaStats.weeklyInteractions} + 1`,
        monthlyInteractions: sql`${nfaStats.monthlyInteractions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(nfaStats.nfaId, id));

    res.json({ interaction: result[0] });
  } catch (error) {
    console.error("Error recording interaction:", error);
    res.status(500).json({ error: "Failed to record interaction" });
  }
});

nfaRouter.get("/agents/:id/interactions", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = "50" } = req.query;

    const interactions = await db
      .select()
      .from(nfaInteractions)
      .where(eq(nfaInteractions.nfaId, id))
      .orderBy(desc(nfaInteractions.createdAt))
      .limit(parseInt(limit as string));

    res.json({ interactions });
  } catch (error) {
    console.error("Error fetching interactions:", error);
    res.json({ interactions: [] });
  }
});

// ==================== Marketplace ====================

nfaRouter.get("/marketplace/listings", async (req: Request, res: Response) => {
  try {
    const { limit = "20", offset = "0" } = req.query;

    const listings = await db
      .select({
        listing: nfaListings,
        agent: nfaAgents,
      })
      .from(nfaListings)
      .innerJoin(nfaAgents, eq(nfaListings.nfaId, nfaAgents.id))
      .where(eq(nfaListings.active, true))
      .orderBy(desc(nfaListings.listedAt))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    res.json({ listings });
  } catch (error) {
    console.error("Error fetching marketplace:", error);
    res.json({ listings: [] });
  }
});

nfaRouter.post("/marketplace/list", authMiddleware, async (req: Request, res: Response) => {
  try {
    const validated = insertNfaListingSchema.parse(req.body);

    const agents = await db.select().from(nfaAgents).where(eq(nfaAgents.id, validated.nfaId));
    if (agents.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }

    // Verify ownership - only owner can list
    if (agents[0].ownerAddress.toLowerCase() !== req.walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: "Only the owner can list this agent" });
    }

    const existing = await db.select().from(nfaListings).where(eq(nfaListings.nfaId, validated.nfaId));
    
    let listing;
    if (existing.length > 0) {
      const result = await db
        .update(nfaListings)
        .set({
          priceWei: validated.priceWei,
          priceDisplay: validated.priceDisplay,
          active: true,
          listedAt: new Date(),
        })
        .where(eq(nfaListings.id, existing[0].id))
        .returning();
      listing = result[0];
    } else {
      const result = await db.insert(nfaListings).values({
        nfaId: validated.nfaId,
        sellerAddress: req.walletAddress!.toLowerCase(),
        priceWei: validated.priceWei,
        priceDisplay: validated.priceDisplay,
      }).returning();
      listing = result[0];
    }

    res.json({ listing });
  } catch (error) {
    console.error("Error listing agent:", error);
    res.status(500).json({ error: "Failed to list agent" });
  }
});

nfaRouter.post("/marketplace/delist/:nfaId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { nfaId } = req.params;

    // Verify ownership
    const agents = await db.select().from(nfaAgents).where(eq(nfaAgents.id, nfaId));
    if (agents.length === 0) {
      return res.status(404).json({ error: "Agent not found" });
    }
    if (agents[0].ownerAddress.toLowerCase() !== req.walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: "Only the owner can delist this agent" });
    }

    await db
      .update(nfaListings)
      .set({ active: false })
      .where(eq(nfaListings.nfaId, nfaId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error delisting agent:", error);
    res.status(500).json({ error: "Failed to delist agent" });
  }
});

nfaRouter.post("/marketplace/sold", async (req: Request, res: Response) => {
  try {
    const { nfaId, buyerAddress, price } = req.body;

    await db
      .update(nfaListings)
      .set({
        active: false,
        soldAt: new Date(),
        buyerAddress: buyerAddress.toLowerCase(),
      })
      .where(eq(nfaListings.nfaId, nfaId));

    await db
      .update(nfaAgents)
      .set({ ownerAddress: buyerAddress.toLowerCase() })
      .where(eq(nfaAgents.id, nfaId));

    await db
      .update(nfaStats)
      .set({
        totalRevenue: sql`CAST(${nfaStats.totalRevenue} AS NUMERIC) + ${price}`,
        updatedAt: new Date(),
      })
      .where(eq(nfaStats.nfaId, nfaId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error recording sale:", error);
    res.status(500).json({ error: "Failed to record sale" });
  }
});

// ==================== Ratings ====================

nfaRouter.post("/agents/:id/rate", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = insertNfaRatingSchema.parse({ ...req.body, nfaId: id });

    // Verify the rater matches the authenticated user
    if (validated.raterAddress.toLowerCase() !== req.walletAddress?.toLowerCase()) {
      return res.status(403).json({ error: "Cannot rate on behalf of another wallet" });
    }

    // Check if user owns this agent (cannot rate your own agent)
    const agents = await db.select().from(nfaAgents).where(eq(nfaAgents.id, id));
    if (agents.length > 0 && agents[0].ownerAddress.toLowerCase() === req.walletAddress?.toLowerCase()) {
      return res.status(400).json({ error: "Cannot rate your own agent" });
    }

    const existing = await db
      .select()
      .from(nfaRatings)
      .where(and(
        eq(nfaRatings.nfaId, id),
        eq(nfaRatings.raterAddress, req.walletAddress!.toLowerCase())
      ));

    if (existing.length > 0) {
      return res.status(400).json({ error: "Already rated this agent" });
    }

    const result = await db.insert(nfaRatings).values({
      nfaId: validated.nfaId,
      raterAddress: req.walletAddress!.toLowerCase(),
      rating: validated.rating,
      review: validated.review,
    }).returning();

    const stats = await db.select().from(nfaStats).where(eq(nfaStats.nfaId, id));
    if (stats.length > 0) {
      const s = stats[0];
      const newRating = ((s.rating || 0) * s.ratingCount + validated.rating) / (s.ratingCount + 1);
      await db
        .update(nfaStats)
        .set({
          rating: newRating,
          ratingCount: s.ratingCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(nfaStats.nfaId, id));
    }

    res.json({ rating: result[0] });
  } catch (error) {
    console.error("Error rating agent:", error);
    res.status(500).json({ error: "Failed to rate agent" });
  }
});

nfaRouter.get("/agents/:id/ratings", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const ratings = await db
      .select()
      .from(nfaRatings)
      .where(eq(nfaRatings.nfaId, id))
      .orderBy(desc(nfaRatings.createdAt));

    res.json({ ratings });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    res.json({ ratings: [] });
  }
});

// ==================== Leaderboard ====================

nfaRouter.get("/leaderboard/interactions", async (req: Request, res: Response) => {
  try {
    const { limit = "10" } = req.query;

    const agents = await db
      .select({
        agent: nfaAgents,
        stats: nfaStats,
      })
      .from(nfaAgents)
      .leftJoin(nfaStats, eq(nfaAgents.id, nfaStats.nfaId))
      .where(eq(nfaAgents.status, "ACTIVE"))
      .orderBy(desc(nfaStats.totalInteractions))
      .limit(parseInt(limit as string));

    res.json({ agents });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.json({ agents: [] });
  }
});

nfaRouter.get("/leaderboard/rating", async (req: Request, res: Response) => {
  try {
    const { limit = "10" } = req.query;

    const agents = await db
      .select({
        agent: nfaAgents,
        stats: nfaStats,
      })
      .from(nfaAgents)
      .innerJoin(nfaStats, eq(nfaAgents.id, nfaStats.nfaId))
      .where(eq(nfaAgents.status, "ACTIVE"))
      .orderBy(desc(nfaStats.rating))
      .limit(parseInt(limit as string));

    res.json({ agents });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.json({ agents: [] });
  }
});

nfaRouter.get("/leaderboard/revenue", async (req: Request, res: Response) => {
  try {
    const { limit = "10" } = req.query;

    const agents = await db
      .select({
        agent: nfaAgents,
        stats: nfaStats,
      })
      .from(nfaAgents)
      .leftJoin(nfaStats, eq(nfaAgents.id, nfaStats.nfaId))
      .where(eq(nfaAgents.status, "ACTIVE"))
      .orderBy(desc(nfaStats.totalRevenue))
      .limit(parseInt(limit as string));

    res.json({ agents });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.json({ agents: [] });
  }
});

// ==================== Categories ====================

nfaRouter.get("/categories", async (req: Request, res: Response) => {
  try {
    const agents = await db.select().from(nfaAgents);
    
    const categoryCounts: Record<string, number> = {};
    agents.forEach(a => {
      if (a.category) {
        categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
      }
    });

    const categories = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    res.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.json({ categories: [] });
  }
});
