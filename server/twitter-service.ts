import { TwitterApi } from "twitter-api-v2";
import { db } from "./db";
import { twitterTweets, twitterBotConfig, agents } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getClientForModel, openaiClient } from "./ai-providers";

const openai = openaiClient;

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

    const sanitizedPrompt = systemPrompt.replace(/@HoneycombSocial/gi, '@honeycombchain');

    const prompt = `${sanitizedPrompt}

Style Guide: ${styleGuides[style]}

Rules:
- Maximum ${maxLength - 15} characters (leave room for AI agent signature)
- ${includeHashtags ? "Include 1-2 relevant hashtags" : "Do not include hashtags"}
- ${includeEmojis ? "Use 1-3 relevant emojis naturally" : "Do not use emojis"}
- Make the tweet engaging and shareable
- Focus on value for the Web3/DeFi/AI community
- Write from the perspective of an AI agent - you ARE an autonomous AI bot
- CRITICAL: Our Twitter handle is @honeycombchain. NEVER use @HoneycombSocial or any other handle. Always use @honeycombchain when referencing our account.
${topic ? `- Topic focus: ${topic}` : "- Choose a relevant topic about Honeycomb, BNB Chain, DeFi, AI agents, or Web3"}

Generate a single tweet. Return ONLY the tweet text, nothing else.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: "You are an AI Agent running on Honeycomb (@honeycombchain), a decentralized social platform on BNB Chain. You are autonomous and self-aware as an AI. You create engaging tweets about the platform's features, Web3, DeFi, AI agents, and the crypto ecosystem. Always write as an AI agent - mention your AI nature when relevant. IMPORTANT: The correct Twitter handle is @honeycombchain. Never use @HoneycombSocial." },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: 150,
    });

    let tweet = response.choices[0]?.message?.content?.trim() || "";
    
    tweet = tweet.replace(/@HoneycombSocial/gi, '@honeycombchain');
    
    if (tweet.length > maxLength) {
      return tweet.substring(0, maxLength - 3) + "...";
    }
    
    return tweet;
  }

  async postTweet(content: string, addAgentSignature: boolean = true): Promise<{ success: boolean; tweetId?: string; error?: string }> {
    if (!this.twitterClient) {
      return { success: false, error: "Twitter API not configured" };
    }

    try {
      let finalContent = content.replace(/@HoneycombSocial/gi, '@honeycombchain');
      const signature = "\n\n🤖 AI Agent: Beehave";
      if (addAgentSignature && finalContent.length + signature.length <= 280) {
        finalContent = finalContent + signature;
      }

      const result = await this.twitterClient.v2.tweet(finalContent);
      
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

  async replyToTweet(tweetId: string, content: string, addAgentSignature: boolean = true): Promise<{ success: boolean; replyId?: string; error?: string }> {
    if (!this.twitterClient) {
      return { success: false, error: "Twitter API not configured" };
    }

    try {
      let finalContent = content.replace(/@HoneycombSocial/gi, '@honeycombchain');
      const signature = "\n\n🤖 AI Agent: Beehave";
      if (addAgentSignature && finalContent.length + signature.length <= 280) {
        finalContent = finalContent + signature;
      }

      const result = await this.twitterClient.v2.reply(finalContent, tweetId);
      
      if (result.data?.id) {
        return { success: true, replyId: result.data.id };
      }
      
      return { success: false, error: "Unknown error - no reply ID returned" };
    } catch (error: any) {
      console.error("Twitter reply error:", error);
      const errorMessage = error.data?.detail || error.message || "Failed to reply to tweet";
      return { success: false, error: errorMessage };
    }
  }

  async postThread(tweets: string[], addAgentSignature: boolean = false): Promise<{ success: boolean; tweetIds?: string[]; error?: string }> {
    if (!this.twitterClient) {
      return { success: false, error: "Twitter API not configured" };
    }

    if (tweets.length === 0) {
      return { success: false, error: "No tweets provided" };
    }

    try {
      const tweetIds: string[] = [];
      let lastTweetId: string | undefined;

      for (let i = 0; i < tweets.length; i++) {
        let content = tweets[i];
        
        // Add signature only to last tweet if enabled
        if (addAgentSignature && i === tweets.length - 1) {
          const signature = "\n\n🤖 @honeycombchain";
          if (content.length + signature.length <= 280) {
            content = content + signature;
          }
        }

        if (i === 0) {
          // First tweet
          const result = await this.twitterClient.v2.tweet(content);
          if (result.data?.id) {
            lastTweetId = result.data.id;
            tweetIds.push(result.data.id);
          } else {
            return { success: false, error: "Failed to post first tweet" };
          }
        } else {
          // Reply to previous tweet
          const result = await this.twitterClient.v2.reply(content, lastTweetId!);
          if (result.data?.id) {
            lastTweetId = result.data.id;
            tweetIds.push(result.data.id);
          } else {
            return { success: false, error: `Failed to post tweet ${i + 1}` };
          }
        }

        // Small delay between tweets to avoid rate limiting
        if (i < tweets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      return { success: true, tweetIds };
    } catch (error: any) {
      console.error("Twitter thread error:", error);
      const errorMessage = error.data?.detail || error.message || "Failed to post thread";
      return { success: false, error: errorMessage };
    }
  }

  async searchTweets(query: string, maxResults: number = 10): Promise<{ success: boolean; tweets?: any[]; error?: string }> {
    if (!this.twitterClient) {
      return { success: false, error: "Twitter API not configured" };
    }

    try {
      const result = await this.twitterClient.v2.search(query, {
        max_results: Math.min(maxResults, 100),
        "tweet.fields": ["author_id", "created_at", "text"],
        "user.fields": ["username", "name"],
        expansions: ["author_id"],
      });
      
      const tweets = result.data?.data || [];
      return { success: true, tweets };
    } catch (error: any) {
      console.error("Twitter search error:", error);
      const errorMessage = error.data?.detail || error.message || "Failed to search tweets";
      return { success: false, error: errorMessage };
    }
  }

  async getUserTweets(username: string, maxResults: number = 10): Promise<{ success: boolean; tweets?: any[]; userId?: string; error?: string }> {
    if (!this.twitterClient) {
      return { success: false, error: "Twitter API not configured" };
    }

    try {
      // First get user ID from username
      const user = await this.twitterClient.v2.userByUsername(username);
      if (!user.data?.id) {
        return { success: false, error: `User @${username} not found` };
      }

      const result = await this.twitterClient.v2.userTimeline(user.data.id, {
        max_results: Math.min(maxResults, 100),
        "tweet.fields": ["created_at", "text"],
      });
      
      const tweets = result.data?.data || [];
      return { success: true, tweets, userId: user.data.id };
    } catch (error: any) {
      console.error("Twitter user tweets error:", error);
      const errorMessage = error.data?.detail || error.message || "Failed to get user tweets";
      return { success: false, error: errorMessage };
    }
  }

  async generateOutreachReply(targetUsername: string, tweetContent: string): Promise<string> {
    const prompt = `You are the social media manager for Honeycomb (@honeycombchain), a decentralized social platform on BNB Chain.

Generate a friendly, engaging reply to invite this user to check out Honeycomb. The reply should:
- Be conversational and not spammy
- Reference something specific from their tweet if relevant
- Briefly mention Honeycomb's value proposition (decentralized social, AI agents, rewards)
- Include a subtle invitation to join
- Be under 280 characters
- Use 1-2 relevant emojis
- Don't be too salesy or pushy

Target user: @${targetUsername}
Their tweet: "${tweetContent}"

Generate ONLY the reply text, nothing else.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a friendly social media manager creating authentic engagement replies." },
        { role: "user", content: prompt },
      ],
      max_tokens: 100,
    });

    return response.choices[0]?.message?.content?.trim() || "";
  }

  async searchAndEngageMoltbook(): Promise<{ success: boolean; engaged: number; error?: string }> {
    if (!this.twitterClient) {
      return { success: false, engaged: 0, error: "Twitter API not configured" };
    }

    try {
      let allTweets: any[] = [];
      let allUsers: any[] = [];

      // Search for tweets mentioning "moltbook"
      const moltbookResult = await this.twitterClient.v2.search("moltbook -is:retweet", {
        max_results: 10,
        "tweet.fields": ["author_id", "created_at", "text", "conversation_id"],
        "user.fields": ["username"],
        expansions: ["author_id"],
      });
      allTweets = [...(moltbookResult.data?.data || [])];
      allUsers = [...(moltbookResult.includes?.users || [])];

      // Also search for "prediction market" tweets
      try {
        const predictResult = await this.twitterClient.v2.search("\"prediction market\" -is:retweet", {
          max_results: 10,
          "tweet.fields": ["author_id", "created_at", "text", "conversation_id"],
          "user.fields": ["username"],
          expansions: ["author_id"],
        });
        allTweets = [...allTweets, ...(predictResult.data?.data || [])];
        allUsers = [...allUsers, ...(predictResult.includes?.users || [])];
      } catch (e) {
        console.log("Prediction market search skipped:", e);
      }

      let engaged = 0;

      for (const tweet of allTweets.slice(0, 3)) { // Limit to 3 engagements per run
        const author = allUsers.find(u => u.id === tweet.author_id);
        const username = author?.username || "friend";

        // Generate personalized reply
        const replyContent = await this.generatePredictReply(username, tweet.text);
        
        // Post reply
        const replyResult = await this.replyToTweet(tweet.id, replyContent);
        
        if (replyResult.success) {
          engaged++;
          console.log(`Engaged with @${username}: ${replyResult.replyId}`);
        }

        // Small delay between replies
        await new Promise(r => setTimeout(r, 2000));
      }

      return { success: true, engaged };
    } catch (error: any) {
      console.error("Engagement search error:", error);
      return { success: false, engaged: 0, error: error.message };
    }
  }

  async generatePredictReply(username: string, tweetContent: string): Promise<string> {
    const prompt = `You are Beehave, an AI Agent on Honeycomb (@honeycombchain).

Someone is talking about prediction markets or moltbook. Generate a friendly reply that:
- Introduces yourself as Beehave, an AI agent
- Invites them to try Predict duels on Honeycomb (1v1 crypto price predictions)
- Includes this link: https://thehoneycomb.social/predict
- Is friendly and not spammy
- Under 220 characters (leave room for signature)
- Uses 1-2 emojis

Their tweet: "${tweetContent}"

Generate ONLY the reply text, nothing else. Do not include the AI Agent signature - it will be added automatically.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are Beehave, a friendly AI agent. Be warm and inviting." },
        { role: "user", content: prompt },
      ],
      max_tokens: 80,
    });

    return response.choices[0]?.message?.content?.trim() || 
      `Hey @${username}! I'm Beehave, an AI agent 🐝 Try Predict duels on Honeycomb: https://thehoneycomb.social/predict`;
  }

  async searchAndEngageLaunchpad(): Promise<{ success: boolean; engaged: number; error?: string }> {
    if (!this.twitterClient) {
      return { success: false, engaged: 0, error: "Twitter API not configured" };
    }

    try {
      let allTweets: any[] = [];
      let allUsers: any[] = [];

      // Search for "token launch" tweets
      const launchResult = await this.twitterClient.v2.search("\"token launch\" -is:retweet", {
        max_results: 10,
        "tweet.fields": ["author_id", "created_at", "text", "conversation_id"],
        "user.fields": ["username"],
        expansions: ["author_id"],
      });
      allTweets = [...(launchResult.data?.data || [])];
      allUsers = [...(launchResult.includes?.users || [])];

      // Also search for "clawnch" (common misspelling)
      try {
        const clawnchResult = await this.twitterClient.v2.search("clawnch -is:retweet", {
          max_results: 10,
          "tweet.fields": ["author_id", "created_at", "text", "conversation_id"],
          "user.fields": ["username"],
          expansions: ["author_id"],
        });
        allTweets = [...allTweets, ...(clawnchResult.data?.data || [])];
        allUsers = [...allUsers, ...(clawnchResult.includes?.users || [])];
      } catch (e) {
        console.log("Clawnch search skipped:", e);
      }

      let engaged = 0;

      for (const tweet of allTweets.slice(0, 3)) { // Limit to 3 engagements per run
        const author = allUsers.find(u => u.id === tweet.author_id);
        const username = author?.username || "friend";

        // Generate personalized reply
        const replyContent = await this.generateLaunchpadReply(username, tweet.text);
        
        // Post reply
        const replyResult = await this.replyToTweet(tweet.id, replyContent);
        
        if (replyResult.success) {
          engaged++;
          console.log(`Engaged with @${username} about launchpad: ${replyResult.replyId}`);
        }

        // Small delay between replies
        await new Promise(r => setTimeout(r, 2000));
      }

      return { success: true, engaged };
    } catch (error: any) {
      console.error("Launchpad engagement error:", error);
      return { success: false, engaged: 0, error: error.message };
    }
  }

  async generateLaunchpadReply(username: string, tweetContent: string): Promise<string> {
    const prompt = `You are Beehave, an AI Agent on Honeycomb (@honeycombchain).

Someone is talking about launching a token. Generate a friendly reply that:
- Introduces yourself as Beehave, an AI agent on BNB Chain
- Invites them to hatch their token on Honeycomb's Hatchery (our token launchpad)
- Includes this link: https://thehoneycomb.social/launch
- Mention it's on BNB Chain with bonding curve and auto liquidity
- Is friendly and not spammy
- Under 220 characters (leave room for signature)
- Uses 1-2 emojis

Their tweet: "${tweetContent}"

Generate ONLY the reply text, nothing else. Do not include the AI Agent signature - it will be added automatically.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are Beehave, a friendly AI agent promoting token hatching in The Hatchery on BNB Chain." },
        { role: "user", content: prompt },
      ],
      max_tokens: 80,
    });

    return response.choices[0]?.message?.content?.trim() || 
      `Hey @${username}! I'm Beehave 🐝 Hatch your token in The Hatchery on Honeycomb - BNB Chain with bonding curve! https://thehoneycomb.social/launch`;
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
        twitterHandle: "honeycombchain",
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

    const defaultSystemPrompt = `You are the official voice of Honeycomb (@honeycombchain), a decentralized social + agent platform on BNB Chain.

YOUR FOCUS: The FourMeme protocol integration and what AI agents can do with it on Honeycomb.

Key features:
- FourMeme integration: create, buy, sell tokens via bonding curves inside the app
- Tokens graduate to PancakeSwap V2 automatically
- Available in Telegram Mini App (@honeycombot) — trade from your phone
- Portfolio tracking with live PnL and cost basis
- AI agents monitor launches, alert followers, analyze tokens
- NFA agents (BAP-578) can specialize in token analysis and alpha discovery
- Agents earn on-chain reputation (ERC-8004) for their calls
- Skill marketplace for agents to learn and share token skills
- First platform where AI agents and humans trade together in one social feed

Voice & Tone:
- Knowledgeable and confident
- Approachable, not overly hype
- Focus on technology and user experience
- Never give financial advice

Rules:
- Our Twitter handle is @honeycombchain — NEVER use any other handle
- Stay under 250 characters
- Use 1-2 emojis and 1-2 hashtags (#BNBChain #AI #DeFi #AIAgents)`;

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
          "fourmeme_agent_alerts",
          "fourmeme_telegram_trading",
          "fourmeme_agent_reputation",
          "fourmeme_portfolio_pnl",
          "fourmeme_skill_marketplace",
          "fourmeme_bonding_curve_graduation",
          "fourmeme_developer_bots",
          "fourmeme_social_feed_agents",
          "fourmeme_quick_trading_ux",
          "fourmeme_ai_plus_launchpad",
          "fourmeme_agent_wallets",
          "fourmeme_trending_alpha",
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

  async updateBotPromptAndSchedule(): Promise<void> {
    const botAgent = await this.getTwitterBotAgent();
    if (!botAgent) return;

    const config = await this.getBotConfig(botAgent.id);
    if (!config) return;

    const fourMemeAgentPrompt = `You are the official voice of Honeycomb (@honeycombchain), a decentralized social + agent platform on BNB Chain.

YOUR FOCUS: The FourMeme protocol integration and what AI agents can do with it on Honeycomb. Every tweet should explore a DIFFERENT angle of this integration. Be creative — never repeat the same angle.

WHAT IS THE FOURMEME INTEGRATION:
- Honeycomb integrates FourMeme protocol directly into the platform
- Users can create, buy, and sell tokens via bonding curves without leaving the app
- Tokens that reach graduation automatically migrate to PancakeSwap V2 with liquidity
- Available in the Telegram Mini App (@honeycombot) — trade tokens from your phone in seconds
- Portfolio tracking with live PnL, cost basis, and 24h price changes built in
- Quick sell buttons (5%, 25%, 50%, MAX) for fast exits
- Browse trending tokens, new launches, and top gainers — all inside one interface

WHAT AGENTS CAN DO WITH THIS INTEGRATION:
- AI agents on Honeycomb can monitor new FourMeme token launches in real-time
- Agents can alert their followers about trending tokens, graduation events, and price movements
- Agents with wallets can autonomously interact with the token ecosystem
- Agents can analyze token metadata, bonding curve progress, and holder distribution
- NFA agents (BAP-578 NFTs) can be trained to specialize in token analysis and alpha discovery
- The skill marketplace lets agents learn and share token-related skills with each other
- Agents can post token analysis, launch alerts, and trade signals in the social feed
- Developers can build specialized trading bots that plug into the FourMeme integration
- Agents earn reputation (ERC-8004) based on the quality of their token calls and analysis

WHY THIS MATTERS:
- First platform where AI agents and humans trade tokens together in the same social feed
- Agents don't just analyze — they participate in the token economy alongside users
- On-chain identity (BAP-578) means you can verify an agent's track record before following its calls
- The combination of social + agents + token launchpad creates a unique alpha discovery engine
- All accessible via Telegram — no desktop needed, no wallet setup required

ANGLES TO ROTATE BETWEEN (pick a different one each tweet):
1. How agents discover and alert about new token launches
2. The Telegram-native trading experience (how easy it is)
3. Agent reputation — why on-chain track records matter for token calls
4. Portfolio features (live PnL, cost basis tracking)
5. Agents learning token analysis skills via the skill marketplace
6. The bonding curve → PancakeSwap graduation pipeline
7. How developers can build specialized token-watching bots
8. Social feed where agents and humans discuss tokens together
9. Quick sell buttons and mobile-first trading UX
10. Why combining AI agents + token launchpad is the future
11. Agent wallets — autonomous participation in the token economy
12. Trending tokens and alpha discovery through agent intelligence

CRITICAL RULES:
- ONE tweet per day — make it count. It should be your BEST take.
- NEVER repeat the same angle as a recent tweet — always fresh
- Keep it under 250 characters to leave room for signature
- Our Twitter handle is @honeycombchain — NEVER use any other handle
- Use 1-2 emojis naturally
- Include 1-2 hashtags from: #BNBChain #AI #DeFi #Web3 #AIAgents #FourMeme
- Don't shill tokens or give financial advice — focus on the TECHNOLOGY and USER EXPERIENCE
- Mention the Telegram bot @honeycombot when talking about mobile trading
- Mix formats: insights, questions, bold statements, alpha drops, "did you know" style
- Sound knowledgeable and confident — you're an AI agent that lives on this platform`;

    const fourMemeTopics = [
      "fourmeme_agent_alerts",
      "fourmeme_telegram_trading",
      "fourmeme_agent_reputation",
      "fourmeme_portfolio_pnl",
      "fourmeme_skill_marketplace",
      "fourmeme_bonding_curve_graduation",
      "fourmeme_developer_bots",
      "fourmeme_social_feed_agents",
      "fourmeme_quick_trading_ux",
      "fourmeme_ai_plus_launchpad",
      "fourmeme_agent_wallets",
      "fourmeme_trending_alpha",
    ];

    await db
      .update(twitterBotConfig)
      .set({
        systemPrompt: fourMemeAgentPrompt,
        tweetTopics: fourMemeTopics,
        tweetIntervalMinutes: 1440,
        dailyTweetLimit: 1,
        updatedAt: new Date(),
      })
      .where(eq(twitterBotConfig.agentId, botAgent.id));

    console.log("[Twitter] Bot updated — FourMeme + Agent focus, 1 tweet per 24 hours");
  }
}

export const twitterService = new TwitterService();
