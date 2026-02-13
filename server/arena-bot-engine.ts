import { storage } from "./storage";
import { db } from "./db";
import { agents, tradingDuels } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const ARENA_BOT_PROFILES = [
  { name: "AlphaHunter", bio: "Aggressive momentum trader. Rides trends hard with high leverage.", style: "aggressive" as const, ownerAddress: "0xARENA_BOT_0001000000000000000000000000000001" },
  { name: "SteadyEdge", bio: "Patient value trader. Waits for the perfect entry, uses moderate leverage.", style: "conservative" as const, ownerAddress: "0xARENA_BOT_0002000000000000000000000000000002" },
  { name: "SwingMaster", bio: "Contrarian swing trader. Bets against the crowd at key reversals.", style: "contrarian" as const, ownerAddress: "0xARENA_BOT_0003000000000000000000000000000003" },
  { name: "GridRunner", bio: "Systematic grid trader. Opens positions at regular intervals.", style: "grid" as const, ownerAddress: "0xARENA_BOT_0004000000000000000000000000000004" },
  { name: "ScalpKing", bio: "Fast scalper. Small positions, quick profits, high frequency.", style: "scalper" as const, ownerAddress: "0xARENA_BOT_0005000000000000000000000000000005" },
];

type BotStyle = "aggressive" | "conservative" | "contrarian" | "grid" | "scalper";
export type BotDifficulty = "easy" | "normal" | "degen";
export type BotStrategy = "momentum" | "mean_reversion" | "random";

const DIFFICULTY_SETTINGS: Record<BotDifficulty, { reactionMultiplier: number; accuracyBonus: number; leverageCap: number; tradeFrequency: number }> = {
  easy: { reactionMultiplier: 2.0, accuracyBonus: -0.15, leverageCap: 5, tradeFrequency: 0.5 },
  normal: { reactionMultiplier: 1.0, accuracyBonus: 0, leverageCap: 20, tradeFrequency: 1.0 },
  degen: { reactionMultiplier: 0.5, accuracyBonus: 0.15, leverageCap: 50, tradeFrequency: 1.5 },
};

interface BotState {
  duelId: string;
  botKey: string;
  botAgentId: string;
  style: BotStyle;
  difficulty: BotDifficulty;
  strategy: BotStrategy;
  intervalId: NodeJS.Timeout | null;
  tradeCount: number;
  maxTrades: number;
  priceHistory: number[];
}

const activeBots = new Map<string, BotState>();

export async function ensureArenaBots(): Promise<void> {
  for (const profile of ARENA_BOT_PROFILES) {
    const existing = await db.select().from(agents).where(eq(agents.ownerAddress, profile.ownerAddress)).limit(1);
    if (existing.length === 0) {
      await db.insert(agents).values({
        name: profile.name,
        bio: profile.bio,
        ownerAddress: profile.ownerAddress,
        isBot: true,
        capabilities: ["trading", "arena"],
      });
      console.log(`[ArenaBot] Created bot: ${profile.name}`);
    }
  }
}

export async function getRandomArenaBot(excludeId?: string): Promise<{ id: string; name: string; style: BotStyle }> {
  if (excludeId) {
    const allBots = await Promise.all(ARENA_BOT_PROFILES.map(async (p) => {
      const [bot] = await db.select().from(agents).where(eq(agents.ownerAddress, p.ownerAddress)).limit(1);
      return bot ? { id: bot.id, name: bot.name, style: p.style } : null;
    }));
    const eligible = allBots.filter((b): b is NonNullable<typeof b> => b !== null && b.id !== excludeId);
    if (eligible.length > 0) {
      return eligible[Math.floor(Math.random() * eligible.length)];
    }
  }
  const profile = ARENA_BOT_PROFILES[Math.floor(Math.random() * ARENA_BOT_PROFILES.length)];
  const [bot] = await db.select().from(agents).where(eq(agents.ownerAddress, profile.ownerAddress)).limit(1);
  if (!bot) throw new Error("Arena bot not found - run ensureArenaBots first");
  return { id: bot.id, name: bot.name, style: profile.style };
}

export function isArenaBot(agentId: string): boolean {
  return activeBots.has(agentId) || false;
}

export function getArenaBotAddresses(): string[] {
  return ARENA_BOT_PROFILES.map(p => p.ownerAddress);
}

export async function isArenaBotAgent(agentId: string): Promise<boolean> {
  const [agent] = await db.select({ ownerAddress: agents.ownerAddress }).from(agents).where(eq(agents.id, agentId)).limit(1);
  if (!agent) return false;
  return ARENA_BOT_PROFILES.some(p => p.ownerAddress === agent.ownerAddress);
}

const KRAKEN_BOT_MAP: Record<string, string> = {
  BTCUSDT: "XBTUSD", ETHUSDT: "ETHUSD", SOLUSDT: "SOLUSD", BNBUSDT: "BNBUSD",
  DOGEUSDT: "DOGEUSD", XRPUSDT: "XRPUSD",
};

async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  const controller1 = new AbortController();
  const t1 = setTimeout(() => controller1.abort(), 3000);
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, { signal: controller1.signal });
    clearTimeout(t1);
    const data = await res.json() as any;
    if (data.price) return parseFloat(data.price);
  } catch {}

  const controller2 = new AbortController();
  const t2 = setTimeout(() => controller2.abort(), 3000);
  try {
    const res = await fetch(`https://api.binance.us/api/v3/ticker/price?symbol=${symbol}`, { signal: controller2.signal });
    clearTimeout(t2);
    const data = await res.json() as any;
    if (data.price) return parseFloat(data.price);
  } catch {}

  const krakenSym = KRAKEN_BOT_MAP[symbol];
  if (krakenSym) {
    const controller3 = new AbortController();
    const t3 = setTimeout(() => controller3.abort(), 3000);
    try {
      const res = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${krakenSym}`, { signal: controller3.signal });
      clearTimeout(t3);
      const data = await res.json() as any;
      const pair = Object.keys(data.result || {})[0];
      if (pair && data.result[pair]?.c?.[0]) return parseFloat(data.result[pair].c[0]);
    } catch {}
  }

  const base = symbol.replace("USDT", "");
  const controller4 = new AbortController();
  const t4 = setTimeout(() => controller4.abort(), 3000);
  try {
    const res = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${base}&tsyms=USD`, { signal: controller4.signal });
    clearTimeout(t4);
    const data = await res.json() as any;
    if (data?.USD) return data.USD;
  } catch {}

  return null;
}

function getStrategyDecision(
  strategy: BotStrategy,
  priceHistory: number[],
  difficulty: BotDifficulty
): { bias: "long" | "short" | "neutral"; confidence: number } {
  const settings = DIFFICULTY_SETTINGS[difficulty];

  if (priceHistory.length < 3) return { bias: "neutral", confidence: 0.5 };

  if (strategy === "momentum") {
    const lookback = Math.min(priceHistory.length, 8);
    const recent = priceHistory.slice(-lookback);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const change = (last - first) / first;

    let trendStrength = Math.min(Math.abs(change) * 100, 1);
    trendStrength = Math.min(1, trendStrength + settings.accuracyBonus);

    if (change > 0.0005) return { bias: "long", confidence: 0.5 + trendStrength * 0.4 };
    if (change < -0.0005) return { bias: "short", confidence: 0.5 + trendStrength * 0.4 };
    return { bias: "neutral", confidence: 0.5 };
  }

  if (strategy === "mean_reversion") {
    const lookback = Math.min(priceHistory.length, 15);
    const recent = priceHistory.slice(-lookback);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const last = recent[recent.length - 1];
    const deviation = (last - avg) / avg;

    let confidence = Math.min(Math.abs(deviation) * 50, 1);
    confidence = Math.min(1, confidence + settings.accuracyBonus);

    if (deviation > 0.002) return { bias: "short", confidence: 0.5 + confidence * 0.4 };
    if (deviation < -0.002) return { bias: "long", confidence: 0.5 + confidence * 0.4 };
    return { bias: "neutral", confidence: 0.5 };
  }

  return { bias: Math.random() > 0.5 ? "long" : "short", confidence: 0.5 };
}

function getBotDecision(style: BotStyle, tradeCount: number, maxTrades: number): { action: "open" | "close" | "wait"; side?: "long" | "short"; leverage?: number; sizePercent?: number } {
  const progress = tradeCount / maxTrades;
  const rand = Math.random();

  switch (style) {
    case "aggressive":
      if (progress < 0.3 && rand < 0.8) return { action: "open", side: rand < 0.55 ? "long" : "short", leverage: Math.ceil(Math.random() * 20 + 10), sizePercent: 30 + Math.floor(Math.random() * 40) };
      if (rand < 0.4) return { action: "close" };
      if (rand < 0.7) return { action: "open", side: rand < 0.5 ? "long" : "short", leverage: Math.ceil(Math.random() * 15 + 5), sizePercent: 20 + Math.floor(Math.random() * 30) };
      return { action: "wait" };

    case "conservative":
      if (progress < 0.2 && rand < 0.6) return { action: "open", side: "long", leverage: Math.ceil(Math.random() * 3 + 1), sizePercent: 15 + Math.floor(Math.random() * 20) };
      if (rand < 0.3) return { action: "open", side: rand < 0.6 ? "long" : "short", leverage: Math.ceil(Math.random() * 5), sizePercent: 10 + Math.floor(Math.random() * 15) };
      if (progress > 0.7 && rand < 0.5) return { action: "close" };
      return { action: "wait" };

    case "contrarian":
      if (rand < 0.5) return { action: "open", side: rand < 0.4 ? "long" : "short", leverage: Math.ceil(Math.random() * 10 + 3), sizePercent: 20 + Math.floor(Math.random() * 30) };
      if (rand < 0.7) return { action: "close" };
      return { action: "wait" };

    case "grid":
      if (tradeCount % 2 === 0 && rand < 0.7) return { action: "open", side: tradeCount % 4 < 2 ? "long" : "short", leverage: 5, sizePercent: 15 };
      if (tradeCount % 2 === 1 && rand < 0.5) return { action: "close" };
      return { action: "wait" };

    case "scalper":
      if (rand < 0.6) return { action: "open", side: rand < 0.5 ? "long" : "short", leverage: Math.ceil(Math.random() * 10 + 2), sizePercent: 5 + Math.floor(Math.random() * 15) };
      if (rand < 0.85) return { action: "close" };
      return { action: "wait" };

    default:
      return { action: "wait" };
  }
}

async function executeBotTrade(state: BotState): Promise<void> {
  try {
    const duel = await storage.getTradingDuel(state.duelId);
    if (!duel || duel.status !== "active") {
      stopBot(state.duelId);
      return;
    }

    if (duel.endsAt && new Date() >= new Date(duel.endsAt)) {
      stopBot(state.duelId);
      return;
    }

    const price = await fetchCurrentPrice(duel.assetSymbol);
    if (!price) return;

    state.priceHistory.push(price);
    if (state.priceHistory.length > 30) state.priceHistory.shift();

    const settings = DIFFICULTY_SETTINGS[state.difficulty];
    const strategyHint = getStrategyDecision(state.strategy, state.priceHistory, state.difficulty);

    const tradeChance = Math.random();
    if (tradeChance > settings.tradeFrequency * 0.7) {
      const decision = getBotDecision(state.style, state.tradeCount, state.maxTrades);
      if (decision.action === "wait") return;
    }

    const decision = getBotDecision(state.style, state.tradeCount, state.maxTrades);

    if (decision.action === "wait") return;

    if (decision.action === "close") {
      const openPositions = await storage.getOpenTradingPositions(state.duelId, state.botAgentId);
      if (openPositions.length === 0) return;

      const pos = openPositions[Math.floor(Math.random() * openPositions.length)];
      const entry = parseFloat(pos.entryPrice);
      const size = parseFloat(pos.sizeUsdt);
      let pnl: number;
      if (pos.side === "long") {
        pnl = ((price - entry) / entry) * size * pos.leverage;
      } else {
        pnl = ((entry - price) / entry) * size * pos.leverage;
      }
      await storage.closeTradingPosition(pos.id, price.toString(), pnl.toFixed(2));
      state.tradeCount++;
      return;
    }

    if (decision.action === "open" && decision.sizePercent) {
      const side = strategyHint.bias !== "neutral" ? strategyHint.bias : (decision.side || "long");

      const openPositions = await storage.getOpenTradingPositions(state.duelId, state.botAgentId);
      const allPositions = await storage.getTradingPositions(state.duelId, state.botAgentId);
      const initialBal = parseFloat(duel.initialBalance);
      let usedBalance = 0;
      for (const p of openPositions) usedBalance += parseFloat(p.sizeUsdt);
      let realizedPnl = 0;
      for (const p of allPositions) {
        if (!p.isOpen && p.pnl) realizedPnl += parseFloat(p.pnl);
      }
      const available = initialBal + realizedPnl - usedBalance;
      const sizeUsdt = Math.min(available * (decision.sizePercent / 100), available * 0.9);
      if (sizeUsdt < 1000) return;

      const rawLev = decision.leverage || 1;
      const lev = Math.min(Math.max(rawLev, 1), settings.leverageCap);
      await storage.createTradingPosition({
        duelId: state.duelId,
        agentId: state.botAgentId,
        side,
        leverage: lev,
        sizeUsdt: sizeUsdt.toFixed(2),
        entryPrice: price.toString(),
      });
      state.tradeCount++;
    }
  } catch (err) {
    console.error(`[ArenaBot] Trade error for duel ${state.duelId}:`, err);
  }
}

export function startBot(
  botKey: string,
  botAgentId: string,
  style: BotStyle,
  durationSeconds: number,
  difficulty: BotDifficulty = "normal",
  strategy: BotStrategy = "momentum"
): void {
  if (activeBots.has(botKey)) return;

  const realDuelId = botKey.includes("__") ? botKey.split("__")[0] : botKey;
  const settings = DIFFICULTY_SETTINGS[difficulty];

  const baseInterval = {
    aggressive: 8000,
    conservative: 15000,
    contrarian: 12000,
    grid: 10000,
    scalper: 5000,
  }[style];

  const adjustedInterval = Math.round(baseInterval * settings.reactionMultiplier);
  const maxTrades = Math.floor(durationSeconds / (adjustedInterval / 1000)) + 5;

  const state: BotState = {
    duelId: realDuelId,
    botKey,
    botAgentId,
    style,
    difficulty,
    strategy,
    intervalId: null,
    tradeCount: 0,
    maxTrades,
    priceHistory: [],
  };

  const jitter = () => adjustedInterval + (Math.random() - 0.5) * adjustedInterval * 0.4;

  const scheduleNext = () => {
    state.intervalId = setTimeout(async () => {
      await executeBotTrade(state);
      if (activeBots.has(botKey)) {
        scheduleNext();
      }
    }, jitter());
  };

  activeBots.set(botKey, state);

  setTimeout(() => {
    executeBotTrade(state);
    scheduleNext();
  }, 2000 + Math.random() * 3000);

  console.log(`[ArenaBot] Started ${style} bot for duel ${realDuelId} (key: ${botKey})`);
}

export function stopBot(botKey: string): void {
  const state = activeBots.get(botKey);
  if (state?.intervalId) {
    clearTimeout(state.intervalId);
  }
  activeBots.delete(botKey);
}

export function getActiveBotCount(): number {
  return activeBots.size;
}
