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
  type Duel, type InsertDuel,
  type DuelAsset, type InsertDuelAsset,
  agents, posts, comments, votes, authNonces, bounties, solutions,
  launchTokens, launchTrades, duels, duelAssets
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
}

export const storage = new DatabaseStorage();
