import { storage } from "./storage";
import { db } from "./db";
import { agents } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getRandomArenaBot, startBot, stopBot } from "./arena-bot-engine";

const SPAWN_INTERVAL = 2 * 60 * 1000;
const DUEL_DURATION_OPTIONS = [120, 180, 240, 300];
const ASSET_OPTIONS = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT"];
const MAX_CONCURRENT_AUTO_DUELS = 3;

const activeAutoDuels = new Set<string>();
let spawnerInterval: ReturnType<typeof setInterval> | null = null;

async function getTwoDifferentBots(): Promise<{ bot1: { id: string; name: string; style: any }; bot2: { id: string; name: string; style: any } }> {
  const bot1 = await getRandomArenaBot();
  let bot2 = await getRandomArenaBot(bot1.id);
  if (bot2.id === bot1.id) {
    bot2 = await getRandomArenaBot(bot1.id);
  }
  return { bot1, bot2 };
}

async function spawnAutoDuel(): Promise<void> {
  try {
    if (activeAutoDuels.size >= MAX_CONCURRENT_AUTO_DUELS) {
      return;
    }

    const { bot1, bot2 } = await getTwoDifferentBots();
    const asset = ASSET_OPTIONS[Math.floor(Math.random() * ASSET_OPTIONS.length)];
    const duration = DUEL_DURATION_OPTIONS[Math.floor(Math.random() * DUEL_DURATION_OPTIONS.length)];

    const duel = await storage.createTradingDuel({
      creatorId: bot1.id,
      assetSymbol: asset,
      potAmount: "0",
      durationSeconds: duration,
      matchType: "ava",
    });

    const joined = await storage.joinTradingDuel(duel.id, bot2.id);
    const started = await storage.startTradingDuel(joined.id);

    activeAutoDuels.add(started.id);

    startBot(started.id, bot1.id, bot1.style, duration);
    startBot(`${started.id}__p2`, bot2.id, bot2.style, duration);

    const settlementDelay = (duration + 5) * 1000;
    setTimeout(async () => {
      try {
        await autoSettleDuel(started.id);
      } catch (err) {
        console.error(`[AutoDuel] Settlement error for ${started.id}:`, err);
      } finally {
        activeAutoDuels.delete(started.id);
      }
    }, settlementDelay);

    console.log(`[AutoDuel] Spawned: ${bot1.name} vs ${bot2.name} | ${asset} | ${duration}s | ID: ${started.id}`);
  } catch (err) {
    console.error("[AutoDuel] Spawn error:", err);
  }
}

async function autoSettleDuel(duelId: string): Promise<void> {
  const duel = await storage.getTradingDuel(duelId);
  if (!duel || duel.status !== "active") return;

  stopBot(duelId);
  stopBot(`${duelId}__p2`);

  let settlementPrice: number | null = null;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${duel.assetSymbol}`, { signal: controller.signal });
    clearTimeout(t);
    const data = await res.json() as any;
    if (data.price) settlementPrice = parseFloat(data.price);
  } catch {}

  if (!settlementPrice) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`https://api.binance.us/api/v3/ticker/price?symbol=${duel.assetSymbol}`, { signal: controller.signal });
      clearTimeout(t);
      const data = await res.json() as any;
      if (data.price) settlementPrice = parseFloat(data.price);
    } catch {}
  }

  if (!settlementPrice) {
    console.warn(`[AutoDuel] Cannot get price for ${duelId}, settling as draw`);
    await storage.settleTradingDuel(duelId, null, duel.initialBalance, duel.initialBalance);
    console.log(`[AutoDuel] Force-settled ${duelId} as draw (price unavailable)`);
    return;
  }

  const calcBalance = async (agentId: string) => {
    const positions = await storage.getTradingPositions(duelId, agentId);
    const initialBal = parseFloat(duel.initialBalance);
    let total = initialBal;
    for (const p of positions) {
      if (p.isOpen) {
        const entry = parseFloat(p.entryPrice);
        const size = parseFloat(p.sizeUsdt);
        let pnl: number;
        if (p.side === "long") {
          pnl = ((settlementPrice! - entry) / entry) * size * p.leverage;
        } else {
          pnl = ((entry - settlementPrice!) / entry) * size * p.leverage;
        }
        total += pnl;
        await storage.closeTradingPosition(p.id, settlementPrice!.toString(), pnl.toFixed(2));
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

  await storage.settleTradingDuel(duelId, winnerId, creatorFinal.toFixed(2), joinerFinal.toFixed(2));

  if (winnerId) {
    await storage.updateAgentArenaStats(duel.creatorId, winnerId === duel.creatorId);
    if (duel.joinerId) {
      await storage.updateAgentArenaStats(duel.joinerId, winnerId === duel.joinerId);
    }
  }

  console.log(`[AutoDuel] Settled ${duelId} | Winner: ${winnerId || "draw"} | Creator: $${creatorFinal.toFixed(0)} | Joiner: $${joinerFinal.toFixed(0)}`);
}

export function startAutoDuelSpawner(): void {
  if (spawnerInterval) return;

  setTimeout(() => {
    spawnAutoDuel();
  }, 10000);

  spawnerInterval = setInterval(() => {
    spawnAutoDuel();
  }, SPAWN_INTERVAL);

  console.log(`[AutoDuel] Spawner started - creating AvA duels every ${SPAWN_INTERVAL / 1000}s`);
}

export function stopAutoDuelSpawner(): void {
  if (spawnerInterval) {
    clearInterval(spawnerInterval);
    spawnerInterval = null;
  }
  console.log("[AutoDuel] Spawner stopped");
}

export function getAutoDuelStats(): { active: number; maxConcurrent: number; intervalMs: number } {
  return {
    active: activeAutoDuels.size,
    maxConcurrent: MAX_CONCURRENT_AUTO_DUELS,
    intervalMs: SPAWN_INTERVAL,
  };
}
