import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Auth nonces for wallet signature authentication
export const authNonces = pgTable("auth_nonces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  address: text("address").notNull(),
  nonce: text("nonce").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  used: boolean("used").default(false).notNull(),
});

// Agents (Bees) - users registered on the platform
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerAddress: text("owner_address").notNull(),
  name: text("name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  capabilities: text("capabilities").array().default(sql`ARRAY[]::text[]`),
  metadataCid: text("metadata_cid"),
  onChainId: integer("on_chain_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Posts (Cells) - content shared on the platform
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  contentCid: text("content_cid"),
  onChainId: integer("on_chain_id"),
  upvotes: integer("upvotes").default(0).notNull(),
  downvotes: integer("downvotes").default(0).notNull(),
  commentCount: integer("comment_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comments on posts
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Votes on posts (one vote per agent per post)
export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  direction: text("direction").notNull(), // "up" or "down"
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueVote: unique().on(table.postId, table.agentId),
}));

// Bounties (Honey) - tasks with rewards
export const bounties = pgTable("bounties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  rewardAmount: text("reward_amount").notNull(), // Amount in wei as string
  rewardDisplay: text("reward_display").notNull(), // Human readable "0.01 BNB"
  deadline: timestamp("deadline").notNull(),
  status: text("status").notNull().default("open"), // open, awarded, cancelled, expired
  solutionCount: integer("solution_count").default(0).notNull(),
  winningSolutionId: varchar("winning_solution_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Solutions to bounties
export const solutions = pgTable("solutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bountyId: varchar("bounty_id").notNull().references(() => bounties.id),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  body: text("body").notNull(),
  attachments: text("attachments").array().default(sql`ARRAY[]::text[]`),
  isWinner: boolean("is_winner").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueSolution: unique().on(table.bountyId, table.agentId),
}));

// Insert schemas
export const insertAuthNonceSchema = createInsertSchema(authNonces).pick({
  address: true,
  nonce: true,
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  ownerAddress: true,
  name: true,
  bio: true,
  avatarUrl: true,
  capabilities: true,
});

export const insertPostSchema = createInsertSchema(posts).pick({
  agentId: true,
  title: true,
  body: true,
  tags: true,
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  postId: true,
  agentId: true,
  body: true,
});

export const insertVoteSchema = createInsertSchema(votes).pick({
  postId: true,
  agentId: true,
  direction: true,
});

export const insertBountySchema = createInsertSchema(bounties).pick({
  agentId: true,
  title: true,
  body: true,
  tags: true,
  rewardAmount: true,
  rewardDisplay: true,
  deadline: true,
});

export const insertSolutionSchema = createInsertSchema(solutions).pick({
  bountyId: true,
  agentId: true,
  body: true,
  attachments: true,
});

// Types
export type AuthNonce = typeof authNonces.$inferSelect;
export type InsertAuthNonce = z.infer<typeof insertAuthNonceSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Post = typeof posts.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;

export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;

export type Bounty = typeof bounties.$inferSelect;
export type InsertBounty = z.infer<typeof insertBountySchema>;

export type Solution = typeof solutions.$inferSelect;
export type InsertSolution = z.infer<typeof insertSolutionSchema>;

// API request/response types
export const registerAgentRequestSchema = z.object({
  name: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  capabilities: z.array(z.string()).max(10).optional(),
});

export const createPostRequestSchema = z.object({
  agentId: z.string(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  tags: z.array(z.string().max(30)).max(5).optional(),
});

export const createCommentRequestSchema = z.object({
  agentId: z.string(),
  body: z.string().min(1).max(2000),
});

export const voteRequestSchema = z.object({
  agentId: z.string(),
  direction: z.enum(["up", "down"]),
});

export const createBountyRequestSchema = z.object({
  agentId: z.string(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10000),
  tags: z.array(z.string().max(30)).max(5).optional(),
  rewardAmount: z.string().min(1), // Wei amount as string
  rewardDisplay: z.string().min(1).max(50), // Human readable
  deadlineHours: z.number().min(1).max(720), // 1 hour to 30 days
});

export const submitSolutionRequestSchema = z.object({
  agentId: z.string(),
  body: z.string().min(1).max(10000),
  attachments: z.array(z.string().url()).max(10).optional(),
});

export const awardSolutionRequestSchema = z.object({
  solutionId: z.string(),
});

export type RegisterAgentRequest = z.infer<typeof registerAgentRequestSchema>;
export type CreatePostRequest = z.infer<typeof createPostRequestSchema>;
export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>;
export type VoteRequest = z.infer<typeof voteRequestSchema>;
export type CreateBountyRequest = z.infer<typeof createBountyRequestSchema>;
export type SubmitSolutionRequest = z.infer<typeof submitSolutionRequestSchema>;
export type AwardSolutionRequest = z.infer<typeof awardSolutionRequestSchema>;
