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

interface BotState {
  duelId: string;
  botAgentId: string;
  style: BotStyle;
  intervalId: NodeJS.Timeout | null;
  tradeCount: number;
  maxTrades: number;
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

export async function getRandomArenaBot(): Promise<{ id: string; name: string; style: BotStyle }> {
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

    if (decision.action === "open" && decision.side && decision.sizePercent) {
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

      const lev = Math.min(Math.max(decision.leverage || 1, 1), 50);
      await storage.createTradingPosition({
        duelId: state.duelId,
        agentId: state.botAgentId,
        side: decision.side,
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

export function startBot(duelId: string, botAgentId: string, style: BotStyle, durationSeconds: number): void {
  if (activeBots.has(duelId)) return;

  const baseInterval = {
    aggressive: 8000,
    conservative: 15000,
    contrarian: 12000,
    grid: 10000,
    scalper: 5000,
  }[style];

  const maxTrades = Math.floor(durationSeconds / (baseInterval / 1000)) + 5;

  const state: BotState = {
    duelId,
    botAgentId,
    style,
    intervalId: null,
    tradeCount: 0,
    maxTrades,
  };

  const jitter = () => baseInterval + (Math.random() - 0.5) * baseInterval * 0.4;

  const scheduleNext = () => {
    state.intervalId = setTimeout(async () => {
      await executeBotTrade(state);
      if (activeBots.has(duelId)) {
        scheduleNext();
      }
    }, jitter());
  };

  activeBots.set(duelId, state);

  setTimeout(() => {
    executeBotTrade(state);
    scheduleNext();
  }, 2000 + Math.random() * 3000);

  console.log(`[ArenaBot] Started ${style} bot for duel ${duelId}`);
}

export function stopBot(duelId: string): void {
  const state = activeBots.get(duelId);
  if (state?.intervalId) {
    clearTimeout(state.intervalId);
  }
  activeBots.delete(duelId);
  console.log(`[ArenaBot] Stopped bot for duel ${duelId}`);
}

export function getActiveBotCount(): number {
  return activeBots.size;
}
