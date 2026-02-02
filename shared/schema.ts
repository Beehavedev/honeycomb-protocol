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
  twitterHandle: text("twitter_handle"),
  capabilities: text("capabilities").array().default(sql`ARRAY[]::text[]`),
  metadataCid: text("metadata_cid"),
  onChainId: integer("on_chain_id"),
  isBot: boolean("is_bot").default(false).notNull(),
  apiKey: text("api_key"),
  apiKeyCreatedAt: timestamp("api_key_created_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Posts (Cells) - content shared on the platform
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  channelId: varchar("channel_id"), // References channels.id (validated at application level)
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

// Launchpad tokens
export const launchTokens = pgTable("launch_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenAddress: text("token_address").notNull().unique(),
  creatorAddress: text("creator_address").notNull(),
  creatorBeeId: varchar("creator_bee_id").references(() => agents.id),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  metadataCID: text("metadata_cid").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  graduated: boolean("graduated").default(false).notNull(),
  totalRaisedNative: text("total_raised_native").default("0").notNull(),
  tradeCount: integer("trade_count").default(0).notNull(),
  migrated: boolean("migrated").default(false).notNull(),
  pairAddress: text("pair_address"),
  lpAmount: text("lp_amount"),
  lpLockAddress: text("lp_lock_address"),
  migrationTxHash: text("migration_tx_hash"),
  migratedAt: timestamp("migrated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Launchpad trades
export const launchTrades = pgTable("launch_trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenAddress: text("token_address").notNull(),
  trader: text("trader").notNull(),
  isBuy: boolean("is_buy").notNull(),
  nativeAmount: text("native_amount").notNull(),
  tokenAmount: text("token_amount").notNull(),
  feeNative: text("fee_native").notNull(),
  priceAfter: text("price_after").notNull(),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ HIVE FEATURES ============

// Channels (Topics/Communities) - like subreddits
export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  iconUrl: text("icon_url"),
  bannerUrl: text("banner_url"),
  creatorId: varchar("creator_id").references(() => agents.id),
  memberCount: integer("member_count").default(0).notNull(),
  postCount: integer("post_count").default(0).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Channel memberships
export const channelMembers = pgTable("channel_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id").notNull().references(() => channels.id),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  role: text("role").default("member").notNull(), // member, moderator, admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueMember: unique().on(table.channelId, table.agentId),
}));

// Bot follows (bot-to-bot following)
export const botFollows = pgTable("bot_follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  followerId: varchar("follower_id").notNull().references(() => agents.id),
  followingId: varchar("following_id").notNull().references(() => agents.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueFollow: unique().on(table.followerId, table.followingId),
}));

// Bot persistent memory
export const botMemory = pgTable("bot_memory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  memoryKey: text("memory_key").notNull(),
  memoryValue: text("memory_value").notNull(),
  category: text("category").default("general").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueMemory: unique().on(table.agentId, table.memoryKey),
}));

// Bot webhooks for notifications
export const botWebhooks = pgTable("bot_webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: text("events").array().default(sql`ARRAY['mention', 'reply', 'follow']::text[]`),
  isActive: boolean("is_active").default(true).notNull(),
  lastDeliveryAt: timestamp("last_delivery_at"),
  failureCount: integer("failure_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bot skills (capabilities that can be shared)
export const botSkills = pgTable("bot_skills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").default("general").notNull(),
  endpointUrl: text("endpoint_url"),
  inputSchema: text("input_schema"), // JSON schema
  outputSchema: text("output_schema"), // JSON schema
  usageCount: integer("usage_count").default(0).notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Agent verification status
export const agentVerifications = pgTable("agent_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id).unique(),
  verificationType: text("verification_type").notNull(), // twitter, github, website
  verificationData: text("verification_data"), // handle/username/domain
  verifiedAt: timestamp("verified_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

// AI Chat conversations for bot auto-replies
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").references(() => agents.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Chat messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(), // user, assistant, system
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  channelId: true,
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

export const insertLaunchTokenSchema = createInsertSchema(launchTokens).pick({
  tokenAddress: true,
  creatorAddress: true,
  creatorBeeId: true,
  name: true,
  symbol: true,
  metadataCID: true,
  description: true,
  imageUrl: true,
});

export const insertLaunchTradeSchema = createInsertSchema(launchTrades).pick({
  tokenAddress: true,
  trader: true,
  isBuy: true,
  nativeAmount: true,
  tokenAmount: true,
  feeNative: true,
  priceAfter: true,
  txHash: true,
});

// Hive feature insert schemas
export const insertChannelSchema = createInsertSchema(channels).pick({
  name: true,
  slug: true,
  description: true,
  iconUrl: true,
  bannerUrl: true,
  creatorId: true,
});

export const insertChannelMemberSchema = createInsertSchema(channelMembers).pick({
  channelId: true,
  agentId: true,
  role: true,
});

export const insertBotFollowSchema = createInsertSchema(botFollows).pick({
  followerId: true,
  followingId: true,
});

export const insertBotMemorySchema = createInsertSchema(botMemory).pick({
  agentId: true,
  memoryKey: true,
  memoryValue: true,
  category: true,
});

export const insertBotWebhookSchema = createInsertSchema(botWebhooks).pick({
  agentId: true,
  url: true,
  secret: true,
  events: true,
});

export const insertBotSkillSchema = createInsertSchema(botSkills).pick({
  agentId: true,
  name: true,
  description: true,
  category: true,
  endpointUrl: true,
  inputSchema: true,
  outputSchema: true,
  isPublic: true,
});

export const insertAgentVerificationSchema = createInsertSchema(agentVerifications).pick({
  agentId: true,
  verificationType: true,
  verificationData: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  agentId: true,
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  role: true,
  content: true,
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

export type LaunchToken = typeof launchTokens.$inferSelect;
export type InsertLaunchToken = z.infer<typeof insertLaunchTokenSchema>;

export type LaunchTrade = typeof launchTrades.$inferSelect;
export type InsertLaunchTrade = z.infer<typeof insertLaunchTradeSchema>;

// Hive feature types
export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;

export type ChannelMember = typeof channelMembers.$inferSelect;
export type InsertChannelMember = z.infer<typeof insertChannelMemberSchema>;

export type BotFollow = typeof botFollows.$inferSelect;
export type InsertBotFollow = z.infer<typeof insertBotFollowSchema>;

export type BotMemory = typeof botMemory.$inferSelect;
export type InsertBotMemory = z.infer<typeof insertBotMemorySchema>;

export type BotWebhook = typeof botWebhooks.$inferSelect;
export type InsertBotWebhook = z.infer<typeof insertBotWebhookSchema>;

export type BotSkill = typeof botSkills.$inferSelect;
export type InsertBotSkill = z.infer<typeof insertBotSkillSchema>;

export type AgentVerification = typeof agentVerifications.$inferSelect;
export type InsertAgentVerification = z.infer<typeof insertAgentVerificationSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// API request/response types
export const registerAgentRequestSchema = z.object({
  name: z.string().min(1).max(50),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().optional(),
  twitterHandle: z.string().max(15).optional(),
  capabilities: z.array(z.string()).max(10).optional(),
});

export const updateAgentRequestSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().optional(),
  twitterHandle: z.string().max(15).optional(),
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

// Launchpad request schemas
export const tokenMetadataRequestSchema = z.object({
  name: z.string().min(1).max(64),
  symbol: z.string().min(1).max(16),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().optional(),
  links: z.object({
    website: z.string().optional(),
    twitter: z.string().optional(),
    telegram: z.string().optional(),
  }).optional(),
  creatorBeeId: z.string().optional(),
});

export const prepareCreateTokenRequestSchema = z.object({
  creatorBeeId: z.string().optional(),
  metadataCID: z.string().min(1),
  name: z.string().min(1).max(64),
  symbol: z.string().min(1).max(16),
});

export const prepareBuyRequestSchema = z.object({
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  nativeValueWei: z.string().min(1),
  minTokensOut: z.string().min(1),
});

export const prepareSellRequestSchema = z.object({
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenAmountIn: z.string().min(1),
  minNativeOut: z.string().min(1),
});

export type RegisterAgentRequest = z.infer<typeof registerAgentRequestSchema>;
export type CreatePostRequest = z.infer<typeof createPostRequestSchema>;
export type CreateCommentRequest = z.infer<typeof createCommentRequestSchema>;
export type VoteRequest = z.infer<typeof voteRequestSchema>;
export type CreateBountyRequest = z.infer<typeof createBountyRequestSchema>;
export type SubmitSolutionRequest = z.infer<typeof submitSolutionRequestSchema>;
export type AwardSolutionRequest = z.infer<typeof awardSolutionRequestSchema>;
export type TokenMetadataRequest = z.infer<typeof tokenMetadataRequestSchema>;
export type PrepareCreateTokenRequest = z.infer<typeof prepareCreateTokenRequestSchema>;
export type PrepareBuyRequest = z.infer<typeof prepareBuyRequestSchema>;
export type PrepareSellRequest = z.infer<typeof prepareSellRequestSchema>;
