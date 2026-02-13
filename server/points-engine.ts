import { db } from "./db";
import { userPoints, pointsHistory, pointsConfig } from "@shared/schema";
import { eq, sql, and, gte, desc } from "drizzle-orm";
import { storage } from "./storage";

export interface GamePointsResult {
  awarded: boolean;
  basePoints: number;
  multiplier: number;
  finalPoints: number;
  reason?: string;
  newTotal: number;
  dailyEarned: number;
  dailyCap: number;
  weeklyEarned: number;
  weeklyCap: number;
  sessionsToday: number;
  diminishingActive: boolean;
}

interface GameSessionData {
  gameType: "honey_runner" | "trading_arena" | "trivia_battle" | "crypto_fighters";
  agentId: string;
  won?: boolean;
  score?: number;
  isBotMatch?: boolean;
  metadata?: Record<string, any>;
}

const DAILY_CAP = 500;
const WEEKLY_CAP = 3000;
const GLOBAL_DAILY_CAP = 1_500_000;
const DIMINISH_THRESHOLD_1 = 10;
const DIMINISH_THRESHOLD_2 = 20;
const DIMINISH_FACTOR_1 = 0.5;
const DIMINISH_FACTOR_2 = 0.1;

const GAME_REWARDS: Record<string, { base: number; winBonus: number; skillMax: number }> = {
  honey_runner:    { base: 20, winBonus: 0,  skillMax: 40 },
  trading_arena:   { base: 60, winBonus: 40, skillMax: 10 },
  trivia_battle:   { base: 30, winBonus: 20, skillMax: 15 },
  crypto_fighters: { base: 30, winBonus: 20, skillMax: 15 },
};

let globalDailyPoints = 0;
let globalDailyResetDate = new Date().toDateString();

function resetGlobalIfNewDay() {
  const today = new Date().toDateString();
  if (today !== globalDailyResetDate) {
    globalDailyPoints = 0;
    globalDailyResetDate = today;
  }
}

function calculateSkillBonus(gameType: string, data: GameSessionData): number {
  const rewards = GAME_REWARDS[gameType];
  if (!rewards) return 0;

  switch (gameType) {
    case "honey_runner": {
      const score = data.score || 0;
      return Math.min(Math.floor(score / 1000), rewards.skillMax);
    }
    case "trading_arena": {
      const clutch = data.metadata?.clutchFinish ? 10 : 0;
      return Math.min(clutch, rewards.skillMax);
    }
    case "trivia_battle": {
      const perfect = data.metadata?.perfectScore ? 15 : 0;
      return Math.min(perfect, rewards.skillMax);
    }
    case "crypto_fighters": {
      const flawless = data.metadata?.flawlessWin ? 15 : 0;
      return Math.min(flawless, rewards.skillMax);
    }
    default:
      return 0;
  }
}

async function getSessionCountToday(agentId: string, gameType: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const results = await db.select({ count: sql<number>`count(*)` })
    .from(pointsHistory)
    .where(
      and(
        eq(pointsHistory.agentId, agentId),
        eq(pointsHistory.action, `game_${gameType}`),
        gte(pointsHistory.createdAt, todayStart)
      )
    );

  return Number(results[0]?.count || 0);
}

async function getWeeklyEarned(agentId: string): Promise<number> {
  const weekStart = new Date();
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);

  const results = await db.select({ total: sql<number>`COALESCE(SUM(final_points), 0)` })
    .from(pointsHistory)
    .where(
      and(
        eq(pointsHistory.agentId, agentId),
        gte(pointsHistory.createdAt, weekStart)
      )
    );

  return Number(results[0]?.total || 0);
}

export async function awardGamePoints(data: GameSessionData): Promise<GamePointsResult> {
  const { gameType, agentId, won, isBotMatch } = data;

  if (isBotMatch) {
    return {
      awarded: false,
      basePoints: 0,
      multiplier: 1,
      finalPoints: 0,
      reason: "Bot/practice matches do not earn points",
      newTotal: 0,
      dailyEarned: 0,
      dailyCap: DAILY_CAP,
      weeklyEarned: 0,
      weeklyCap: WEEKLY_CAP,
      sessionsToday: 0,
      diminishingActive: false,
    };
  }

  const rewards = GAME_REWARDS[gameType];
  if (!rewards) {
    return {
      awarded: false,
      basePoints: 0,
      multiplier: 1,
      finalPoints: 0,
      reason: `Unknown game type: ${gameType}`,
      newTotal: 0,
      dailyEarned: 0,
      dailyCap: DAILY_CAP,
      weeklyEarned: 0,
      weeklyCap: WEEKLY_CAP,
      sessionsToday: 0,
      diminishingActive: false,
    };
  }

  resetGlobalIfNewDay();

  if (globalDailyPoints >= GLOBAL_DAILY_CAP) {
    return {
      awarded: false,
      basePoints: 0,
      multiplier: 1,
      finalPoints: 0,
      reason: "Global daily points cap reached. Try again tomorrow!",
      newTotal: 0,
      dailyEarned: 0,
      dailyCap: DAILY_CAP,
      weeklyEarned: 0,
      weeklyCap: WEEKLY_CAP,
      sessionsToday: 0,
      diminishingActive: false,
    };
  }

  let userPts = await storage.getUserPoints(agentId);
  if (!userPts) {
    userPts = await storage.createUserPoints(agentId);
  }

  const now = new Date();
  const resetTime = new Date(userPts.dailyCapResetAt);
  const isNewDay = now.toDateString() !== resetTime.toDateString();
  const currentDailyEarned = isNewDay ? 0 : userPts.dailyEarned;

  if (currentDailyEarned >= DAILY_CAP) {
    return {
      awarded: false,
      basePoints: 0,
      multiplier: 1,
      finalPoints: 0,
      reason: "Daily points cap reached (500/day). Come back tomorrow!",
      newTotal: userPts.totalPoints,
      dailyEarned: currentDailyEarned,
      dailyCap: DAILY_CAP,
      weeklyEarned: await getWeeklyEarned(agentId),
      weeklyCap: WEEKLY_CAP,
      sessionsToday: await getSessionCountToday(agentId, gameType),
      diminishingActive: false,
    };
  }

  const weeklyEarned = await getWeeklyEarned(agentId);
  if (weeklyEarned >= WEEKLY_CAP) {
    return {
      awarded: false,
      basePoints: 0,
      multiplier: 1,
      finalPoints: 0,
      reason: "Weekly points cap reached (3,000/week). Resets Monday!",
      newTotal: userPts.totalPoints,
      dailyEarned: currentDailyEarned,
      dailyCap: DAILY_CAP,
      weeklyEarned,
      weeklyCap: WEEKLY_CAP,
      sessionsToday: await getSessionCountToday(agentId, gameType),
      diminishingActive: false,
    };
  }

  let basePoints = rewards.base;
  if (won) basePoints += rewards.winBonus;
  basePoints += calculateSkillBonus(gameType, data);

  const sessionsToday = await getSessionCountToday(agentId, gameType);
  let diminishingActive = false;

  if (sessionsToday >= DIMINISH_THRESHOLD_2) {
    basePoints = Math.floor(basePoints * DIMINISH_FACTOR_2);
    diminishingActive = true;
  } else if (sessionsToday >= DIMINISH_THRESHOLD_1) {
    basePoints = Math.floor(basePoints * DIMINISH_FACTOR_1);
    diminishingActive = true;
  }

  if (basePoints <= 0) basePoints = 1;

  const remaining = Math.min(DAILY_CAP - currentDailyEarned, WEEKLY_CAP - weeklyEarned);
  if (basePoints > remaining) {
    basePoints = remaining;
  }

  const globalRemaining = GLOBAL_DAILY_CAP - globalDailyPoints;
  if (basePoints > globalRemaining) {
    basePoints = globalRemaining;
  }

  if (basePoints <= 0) {
    return {
      awarded: false,
      basePoints: 0,
      multiplier: 1,
      finalPoints: 0,
      reason: "Points cap reached",
      newTotal: userPts.totalPoints,
      dailyEarned: currentDailyEarned,
      dailyCap: DAILY_CAP,
      weeklyEarned,
      weeklyCap: WEEKLY_CAP,
      sessionsToday,
      diminishingActive,
    };
  }

  const earlyAdopter = await storage.getEarlyAdopter(agentId);
  const multiplier = earlyAdopter?.rewardMultiplier || 1;
  const finalPoints = Math.floor(basePoints * multiplier);

  const metadataStr = JSON.stringify({
    gameType,
    won: !!won,
    score: data.score,
    sessionsToday: sessionsToday + 1,
    diminishingActive,
    ...data.metadata,
  });

  const [history] = await db.insert(pointsHistory).values({
    agentId,
    action: `game_${gameType}`,
    points: basePoints,
    multiplier,
    finalPoints,
    referenceType: "game",
    metadata: metadataStr,
  }).returning();

  const newDailyEarned = currentDailyEarned + finalPoints;
  const newTotal = userPts.totalPoints + finalPoints;
  const newLifetime = userPts.lifetimePoints + finalPoints;

  await db.update(userPoints)
    .set({
      totalPoints: newTotal,
      lifetimePoints: newLifetime,
      dailyEarned: isNewDay ? finalPoints : newDailyEarned,
      dailyCapResetAt: isNewDay ? now : userPts.dailyCapResetAt,
      lastEarnedAt: now,
      updatedAt: now,
    })
    .where(eq(userPoints.agentId, agentId));

  globalDailyPoints += finalPoints;

  return {
    awarded: true,
    basePoints,
    multiplier,
    finalPoints,
    newTotal,
    dailyEarned: isNewDay ? finalPoints : newDailyEarned,
    dailyCap: DAILY_CAP,
    weeklyEarned: weeklyEarned + finalPoints,
    weeklyCap: WEEKLY_CAP,
    sessionsToday: sessionsToday + 1,
    diminishingActive,
  };
}

export function getGameRewards() {
  return GAME_REWARDS;
}

export function getPointsCaps() {
  return {
    dailyCap: DAILY_CAP,
    weeklyCap: WEEKLY_CAP,
    globalDailyCap: GLOBAL_DAILY_CAP,
    diminishThreshold1: DIMINISH_THRESHOLD_1,
    diminishThreshold2: DIMINISH_THRESHOLD_2,
    diminishFactor1: DIMINISH_FACTOR_1,
    diminishFactor2: DIMINISH_FACTOR_2,
  };
}

export const TOKENOMICS = {
  totalSupply: 1_000_000_000,
  allocations: {
    communityRewards: { amount: 250_000_000, pct: 25, description: "Play-to-Earn + Points Conversion" },
    liquidity: { amount: 200_000_000, pct: 20, description: "PancakeSwap LP + Exchange Listings" },
    teamAdvisors: { amount: 150_000_000, pct: 15, description: "Team & Advisors (4yr vest, 1yr cliff)" },
    stakingRewards: { amount: 100_000_000, pct: 10, description: "Staking APY Rewards (4yr emission)" },
    ecosystem: { amount: 100_000_000, pct: 10, description: "Ecosystem & Developer Grants" },
    treasury: { amount: 100_000_000, pct: 10, description: "Treasury & Operations" },
    marketing: { amount: 50_000_000, pct: 5, description: "Marketing & Growth Campaigns" },
    strategicPartners: { amount: 50_000_000, pct: 5, description: "Strategic Partners & Backers" },
  },
  pointsConversionPool: 200_000_000,
  feeSplit: {
    totalFeePct: 10,
    treasuryPct: 5,
    burnPct: 2.5,
    rewardPoolPct: 2.5,
  },
};
