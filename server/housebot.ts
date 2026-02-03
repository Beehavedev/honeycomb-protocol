import { db } from "./db";
import { housebotConfig, housebotDuels, matchmakingQueue, duels } from "@shared/schema";
import { eq, and, lt, gte, desc } from "drizzle-orm";

interface HouseBotStatus {
  enabled: boolean;
  walletAddress: string | null;
  maxStakeWei: string;
  dailyLossLimitWei: string;
  currentDailyLossWei: string;
  maxConcurrentDuels: number;
  activeDuels: number;
  allowedAssets: string[];
  allowedDuelTypes: string[];
  dailyLossRemaining: string;
  canJoinDuels: boolean;
}

export class HouseBotService {
  private static instance: HouseBotService | null = null;
  
  static getInstance(): HouseBotService {
    if (!HouseBotService.instance) {
      HouseBotService.instance = new HouseBotService();
    }
    return HouseBotService.instance;
  }

  async getConfig() {
    const configs = await db.select().from(housebotConfig).limit(1);
    if (configs.length === 0) {
      const [newConfig] = await db.insert(housebotConfig).values({
        enabled: false,
      }).returning();
      return newConfig;
    }
    return configs[0];
  }

  async updateConfig(updates: Partial<{
    enabled: boolean;
    walletAddress: string;
    agentId: string;
    onChainAgentId: bigint;
    maxStakeWei: string;
    dailyLossLimitWei: string;
    maxConcurrentDuels: number;
    allowedAssets: string[];
    allowedDuelTypes: string[];
  }>) {
    const config = await this.getConfig();
    const [updated] = await db.update(housebotConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(housebotConfig.id, config.id))
      .returning();
    return updated;
  }

  async getStatus(): Promise<HouseBotStatus> {
    const config = await this.getConfig();
    await this.resetDailyLossIfNeeded(config);
    
    const activeDuelCount = await this.getActiveDuelCount();
    
    const currentLoss = BigInt(config.currentDailyLossWei);
    const dailyLimit = BigInt(config.dailyLossLimitWei);
    const lossRemaining = dailyLimit > currentLoss ? dailyLimit - currentLoss : BigInt(0);
    
    const canJoin = config.enabled && 
      activeDuelCount < config.maxConcurrentDuels && 
      currentLoss < dailyLimit;

    return {
      enabled: config.enabled,
      walletAddress: config.walletAddress,
      maxStakeWei: config.maxStakeWei,
      dailyLossLimitWei: config.dailyLossLimitWei,
      currentDailyLossWei: config.currentDailyLossWei,
      maxConcurrentDuels: config.maxConcurrentDuels,
      activeDuels: activeDuelCount,
      allowedAssets: config.allowedAssets || [],
      allowedDuelTypes: config.allowedDuelTypes || [],
      dailyLossRemaining: lossRemaining.toString(),
      canJoinDuels: canJoin,
    };
  }

  private async resetDailyLossIfNeeded(config: typeof housebotConfig.$inferSelect) {
    const now = new Date();
    const lastReset = new Date(config.lastDailyReset);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceReset >= 24) {
      await db.update(housebotConfig)
        .set({
          currentDailyLossWei: "0",
          lastDailyReset: now,
          updatedAt: now,
        })
        .where(eq(housebotConfig.id, config.id));
    }
  }

  private async getActiveDuelCount(): Promise<number> {
    const config = await this.getConfig();
    if (!config.walletAddress) return 0;
    
    const activeDuels = await db.select()
      .from(duels)
      .where(
        and(
          eq(duels.joinerAddress, config.walletAddress.toLowerCase()),
          eq(duels.status, "live")
        )
      );
    return activeDuels.length;
  }

  async canJoinDuel(duel: typeof duels.$inferSelect): Promise<{ canJoin: boolean; reason?: string }> {
    const config = await this.getConfig();
    
    if (!config.enabled) {
      return { canJoin: false, reason: "HouseBot is disabled" };
    }
    
    if (!config.walletAddress) {
      return { canJoin: false, reason: "HouseBot wallet not configured" };
    }

    if (duel.creatorAddress.toLowerCase() === config.walletAddress.toLowerCase()) {
      return { canJoin: false, reason: "Cannot join own duel" };
    }

    const stakeWei = BigInt(duel.stakeWei);
    const maxStake = BigInt(config.maxStakeWei);
    if (stakeWei > maxStake) {
      return { canJoin: false, reason: `Stake ${duel.stakeDisplay} exceeds max ${Number(maxStake) / 1e18} BNB` };
    }

    const currentLoss = BigInt(config.currentDailyLossWei);
    const dailyLimit = BigInt(config.dailyLossLimitWei);
    if (currentLoss >= dailyLimit) {
      return { canJoin: false, reason: "Daily loss limit reached" };
    }

    const activeDuels = await this.getActiveDuelCount();
    if (activeDuels >= config.maxConcurrentDuels) {
      return { canJoin: false, reason: `Max concurrent duels (${config.maxConcurrentDuels}) reached` };
    }

    if (!config.allowedAssets?.includes(duel.assetId)) {
      return { canJoin: false, reason: `Asset ${duel.assetId} not in allowed list` };
    }

    const duelType = duel.duelType || "price";
    if (!config.allowedDuelTypes?.includes(duelType)) {
      return { canJoin: false, reason: `Duel type ${duelType} not allowed` };
    }

    return { canJoin: true };
  }

  async logDuelAction(duelId: string, action: "joined" | "won" | "lost" | "draw", pnlWei: string) {
    await db.insert(housebotDuels).values({
      duelId,
      action,
      pnlWei,
    });

    if (action === "lost") {
      const config = await this.getConfig();
      const currentLoss = BigInt(config.currentDailyLossWei);
      const newLoss = currentLoss + BigInt(pnlWei.replace("-", ""));
      
      await db.update(housebotConfig)
        .set({
          currentDailyLossWei: newLoss.toString(),
          updatedAt: new Date(),
        })
        .where(eq(housebotConfig.id, config.id));
    }
  }

  async getRecentActivity(limit: number = 20) {
    return db.select()
      .from(housebotDuels)
      .orderBy(desc(housebotDuels.createdAt))
      .limit(limit);
  }

  async addToMatchmakingQueue(duelId: string, assetId: string, duelType: string, durationSec: number, stakeWei: string, creatorAddress: string) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    await db.insert(matchmakingQueue).values({
      duelId,
      assetId,
      duelType,
      durationSec,
      stakeWei,
      creatorAddress,
      status: "waiting",
      expiresAt,
    });
  }

  async getMatchmakingQueue() {
    return db.select()
      .from(matchmakingQueue)
      .where(
        and(
          eq(matchmakingQueue.status, "waiting"),
          gte(matchmakingQueue.expiresAt, new Date())
        )
      )
      .orderBy(matchmakingQueue.createdAt);
  }

  async expireOldQueueEntries() {
    const now = new Date();
    await db.update(matchmakingQueue)
      .set({ status: "expired" })
      .where(
        and(
          eq(matchmakingQueue.status, "waiting"),
          lt(matchmakingQueue.expiresAt, now)
        )
      );
  }

  async findMatch(stakeWei: string, duelType: string): Promise<typeof matchmakingQueue.$inferSelect | null> {
    const queue = await db.select()
      .from(matchmakingQueue)
      .where(
        and(
          eq(matchmakingQueue.status, "waiting"),
          eq(matchmakingQueue.stakeWei, stakeWei),
          eq(matchmakingQueue.duelType, duelType),
          gte(matchmakingQueue.expiresAt, new Date())
        )
      )
      .limit(1);
    
    return queue[0] || null;
  }

  async markMatched(queueEntryId: string) {
    await db.update(matchmakingQueue)
      .set({ status: "matched" })
      .where(eq(matchmakingQueue.id, queueEntryId));
  }
}

export const houseBotService = HouseBotService.getInstance();
