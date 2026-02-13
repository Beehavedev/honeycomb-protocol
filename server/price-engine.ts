import { storage } from "./storage";

function seededRng(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  let s = Math.abs(h) || 1;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

export interface PriceTick {
  idx: number;
  price: number;
  ts: number;
  volume: number;
}

export interface PriceSeriesConfig {
  startPrice: number;
  volatility: number;
  drift: number;
  tickIntervalMs: number;
  totalTicks: number;
}

const ASSET_DEFAULTS: Record<string, Partial<PriceSeriesConfig>> = {
  BTCUSDT: { startPrice: 65000, volatility: 0.002, drift: 0.00001 },
  BNBUSDT: { startPrice: 600, volatility: 0.003, drift: 0.00002 },
  ETHUSDT: { startPrice: 3500, volatility: 0.0025, drift: 0.00001 },
  SOLUSDT: { startPrice: 180, volatility: 0.004, drift: 0.00003 },
  DOGEUSDT: { startPrice: 0.15, volatility: 0.005, drift: 0 },
};

export function generatePriceSeries(
  seed: string,
  asset: string,
  durationSeconds: number,
  tickIntervalMs: number = 500
): PriceTick[] {
  const rng = seededRng(seed);
  const defaults = ASSET_DEFAULTS[asset] || ASSET_DEFAULTS.BTCUSDT;
  const startPrice = defaults.startPrice || 65000;
  const volatility = defaults.volatility || 0.002;
  const drift = defaults.drift || 0;
  const totalTicks = Math.ceil((durationSeconds * 1000) / tickIntervalMs);

  const ticks: PriceTick[] = [];
  let price = startPrice;
  const now = Date.now();

  let trendDirection = rng() > 0.5 ? 1 : -1;
  let trendStrength = 0.3 + rng() * 0.4;
  let trendDuration = Math.floor(10 + rng() * 30);
  let ticksInTrend = 0;

  for (let i = 0; i < totalTicks; i++) {
    ticksInTrend++;
    if (ticksInTrend >= trendDuration) {
      trendDirection = rng() > 0.45 ? 1 : -1;
      trendStrength = 0.2 + rng() * 0.5;
      trendDuration = Math.floor(8 + rng() * 40);
      ticksInTrend = 0;
    }

    const randomComponent = (rng() - 0.5) * 2 * volatility;
    const trendComponent = trendDirection * trendStrength * volatility * 0.3;
    const driftComponent = drift;

    const jumpChance = rng();
    let jumpComponent = 0;
    if (jumpChance > 0.98) {
      jumpComponent = (rng() - 0.5) * volatility * 5;
    }

    const change = randomComponent + trendComponent + driftComponent + jumpComponent;
    price = price * (1 + change);
    price = Math.max(price * 0.5, Math.min(price * 1.5, price));

    const volume = 100 + rng() * 900 + (Math.abs(change) / volatility) * 500;

    ticks.push({
      idx: i,
      price: parseFloat(price.toFixed(asset === "DOGEUSDT" ? 6 : 2)),
      ts: now + i * tickIntervalMs,
      volume: parseFloat(volume.toFixed(2)),
    });
  }

  return ticks;
}

export function generateSeed(duelId: string): string {
  return `honeycomb-duel-${duelId}-${Date.now()}`;
}

interface ActiveDuelFeed {
  duelId: string;
  ticks: PriceTick[];
  currentIdx: number;
  intervalId: NodeJS.Timeout | null;
  subscribers: Set<(tick: PriceTick) => void>;
  startTime: number;
  tickIntervalMs: number;
}

const activeFeeds = new Map<string, ActiveDuelFeed>();

export function startPriceFeed(
  duelId: string,
  ticks: PriceTick[],
  tickIntervalMs: number = 500
): ActiveDuelFeed {
  if (activeFeeds.has(duelId)) {
    return activeFeeds.get(duelId)!;
  }

  const feed: ActiveDuelFeed = {
    duelId,
    ticks,
    currentIdx: 0,
    intervalId: null,
    subscribers: new Set(),
    startTime: Date.now(),
    tickIntervalMs,
  };

  feed.intervalId = setInterval(() => {
    if (feed.currentIdx >= feed.ticks.length) {
      stopPriceFeed(duelId);
      return;
    }

    const tick = feed.ticks[feed.currentIdx];
    feed.currentIdx++;

    for (const cb of feed.subscribers) {
      try {
        cb(tick);
      } catch (err) {
        console.error(`[PriceEngine] Subscriber error for duel ${duelId}:`, err);
      }
    }
  }, tickIntervalMs);

  activeFeeds.set(duelId, feed);
  console.log(`[PriceEngine] Started feed for duel ${duelId} (${ticks.length} ticks, ${tickIntervalMs}ms interval)`);
  return feed;
}

export function stopPriceFeed(duelId: string): void {
  const feed = activeFeeds.get(duelId);
  if (feed) {
    if (feed.intervalId) clearInterval(feed.intervalId);
    feed.subscribers.clear();
    activeFeeds.delete(duelId);
    console.log(`[PriceEngine] Stopped feed for duel ${duelId}`);
  }
}

export function subscribeToPriceFeed(
  duelId: string,
  callback: (tick: PriceTick) => void
): () => void {
  const feed = activeFeeds.get(duelId);
  if (!feed) return () => {};

  feed.subscribers.add(callback);
  return () => feed.subscribers.delete(callback);
}

export function getCurrentPrice(duelId: string): PriceTick | null {
  const feed = activeFeeds.get(duelId);
  if (!feed || feed.currentIdx === 0) return null;
  return feed.ticks[feed.currentIdx - 1];
}

export function getFullSeries(duelId: string): PriceTick[] {
  const feed = activeFeeds.get(duelId);
  if (!feed) return [];
  return feed.ticks;
}

export function getHistorySoFar(duelId: string): PriceTick[] {
  const feed = activeFeeds.get(duelId);
  if (!feed) return [];
  return feed.ticks.slice(0, feed.currentIdx);
}

export function isFeedActive(duelId: string): boolean {
  return activeFeeds.has(duelId);
}

export async function initDuelPriceFeed(duelId: string, asset: string, durationSeconds: number): Promise<PriceTick[]> {
  const seed = generateSeed(duelId);
  const ticks = generatePriceSeries(seed, asset, durationSeconds);

  try {
    await storage.updateTradingDuel(duelId, {
      seed,
      priceSeries: JSON.stringify(ticks),
    });
  } catch (err) {
    console.error(`[PriceEngine] Failed to persist price series for duel ${duelId}:`, err);
  }

  return ticks;
}
