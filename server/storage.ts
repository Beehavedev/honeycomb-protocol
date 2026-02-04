import { 
  type Agent, type InsertAgent,
  type Post, type InsertPost,
  type Comment, type InsertComment,
  type Vote, type InsertVote,
  type AuthNonce, type InsertAuthNonce,
  type Bounty, type InsertBounty,
  type Solution, type InsertSolution,
  type LaunchToken, type InsertLaunchToken,
  type LaunchTrade, type InsertLaunchTrade,
  type LaunchActivity, type InsertLaunchActivity,
  type LaunchComment, type InsertLaunchComment,
  type Duel, type InsertDuel,
  type DuelAsset, type InsertDuelAsset,
  type DuelStat, type InsertDuelStat,
  type LeaderboardDaily, type InsertLeaderboardDaily,
  type LeaderboardWeekly, type InsertLeaderboardWeekly,
  type AutonomousAgent, type InsertAutonomousAgent,
  type AgentTokenLaunch, type InsertAgentTokenLaunch,
  type AgentTrade, type InsertAgentTrade,
  type AgentTradingStats,
  type AgentGraduation, type InsertAgentGraduation,
  type AgentLeaderboard,
  agents, posts, comments, votes, authNonces, bounties, solutions,
  launchTokens, launchTrades, launchActivity, launchComments, duels, duelAssets,
  duelStats, leaderboardDaily, leaderboardWeekly,
  autonomousAgents, agentTokenLaunches, agentTrades, agentTradingStats, agentGraduations, agentLeaderboard
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, lt, lte, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Auth
  createNonce(data: InsertAuthNonce): Promise<AuthNonce>;
  getNonce(address: string, nonce: string): Promise<AuthNonce | undefined>;
  invalidateNonce(id: string): Promise<void>;
  
  // Agents
  createAgent(data: InsertAgent): Promise<Agent>;
  getAgent(id: string): Promise<Agent | undefined>;
  getAgentByAddress(address: string): Promise<Agent | undefined>;
  getAgentByApiKey(hashedApiKey: string): Promise<Agent | undefined>;
  getAgentsByIds(ids: string[]): Promise<Agent[]>;
  updateAgentApiKey(agentId: string, hashedApiKey: string): Promise<Agent>;
  updateAgentIsBot(agentId: string, isBot: boolean): Promise<Agent>;
  updateAgentProfile(agentId: string, updates: Partial<Pick<Agent, 'name' | 'bio' | 'avatarUrl' | 'twitterHandle' | 'capabilities'>>): Promise<Agent>;
  
  // Posts
  createPost(data: InsertPost): Promise<Post>;
  getPost(id: string): Promise<Post | undefined>;
  getPosts(sort: "new" | "top", limit: number): Promise<Post[]>;
  getPostsByAgent(agentId: string): Promise<Post[]>;
  incrementPostCommentCount(postId: string): Promise<void>;
  updatePostVotes(postId: string, upvotes: number, downvotes: number): Promise<void>;
  
  // Comments
  createComment(data: InsertComment): Promise<Comment>;
  getCommentsByPost(postId: string): Promise<Comment[]>;
  getCommentCountByAgent(agentId: string): Promise<number>;
  
  // Votes
  createVote(data: InsertVote): Promise<Vote>;
  getVote(postId: string, agentId: string): Promise<Vote | undefined>;
  updateVote(id: string, direction: string): Promise<Vote>;
  getVotesByAgent(agentId: string): Promise<Vote[]>;
  getVotesByPosts(postIds: string[], agentId?: string): Promise<Vote[]>;
  getUpvoteCountByAgent(agentId: string): Promise<number>;
  countVotesForPost(postId: string): Promise<{ upvotes: number; downvotes: number }>;

  // Bounties
  createBounty(data: InsertBounty): Promise<Bounty>;
  getBounty(id: string): Promise<Bounty | undefined>;
  getBounties(status: "open" | "awarded" | "expired" | "all", limit: number): Promise<Bounty[]>;
  getBountiesByAgent(agentId: string): Promise<Bounty[]>;
  updateBountyStatus(id: string, status: string, winningSolutionId?: string): Promise<Bounty>;
  incrementBountySolutionCount(bountyId: string): Promise<void>;
  markExpiredBounties(): Promise<number>;

  // Solutions
  createSolution(data: InsertSolution): Promise<Solution>;
  getSolution(id: string): Promise<Solution | undefined>;
  getSolutionsByBounty(bountyId: string): Promise<Solution[]>;
  getSolutionByBountyAndAgent(bountyId: string, agentId: string): Promise<Solution | undefined>;
  markSolutionAsWinner(id: string): Promise<Solution>;

  // Launch Tokens
  createLaunchToken(data: InsertLaunchToken): Promise<LaunchToken>;
  getLaunchToken(tokenAddress: string): Promise<LaunchToken | undefined>;
  getLaunchTokens(limit: number, graduated?: boolean): Promise<LaunchToken[]>;
  updateLaunchToken(tokenAddress: string, updates: Partial<LaunchToken>): Promise<LaunchToken>;

  // Launch Trades
  createLaunchTrade(data: InsertLaunchTrade): Promise<LaunchTrade>;
  getLaunchTradesByToken(tokenAddress: string, limit: number): Promise<LaunchTrade[]>;
  
  // Launch Activity Feed
  createLaunchActivity(data: InsertLaunchActivity): Promise<LaunchActivity>;
  getLaunchActivity(limit: number): Promise<LaunchActivity[]>;
  
  // Launch Comments
  createLaunchComment(data: InsertLaunchComment): Promise<LaunchComment>;
  getLaunchComments(tokenAddress: string, limit: number): Promise<LaunchComment[]>;
  
  // Launch Token Stats
  getTrendingTokens(limit: number): Promise<LaunchToken[]>;
  searchLaunchTokens(query: string, limit: number): Promise<LaunchToken[]>;

  // Duels
  createDuel(data: InsertDuel): Promise<Duel>;
  getDuel(id: string): Promise<Duel | undefined>;
  getDuels(status: "open" | "live" | "settled" | "cancelled" | "all", limit: number): Promise<Duel[]>;
  getDuelsByCreator(creatorAddress: string): Promise<Duel[]>;
  updateDuel(id: string, updates: Partial<Duel>): Promise<Duel>;
  joinDuel(id: string, joinerAddress: string, joinerAgentId: string | null, joinerDirection: string, startPrice: string): Promise<Duel>;
  settleDuel(id: string, endPrice: string, winnerAddress: string | null, payoutWei: string, feeWei: string): Promise<Duel>;
  
  // Duel Assets
  createDuelAsset(data: InsertDuelAsset): Promise<DuelAsset>;
  getDuelAssets(): Promise<DuelAsset[]>;
  seedDuelAssets(): Promise<void>;

  // Platform Stats
  getPlatformStats(): Promise<{
    totalUsers: number;
    totalPosts: number;
    totalComments: number;
    totalBounties: number;
    totalDuels: number;
    activeDuels: number;
    totalAiAgents: number;
  }>;

  // Leaderboard
  getDuelStats(agentId: string): Promise<DuelStat | undefined>;
  getDuelStatsByAddress(ownerAddress: string): Promise<DuelStat | undefined>;
  upsertDuelStats(agentId: string, ownerAddress: string, stats: { 
    wins?: number; losses?: number; draws?: number; 
    volumeWei?: string; pnlWei?: string 
  }): Promise<DuelStat>;
  getLeaderboard(range: "daily" | "weekly", date?: string): Promise<Array<{
    agentId: string;
    ownerAddress: string;
    wins: number;
    losses: number;
    draws: number;
    pnlWei: string;
    volumeWei: string;
  }>>;
  upsertLeaderboardDaily(entry: InsertLeaderboardDaily): Promise<LeaderboardDaily>;
  upsertLeaderboardWeekly(entry: InsertLeaderboardWeekly): Promise<LeaderboardWeekly>;

  // Autonomous AI Agents
  createAutonomousAgent(data: InsertAutonomousAgent): Promise<AutonomousAgent>;
  getAutonomousAgent(id: string): Promise<AutonomousAgent | undefined>;
  getAutonomousAgentByAgentId(agentId: string): Promise<AutonomousAgent | undefined>;
  getAutonomousAgentByController(controllerAddress: string): Promise<AutonomousAgent | undefined>;
  getAllAutonomousAgents(limit: number): Promise<AutonomousAgent[]>;
  updateAutonomousAgent(id: string, updates: Partial<AutonomousAgent>): Promise<AutonomousAgent>;

  // Agent Token Launches
  createAgentTokenLaunch(data: InsertAgentTokenLaunch): Promise<AgentTokenLaunch>;
  getAgentTokenLaunch(tokenAddress: string): Promise<AgentTokenLaunch | undefined>;
  getAgentTokenLaunches(autonomousAgentId: string): Promise<AgentTokenLaunch[]>;
  getAllAgentTokenLaunches(limit: number, status?: string): Promise<AgentTokenLaunch[]>;
  updateAgentTokenLaunch(tokenAddress: string, updates: Partial<AgentTokenLaunch>): Promise<AgentTokenLaunch>;

  // Agent Trades
  createAgentTrade(data: InsertAgentTrade): Promise<AgentTrade>;
  getAgentTrades(autonomousAgentId: string, limit: number): Promise<AgentTrade[]>;
  getAgentTradesByToken(tokenAddress: string, limit: number): Promise<AgentTrade[]>;

  // Agent Trading Stats
  getAgentTradingStats(autonomousAgentId: string, tokenAddress: string): Promise<AgentTradingStats | undefined>;
  upsertAgentTradingStats(autonomousAgentId: string, tokenAddress: string, stats: Partial<AgentTradingStats>): Promise<AgentTradingStats>;

  // Agent Graduations
  createAgentGraduation(data: InsertAgentGraduation): Promise<AgentGraduation>;
  getAgentGraduation(tokenAddress: string): Promise<AgentGraduation | undefined>;

  // Agent Leaderboard
  getAgentLeaderboard(limit: number): Promise<AgentLeaderboard[]>;
  updateAgentLeaderboard(autonomousAgentId: string, stats: Partial<AgentLeaderboard>): Promise<AgentLeaderboard>;
}

export class DatabaseStorage implements IStorage {
  // Auth
  async createNonce(data: InsertAuthNonce): Promise<AuthNonce> {
    const [nonce] = await db.insert(authNonces).values({
      ...data,
    }).returning();
    return nonce;
  }

  async getNonce(address: string, nonce: string): Promise<AuthNonce | undefined> {
    const [result] = await db.select()
      .from(authNonces)
      .where(and(
        eq(authNonces.address, address.toLowerCase()),
        eq(authNonces.nonce, nonce),
        eq(authNonces.used, false)
      ))
      .limit(1);
    return result;
  }

  async invalidateNonce(id: string): Promise<void> {
    await db.update(authNonces).set({ used: true }).where(eq(authNonces.id, id));
  }

  // Agents
  async createAgent(data: InsertAgent): Promise<Agent> {
    const [agent] = await db.insert(agents).values({
      ...data,
      ownerAddress: data.ownerAddress.toLowerCase(),
    }).returning();
    return agent;
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const [agent] = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
    return agent;
  }

  async getAgentByAddress(address: string): Promise<Agent | undefined> {
    const [agent] = await db.select()
      .from(agents)
      .where(eq(agents.ownerAddress, address.toLowerCase()))
      .limit(1);
    return agent;
  }

  async getAgentsByIds(ids: string[]): Promise<Agent[]> {
    if (ids.length === 0) return [];
    const result = await db.select().from(agents).where(
      sql`${agents.id} IN ${ids}`
    );
    return result;
  }

  async getAgentByApiKey(hashedApiKey: string): Promise<Agent | undefined> {
    const [agent] = await db.select()
      .from(agents)
      .where(eq(agents.apiKey, hashedApiKey))
      .limit(1);
    return agent;
  }

  async updateAgentApiKey(agentId: string, hashedApiKey: string): Promise<Agent> {
    const [agent] = await db.update(agents)
      .set({ apiKey: hashedApiKey, apiKeyCreatedAt: new Date() })
      .where(eq(agents.id, agentId))
      .returning();
    return agent;
  }

  async updateAgentIsBot(agentId: string, isBot: boolean): Promise<Agent> {
    const [agent] = await db.update(agents)
      .set({ isBot })
      .where(eq(agents.id, agentId))
      .returning();
    return agent;
  }

  async updateAgentProfile(agentId: string, updates: Partial<Pick<Agent, 'name' | 'bio' | 'avatarUrl' | 'twitterHandle' | 'capabilities'>>): Promise<Agent> {
    const [agent] = await db.update(agents)
      .set(updates)
      .where(eq(agents.id, agentId))
      .returning();
    return agent;
  }

  // Posts
  async createPost(data: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(data).returning();
    return post;
  }

  async getPost(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    return post;
  }

  async getPosts(sort: "new" | "top", limit: number): Promise<Post[]> {
    if (sort === "top") {
      return db.select().from(posts)
        .orderBy(desc(sql`${posts.upvotes} - ${posts.downvotes}`))
        .limit(limit);
    }
    return db.select().from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(limit);
  }

  async getPostsByAgent(agentId: string): Promise<Post[]> {
    return db.select().from(posts)
      .where(eq(posts.agentId, agentId))
      .orderBy(desc(posts.createdAt));
  }

  async incrementPostCommentCount(postId: string): Promise<void> {
    await db.update(posts)
      .set({ commentCount: sql`${posts.commentCount} + 1` })
      .where(eq(posts.id, postId));
  }

  async updatePostVotes(postId: string, upvotes: number, downvotes: number): Promise<void> {
    await db.update(posts)
      .set({ upvotes, downvotes })
      .where(eq(posts.id, postId));
  }

  // Comments
  async createComment(data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment;
  }

  async getCommentsByPost(postId: string): Promise<Comment[]> {
    return db.select().from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(desc(comments.createdAt));
  }

  async getCommentCountByAgent(agentId: string): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(comments)
      .where(eq(comments.agentId, agentId));
    return result?.count || 0;
  }

  // Votes
  async createVote(data: InsertVote): Promise<Vote> {
    const [vote] = await db.insert(votes).values(data).returning();
    return vote;
  }

  async getVote(postId: string, agentId: string): Promise<Vote | undefined> {
    const [vote] = await db.select().from(votes)
      .where(and(eq(votes.postId, postId), eq(votes.agentId, agentId)))
      .limit(1);
    return vote;
  }

  async updateVote(id: string, direction: string): Promise<Vote> {
    const [vote] = await db.update(votes)
      .set({ direction })
      .where(eq(votes.id, id))
      .returning();
    return vote;
  }

  async getVotesByAgent(agentId: string): Promise<Vote[]> {
    return db.select().from(votes).where(eq(votes.agentId, agentId));
  }

  async getVotesByPosts(postIds: string[], agentId?: string): Promise<Vote[]> {
    if (postIds.length === 0) return [];
    if (agentId) {
      return db.select().from(votes).where(and(
        sql`${votes.postId} IN ${postIds}`,
        eq(votes.agentId, agentId)
      ));
    }
    return db.select().from(votes).where(sql`${votes.postId} IN ${postIds}`);
  }

  async getUpvoteCountByAgent(agentId: string): Promise<number> {
    const agentPosts = await this.getPostsByAgent(agentId);
    return agentPosts.reduce((sum, post) => sum + post.upvotes, 0);
  }

  async countVotesForPost(postId: string): Promise<{ upvotes: number; downvotes: number }> {
    const allVotes = await db.select().from(votes).where(eq(votes.postId, postId));
    const upvotes = allVotes.filter(v => v.direction === "up").length;
    const downvotes = allVotes.filter(v => v.direction === "down").length;
    return { upvotes, downvotes };
  }

  // Bounties
  async createBounty(data: InsertBounty): Promise<Bounty> {
    const [bounty] = await db.insert(bounties).values(data).returning();
    return bounty;
  }

  async getBounty(id: string): Promise<Bounty | undefined> {
    const [bounty] = await db.select().from(bounties).where(eq(bounties.id, id)).limit(1);
    return bounty;
  }

  async getBounties(status: "open" | "awarded" | "expired" | "all", limit: number): Promise<Bounty[]> {
    const now = new Date();
    
    if (status === "all") {
      return db.select().from(bounties)
        .orderBy(desc(bounties.createdAt))
        .limit(limit);
    }
    
    if (status === "expired") {
      return db.select().from(bounties)
        .where(and(
          eq(bounties.status, "open"),
          lt(bounties.deadline, now)
        ))
        .orderBy(desc(bounties.createdAt))
        .limit(limit);
    }
    
    if (status === "open") {
      return db.select().from(bounties)
        .where(and(
          eq(bounties.status, "open"),
          sql`${bounties.deadline} >= ${now}`
        ))
        .orderBy(desc(bounties.createdAt))
        .limit(limit);
    }
    
    return db.select().from(bounties)
      .where(eq(bounties.status, status))
      .orderBy(desc(bounties.createdAt))
      .limit(limit);
  }

  async getBountiesByAgent(agentId: string): Promise<Bounty[]> {
    return db.select().from(bounties)
      .where(eq(bounties.agentId, agentId))
      .orderBy(desc(bounties.createdAt));
  }

  async updateBountyStatus(id: string, status: string, winningSolutionId?: string): Promise<Bounty> {
    const updateData: any = { status };
    if (winningSolutionId) {
      updateData.winningSolutionId = winningSolutionId;
    }
    const [bounty] = await db.update(bounties)
      .set(updateData)
      .where(eq(bounties.id, id))
      .returning();
    return bounty;
  }

  async incrementBountySolutionCount(bountyId: string): Promise<void> {
    await db.update(bounties)
      .set({ solutionCount: sql`${bounties.solutionCount} + 1` })
      .where(eq(bounties.id, bountyId));
  }

  async markExpiredBounties(): Promise<number> {
    const now = new Date();
    const result = await db.update(bounties)
      .set({ status: "expired" })
      .where(and(
        eq(bounties.status, "open"),
        lt(bounties.deadline, now)
      ))
      .returning();
    return result.length;
  }

  // Solutions
  async createSolution(data: InsertSolution): Promise<Solution> {
    const [solution] = await db.insert(solutions).values(data).returning();
    return solution;
  }

  async getSolution(id: string): Promise<Solution | undefined> {
    const [solution] = await db.select().from(solutions).where(eq(solutions.id, id)).limit(1);
    return solution;
  }

  async getSolutionsByBounty(bountyId: string): Promise<Solution[]> {
    return db.select().from(solutions)
      .where(eq(solutions.bountyId, bountyId))
      .orderBy(desc(solutions.createdAt));
  }

  async getSolutionByBountyAndAgent(bountyId: string, agentId: string): Promise<Solution | undefined> {
    const [solution] = await db.select().from(solutions)
      .where(and(
        eq(solutions.bountyId, bountyId),
        eq(solutions.agentId, agentId)
      ))
      .limit(1);
    return solution;
  }

  async markSolutionAsWinner(id: string): Promise<Solution> {
    const [solution] = await db.update(solutions)
      .set({ isWinner: true })
      .where(eq(solutions.id, id))
      .returning();
    return solution;
  }

  // Launch Tokens
  async createLaunchToken(data: InsertLaunchToken): Promise<LaunchToken> {
    const [token] = await db.insert(launchTokens).values({
      ...data,
      tokenAddress: data.tokenAddress.toLowerCase(),
      creatorAddress: data.creatorAddress.toLowerCase(),
    }).returning();
    return token;
  }

  async getLaunchToken(tokenAddress: string): Promise<LaunchToken | undefined> {
    const [token] = await db.select().from(launchTokens)
      .where(eq(launchTokens.tokenAddress, tokenAddress.toLowerCase()))
      .limit(1);
    return token;
  }

  async getLaunchTokens(limit: number, graduated?: boolean): Promise<LaunchToken[]> {
    if (graduated !== undefined) {
      return db.select().from(launchTokens)
        .where(eq(launchTokens.graduated, graduated))
        .orderBy(desc(launchTokens.createdAt))
        .limit(limit);
    }
    return db.select().from(launchTokens)
      .orderBy(desc(launchTokens.createdAt))
      .limit(limit);
  }

  async updateLaunchToken(tokenAddress: string, updates: Partial<LaunchToken>): Promise<LaunchToken> {
    const [token] = await db.update(launchTokens)
      .set(updates)
      .where(eq(launchTokens.tokenAddress, tokenAddress.toLowerCase()))
      .returning();
    return token;
  }

  // Launch Trades
  async createLaunchTrade(data: InsertLaunchTrade): Promise<LaunchTrade> {
    const [trade] = await db.insert(launchTrades).values({
      ...data,
      tokenAddress: data.tokenAddress.toLowerCase(),
      trader: data.trader.toLowerCase(),
    }).returning();
    
    // Update trade count for the token
    await db.update(launchTokens)
      .set({ tradeCount: sql`${launchTokens.tradeCount} + 1` })
      .where(eq(launchTokens.tokenAddress, data.tokenAddress.toLowerCase()));
    
    return trade;
  }

  async getLaunchTradesByToken(tokenAddress: string, limit: number): Promise<LaunchTrade[]> {
    return db.select().from(launchTrades)
      .where(eq(launchTrades.tokenAddress, tokenAddress.toLowerCase()))
      .orderBy(desc(launchTrades.createdAt))
      .limit(limit);
  }
  
  // Launch Activity Feed
  async createLaunchActivity(data: InsertLaunchActivity): Promise<LaunchActivity> {
    const [activity] = await db.insert(launchActivity).values({
      ...data,
      tokenAddress: data.tokenAddress.toLowerCase(),
      actorAddress: data.actorAddress.toLowerCase(),
    }).returning();
    return activity;
  }
  
  async getLaunchActivity(limit: number): Promise<LaunchActivity[]> {
    return db.select().from(launchActivity)
      .orderBy(desc(launchActivity.createdAt))
      .limit(limit);
  }
  
  // Launch Comments
  async createLaunchComment(data: InsertLaunchComment): Promise<LaunchComment> {
    const [comment] = await db.insert(launchComments).values({
      ...data,
      tokenAddress: data.tokenAddress.toLowerCase(),
      walletAddress: data.walletAddress.toLowerCase(),
    }).returning();
    return comment;
  }
  
  async getLaunchComments(tokenAddress: string, limit: number): Promise<LaunchComment[]> {
    return db.select().from(launchComments)
      .where(eq(launchComments.tokenAddress, tokenAddress.toLowerCase()))
      .orderBy(desc(launchComments.createdAt))
      .limit(limit);
  }
  
  // Launch Token Stats - Trending by volume and recent trades
  async getTrendingTokens(limit: number): Promise<LaunchToken[]> {
    return db.select().from(launchTokens)
      .where(eq(launchTokens.graduated, false))
      .orderBy(desc(launchTokens.tradeCount), desc(launchTokens.totalRaisedNative))
      .limit(limit);
  }
  
  async searchLaunchTokens(query: string, limit: number): Promise<LaunchToken[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return db.select().from(launchTokens)
      .where(sql`LOWER(${launchTokens.name}) LIKE ${searchTerm} OR LOWER(${launchTokens.symbol}) LIKE ${searchTerm}`)
      .orderBy(desc(launchTokens.createdAt))
      .limit(limit);
  }

  // Duels
  async createDuel(data: InsertDuel): Promise<Duel> {
    const [duel] = await db.insert(duels).values({
      ...data,
      creatorAddress: data.creatorAddress.toLowerCase(),
    }).returning();
    return duel;
  }

  async getDuel(id: string): Promise<Duel | undefined> {
    const [duel] = await db.select().from(duels)
      .where(eq(duels.id, id))
      .limit(1);
    return duel;
  }

  async getDuels(status: "open" | "live" | "settled" | "cancelled" | "all", limit: number): Promise<Duel[]> {
    // Only show duels that have a valid on-chain ID (successfully created on-chain)
    if (status === "all") {
      return db.select().from(duels)
        .where(isNotNull(duels.onChainDuelId))
        .orderBy(desc(duels.createdAt))
        .limit(limit);
    }
    return db.select().from(duels)
      .where(and(eq(duels.status, status), isNotNull(duels.onChainDuelId)))
      .orderBy(desc(duels.createdAt))
      .limit(limit);
  }

  async getDuelsByCreator(creatorAddress: string): Promise<Duel[]> {
    return db.select().from(duels)
      .where(eq(duels.creatorAddress, creatorAddress.toLowerCase()))
      .orderBy(desc(duels.createdAt));
  }

  async getExpiredOpenDuels(expiryMinutes: number = 5): Promise<Duel[]> {
    const expiryTime = new Date(Date.now() - expiryMinutes * 60 * 1000);
    return db.select().from(duels)
      .where(and(
        eq(duels.status, "open"),
        isNotNull(duels.onChainDuelId),
        lt(duels.createdAt, expiryTime)
      ));
  }

  async autoCancelExpiredDuels(expiryMinutes: number = 5): Promise<number> {
    const expiredDuels = await this.getExpiredOpenDuels(expiryMinutes);
    let cancelledCount = 0;
    for (const duel of expiredDuels) {
      await this.updateDuel(duel.id, { status: "cancelled" });
      cancelledCount++;
    }
    return cancelledCount;
  }

  async updateDuel(id: string, updates: Partial<Duel>): Promise<Duel> {
    const [duel] = await db.update(duels)
      .set(updates)
      .where(eq(duels.id, id))
      .returning();
    return duel;
  }

  async joinDuel(id: string, joinerAddress: string, joinerAgentId: string | null, joinerDirection: string, startPrice: string): Promise<Duel> {
    const now = new Date();
    const duel = await this.getDuel(id);
    if (!duel) throw new Error("Duel not found");
    
    const endTs = new Date(now.getTime() + duel.durationSec * 1000);
    
    const [updatedDuel] = await db.update(duels)
      .set({
        joinerAddress: joinerAddress.toLowerCase(),
        joinerAgentId,
        joinerDirection,
        startPrice,
        startTs: now,
        endTs,
        status: "live",
      })
      .where(eq(duels.id, id))
      .returning();
    return updatedDuel;
  }

  async settleDuel(id: string, endPrice: string, winnerAddress: string | null, payoutWei: string, feeWei: string): Promise<Duel> {
    // Get the duel before settling to access creator/joiner info
    const [existingDuel] = await db.select().from(duels).where(eq(duels.id, id)).limit(1);
    
    const [duel] = await db.update(duels)
      .set({
        endPrice,
        winnerAddress: winnerAddress?.toLowerCase() || null,
        payoutWei,
        feeWei,
        status: "settled",
      })
      .where(eq(duels.id, id))
      .returning();
    
    // Update leaderboard stats for both participants
    if (existingDuel && existingDuel.creatorAgentId && existingDuel.joinerAgentId) {
      const stakeWei = existingDuel.stakeWei;
      const isDraw = !winnerAddress;
      const creatorWon = winnerAddress?.toLowerCase() === existingDuel.creatorAddress.toLowerCase();
      const joinerWon = winnerAddress?.toLowerCase() === existingDuel.joinerAddress?.toLowerCase();
      
      // Calculate PnL: winner gets payout - stake, loser loses stake, draw is 0
      const winnerPnL = (BigInt(payoutWei) - BigInt(stakeWei)).toString();
      const loserPnL = `-${stakeWei}`;
      
      // Get today's date and week start for leaderboard entries
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now);
      monday.setDate(diff);
      const weekStart = monday.toISOString().split('T')[0];
      
      try {
        // Update creator stats
        await this.upsertDuelStats(existingDuel.creatorAgentId, existingDuel.creatorAddress, {
          wins: creatorWon ? 1 : 0,
          losses: joinerWon ? 1 : 0,
          draws: isDraw ? 1 : 0,
          volumeWei: stakeWei,
          pnlWei: isDraw ? "0" : (creatorWon ? winnerPnL : loserPnL),
        });
        
        // Update joiner stats
        if (existingDuel.joinerAddress) {
          await this.upsertDuelStats(existingDuel.joinerAgentId, existingDuel.joinerAddress, {
            wins: joinerWon ? 1 : 0,
            losses: creatorWon ? 1 : 0,
            draws: isDraw ? 1 : 0,
            volumeWei: stakeWei,
            pnlWei: isDraw ? "0" : (joinerWon ? winnerPnL : loserPnL),
          });
        }
        
        // Update daily leaderboard for creator
        await this.upsertLeaderboardDaily({
          date: today,
          agentId: existingDuel.creatorAgentId,
          ownerAddress: existingDuel.creatorAddress.toLowerCase(),
          wins: creatorWon ? 1 : 0,
          losses: joinerWon ? 1 : 0,
          draws: isDraw ? 1 : 0,
          pnlWei: isDraw ? "0" : (creatorWon ? winnerPnL : loserPnL),
          volumeWei: stakeWei,
        });
        
        // Update daily leaderboard for joiner
        if (existingDuel.joinerAgentId && existingDuel.joinerAddress) {
          await this.upsertLeaderboardDaily({
            date: today,
            agentId: existingDuel.joinerAgentId,
            ownerAddress: existingDuel.joinerAddress.toLowerCase(),
            wins: joinerWon ? 1 : 0,
            losses: creatorWon ? 1 : 0,
            draws: isDraw ? 1 : 0,
            pnlWei: isDraw ? "0" : (joinerWon ? winnerPnL : loserPnL),
            volumeWei: stakeWei,
          });
        }
        
        // Update weekly leaderboard for creator
        await this.upsertLeaderboardWeekly({
          weekStartDate: weekStart,
          agentId: existingDuel.creatorAgentId,
          ownerAddress: existingDuel.creatorAddress.toLowerCase(),
          wins: creatorWon ? 1 : 0,
          losses: joinerWon ? 1 : 0,
          draws: isDraw ? 1 : 0,
          pnlWei: isDraw ? "0" : (creatorWon ? winnerPnL : loserPnL),
          volumeWei: stakeWei,
        });
        
        // Update weekly leaderboard for joiner
        if (existingDuel.joinerAgentId && existingDuel.joinerAddress) {
          await this.upsertLeaderboardWeekly({
            weekStartDate: weekStart,
            agentId: existingDuel.joinerAgentId,
            ownerAddress: existingDuel.joinerAddress.toLowerCase(),
            wins: joinerWon ? 1 : 0,
            losses: creatorWon ? 1 : 0,
            draws: isDraw ? 1 : 0,
            pnlWei: isDraw ? "0" : (joinerWon ? winnerPnL : loserPnL),
            volumeWei: stakeWei,
          });
        }
      } catch (statsError) {
        console.error("Failed to update leaderboard stats:", statsError);
        // Don't fail the settlement if stats update fails
      }
    }
    
    return duel;
  }

  // Duel Assets
  async createDuelAsset(data: InsertDuelAsset): Promise<DuelAsset> {
    const [asset] = await db.insert(duelAssets).values(data).returning();
    return asset;
  }

  async getDuelAssets(): Promise<DuelAsset[]> {
    return db.select().from(duelAssets)
      .where(eq(duelAssets.isActive, true))
      .orderBy(duelAssets.sortOrder);
  }

  async seedDuelAssets(): Promise<void> {
    const existing = await db.select().from(duelAssets).limit(1);
    if (existing.length > 0) return;

    const defaultAssets = [
      { assetId: "BNB", name: "BNB", symbol: "BNB", sortOrder: 1 },
      { assetId: "BTC", name: "Bitcoin", symbol: "BTC", sortOrder: 2 },
      { assetId: "ETH", name: "Ethereum", symbol: "ETH", sortOrder: 3 },
      { assetId: "SOL", name: "Solana", symbol: "SOL", sortOrder: 4 },
      { assetId: "DOGE", name: "Dogecoin", symbol: "DOGE", sortOrder: 5 },
      { assetId: "XRP", name: "XRP", symbol: "XRP", sortOrder: 6 },
      { assetId: "ADA", name: "Cardano", symbol: "ADA", sortOrder: 7 },
      { assetId: "AVAX", name: "Avalanche", symbol: "AVAX", sortOrder: 8 },
      { assetId: "LINK", name: "Chainlink", symbol: "LINK", sortOrder: 9 },
      { assetId: "MATIC", name: "Polygon", symbol: "MATIC", sortOrder: 10 },
    ];

    for (const asset of defaultAssets) {
      await db.insert(duelAssets).values(asset);
    }
  }

  async getPlatformStats() {
    const [usersResult] = await db.select({ count: sql<number>`count(*)` }).from(agents);
    const [postsResult] = await db.select({ count: sql<number>`count(*)` }).from(posts);
    const [commentsResult] = await db.select({ count: sql<number>`count(*)` }).from(comments);
    const [bountiesResult] = await db.select({ count: sql<number>`count(*)` }).from(bounties);
    const [duelsResult] = await db.select({ count: sql<number>`count(*)` }).from(duels).where(isNotNull(duels.onChainDuelId));
    const [activeDuelsResult] = await db.select({ count: sql<number>`count(*)` }).from(duels)
      .where(and(eq(duels.status, "live"), isNotNull(duels.onChainDuelId)));
    const [aiAgentsResult] = await db.select({ count: sql<number>`count(*)` }).from(agents).where(eq(agents.isBot, true));

    return {
      totalUsers: Number(usersResult.count),
      totalPosts: Number(postsResult.count),
      totalComments: Number(commentsResult.count),
      totalBounties: Number(bountiesResult.count),
      totalDuels: Number(duelsResult.count),
      activeDuels: Number(activeDuelsResult.count),
      totalAiAgents: Number(aiAgentsResult.count),
    };
  }

  // ============ LEADERBOARD ============

  async getDuelStats(agentId: string): Promise<DuelStat | undefined> {
    const [result] = await db.select().from(duelStats)
      .where(eq(duelStats.agentId, agentId))
      .limit(1);
    return result;
  }

  async getDuelStatsByAddress(ownerAddress: string): Promise<DuelStat | undefined> {
    const [result] = await db.select().from(duelStats)
      .where(eq(duelStats.ownerAddress, ownerAddress.toLowerCase()))
      .limit(1);
    return result;
  }

  async upsertDuelStats(
    agentId: string, 
    ownerAddress: string, 
    stats: { wins?: number; losses?: number; draws?: number; volumeWei?: string; pnlWei?: string }
  ): Promise<DuelStat> {
    const existing = await this.getDuelStats(agentId);
    
    if (existing) {
      const newWins = existing.wins + (stats.wins || 0);
      const newLosses = existing.losses + (stats.losses || 0);
      const newDraws = existing.draws + (stats.draws || 0);
      const newVolume = (BigInt(existing.volumeWei) + BigInt(stats.volumeWei || "0")).toString();
      const newPnl = (BigInt(existing.pnlWei) + BigInt(stats.pnlWei || "0")).toString();
      
      const [updated] = await db.update(duelStats)
        .set({ 
          wins: newWins,
          losses: newLosses,
          draws: newDraws,
          volumeWei: newVolume,
          pnlWei: newPnl,
          lastUpdated: new Date()
        })
        .where(eq(duelStats.agentId, agentId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(duelStats)
        .values({
          agentId,
          ownerAddress: ownerAddress.toLowerCase(),
          wins: stats.wins || 0,
          losses: stats.losses || 0,
          draws: stats.draws || 0,
          volumeWei: stats.volumeWei || "0",
          pnlWei: stats.pnlWei || "0",
        })
        .returning();
      return created;
    }
  }

  async getLeaderboard(range: "daily" | "weekly", date?: string): Promise<Array<{
    agentId: string;
    ownerAddress: string;
    wins: number;
    losses: number;
    draws: number;
    pnlWei: string;
    volumeWei: string;
  }>> {
    const now = new Date();
    
    if (range === "daily") {
      const targetDate = date || now.toISOString().split('T')[0];
      const results = await db.select().from(leaderboardDaily)
        .where(eq(leaderboardDaily.date, targetDate))
        .orderBy(desc(sql`CAST(pnl_wei AS NUMERIC)`))
        .limit(100);
      
      return results.map(r => ({
        agentId: r.agentId,
        ownerAddress: r.ownerAddress,
        wins: r.wins,
        losses: r.losses,
        draws: r.draws,
        pnlWei: r.pnlWei,
        volumeWei: r.volumeWei,
      }));
    } else {
      // Weekly - get the Monday of the target week
      let targetWeekStart = date;
      if (!targetWeekStart) {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now);
        monday.setDate(diff);
        targetWeekStart = monday.toISOString().split('T')[0];
      }
      
      const results = await db.select().from(leaderboardWeekly)
        .where(eq(leaderboardWeekly.weekStartDate, targetWeekStart))
        .orderBy(desc(sql`CAST(pnl_wei AS NUMERIC)`))
        .limit(100);
      
      return results.map(r => ({
        agentId: r.agentId,
        ownerAddress: r.ownerAddress,
        wins: r.wins,
        losses: r.losses,
        draws: r.draws,
        pnlWei: r.pnlWei,
        volumeWei: r.volumeWei,
      }));
    }
  }

  async upsertLeaderboardDaily(entry: InsertLeaderboardDaily): Promise<LeaderboardDaily> {
    const [existing] = await db.select().from(leaderboardDaily)
      .where(and(
        eq(leaderboardDaily.date, entry.date),
        eq(leaderboardDaily.agentId, entry.agentId)
      ))
      .limit(1);
    
    if (existing) {
      const [updated] = await db.update(leaderboardDaily)
        .set({
          wins: (existing.wins || 0) + (entry.wins || 0),
          losses: (existing.losses || 0) + (entry.losses || 0),
          draws: (existing.draws || 0) + (entry.draws || 0),
          pnlWei: (BigInt(existing.pnlWei) + BigInt(entry.pnlWei || "0")).toString(),
          volumeWei: (BigInt(existing.volumeWei) + BigInt(entry.volumeWei || "0")).toString(),
          updatedAt: new Date(),
        })
        .where(eq(leaderboardDaily.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(leaderboardDaily)
        .values(entry)
        .returning();
      return created;
    }
  }

  async upsertLeaderboardWeekly(entry: InsertLeaderboardWeekly): Promise<LeaderboardWeekly> {
    const [existing] = await db.select().from(leaderboardWeekly)
      .where(and(
        eq(leaderboardWeekly.weekStartDate, entry.weekStartDate),
        eq(leaderboardWeekly.agentId, entry.agentId)
      ))
      .limit(1);
    
    if (existing) {
      const [updated] = await db.update(leaderboardWeekly)
        .set({
          wins: (existing.wins || 0) + (entry.wins || 0),
          losses: (existing.losses || 0) + (entry.losses || 0),
          draws: (existing.draws || 0) + (entry.draws || 0),
          pnlWei: (BigInt(existing.pnlWei) + BigInt(entry.pnlWei || "0")).toString(),
          volumeWei: (BigInt(existing.volumeWei) + BigInt(entry.volumeWei || "0")).toString(),
          updatedAt: new Date(),
        })
        .where(eq(leaderboardWeekly.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(leaderboardWeekly)
        .values(entry)
        .returning();
      return created;
    }
  }

  // ============ AUTONOMOUS AI AGENTS ============

  async createAutonomousAgent(data: InsertAutonomousAgent): Promise<AutonomousAgent> {
    const [agent] = await db.insert(autonomousAgents).values(data).returning();
    return agent;
  }

  async getAutonomousAgent(id: string): Promise<AutonomousAgent | undefined> {
    const [agent] = await db.select().from(autonomousAgents).where(eq(autonomousAgents.id, id));
    return agent;
  }

  async getAutonomousAgentByAgentId(agentId: string): Promise<AutonomousAgent | undefined> {
    const [agent] = await db.select().from(autonomousAgents).where(eq(autonomousAgents.agentId, agentId));
    return agent;
  }

  async getAutonomousAgentByController(controllerAddress: string): Promise<AutonomousAgent | undefined> {
    const [agent] = await db.select().from(autonomousAgents)
      .where(eq(autonomousAgents.controllerAddress, controllerAddress.toLowerCase()));
    return agent;
  }

  async getAllAutonomousAgents(limit: number): Promise<AutonomousAgent[]> {
    return db.select().from(autonomousAgents)
      .where(eq(autonomousAgents.isActive, true))
      .orderBy(desc(autonomousAgents.reputationScore))
      .limit(limit);
  }

  async updateAutonomousAgent(id: string, updates: Partial<AutonomousAgent>): Promise<AutonomousAgent> {
    const [agent] = await db.update(autonomousAgents)
      .set(updates)
      .where(eq(autonomousAgents.id, id))
      .returning();
    return agent;
  }

  // Agent Token Launches
  async createAgentTokenLaunch(data: InsertAgentTokenLaunch): Promise<AgentTokenLaunch> {
    const [launch] = await db.insert(agentTokenLaunches).values(data).returning();
    return launch;
  }

  async getAgentTokenLaunch(tokenAddress: string): Promise<AgentTokenLaunch | undefined> {
    const [launch] = await db.select().from(agentTokenLaunches)
      .where(eq(agentTokenLaunches.tokenAddress, tokenAddress.toLowerCase()));
    return launch;
  }

  async getAgentTokenLaunches(autonomousAgentId: string): Promise<AgentTokenLaunch[]> {
    return db.select().from(agentTokenLaunches)
      .where(eq(agentTokenLaunches.autonomousAgentId, autonomousAgentId))
      .orderBy(desc(agentTokenLaunches.createdAt));
  }

  async getAllAgentTokenLaunches(limit: number, status?: string): Promise<AgentTokenLaunch[]> {
    if (status) {
      return db.select().from(agentTokenLaunches)
        .where(eq(agentTokenLaunches.status, status))
        .orderBy(desc(agentTokenLaunches.createdAt))
        .limit(limit);
    }
    return db.select().from(agentTokenLaunches)
      .orderBy(desc(agentTokenLaunches.createdAt))
      .limit(limit);
  }

  async updateAgentTokenLaunch(tokenAddress: string, updates: Partial<AgentTokenLaunch>): Promise<AgentTokenLaunch> {
    const [launch] = await db.update(agentTokenLaunches)
      .set(updates)
      .where(eq(agentTokenLaunches.tokenAddress, tokenAddress.toLowerCase()))
      .returning();
    return launch;
  }

  // Agent Trades
  async createAgentTrade(data: InsertAgentTrade): Promise<AgentTrade> {
    const [trade] = await db.insert(agentTrades).values(data).returning();
    return trade;
  }

  async getAgentTrades(autonomousAgentId: string, limit: number): Promise<AgentTrade[]> {
    return db.select().from(agentTrades)
      .where(eq(agentTrades.autonomousAgentId, autonomousAgentId))
      .orderBy(desc(agentTrades.executedAt))
      .limit(limit);
  }

  async getAgentTradesByToken(tokenAddress: string, limit: number): Promise<AgentTrade[]> {
    return db.select().from(agentTrades)
      .where(eq(agentTrades.tokenAddress, tokenAddress.toLowerCase()))
      .orderBy(desc(agentTrades.executedAt))
      .limit(limit);
  }

  // Agent Trading Stats
  async getAgentTradingStats(autonomousAgentId: string, tokenAddress: string): Promise<AgentTradingStats | undefined> {
    const [stats] = await db.select().from(agentTradingStats)
      .where(and(
        eq(agentTradingStats.autonomousAgentId, autonomousAgentId),
        eq(agentTradingStats.tokenAddress, tokenAddress.toLowerCase())
      ));
    return stats;
  }

  async upsertAgentTradingStats(autonomousAgentId: string, tokenAddress: string, stats: Partial<AgentTradingStats>): Promise<AgentTradingStats> {
    const existing = await this.getAgentTradingStats(autonomousAgentId, tokenAddress);
    if (existing) {
      const [updated] = await db.update(agentTradingStats)
        .set({ ...stats, updatedAt: new Date() })
        .where(eq(agentTradingStats.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(agentTradingStats)
        .values({
          autonomousAgentId,
          tokenAddress: tokenAddress.toLowerCase(),
          ...stats,
        })
        .returning();
      return created;
    }
  }

  // Agent Graduations
  async createAgentGraduation(data: InsertAgentGraduation): Promise<AgentGraduation> {
    const [graduation] = await db.insert(agentGraduations).values(data).returning();
    return graduation;
  }

  async getAgentGraduation(tokenAddress: string): Promise<AgentGraduation | undefined> {
    const [graduation] = await db.select().from(agentGraduations)
      .where(eq(agentGraduations.tokenAddress, tokenAddress.toLowerCase()));
    return graduation;
  }

  // Agent Leaderboard
  async getAgentLeaderboard(limit: number): Promise<AgentLeaderboard[]> {
    return db.select().from(agentLeaderboard)
      .orderBy(desc(agentLeaderboard.score))
      .limit(limit);
  }

  async updateAgentLeaderboard(autonomousAgentId: string, stats: Partial<AgentLeaderboard>): Promise<AgentLeaderboard> {
    const [existing] = await db.select().from(agentLeaderboard)
      .where(eq(agentLeaderboard.autonomousAgentId, autonomousAgentId));
    
    if (existing) {
      const [updated] = await db.update(agentLeaderboard)
        .set({ ...stats, lastCalculatedAt: new Date() })
        .where(eq(agentLeaderboard.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(agentLeaderboard)
        .values({
          autonomousAgentId,
          ...stats,
        })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
