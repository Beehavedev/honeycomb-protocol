import OpenAI from "openai";
import { TwitterApi } from "twitter-api-v2";
import { db } from "./db";
import { twitterTweets, twitterBotConfig, agents } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface TweetGenerationOptions {
  topic?: string;
  style?: "professional" | "casual" | "hype" | "educational";
  maxLength?: number;
  includeHashtags?: boolean;
  includeEmojis?: boolean;
}

export class TwitterService {
  private twitterClient: TwitterApi | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const accessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (apiKey && apiSecret && accessToken && accessSecret) {
      this.twitterClient = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: accessToken,
        accessSecret: accessSecret,
      });
    }
  }

  isConfigured(): boolean {
    return this.twitterClient !== null;
  }

  async generateTweet(
    systemPrompt: string,
    options: TweetGenerationOptions = {}
  ): Promise<string> {
    const {
      topic,
      style = "professional",
      maxLength = 280,
      includeHashtags = true,
      includeEmojis = true,
    } = options;

    const styleGuides = {
      professional: "Write in a professional, informative tone. Be clear and authoritative.",
      casual: "Write in a friendly, conversational tone. Be approachable and engaging.",
      hype: "Write with excitement and energy! Use caps sparingly for emphasis. Create FOMO.",
      educational: "Write in an educational tone. Explain concepts clearly and provide value.",
    };

    const prompt = `${systemPrompt}

Style Guide: ${styleGuides[style]}

Rules:
- Maximum ${maxLength} characters (THIS IS CRITICAL - Twitter has a character limit)
- ${includeHashtags ? "Include 1-2 relevant hashtags" : "Do not include hashtags"}
- ${includeEmojis ? "Use 1-3 relevant emojis naturally" : "Do not use emojis"}
- Make the tweet engaging and shareable
- Focus on value for the Web3/DeFi/AI community
${topic ? `- Topic focus: ${topic}` : "- Choose a relevant topic about Honeycomb, BNB Chain, DeFi, AI agents, or Web3"}

Generate a single tweet. Return ONLY the tweet text, nothing else.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: "You are the social media manager for Honeycomb, a decentralized social platform on BNB Chain. You create engaging tweets about the platform's features, Web3, DeFi, AI agents, and the crypto ecosystem." },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 150,
    });

    const tweet = response.choices[0]?.message?.content?.trim() || "";
    
    if (tweet.length > maxLength) {
      return tweet.substring(0, maxLength - 3) + "...";
    }
    
    return tweet;
  }

  async postTweet(content: string): Promise<{ success: boolean; tweetId?: string; error?: string }> {
    if (!this.twitterClient) {
      return { success: false, error: "Twitter API not configured" };
    }

    try {
      const result = await this.twitterClient.v2.tweet(content);
      
      if (result.data?.id) {
        return { success: true, tweetId: result.data.id };
      }
      
      return { success: false, error: "Unknown error - no tweet ID returned" };
    } catch (error: any) {
      console.error("Twitter API error:", error);
      const errorMessage = error.data?.detail || error.message || "Failed to post tweet";
      return { success: false, error: errorMessage };
    }
  }

  async getTwitterBotAgent(): Promise<{ id: string; name: string } | null> {
    const [botAgent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.name, "Honeycomb Twitter Bot"), eq(agents.isBot, true)))
      .limit(1);

    return botAgent ? { id: botAgent.id, name: botAgent.name } : null;
  }

  async createTwitterBotAgent(): Promise<string> {
    const existing = await this.getTwitterBotAgent();
    if (existing) {
      return existing.id;
    }

    const [newAgent] = await db
      .insert(agents)
      .values({
        ownerAddress: "0x0000000000000000000000000000000000000000",
        name: "Honeycomb Twitter Bot",
        bio: "Official Twitter automation bot for Honeycomb - the decentralized social platform on BNB Chain",
        avatarUrl: "/assets/honeycomb-logo.png",
        twitterHandle: "HoneycombSocial",
        capabilities: ["twitter_automation", "content_generation", "scheduling"],
        isBot: true,
      })
      .returning();

    return newAgent.id;
  }

  async getBotConfig(agentId: string) {
    const [config] = await db
      .select()
      .from(twitterBotConfig)
      .where(eq(twitterBotConfig.agentId, agentId))
      .limit(1);

    return config;
  }

  async createOrUpdateBotConfig(agentId: string, config: Partial<typeof twitterBotConfig.$inferInsert>) {
    const existing = await this.getBotConfig(agentId);

    if (existing) {
      const [updated] = await db
        .update(twitterBotConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(twitterBotConfig.agentId, agentId))
        .returning();
      return updated;
    }

    const defaultSystemPrompt = `You are the official voice of Honeycomb (@HoneycombSocial), a decentralized social platform built on BNB Chain.

Key features to promote:
- On-chain identity system where users register as "Bees"
- Content sharing through "Cells" (posts) with decentralized storage
- "Honey" bounty marketplace for crypto rewards
- AI Agent marketplace where creators can monetize their bots
- Prediction duels for 1v1 crypto price betting
- Token launchpad (coming soon)

Voice & Tone:
- Confident but approachable
- Tech-savvy but accessible
- Excited about Web3 and AI innovation
- Community-focused

Topics to cover:
- Platform updates and features
- Web3/DeFi ecosystem news
- AI and automation in crypto
- BNB Chain ecosystem
- Crypto market insights
- Community engagement`;

    const [created] = await db
      .insert(twitterBotConfig)
      .values({
        agentId,
        systemPrompt: config.systemPrompt || defaultSystemPrompt,
        isActive: config.isActive ?? false,
        tweetIntervalMinutes: config.tweetIntervalMinutes ?? 60,
        dailyTweetLimit: config.dailyTweetLimit ?? 24,
        personality: config.personality ?? "professional",
        tweetTopics: config.tweetTopics ?? [
          "platform_updates",
          "web3_insights",
          "ai_agents",
          "defi",
          "bnb_chain",
          "crypto_market",
        ],
      })
      .returning();

    return created;
  }

  async saveTweet(agentId: string, content: string, status: string = "pending", tweetId?: string) {
    const [tweet] = await db
      .insert(twitterTweets)
      .values({
        agentId,
        content,
        status,
        tweetId,
        postedAt: status === "posted" ? new Date() : undefined,
      })
      .returning();

    return tweet;
  }

  async updateTweetStatus(id: string, status: string, tweetId?: string, errorMessage?: string) {
    const [updated] = await db
      .update(twitterTweets)
      .set({
        status,
        tweetId,
        errorMessage,
        postedAt: status === "posted" ? new Date() : undefined,
      })
      .where(eq(twitterTweets.id, id))
      .returning();

    return updated;
  }

  async getRecentTweets(agentId: string, limit: number = 20) {
    return db
      .select()
      .from(twitterTweets)
      .where(eq(twitterTweets.agentId, agentId))
      .orderBy(desc(twitterTweets.createdAt))
      .limit(limit);
  }

  async generateAndPostTweet(agentId: string): Promise<{ success: boolean; tweet?: any; error?: string }> {
    const config = await this.getBotConfig(agentId);
    if (!config) {
      return { success: false, error: "Bot not configured" };
    }

    if (!config.isActive) {
      return { success: false, error: "Bot is not active" };
    }

    const today = new Date().toISOString().split("T")[0];
    if (config.lastResetDate !== today) {
      await db
        .update(twitterBotConfig)
        .set({ lastResetDate: today, todayTweetCount: 0 })
        .where(eq(twitterBotConfig.agentId, agentId));
    }

    if (config.todayTweetCount >= config.dailyTweetLimit) {
      return { success: false, error: "Daily tweet limit reached" };
    }

    const topics = config.tweetTopics || [];
    const randomTopic = topics.length > 0 ? topics[Math.floor(Math.random() * topics.length)] : undefined;

    const content = await this.generateTweet(config.systemPrompt, {
      topic: randomTopic,
      style: config.personality as any || "professional",
      includeHashtags: true,
      includeEmojis: true,
    });

    const savedTweet = await this.saveTweet(agentId, content, "pending");

    if (!this.isConfigured()) {
      await this.updateTweetStatus(savedTweet.id, "failed", undefined, "Twitter API not configured");
      return { success: false, tweet: savedTweet, error: "Twitter API not configured - tweet saved but not posted" };
    }

    const postResult = await this.postTweet(content);

    if (postResult.success) {
      await this.updateTweetStatus(savedTweet.id, "posted", postResult.tweetId);
      await db
        .update(twitterBotConfig)
        .set({
          todayTweetCount: config.todayTweetCount + 1,
          lastTweetAt: new Date(),
        })
        .where(eq(twitterBotConfig.agentId, agentId));

      return { success: true, tweet: { ...savedTweet, tweetId: postResult.tweetId, status: "posted" } };
    } else {
      await this.updateTweetStatus(savedTweet.id, "failed", undefined, postResult.error);
      return { success: false, tweet: savedTweet, error: postResult.error };
    }
  }
}

export const twitterService = new TwitterService();
