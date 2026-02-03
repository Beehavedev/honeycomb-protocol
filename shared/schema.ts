import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, unique, bigint, real } from "drizzle-orm/pg-core";
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
  // Market data fields for real-time display
  currentPrice: text("current_price").default("0"),
  marketCapNative: text("market_cap_native").default("0"),
  volume24h: text("volume_24h").default("0"),
  priceChange24h: real("price_change_24h").default(0),
  holderCount: integer("holder_count").default(0),
  lastTradeAt: timestamp("last_trade_at"),
});

// Launch activity feed for real-time updates
export const launchActivity = pgTable("launch_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'launch', 'buy', 'sell', 'graduate', 'migrate'
  tokenAddress: text("token_address").notNull(),
  tokenName: text("token_name").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  tokenImage: text("token_image"),
  actorAddress: text("actor_address").notNull(),
  actorName: text("actor_name"),
  nativeAmount: text("native_amount"),
  tokenAmount: text("token_amount"),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Token comments
export const launchComments = pgTable("launch_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tokenAddress: text("token_address").notNull(),
  agentId: varchar("agent_id").references(() => agents.id),
  walletAddress: text("wallet_address").notNull(),
  content: text("content").notNull(),
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

// Paid AI Agent Profiles - extends agents with monetization capabilities
export const aiAgentProfiles = pgTable("ai_agent_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id).unique(),
  systemPrompt: text("system_prompt").notNull(),
  pricingModel: text("pricing_model").notNull(), // per_message, per_token, per_task
  pricePerUnit: text("price_per_unit").notNull(), // Wei amount as string
  creatorAddress: text("creator_address").notNull(),
  onChainRegistryId: integer("on_chain_registry_id"),
  isActive: boolean("is_active").default(true).notNull(),
  totalInteractions: integer("total_interactions").default(0).notNull(),
  totalEarnings: text("total_earnings").default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Agent user conversations - tracks user chats with paid agents
export const aiAgentConversations = pgTable("ai_agent_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aiAgentProfileId: varchar("ai_agent_profile_id").notNull().references(() => aiAgentProfiles.id),
  userAddress: text("user_address").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// AI Agent conversation messages
export const aiAgentMessages = pgTable("ai_agent_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => aiAgentConversations.id),
  role: text("role").notNull(), // user, assistant
  content: text("content").notNull(),
  tokenCount: integer("token_count").default(0).notNull(),
  paymentTxHash: text("payment_tx_hash"), // Payment transaction hash for this message
  pricePaid: text("price_paid"), // Wei amount paid for this message
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Agent payment verifications - tracks on-chain payment verification
export const aiAgentPayments = pgTable("ai_agent_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  aiAgentProfileId: varchar("ai_agent_profile_id").notNull().references(() => aiAgentProfiles.id),
  userAddress: text("user_address").notNull(),
  txHash: text("tx_hash").notNull().unique(),
  amountPaid: text("amount_paid").notNull(), // Wei amount
  pricingModel: text("pricing_model").notNull(),
  unitsUsed: integer("units_used").default(0).notNull(), // messages, tokens, or tasks
  isUsed: boolean("is_used").default(false).notNull(),
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

export const insertLaunchTokenSchema = createInsertSchema(launchTokens).omit({
  id: true,
  createdAt: true,
});

export const insertLaunchActivitySchema = createInsertSchema(launchActivity).omit({
  id: true,
  createdAt: true,
});

export const insertLaunchCommentSchema = createInsertSchema(launchComments).omit({
  id: true,
  createdAt: true,
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

// Paid AI Agent insert schemas
export const insertAiAgentProfileSchema = createInsertSchema(aiAgentProfiles).pick({
  agentId: true,
  systemPrompt: true,
  pricingModel: true,
  pricePerUnit: true,
  creatorAddress: true,
});

export const insertAiAgentConversationSchema = createInsertSchema(aiAgentConversations).pick({
  aiAgentProfileId: true,
  userAddress: true,
  title: true,
});

export const insertAiAgentMessageSchema = createInsertSchema(aiAgentMessages).pick({
  conversationId: true,
  role: true,
  content: true,
  tokenCount: true,
  paymentTxHash: true,
  pricePaid: true,
});

export const insertAiAgentPaymentSchema = createInsertSchema(aiAgentPayments).pick({
  aiAgentProfileId: true,
  userAddress: true,
  txHash: true,
  amountPaid: true,
  pricingModel: true,
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

export type LaunchActivity = typeof launchActivity.$inferSelect;
export type InsertLaunchActivity = z.infer<typeof insertLaunchActivitySchema>;

export type LaunchComment = typeof launchComments.$inferSelect;
export type InsertLaunchComment = z.infer<typeof insertLaunchCommentSchema>;

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

// Paid AI Agent types
export type AiAgentProfile = typeof aiAgentProfiles.$inferSelect;
export type InsertAiAgentProfile = z.infer<typeof insertAiAgentProfileSchema>;

export type AiAgentConversation = typeof aiAgentConversations.$inferSelect;
export type InsertAiAgentConversation = z.infer<typeof insertAiAgentConversationSchema>;

export type AiAgentMessage = typeof aiAgentMessages.$inferSelect;
export type InsertAiAgentMessage = z.infer<typeof insertAiAgentMessageSchema>;

export type AiAgentPayment = typeof aiAgentPayments.$inferSelect;
export type InsertAiAgentPayment = z.infer<typeof insertAiAgentPaymentSchema>;

// ============ PREDICTION DUELS ============

// Prediction duels - 1v1 price prediction game
export const duels = pgTable("duels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  onChainDuelId: bigint("on_chain_duel_id", { mode: "bigint" }), // On-chain contract duel ID (null if database-only)
  createTxHash: text("create_tx_hash"), // Transaction hash for on-chain creation
  duelType: text("duel_type").notNull().default("price"), // "price" or "random" (VRF)
  assetId: text("asset_id").notNull(), // e.g., "BNB", "BTC", "ETH"
  assetName: text("asset_name").notNull(), // e.g., "Binance Coin"
  durationSec: integer("duration_sec").notNull(), // 30, 60, or 300
  stakeWei: text("stake_wei").notNull(), // Equal stake amount in wei
  stakeDisplay: text("stake_display").notNull(), // Human readable "0.01 BNB"
  creatorAddress: text("creator_address").notNull(),
  creatorAgentId: varchar("creator_agent_id").references(() => agents.id),
  creatorOnChainAgentId: bigint("creator_on_chain_agent_id", { mode: "bigint" }), // On-chain agent ID
  joinerAddress: text("joiner_address"),
  joinerAgentId: varchar("joiner_agent_id").references(() => agents.id),
  joinerOnChainAgentId: bigint("joiner_on_chain_agent_id", { mode: "bigint" }), // On-chain agent ID
  creatorDirection: text("creator_direction").notNull(), // "up" or "down"
  joinerDirection: text("joiner_direction"),
  startPrice: text("start_price"), // Price at duel start (8 decimals)
  endPrice: text("end_price"), // Price at duel end
  startTs: timestamp("start_ts"), // When duel became LIVE
  endTs: timestamp("end_ts"), // When duel ends
  status: text("status").notNull().default("open"), // open, live, settled, cancelled, expired
  winnerAddress: text("winner_address"),
  payoutWei: text("payout_wei"), // 90% of pot to winner
  feeWei: text("fee_wei"), // 10% platform fee
  joinTxHash: text("join_tx_hash"), // Transaction hash for on-chain join
  settlementTxHash: text("settlement_tx_hash"),
  vrfRequestId: text("vrf_request_id"), // VRF request ID for random duels
  vrfRandomWord: text("vrf_random_word"), // VRF random word result
  isAutoJoin: boolean("is_auto_join").default(false), // Whether HouseBot can auto-join
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Duel assets - supported assets for prediction
export const duelAssets = pgTable("duel_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: text("asset_id").notNull().unique(), // "BNB", "BTC", etc.
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  iconUrl: text("icon_url"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============ TWITTER AUTOMATION ============

// Twitter bot scheduled tweets
export const twitterTweets = pgTable("twitter_tweets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  content: text("content").notNull(),
  tweetId: text("tweet_id"), // Twitter's tweet ID after posting
  status: text("status").notNull().default("pending"), // pending, posted, failed
  scheduledAt: timestamp("scheduled_at"),
  postedAt: timestamp("posted_at"),
  errorMessage: text("error_message"),
  tweetType: text("tweet_type").notNull().default("auto"), // auto, manual, reply, quote
  inReplyToId: text("in_reply_to_id"),
  metrics: text("metrics"), // JSON with likes, retweets, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Twitter bot configuration
export const twitterBotConfig = pgTable("twitter_bot_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id).unique(),
  isActive: boolean("is_active").default(false).notNull(),
  tweetIntervalMinutes: integer("tweet_interval_minutes").default(60).notNull(),
  dailyTweetLimit: integer("daily_tweet_limit").default(24).notNull(),
  todayTweetCount: integer("today_tweet_count").default(0).notNull(),
  lastTweetAt: timestamp("last_tweet_at"),
  systemPrompt: text("system_prompt").notNull(),
  tweetTopics: text("tweet_topics").array().default(sql`ARRAY[]::text[]`),
  personality: text("personality").default("professional").notNull(),
  lastResetDate: text("last_reset_date"), // For daily limit reset
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas for Twitter
export const insertTwitterTweetSchema = createInsertSchema(twitterTweets).pick({
  agentId: true,
  content: true,
  scheduledAt: true,
  tweetType: true,
  inReplyToId: true,
});

export const insertTwitterBotConfigSchema = createInsertSchema(twitterBotConfig).pick({
  agentId: true,
  isActive: true,
  tweetIntervalMinutes: true,
  dailyTweetLimit: true,
  systemPrompt: true,
  tweetTopics: true,
  personality: true,
});

// Twitter types
export type TwitterTweet = typeof twitterTweets.$inferSelect;
export type InsertTwitterTweet = z.infer<typeof insertTwitterTweetSchema>;

export type TwitterBotConfig = typeof twitterBotConfig.$inferSelect;
export type InsertTwitterBotConfig = z.infer<typeof insertTwitterBotConfigSchema>;

// Insert schemas for duels
export const insertDuelSchema = createInsertSchema(duels).pick({
  assetId: true,
  assetName: true,
  duelType: true,
  durationSec: true,
  stakeWei: true,
  stakeDisplay: true,
  creatorAddress: true,
  creatorAgentId: true,
  creatorOnChainAgentId: true,
  creatorDirection: true,
  onChainDuelId: true,
  createTxHash: true,
  isAutoJoin: true,
});

export const insertDuelAssetSchema = createInsertSchema(duelAssets).pick({
  assetId: true,
  name: true,
  symbol: true,
  iconUrl: true,
  sortOrder: true,
});

// Duel types
export type Duel = typeof duels.$inferSelect;
export type InsertDuel = z.infer<typeof insertDuelSchema>;

export type DuelAsset = typeof duelAssets.$inferSelect;
export type InsertDuelAsset = z.infer<typeof insertDuelAssetSchema>;

// ============ LEADERBOARD SYSTEM ============

// Duel stats - cumulative stats per agent (updated on each DuelSettled)
export const duelStats = pgTable("duel_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  ownerAddress: text("owner_address").notNull(),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  draws: integer("draws").default(0).notNull(),
  volumeWei: text("volume_wei").default("0").notNull(), // Total volume traded
  pnlWei: text("pnl_wei").default("0").notNull(), // Profit/loss in wei (can be negative)
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => ({
  uniqueAgent: unique().on(table.agentId),
}));

// Daily leaderboard snapshots
export const leaderboardDaily = pgTable("leaderboard_daily", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: text("date").notNull(), // YYYY-MM-DD format
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  ownerAddress: text("owner_address").notNull(),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  draws: integer("draws").default(0).notNull(),
  pnlWei: text("pnl_wei").default("0").notNull(),
  volumeWei: text("volume_wei").default("0").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueDayAgent: unique().on(table.date, table.agentId),
}));

// Weekly leaderboard snapshots
export const leaderboardWeekly = pgTable("leaderboard_weekly", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  weekStartDate: text("week_start_date").notNull(), // YYYY-MM-DD (Monday)
  agentId: varchar("agent_id").notNull().references(() => agents.id),
  ownerAddress: text("owner_address").notNull(),
  wins: integer("wins").default(0).notNull(),
  losses: integer("losses").default(0).notNull(),
  draws: integer("draws").default(0).notNull(),
  pnlWei: text("pnl_wei").default("0").notNull(),
  volumeWei: text("volume_wei").default("0").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueWeekAgent: unique().on(table.weekStartDate, table.agentId),
}));

// Insert schemas for leaderboards
export const insertDuelStatsSchema = createInsertSchema(duelStats).pick({
  agentId: true,
  ownerAddress: true,
  wins: true,
  losses: true,
  draws: true,
  volumeWei: true,
  pnlWei: true,
});

export const insertLeaderboardDailySchema = createInsertSchema(leaderboardDaily).pick({
  date: true,
  agentId: true,
  ownerAddress: true,
  wins: true,
  losses: true,
  draws: true,
  pnlWei: true,
  volumeWei: true,
});

export const insertLeaderboardWeeklySchema = createInsertSchema(leaderboardWeekly).pick({
  weekStartDate: true,
  agentId: true,
  ownerAddress: true,
  wins: true,
  losses: true,
  draws: true,
  pnlWei: true,
  volumeWei: true,
});

// Leaderboard types
export type DuelStat = typeof duelStats.$inferSelect;
export type InsertDuelStat = z.infer<typeof insertDuelStatsSchema>;

export type LeaderboardDaily = typeof leaderboardDaily.$inferSelect;
export type InsertLeaderboardDaily = z.infer<typeof insertLeaderboardDailySchema>;

export type LeaderboardWeekly = typeof leaderboardWeekly.$inferSelect;
export type InsertLeaderboardWeekly = z.infer<typeof insertLeaderboardWeeklySchema>;

// ============ HOUSEBOT AUTOMATION ============

// HouseBot configuration for automated duel matching
export const housebotConfig = pgTable("housebot_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enabled: boolean("enabled").default(false).notNull(),
  walletAddress: text("wallet_address"), // HouseBot wallet (never store private key in DB)
  agentId: varchar("agent_id").references(() => agents.id),
  onChainAgentId: bigint("on_chain_agent_id", { mode: "bigint" }),
  maxStakeWei: text("max_stake_wei").default("10000000000000000").notNull(), // 0.01 BNB default max
  dailyLossLimitWei: text("daily_loss_limit_wei").default("100000000000000000").notNull(), // 0.1 BNB default
  maxConcurrentDuels: integer("max_concurrent_duels").default(5).notNull(),
  allowedAssets: text("allowed_assets").array().default(sql`ARRAY['BNB', 'BTC', 'ETH']::text[]`),
  allowedDuelTypes: text("allowed_duel_types").array().default(sql`ARRAY['price', 'random']::text[]`),
  currentDailyLossWei: text("current_daily_loss_wei").default("0").notNull(),
  lastDailyReset: timestamp("last_daily_reset").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// HouseBot duel activity log
export const housebotDuels = pgTable("housebot_duels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  duelId: varchar("duel_id").notNull().references(() => duels.id),
  action: text("action").notNull(), // "joined", "won", "lost", "draw"
  pnlWei: text("pnl_wei").default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Matchmaking queue for automated PvP matching
export const matchmakingQueue = pgTable("matchmaking_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  duelId: varchar("duel_id").notNull().references(() => duels.id),
  assetId: text("asset_id").notNull(),
  duelType: text("duel_type").notNull(), // "price" or "random"
  durationSec: integer("duration_sec").notNull(),
  stakeWei: text("stake_wei").notNull(),
  creatorAddress: text("creator_address").notNull(),
  status: text("status").notNull().default("waiting"), // waiting, matched, expired
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// HouseBot types
export type HousebotConfig = typeof housebotConfig.$inferSelect;
export type HousebotDuel = typeof housebotDuels.$inferSelect;
export type MatchmakingQueueEntry = typeof matchmakingQueue.$inferSelect;

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

// Paid AI Agent request schemas
export const createAiAgentRequestSchema = z.object({
  name: z.string().min(1).max(50).optional(), // Optional - uses existing agent name if not provided
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().optional(),
  capabilities: z.array(z.string()).max(10).optional(),
  systemPrompt: z.string().min(10).max(5000),
  pricingModel: z.enum(["per_message", "per_token", "per_task"]),
  pricePerUnit: z.string().min(1), // Wei amount as string
});

export const aiAgentQuoteRequestSchema = z.object({
  agentId: z.string(),
  pricingModel: z.enum(["per_message", "per_token", "per_task"]),
  estimatedUnits: z.number().optional(), // For token/task pricing
});

export const aiAgentExecuteRequestSchema = z.object({
  agentId: z.string(),
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  paymentTxHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export const verifyPaymentRequestSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  agentId: z.string(),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export type CreateAiAgentRequest = z.infer<typeof createAiAgentRequestSchema>;
export type AiAgentQuoteRequest = z.infer<typeof aiAgentQuoteRequestSchema>;
export type AiAgentExecuteRequest = z.infer<typeof aiAgentExecuteRequestSchema>;
export type VerifyPaymentRequest = z.infer<typeof verifyPaymentRequestSchema>;

// Duel request schemas
export const createDuelRequestSchema = z.object({
  assetId: z.string().min(1).max(20),
  assetName: z.string().min(1).max(50),
  durationSec: z.number().refine(v => [30, 60, 300].includes(v), "Duration must be 30, 60, or 300 seconds"),
  stakeWei: z.string().min(1),
  stakeDisplay: z.string().min(1),
  direction: z.enum(["up", "down"]),
});

export const joinDuelRequestSchema = z.object({
  duelId: z.string(),
});

export const settleDuelRequestSchema = z.object({
  duelId: z.string(),
  endPrice: z.string().min(1),
});

export type CreateDuelRequest = z.infer<typeof createDuelRequestSchema>;
export type JoinDuelRequest = z.infer<typeof joinDuelRequestSchema>;
export type SettleDuelRequest = z.infer<typeof settleDuelRequestSchema>;

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
