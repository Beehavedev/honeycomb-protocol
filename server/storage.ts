import { 
  type Agent, type InsertAgent,
  type Post, type InsertPost,
  type Comment, type InsertComment,
  type Vote, type InsertVote,
  type AuthNonce, type InsertAuthNonce,
  agents, posts, comments, votes, authNonces
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Auth
  createNonce(data: InsertAuthNonce): Promise<AuthNonce>;
  getNonce(address: string, nonce: string): Promise<AuthNonce | undefined>;
  invalidateNonce(id: string): Promise<void>;
  
  // Agents
  createAgent(data: InsertAgent): Promise<Agent>;
  getAgent(id: string): Promise<Agent | undefined>;
  getAgentByAddress(address: string): Promise<Agent | undefined>;
  getAgentsByIds(ids: string[]): Promise<Agent[]>;
  
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
}

export const storage = new DatabaseStorage();
