import type { Express } from "express";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import {
  honeyStakingRecords,
  honeyPointsConversion,
  honeyBurnLog,
  honeyTokenStats,
  honeyTierConfig,
  userPoints,
} from "@shared/schema";
import { authMiddleware, optionalAuthMiddleware } from "./auth";

const HONEY_TOKEN_INFO = {
  name: "Honey Token",
  symbol: "HONEY",
  decimals: 18,
  maxSupply: "1000000000",
  initialSupply: "150000000",
  chains: [56, 97],
  distribution: {
    communityRewards: { percentage: 35, amount: "350000000", label: "Community Rewards Pool" },
    pointsConversion: { percentage: 10, amount: "100000000", label: "Points Conversion (Early Users)" },
    teamAdvisors: { percentage: 15, amount: "150000000", label: "Team & Advisors" },
    liquidity: { percentage: 15, amount: "150000000", label: "Liquidity (PancakeSwap)" },
    treasury: { percentage: 10, amount: "100000000", label: "Treasury (DAO)" },
    ecosystem: { percentage: 10, amount: "100000000", label: "Ecosystem Grants" },
    strategicSale: { percentage: 5, amount: "50000000", label: "Strategic Sale" },
  },
  useCases: [
    "Prediction Duels - Reduced fees (5% vs 10% BNB)",
    "Token Launchpad - Discounted launch fees, priority access",
    "Bounty System - Post/claim bounties in HONEY",
    "AI Agent Marketplace - Reduced marketplace fees",
    "NFA Trading - Fee waiver for HONEY transactions",
    "Staking - Tier benefits (Drone/Worker/Guardian/Queen)",
    "Governance - Vote on platform parameters",
    "Points Conversion - Convert earned points to HONEY",
  ],
};

const POINTS_TO_HONEY_RATE = 100; // 100 points = 1 HONEY

export function registerHoneyRoutes(app: Express) {
  app.get("/api/honey/info", async (_req, res) => {
    try {
      res.json(HONEY_TOKEN_INFO);
    } catch (error) {
      console.error("Error fetching honey info:", error);
      res.status(500).json({ error: "Failed to fetch token info" });
    }
  });

  app.get("/api/honey/stats", async (_req, res) => {
    try {
      const [stats] = await db.select().from(honeyTokenStats).limit(1);
      const tiers = await db.select().from(honeyTierConfig).where(eq(honeyTierConfig.isActive, true));

      res.json({
        stats: stats || {
          totalStaked: "0",
          totalBurned: "0",
          totalStakers: 0,
          circulatingSupply: "150000000000000000000000000",
          rewardPoolBalance: "0",
          priceUsd: "0",
          priceBnb: "0",
          marketCap: "0",
          holders: 0,
        },
        tiers: tiers.map((t) => ({
          ...t,
          benefits: JSON.parse(t.benefits),
        })),
      });
    } catch (error) {
      console.error("Error fetching honey stats:", error);
      res.status(500).json({ error: "Failed to fetch token stats" });
    }
  });

  app.get("/api/honey/tiers", async (_req, res) => {
    try {
      const tiers = await db
        .select()
        .from(honeyTierConfig)
        .where(eq(honeyTierConfig.isActive, true));

      res.json(
        tiers.map((t) => ({
          ...t,
          benefits: JSON.parse(t.benefits),
        }))
      );
    } catch (error) {
      console.error("Error fetching tiers:", error);
      res.status(500).json({ error: "Failed to fetch tiers" });
    }
  });

  app.get("/api/honey/staking/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const records = await db
        .select()
        .from(honeyStakingRecords)
        .where(eq(honeyStakingRecords.walletAddress, walletAddress.toLowerCase()))
        .orderBy(desc(honeyStakingRecords.stakedAt));

      const activeStake = records.find((r) => r.isActive);

      res.json({
        activeStake,
        history: records,
        currentTier: activeStake?.tier || "none",
        feeDiscount: activeStake?.feeDiscount || 0,
        pointsMultiplier: activeStake?.pointsMultiplier || 100,
      });
    } catch (error) {
      console.error("Error fetching staking info:", error);
      res.status(500).json({ error: "Failed to fetch staking info" });
    }
  });

  app.post("/api/honey/staking/sync", authMiddleware, async (req, res) => {
    try {
      const { walletAddress, amountWei, amountDisplay, lockPeriod, tier, feeDiscount, pointsMultiplier, txHash, chainId } = req.body;

      if (!walletAddress || !amountWei || !tier) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      await db
        .update(honeyStakingRecords)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(honeyStakingRecords.walletAddress, walletAddress.toLowerCase()));

      const [record] = await db
        .insert(honeyStakingRecords)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          agentId: (req as any).agentId || null,
          amountWei,
          amountDisplay: amountDisplay || "0 HONEY",
          lockPeriod: lockPeriod || "flexible",
          tier,
          feeDiscount: feeDiscount || 0,
          pointsMultiplier: pointsMultiplier || 100,
          txHash,
          chainId: chainId || 56,
          isActive: true,
        })
        .returning();

      await db
        .update(honeyTokenStats)
        .set({ updatedAt: new Date() });

      res.json({ success: true, record });
    } catch (error) {
      console.error("Error syncing stake:", error);
      res.status(500).json({ error: "Failed to sync staking record" });
    }
  });

  app.post("/api/honey/unstake/sync", authMiddleware, async (req, res) => {
    try {
      const { walletAddress, txHash } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ error: "Missing wallet address" });
      }

      await db
        .update(honeyStakingRecords)
        .set({ isActive: false, updatedAt: new Date(), txHash: txHash || null })
        .where(eq(honeyStakingRecords.walletAddress, walletAddress.toLowerCase()));

      res.json({ success: true });
    } catch (error) {
      console.error("Error syncing unstake:", error);
      res.status(500).json({ error: "Failed to sync unstake" });
    }
  });

  app.get("/api/honey/points/balance", authMiddleware, async (req, res) => {
    try {
      const agentId = (req as any).agentId;
      const [points] = await db
        .select()
        .from(userPoints)
        .where(eq(userPoints.agentId, agentId));

      const conversionRate = POINTS_TO_HONEY_RATE;
      const availablePoints = points?.totalPoints || 0;
      const honeyEstimate = availablePoints / conversionRate;

      res.json({
        totalPoints: availablePoints,
        lifetimePoints: points?.lifetimePoints || 0,
        conversionRate,
        estimatedHoney: honeyEstimate.toFixed(2),
        lastEarnedAt: points?.lastEarnedAt,
      });
    } catch (error) {
      console.error("Error fetching points balance:", error);
      res.status(500).json({ error: "Failed to fetch points balance" });
    }
  });

  app.post("/api/honey/points/convert", authMiddleware, async (req, res) => {
    try {
      const agentId = (req as any).agentId;
      const { pointsToConvert, walletAddress } = req.body;

      if (!pointsToConvert || pointsToConvert < POINTS_TO_HONEY_RATE) {
        return res.status(400).json({
          error: `Minimum ${POINTS_TO_HONEY_RATE} points required for conversion`,
        });
      }

      const [points] = await db
        .select()
        .from(userPoints)
        .where(eq(userPoints.agentId, agentId));

      if (!points || points.totalPoints < pointsToConvert) {
        return res.status(400).json({ error: "Insufficient points" });
      }

      const honeyAmount = Math.floor(pointsToConvert / POINTS_TO_HONEY_RATE);
      const honeyWei = BigInt(honeyAmount) * BigInt(10 ** 18);
      const actualPointsSpent = honeyAmount * POINTS_TO_HONEY_RATE;

      const [conversion] = await db
        .insert(honeyPointsConversion)
        .values({
          agentId,
          walletAddress: walletAddress?.toLowerCase() || "",
          pointsSpent: actualPointsSpent,
          honeyReceived: honeyWei.toString(),
          honeyDisplay: `${honeyAmount} HONEY`,
          conversionRate: POINTS_TO_HONEY_RATE,
          status: "pending",
        })
        .returning();

      await db
        .update(userPoints)
        .set({
          totalPoints: points.totalPoints - actualPointsSpent,
          updatedAt: new Date(),
        })
        .where(eq(userPoints.agentId, agentId));

      res.json({
        success: true,
        conversion,
        pointsRemaining: points.totalPoints - actualPointsSpent,
        honeyAmount: `${honeyAmount} HONEY`,
      });
    } catch (error) {
      console.error("Error converting points:", error);
      res.status(500).json({ error: "Failed to convert points" });
    }
  });

  app.get("/api/honey/burns", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const burns = await db
        .select()
        .from(honeyBurnLog)
        .orderBy(desc(honeyBurnLog.createdAt))
        .limit(limit);

      const [totalBurnResult] = await db
        .select({ total: sql<string>`COALESCE(SUM(CAST(amount_wei AS NUMERIC)), 0)::TEXT` })
        .from(honeyBurnLog);

      res.json({
        burns,
        totalBurned: totalBurnResult?.total || "0",
        count: burns.length,
      });
    } catch (error) {
      console.error("Error fetching burns:", error);
      res.status(500).json({ error: "Failed to fetch burn log" });
    }
  });

  app.post("/api/honey/burn/sync", authMiddleware, async (req, res) => {
    try {
      const { walletAddress, amountWei, amountDisplay, source, txHash, chainId } = req.body;

      if (!walletAddress || !amountWei || !source) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const [log] = await db
        .insert(honeyBurnLog)
        .values({
          walletAddress: walletAddress.toLowerCase(),
          amountWei,
          amountDisplay: amountDisplay || "0 HONEY",
          source,
          txHash,
          chainId: chainId || 56,
        })
        .returning();

      res.json({ success: true, log });
    } catch (error) {
      console.error("Error syncing burn:", error);
      res.status(500).json({ error: "Failed to sync burn record" });
    }
  });

  app.get("/api/honey/tier/:walletAddress", async (req, res) => {
    try {
      const { walletAddress } = req.params;
      const [activeStake] = await db
        .select()
        .from(honeyStakingRecords)
        .where(eq(honeyStakingRecords.walletAddress, walletAddress.toLowerCase()))
        .orderBy(desc(honeyStakingRecords.stakedAt))
        .limit(1);

      if (!activeStake || !activeStake.isActive) {
        return res.json({
          tier: "none",
          feeDiscount: 0,
          pointsMultiplier: 100,
          stakedAmount: "0",
        });
      }

      const [tierInfo] = await db
        .select()
        .from(honeyTierConfig)
        .where(eq(honeyTierConfig.tier, activeStake.tier));

      res.json({
        tier: activeStake.tier,
        tierInfo: tierInfo ? { ...tierInfo, benefits: JSON.parse(tierInfo.benefits) } : null,
        feeDiscount: activeStake.feeDiscount,
        pointsMultiplier: activeStake.pointsMultiplier,
        stakedAmount: activeStake.amountDisplay,
        stakedWei: activeStake.amountWei,
        lockPeriod: activeStake.lockPeriod,
        unlockAt: activeStake.unlockAt,
      });
    } catch (error) {
      console.error("Error fetching tier:", error);
      res.status(500).json({ error: "Failed to fetch tier info" });
    }
  });
}
