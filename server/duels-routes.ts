import type { Express } from "express";
import { storage } from "./storage";
import { authMiddleware } from "./auth";
import { createDuelRequestSchema, joinDuelRequestSchema } from "@shared/schema";

const FEE_TREASURY_ADDRESS = "0xEA42922A5c695bD947246988B7927fbD3fD889fF";
const FEE_PERCENTAGE = 10;

export function registerDuelsRoutes(app: Express) {
  app.get("/api/duels/assets", async (_req, res) => {
    try {
      await storage.seedDuelAssets();
      const assets = await storage.getDuelAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching duel assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.get("/api/duels", async (req, res) => {
    try {
      const status = (req.query.status as string) || "all";
      const limit = parseInt(req.query.limit as string) || 50;
      
      const validStatuses = ["open", "live", "settled", "cancelled", "all"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const duels = await storage.getDuels(status as "open" | "live" | "settled" | "cancelled" | "all", limit);
      res.json(duels);
    } catch (error) {
      console.error("Error fetching duels:", error);
      res.status(500).json({ message: "Failed to fetch duels" });
    }
  });

  app.get("/api/duels/:id", async (req, res) => {
    try {
      const duel = await storage.getDuel(req.params.id);
      if (!duel) {
        return res.status(404).json({ message: "Duel not found" });
      }
      res.json(duel);
    } catch (error) {
      console.error("Error fetching duel:", error);
      res.status(500).json({ message: "Failed to fetch duel" });
    }
  });

  app.post("/api/duels", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      
      const parseResult = createDuelRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const { assetId, assetName, durationSec, stakeWei, stakeDisplay, direction } = parseResult.data;

      const agent = await storage.getAgentByAddress(walletAddress);

      const duel = await storage.createDuel({
        assetId,
        assetName,
        durationSec,
        stakeWei,
        stakeDisplay,
        creatorAddress: walletAddress,
        creatorAgentId: agent?.id || null,
        creatorDirection: direction,
      });

      res.status(201).json(duel);
    } catch (error) {
      console.error("Error creating duel:", error);
      res.status(500).json({ message: "Failed to create duel" });
    }
  });

  app.post("/api/duels/:id/join", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const duelId = req.params.id;

      const duel = await storage.getDuel(duelId);
      if (!duel) {
        return res.status(404).json({ message: "Duel not found" });
      }

      if (duel.status !== "open") {
        return res.status(400).json({ message: "Duel is not open for joining" });
      }

      if (duel.creatorAddress.toLowerCase() === walletAddress.toLowerCase()) {
        return res.status(400).json({ message: "Cannot join your own duel" });
      }

      const joinerDirection = duel.creatorDirection === "up" ? "down" : "up";

      const agent = await storage.getAgentByAddress(walletAddress);
      
      const mockStartPrice = await fetchMockPrice(duel.assetId);

      const updatedDuel = await storage.joinDuel(
        duelId,
        walletAddress,
        agent?.id || null,
        joinerDirection,
        mockStartPrice
      );

      res.json(updatedDuel);
    } catch (error) {
      console.error("Error joining duel:", error);
      res.status(500).json({ message: "Failed to join duel" });
    }
  });

  app.post("/api/duels/:id/cancel", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const duelId = req.params.id;

      const duel = await storage.getDuel(duelId);
      if (!duel) {
        return res.status(404).json({ message: "Duel not found" });
      }

      if (duel.creatorAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Only the creator can cancel" });
      }

      if (duel.status !== "open") {
        return res.status(400).json({ message: "Can only cancel open duels" });
      }

      const updatedDuel = await storage.updateDuel(duelId, { status: "cancelled" });
      res.json(updatedDuel);
    } catch (error) {
      console.error("Error cancelling duel:", error);
      res.status(500).json({ message: "Failed to cancel duel" });
    }
  });

  app.post("/api/duels/:id/settle", async (req, res) => {
    try {
      const duelId = req.params.id;

      const duel = await storage.getDuel(duelId);
      if (!duel) {
        return res.status(404).json({ message: "Duel not found" });
      }

      if (duel.status !== "live") {
        return res.status(400).json({ message: "Duel is not live" });
      }

      if (!duel.endTs || new Date() < duel.endTs) {
        return res.status(400).json({ message: "Duel has not ended yet" });
      }

      const endPrice = await fetchMockPrice(duel.assetId);
      const startPrice = BigInt(duel.startPrice || "0");
      const endPriceBigInt = BigInt(endPrice);

      let winnerAddress: string | null = null;
      const pot = BigInt(duel.stakeWei) * BigInt(2);
      const fee = (pot * BigInt(FEE_PERCENTAGE)) / BigInt(100);
      const payout = pot - fee;
      
      console.log(`Duel ${duelId} settled: Fee ${fee.toString()} wei → ${FEE_TREASURY_ADDRESS}`);

      if (endPriceBigInt > startPrice) {
        winnerAddress = duel.creatorDirection === "up" ? duel.creatorAddress : duel.joinerAddress;
      } else if (endPriceBigInt < startPrice) {
        winnerAddress = duel.creatorDirection === "down" ? duel.creatorAddress : duel.joinerAddress;
      }

      const settledDuel = await storage.settleDuel(
        duelId,
        endPrice,
        winnerAddress,
        payout.toString(),
        fee.toString()
      );

      res.json(settledDuel);
    } catch (error) {
      console.error("Error settling duel:", error);
      res.status(500).json({ message: "Failed to settle duel" });
    }
  });

  app.get("/api/duels/price/:assetId", async (req, res) => {
    try {
      const price = await fetchMockPrice(req.params.assetId);
      res.json({ 
        assetId: req.params.assetId, 
        price, 
        priceFormatted: formatPrice(price),
        timestamp: Date.now() 
      });
    } catch (error) {
      console.error("Error fetching price:", error);
      res.status(500).json({ message: "Failed to fetch price" });
    }
  });

  app.get("/api/duels/config", async (_req, res) => {
    res.json({
      feePercentage: FEE_PERCENTAGE,
      feeTreasury: FEE_TREASURY_ADDRESS,
      payoutPercentage: 100 - FEE_PERCENTAGE
    });
  });
}

const basePrices: Record<string, number> = {
  BNB: 650,
  BTC: 105000,
  ETH: 3200,
  SOL: 180,
  DOGE: 0.32,
  XRP: 2.5,
  ADA: 1.05,
  AVAX: 35,
  LINK: 25,
  MATIC: 0.45,
};

async function fetchMockPrice(assetId: string): Promise<string> {
  const basePrice = basePrices[assetId] || 100;
  const variation = (Math.random() - 0.5) * 0.02;
  const price = basePrice * (1 + variation);
  return Math.floor(price * 1e8).toString();
}

function formatPrice(priceStr: string): string {
  const price = parseFloat(priceStr) / 1e8;
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}
