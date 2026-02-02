import type { Express } from "express";
import { storage } from "./storage";
import { authMiddleware } from "./auth";
import { createDuelRequestSchema, joinDuelRequestSchema } from "@shared/schema";

const FEE_TREASURY_ADDRESS = "0xEA42922A5c695bD947246988B7927fbD3fD889fF";
const FEE_PERCENTAGE = 10;

// Price cache to avoid CoinGecko rate limits (free tier: 10-30 req/min)
const priceCache: Record<string, { price: number; timestamp: number }> = {};
const CACHE_TTL_MS = 10000; // 10 seconds cache

// CoinGecko ID mapping for price data (Binance is geo-blocked from server)
const COINGECKO_IDS: Record<string, string> = {
  "BNB": "binancecoin",
  "BTC": "bitcoin",
  "ETH": "ethereum",
  "SOL": "solana",
  "DOGE": "dogecoin",
  "PEPE": "pepe",
  "SHIB": "shiba-inu",
  "XRP": "ripple",
  "ADA": "cardano",
  "AVAX": "avalanche-2",
  "MATIC": "matic-network",
  "LINK": "chainlink",
};

// Binance symbol mapping (for reference, but API is geo-blocked)
const BINANCE_SYMBOLS: Record<string, string> = {
  "BNB": "BNBUSDT",
  "BTC": "BTCUSDT",
  "ETH": "ETHUSDT",
  "SOL": "SOLUSDT",
  "DOGE": "DOGEUSDT",
  "PEPE": "PEPEUSDT",
  "SHIB": "SHIBUSDT",
  "XRP": "XRPUSDT",
  "ADA": "ADAUSDT",
  "AVAX": "AVAXUSDT",
  "MATIC": "MATICUSDT",
  "LINK": "LINKUSDT",
};

// Helper to convert BigInt fields to strings for JSON serialization
function serializeDuel(duel: any) {
  if (!duel) return duel;
  return {
    ...duel,
    onChainDuelId: duel.onChainDuelId?.toString() || null,
    creatorOnChainAgentId: duel.creatorOnChainAgentId?.toString() || null,
    joinerOnChainAgentId: duel.joinerOnChainAgentId?.toString() || null,
  };
}

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
      res.json(duels.map(serializeDuel));
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
      res.json(serializeDuel(duel));
    } catch (error) {
      console.error("Error fetching duel:", error);
      res.status(500).json({ message: "Failed to fetch duel" });
    }
  });

  // Direct duel creation disabled - must use on-chain flow via /api/duels/sync-create
  // This endpoint now returns an error instructing users to use on-chain transactions
  app.post("/api/duels", authMiddleware, async (req, res) => {
    return res.status(400).json({ 
      message: "Direct duel creation is disabled. Please use on-chain transactions on BSC Mainnet.",
      code: "ON_CHAIN_REQUIRED"
    });
  });

  // Direct duel joining disabled - must use on-chain flow via /api/duels/:id/sync-join
  // This endpoint now returns an error instructing users to use on-chain transactions
  app.post("/api/duels/:id/join", authMiddleware, async (req, res) => {
    return res.status(400).json({ 
      message: "Direct duel joining is disabled. Please use on-chain transactions on BSC Mainnet.",
      code: "ON_CHAIN_REQUIRED"
    });
  });

  app.post("/api/duels/:id/cancel", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const duelId = req.params.id as string;

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
      res.json(serializeDuel(updatedDuel));
    } catch (error) {
      console.error("Error cancelling duel:", error);
      res.status(500).json({ message: "Failed to cancel duel" });
    }
  });

  app.post("/api/duels/:id/settle", async (req, res) => {
    try {
      const duelId = req.params.id as string;

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

      const endPrice = await fetchPrice(duel.assetId);
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

      res.json(serializeDuel(settledDuel));
    } catch (error) {
      console.error("Error settling duel:", error);
      res.status(500).json({ message: "Failed to settle duel" });
    }
  });

  app.get("/api/duels/price/:assetId", async (req, res) => {
    try {
      const price = await fetchPrice(req.params.assetId);
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

  // Price history using CoinGecko (Binance is geo-blocked from server)
  app.get("/api/duels/binance/klines/:assetId", async (req, res) => {
    try {
      const assetId = req.params.assetId;
      const coinId = COINGECKO_IDS[assetId];
      const symbol = BINANCE_SYMBOLS[assetId] || `${assetId}USDT`;
      
      if (!coinId) {
        return res.status(400).json({ message: `Unsupported asset: ${assetId}` });
      }
      
      // CoinGecko market chart - get last 1 day with 5 min intervals
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=1`
      );
      
      if (!response.ok) {
        return res.status(400).json({ message: `Failed to fetch history for ${assetId}` });
      }
      
      const data = await response.json();
      
      if (data.prices && Array.isArray(data.prices)) {
        // CoinGecko returns [timestamp, price] pairs
        // Sample every 5th point to reduce data and simulate OHLC
        const sampled = data.prices.filter((_: any, i: number) => i % 5 === 0);
        const klines = sampled.map((p: [number, number], i: number) => {
          const price = p[1];
          const prevPrice = i > 0 ? sampled[i - 1][1] : price;
          // Simulate OHLC with small variation
          const variation = price * 0.001;
          return {
            timestamp: p[0],
            open: prevPrice,
            high: Math.max(price, prevPrice) + variation,
            low: Math.min(price, prevPrice) - variation,
            close: price,
            volume: 0
          };
        });
        res.json({ symbol, klines: klines.slice(-60) }); // Last 60 points
      } else {
        res.status(400).json({ message: "Failed to fetch price history" });
      }
    } catch (error) {
      console.error("Error fetching price history:", error);
      res.status(500).json({ message: "Failed to fetch price history" });
    }
  });

  // Price ticker using CoinGecko with caching (Binance is geo-blocked from server)
  app.get("/api/duels/binance/ticker/:assetId", async (req, res) => {
    try {
      const assetId = req.params.assetId;
      const coinId = COINGECKO_IDS[assetId];
      const symbol = BINANCE_SYMBOLS[assetId] || `${assetId}USDT`;
      
      if (!coinId) {
        return res.status(400).json({ message: `Unsupported asset: ${assetId}` });
      }
      
      // Check cache first
      const cached = priceCache[assetId];
      const now = Date.now();
      if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
        return res.json({ 
          symbol, 
          price: cached.price,
          priceScaled: Math.floor(cached.price * 1e8).toString(),
          timestamp: cached.timestamp,
          cached: true
        });
      }
      
      // Fetch from CoinGecko with retry
      let price: number | null = null;
      let retries = 3;
      
      while (retries > 0 && price === null) {
        try {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data[coinId]?.usd) {
              price = data[coinId].usd;
            }
          } else if (response.status === 429) {
            // Rate limited - wait and retry
            console.log(`CoinGecko rate limited for ${assetId}, retrying...`);
            await new Promise(r => setTimeout(r, 1000));
          }
        } catch (e) {
          console.error(`Fetch attempt failed for ${assetId}:`, e);
        }
        retries--;
      }
      
      // If still no price, use cached value even if stale
      if (price === null && cached) {
        console.log(`Using stale cache for ${assetId}`);
        return res.json({ 
          symbol, 
          price: cached.price,
          priceScaled: Math.floor(cached.price * 1e8).toString(),
          timestamp: cached.timestamp,
          cached: true,
          stale: true
        });
      }
      
      if (price !== null) {
        // Update cache
        priceCache[assetId] = { price, timestamp: now };
        
        res.json({ 
          symbol, 
          price,
          priceScaled: Math.floor(price * 1e8).toString(),
          timestamp: now 
        });
      } else {
        res.status(400).json({ message: "Failed to fetch price from CoinGecko" });
      }
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

  // Sync on-chain duel creation with database
  app.post("/api/duels/sync-create", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const { 
        onChainDuelId, 
        txHash, 
        assetId, 
        assetName, 
        durationSec, 
        stakeWei, 
        stakeDisplay, 
        creatorOnChainAgentId, 
        direction 
      } = req.body;

      if (!onChainDuelId || !txHash) {
        return res.status(400).json({ message: "Missing on-chain duel ID or transaction hash" });
      }

      const agent = await storage.getAgentByAddress(walletAddress);

      const duel = await storage.createDuel({
        onChainDuelId: BigInt(onChainDuelId),
        createTxHash: txHash,
        assetId,
        assetName,
        durationSec: parseInt(durationSec),
        stakeWei,
        stakeDisplay,
        creatorAddress: walletAddress,
        creatorAgentId: agent?.id || null,
        creatorOnChainAgentId: BigInt(creatorOnChainAgentId),
        creatorDirection: direction,
      });

      res.status(201).json(serializeDuel(duel));
    } catch (error) {
      console.error("Error syncing on-chain duel creation:", error);
      res.status(500).json({ message: "Failed to sync on-chain duel" });
    }
  });

  // Sync on-chain duel join with database
  app.post("/api/duels/:id/sync-join", authMiddleware, async (req, res) => {
    try {
      const walletAddress = req.walletAddress!;
      const duelId = req.params.id as string;
      const { txHash, joinerOnChainAgentId, startPrice } = req.body;

      if (!txHash) {
        return res.status(400).json({ message: "Missing transaction hash" });
      }

      const duel = await storage.getDuel(duelId);
      if (!duel) {
        return res.status(404).json({ message: "Duel not found" });
      }

      const agent = await storage.getAgentByAddress(walletAddress);
      const joinerDirection = duel.creatorDirection === "up" ? "down" : "up";
      const now = new Date();
      const endTs = new Date(now.getTime() + duel.durationSec * 1000);

      // Fetch current Binance price for accurate start price
      let finalStartPrice = startPrice;
      if (!startPrice) {
        finalStartPrice = await fetchPrice(duel.assetId);
      }

      const updatedDuel = await storage.updateDuel(duelId, {
        joinerAddress: walletAddress,
        joinerAgentId: agent?.id || null,
        joinerOnChainAgentId: joinerOnChainAgentId ? BigInt(joinerOnChainAgentId) : null,
        joinerDirection,
        startPrice: finalStartPrice,
        startTs: now,
        endTs,
        status: "live",
        joinTxHash: txHash,
      });

      res.json(serializeDuel(updatedDuel));
    } catch (error) {
      console.error("Error syncing on-chain duel join:", error);
      res.status(500).json({ message: "Failed to sync on-chain join" });
    }
  });

  // Sync on-chain settlement with database
  app.post("/api/duels/:id/sync-settle", authMiddleware, async (req, res) => {
    try {
      const duelId = req.params.id as string;
      const { txHash, endPrice, winnerAddress } = req.body;

      if (!txHash) {
        return res.status(400).json({ message: "Missing transaction hash" });
      }

      const duel = await storage.getDuel(duelId);
      if (!duel) {
        return res.status(404).json({ message: "Duel not found" });
      }

      if (duel.status !== "live") {
        return res.status(400).json({ message: "Duel is not live" });
      }

      // Fetch current price for end price if not provided
      let finalEndPrice = endPrice;
      if (!endPrice) {
        finalEndPrice = await fetchPrice(duel.assetId);
      }

      // Calculate winner based on price movement
      const startPriceNum = parseFloat(duel.startPrice || "0");
      const endPriceNum = parseFloat(finalEndPrice);
      const priceWentUp = endPriceNum > startPriceNum;
      
      let calculatedWinner: string | null = null;
      if (startPriceNum === endPriceNum) {
        // Draw - no winner (refund handled by contract)
        calculatedWinner = null;
      } else if (priceWentUp) {
        // Price went up - whoever bet "up" wins
        calculatedWinner = duel.creatorDirection === "up" ? duel.creatorAddress : duel.joinerAddress;
      } else {
        // Price went down - whoever bet "down" wins
        calculatedWinner = duel.creatorDirection === "down" ? duel.creatorAddress : duel.joinerAddress;
      }

      // Calculate payout (90% of total pot)
      const stakeWei = BigInt(duel.stakeWei);
      const totalPot = stakeWei * BigInt(2);
      const feeWei = (totalPot * BigInt(FEE_PERCENTAGE)) / BigInt(100);
      const payoutWei = totalPot - feeWei;

      const updatedDuel = await storage.updateDuel(duelId, {
        endPrice: finalEndPrice,
        status: "settled",
        winnerAddress: winnerAddress || calculatedWinner,
        payoutWei: payoutWei.toString(),
        feeWei: feeWei.toString(),
        settlementTxHash: txHash,
      });

      res.json(serializeDuel(updatedDuel));
    } catch (error) {
      console.error("Error syncing on-chain settlement:", error);
      res.status(500).json({ message: "Failed to sync settlement" });
    }
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

async function fetchPrice(assetId: string): Promise<string> {
  const coinId = COINGECKO_IDS[assetId];
  
  if (coinId) {
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
      const data = await response.json();
      
      if (data[coinId]?.usd) {
        const price = data[coinId].usd;
        return Math.floor(price * 1e8).toString();
      }
    } catch (error) {
      console.error(`Failed to fetch CoinGecko price for ${assetId}:`, error);
    }
  }
  
  // Fallback to base prices if CoinGecko API fails
  const basePrice = basePrices[assetId] || 100;
  return Math.floor(basePrice * 1e8).toString();
}

function formatPrice(priceStr: string): string {
  const price = parseFloat(priceStr) / 1e8;
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

// Sync on-chain duel creation with database
export async function syncOnChainDuelCreation(
  onChainDuelId: bigint,
  txHash: string,
  assetId: string,
  assetName: string,
  durationSec: number,
  stakeWei: string,
  stakeDisplay: string,
  creatorAddress: string,
  creatorAgentId: string | null,
  creatorOnChainAgentId: bigint,
  creatorDirection: string,
) {
  return storage.createDuel({
    onChainDuelId,
    createTxHash: txHash,
    assetId,
    assetName,
    durationSec,
    stakeWei,
    stakeDisplay,
    creatorAddress,
    creatorAgentId,
    creatorOnChainAgentId,
    creatorDirection,
  });
}

// Sync on-chain duel join with database
export async function syncOnChainDuelJoin(
  duelDbId: string,
  joinerAddress: string,
  joinerAgentId: string | null,
  joinerOnChainAgentId: bigint,
  startPrice: string,
  txHash: string,
) {
  const duel = await storage.getDuel(duelDbId);
  if (!duel) throw new Error("Duel not found");
  
  const joinerDirection = duel.creatorDirection === "up" ? "down" : "up";
  const now = new Date();
  const endTs = new Date(now.getTime() + duel.durationSec * 1000);
  
  return storage.updateDuel(duelDbId, {
    joinerAddress,
    joinerAgentId,
    joinerOnChainAgentId,
    joinerDirection,
    startPrice,
    startTs: now,
    endTs,
    status: "live",
    joinTxHash: txHash,
  });
}
