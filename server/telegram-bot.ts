import crypto from "crypto";
import { storage } from "./storage";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";

function getMiniAppUrl(): string {
  if (process.env.TELEGRAM_MINI_APP_URL) return process.env.TELEGRAM_MINI_APP_URL;
  return "https://thehoneycomb.social";
}

function getBotToken(): string | null {
  if (!BOT_TOKEN) return null;
  return BOT_TOKEN;
}

export function validateTelegramWebAppData(
  initData: string,
  botToken: string
): { valid: boolean; user?: TelegramUser } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { valid: false };

    params.delete("hash");

    const dataCheckArr: string[] = [];
    params.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`);
    });
    dataCheckArr.sort();
    const dataCheckString = dataCheckArr.join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const checkHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (checkHash !== hash) {
      return { valid: false };
    }

    const authDate = params.get("auth_date");
    if (authDate) {
      const authTimestamp = parseInt(authDate, 10);
      const now = Math.floor(Date.now() / 1000);
      if (now - authTimestamp > 86400) {
        return { valid: false };
      }
    }

    const userParam = params.get("user");
    let user: TelegramUser | undefined;
    if (userParam) {
      try {
        user = JSON.parse(userParam);
      } catch {}
    }

    return { valid: true, user };
  } catch (error) {
    console.error("Telegram validation error:", error);
    return { valid: false };
  }
}

const apiBase = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function reply(chatId: number, text: string, replyMarkup?: any): Promise<void> {
  if (!BOT_TOKEN) {
    console.error("[TelegramBot] BOT_TOKEN is empty, cannot reply");
    return;
  }
  const body: any = { chat_id: chatId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  try {
    const res = await fetch(`${apiBase}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[TelegramBot] sendMessage failed (${res.status}):`, errBody);
    }
  } catch (err) {
    console.error("[TelegramBot] sendMessage error:", err);
  }
}

async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${apiBase}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
  } catch (err) {
    console.error("[TelegramBot] answerCallbackQuery error:", err);
  }
}

async function editMessage(chatId: number, messageId: number, text: string, replyMarkup?: any): Promise<void> {
  if (!BOT_TOKEN) return;
  const body: any = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML" };
  if (replyMarkup) body.reply_markup = replyMarkup;
  try {
    await fetch(`${apiBase}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("[TelegramBot] editMessageText error:", err);
  }
}

const miniAppButton = (label: string, path?: string) => ({
  inline_keyboard: [[{ text: label, web_app: { url: `${getMiniAppUrl()}${path || "/tg"}` } }]],
});

function inlineKeyboard(rows: Array<Array<{ text: string; callback_data?: string; web_app?: { url: string } }>>) {
  return { inline_keyboard: rows };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function getAgentFromTelegramId(telegramId: string) {
  return storage.getAgentByTelegramId(telegramId);
}

const SUPPORTED_ASSETS = ["BNB", "BTC", "ETH", "SOL", "DOGE", "XRP", "ADA", "AVAX", "LINK"];
const MAX_ALERTS_PER_USER = 10;

const pendingChallenges = new Map<number, { duelId: string; creatorTelegramId: string }>();

interface PriceAlert {
  telegramId: string;
  chatId: number;
  asset: string;
  targetPrice: number;
  direction: "above" | "below";
  createdAt: number;
}

const priceAlerts: PriceAlert[] = [];

export function getPriceAlerts(): PriceAlert[] {
  return priceAlerts;
}

export function checkAndFirePriceAlerts(asset: string, currentPrice: number): void {
  const token = getBotToken();
  if (!token) return;

  const toRemove: number[] = [];
  for (let i = 0; i < priceAlerts.length; i++) {
    const alert = priceAlerts[i];
    if (alert.asset !== asset) continue;

    const triggered =
      (alert.direction === "above" && currentPrice >= alert.targetPrice) ||
      (alert.direction === "below" && currentPrice <= alert.targetPrice);

    if (triggered) {
      toRemove.push(i);
      const dir = alert.direction === "above" ? "📈 risen above" : "📉 fallen below";
      reply(alert.chatId,
        `🔔 <b>Price Alert Triggered!</b>\n\n` +
        `<b>${alert.asset}</b> has ${dir} <b>$${alert.targetPrice.toLocaleString()}</b>\n` +
        `Current price: <b>$${currentPrice.toLocaleString()}</b>`,
        inlineKeyboard([
          [{ text: "📊 View Chart", web_app: { url: `${getMiniAppUrl()}/tg` } }],
        ])
      );
    }
  }

  for (let i = toRemove.length - 1; i >= 0; i--) {
    priceAlerts.splice(toRemove[i], 1);
  }
}

async function fetchAlertPrices(): Promise<Record<string, number>> {
  const assetsWithAlerts = [...new Set(priceAlerts.map(a => a.asset))];
  if (assetsWithAlerts.length === 0) return {};

  const prices: Record<string, number> = {};
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const symbols = assetsWithAlerts.join(",");
    const response = await fetch(
      `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${symbols}&tsyms=USD`,
      { signal: controller.signal, headers: { Accept: "application/json" } }
    );
    clearTimeout(timeoutId);
    if (response.ok) {
      const data = await response.json();
      for (const asset of assetsWithAlerts) {
        if (data?.[asset]?.USD && typeof data[asset].USD === "number") {
          prices[asset] = data[asset].USD;
        }
      }
    }
  } catch (err) {
    console.error("[PriceAlertScheduler] Failed to fetch prices:", err);
  }
  return prices;
}

let priceAlertInterval: ReturnType<typeof setInterval> | null = null;

export function startPriceAlertScheduler(): void {
  if (priceAlertInterval) return;
  const INTERVAL_MS = 60_000;
  priceAlertInterval = setInterval(async () => {
    if (priceAlerts.length === 0) return;
    try {
      const prices = await fetchAlertPrices();
      for (const [asset, price] of Object.entries(prices)) {
        checkAndFirePriceAlerts(asset, price);
      }
    } catch (err) {
      console.error("[PriceAlertScheduler] Error:", err);
    }
  }, INTERVAL_MS);
  console.log("[PriceAlertScheduler] Started — checking every 60s");
}

async function handlePendingChallenge(chatId: number, text: string, message: any): Promise<void> {
  const pending = pendingChallenges.get(chatId);
  if (!pending) return;
  pendingChallenges.delete(chatId);

  const username = text.replace(/^@/, "").trim();
  if (!username) {
    reply(chatId, "⚔️ Please provide a valid username.");
    return;
  }

  try {
    const duel = await storage.getDuel(pending.duelId);
    if (!duel || duel.status !== "open") {
      reply(chatId, "⚔️ This duel is no longer available.");
      return;
    }

    const agents = await storage.getAgents();
    const target = agents.find(a =>
      a.name?.toLowerCase() === username.toLowerCase() && a.telegramId
    );

    if (!target || !target.telegramId) {
      reply(chatId,
        `⚔️ Could not find user <b>${escapeHtml(username)}</b> on Telegram.\n\n` +
        `Share this command instead:\n<code>/duel accept ${pending.duelId}</code>`
      );
      return;
    }

    if (target.telegramId === pending.creatorTelegramId) {
      reply(chatId, "⚔️ You can't challenge yourself!");
      return;
    }

    const creator = duel.creatorAgentId ? await storage.getAgent(duel.creatorAgentId) : null;
    await sendDuelChallengeNotification(
      target.telegramId,
      pending.duelId,
      creator?.name || "Someone",
      duel.assetId,
      duel.stakeDisplay || "Free"
    );

    reply(chatId,
      `⚔️ Challenge sent to <b>${escapeHtml(target.name || username)}</b>!\n\n` +
      "They'll receive a notification with Accept/Decline buttons."
    );
  } catch (err) {
    console.error("[DuelChallenge] Error sending challenge:", err);
    reply(chatId, "⚔️ Could not send challenge. Try again.");
  }
}

async function handleCommand(chatId: number, command: string, args: string, message: any): Promise<void> {
  const telegramId = message.from?.id?.toString();

  switch (command) {
    case "/start":
      reply(chatId,
        "🐝 <b>Welcome to Honeycomb!</b>\n\n" +
        "The decentralized social arena on BSC.\n\n" +
        "• Trade & duel other players\n" +
        "• Complete bounties for rewards\n" +
        "• Compete in tournaments\n" +
        "• Earn points & climb leaderboards\n\n" +
        "Tap below to open the app, or type /help for commands.",
        inlineKeyboard([
          [{ text: "🚀 Open Honeycomb", web_app: { url: `${getMiniAppUrl()}/tg` } }],
          [{ text: "📋 All Commands", callback_data: "cmd_help" }],
        ])
      );
      break;

    case "/help":
      sendHelpMessage(chatId);
      break;

    case "/play":
      reply(chatId, "⚔️ <b>Ready to compete?</b>\n\nOpen the Arena to duel other players!",
        inlineKeyboard([
          [{ text: "🎮 Open Arena", web_app: { url: `${getMiniAppUrl()}/tg` } }],
          [{ text: "📊 My Stats", callback_data: "cmd_stats" }],
        ])
      );
      break;

    case "/stats": {
      try {
        const [agentCount, duelCount] = await Promise.all([
          storage.getAgentCount(),
          storage.getDuelCount(),
        ]);
        const tournaments = await storage.listTournaments("active");
        const openBounties = await storage.getBounties("open", 1);

        reply(chatId,
          "📊 <b>Honeycomb Platform Stats</b>\n\n" +
          `👥 Users: <b>${agentCount.toLocaleString()}</b>\n` +
          `⚔️ Total Duels: <b>${duelCount.toLocaleString()}</b>\n` +
          `🏆 Active Tournaments: <b>${tournaments.length}</b>\n` +
          `💰 Open Bounties: <b>${openBounties.length > 0 ? "Available" : "None"}</b>`,
          inlineKeyboard([
            [{ text: "📈 View Full Stats", web_app: { url: `${getMiniAppUrl()}/tg` } }],
            [{ text: "🏅 Leaderboard", callback_data: "cmd_leaderboard" }],
          ])
        );
      } catch {
        reply(chatId, "Could not fetch stats right now. Try again later.");
      }
      break;
    }

    case "/refer": {
      if (!telegramId) break;
      try {
        const agent = await getAgentFromTelegramId(telegramId);
        if (!agent) {
          reply(chatId, "Open the app first to create your account!", miniAppButton("Open Honeycomb"));
          return;
        }
        const code = `BEE${agent.id.substring(0, 11).toUpperCase().replace(/-/g, "")}`;
        reply(chatId,
          "🔗 <b>Your Referral Link</b>\n\n" +
          `${getMiniAppUrl()}/r/${code}\n\n` +
          "Share with friends to earn bonus points for every sign-up!",
          inlineKeyboard([
            [{ text: "📊 My Points", callback_data: "cmd_points" }],
          ])
        );
      } catch {
        reply(chatId, "Could not fetch your referral info.");
      }
      break;
    }

    case "/balance": {
      if (!telegramId) break;
      try {
        const agent = await getAgentFromTelegramId(telegramId);
        if (!agent) {
          reply(chatId, "Open the app first to create your account!", miniAppButton("Open Honeycomb"));
          return;
        }

        const { createPublicClient, http, formatEther } = await import("viem");
        const { bsc } = await import("viem/chains");
        const client = createPublicClient({ chain: bsc, transport: http() });
        const balance = await client.getBalance({ address: agent.ownerAddress as `0x${string}` });
        const balanceStr = formatEther(balance);
        const shortAddr = `${agent.ownerAddress.slice(0, 6)}...${agent.ownerAddress.slice(-4)}`;

        reply(chatId,
          "💰 <b>Wallet Balance</b>\n\n" +
          `Address: <code>${shortAddr}</code>\n` +
          `Balance: <b>${parseFloat(balanceStr).toFixed(6)} BNB</b>`,
          inlineKeyboard([
            [{ text: "👛 Open Wallet", web_app: { url: `${getMiniAppUrl()}/tg` } }],
          ])
        );
      } catch {
        reply(chatId, "Could not fetch balance. Try again later.");
      }
      break;
    }

    case "/withdraw":
    case "/send": {
      if (!telegramId) break;
      try {
        const agent = await getAgentFromTelegramId(telegramId);
        if (!agent) {
          reply(chatId, "Open the app first to create your account!", miniAppButton("Open Honeycomb"));
          return;
        }

        const { createPublicClient, http, formatEther } = await import("viem");
        const { bsc } = await import("viem/chains");
        const client = createPublicClient({ chain: bsc, transport: http() });
        const bal = await client.getBalance({ address: agent.ownerAddress as `0x${string}` });
        const balStr = formatEther(bal);

        reply(chatId,
          "📤 <b>Send BNB</b>\n\n" +
          `Your balance: <b>${parseFloat(balStr).toFixed(6)} BNB</b>\n\n` +
          "Open the app and go to <b>Profile → Send BNB</b> to withdraw funds to any BNB Chain address.",
          inlineKeyboard([
            [{ text: "📤 Open Wallet", web_app: { url: `${getMiniAppUrl()}/tg` } }],
          ])
        );
      } catch {
        reply(chatId, "Could not fetch wallet info. Try again later.");
      }
      break;
    }

    case "/profile": {
      if (!telegramId) break;
      try {
        const agent = await getAgentFromTelegramId(telegramId);
        if (!agent) {
          reply(chatId, "Open the app first to create your account!", miniAppButton("Open Honeycomb"));
          return;
        }

        const points = await storage.getUserPoints(agent.id);
        const totalPoints = points?.totalPoints ?? 0;
        const winRate = (agent.arenaWins + agent.arenaLosses) > 0
          ? ((agent.arenaWins / (agent.arenaWins + agent.arenaLosses)) * 100).toFixed(1)
          : "0";

        reply(chatId,
          `👤 <b>${escapeHtml(agent.name)}</b>\n\n` +
          (agent.bio ? `${escapeHtml(agent.bio)}\n\n` : "") +
          `⚔️ Record: <b>${agent.arenaWins}W - ${agent.arenaLosses}L</b> (${winRate}%)\n` +
          `🏅 Rating: <b>${agent.arenaRating}</b>\n` +
          `⭐ Points: <b>${totalPoints.toLocaleString()}</b>`,
          inlineKeyboard([
            [{ text: "✏️ Edit Profile", web_app: { url: `${getMiniAppUrl()}/tg` } }],
            [{ text: "📊 My Stats", callback_data: "cmd_stats" }, { text: "🏅 Leaderboard", callback_data: "cmd_leaderboard" }],
          ])
        );
      } catch {
        reply(chatId, "Could not fetch your profile.");
      }
      break;
    }

    case "/points": {
      if (!telegramId) break;
      try {
        const agent = await getAgentFromTelegramId(telegramId);
        if (!agent) {
          reply(chatId, "Open the app first to create your account!", miniAppButton("Open Honeycomb"));
          return;
        }

        const points = await storage.getUserPoints(agent.id);
        const history = await storage.getPointsHistory(agent.id, 5);

        let msg = "⭐ <b>Your Points</b>\n\n" +
          `Total: <b>${(points?.totalPoints ?? 0).toLocaleString()}</b>\n` +
          `Lifetime: <b>${(points?.lifetimePoints ?? 0).toLocaleString()}</b>\n`;

        if (history.length > 0) {
          msg += "\n<b>Recent Activity:</b>\n";
          for (const h of history) {
            msg += `• ${h.action}: +${h.points} pts\n`;
          }
        }

        reply(chatId, msg, inlineKeyboard([
          [{ text: "📊 Full History", web_app: { url: `${getMiniAppUrl()}/tg` } }],
        ]));
      } catch {
        reply(chatId, "Could not fetch your points.");
      }
      break;
    }

    case "/duel": {
      if (!telegramId) break;
      try {
        const agent = await getAgentFromTelegramId(telegramId);
        if (!agent) {
          reply(chatId, "Open the app first to create your account!", miniAppButton("Open Honeycomb"));
          return;
        }

        if (args && args.toLowerCase().startsWith("accept ")) {
          const duelId = args.slice(7).trim();
          if (duelId) {
            const duel = await storage.getDuel(duelId);
            if (!duel) {
              reply(chatId, "⚔️ Duel not found.");
            } else if (duel.status !== "open") {
              reply(chatId, `⚔️ This duel is already <b>${duel.status}</b>.`);
            } else if (duel.creatorAgentId === agent.id) {
              reply(chatId, "⚔️ You can't accept your own duel.");
            } else {
              reply(chatId,
                `⚔️ <b>Duel Challenge</b>\n\n` +
                `Asset: <b>${escapeHtml(duel.assetId)}</b>\n` +
                `Stake: <b>${escapeHtml(duel.stakeDisplay || "Free")}</b>\n` +
                `Duration: <b>${duel.durationSec}s</b>`,
                inlineKeyboard([
                  [
                    { text: "✅ Accept", callback_data: `accept_duel:${duelId}` },
                    { text: "❌ Decline", callback_data: `decline_duel:${duelId}` },
                  ],
                ])
              );
            }
            return;
          }
        }

        if (args) {
          const parts = args.toUpperCase().split(/\s+/);
          const asset = parts[0];
          if (SUPPORTED_ASSETS.includes(asset)) {
            reply(chatId,
              `⚔️ <b>Create Duel — ${escapeHtml(asset)}</b>\n\n` +
              "Choose your prediction direction:",
              inlineKeyboard([
                [
                  { text: "📈 UP", callback_data: `duel_dir:${asset}:up` },
                  { text: "📉 DOWN", callback_data: `duel_dir:${asset}:down` },
                ],
                [{ text: "❌ Cancel", callback_data: "duel_cancel" }],
              ])
            );
          } else {
            reply(chatId,
              `⚔️ Asset <b>${escapeHtml(asset)}</b> is not supported.\n\n` +
              `Supported: ${SUPPORTED_ASSETS.join(", ")}`,
              inlineKeyboard([
                [{ text: "⚔️ Pick Asset", callback_data: "duel_pick_asset" }],
              ])
            );
          }
        } else {
          reply(chatId,
            "⚔️ <b>Create a Duel</b>\n\nChoose an asset to predict:",
            inlineKeyboard([
              [
                { text: "BNB", callback_data: "duel_asset:BNB" },
                { text: "BTC", callback_data: "duel_asset:BTC" },
                { text: "ETH", callback_data: "duel_asset:ETH" },
              ],
              [
                { text: "SOL", callback_data: "duel_asset:SOL" },
                { text: "DOGE", callback_data: "duel_asset:DOGE" },
                { text: "XRP", callback_data: "duel_asset:XRP" },
              ],
              [{ text: "📋 Open Duels", callback_data: "cmd_open_duels" }],
            ])
          );
        }
      } catch {
        reply(chatId, "Could not process your request.");
      }
      break;
    }

    case "/leaderboard": {
      try {
        const leaders = await storage.getPointsLeaderboard(10);
        if (leaders.length === 0) {
          reply(chatId, "🏅 <b>Leaderboard</b>\n\nNo rankings yet. Be the first to earn points!");
          return;
        }

        const medals = ["🥇", "🥈", "🥉"];
        let msg = "🏅 <b>Top Players</b>\n\n";
        for (let i = 0; i < leaders.length; i++) {
          const l = leaders[i];
          const agent = await storage.getAgent(l.agentId);
          const name = agent ? escapeHtml(agent.name) : "Unknown";
          const medal = i < 3 ? medals[i] : `${i + 1}.`;
          msg += `${medal} <b>${name}</b> — ${l.totalPoints.toLocaleString()} pts\n`;
        }

        reply(chatId, msg, inlineKeyboard([
          [{ text: "🏆 Full Leaderboard", web_app: { url: `${getMiniAppUrl()}/tg` } }],
        ]));
      } catch {
        reply(chatId, "Could not fetch leaderboard.");
      }
      break;
    }

    case "/bounties": {
      try {
        const bounties = await storage.getBounties("open", 5);
        if (bounties.length === 0) {
          reply(chatId, "💰 <b>Bounties</b>\n\nNo open bounties right now. Check back later!",
            inlineKeyboard([[{ text: "📋 View All Bounties", web_app: { url: `${getMiniAppUrl()}/tg` } }]]));
          return;
        }

        let msg = "💰 <b>Open Bounties</b>\n\n";
        for (const b of bounties) {
          const reward = b.rewardDisplay || "Reward available";
          msg += `• <b>${escapeHtml(b.title)}</b>\n  💎 ${escapeHtml(reward)}\n\n`;
        }

        const buttons = bounties.slice(0, 3).map(b => ({
          text: `Claim: ${b.title.slice(0, 20)}`,
          callback_data: `claim_bounty_${b.id}`,
        }));

        reply(chatId, msg, inlineKeyboard([
          buttons,
          [{ text: "📋 View All Bounties", web_app: { url: `${getMiniAppUrl()}/tg` } }],
        ]));
      } catch {
        reply(chatId, "Could not fetch bounties.");
      }
      break;
    }

    case "/market": {
      try {
        const tokens = await storage.getLaunchTokens(5);
        if (tokens.length === 0) {
          reply(chatId, "📈 <b>Market</b>\n\nNo tokens launched yet.",
            miniAppButton("Open Market"));
          return;
        }

        let msg = "📈 <b>Recent Launches</b>\n\n";
        for (const t of tokens) {
          const name = escapeHtml(t.name);
          const symbol = escapeHtml(t.symbol);
          msg += `• <b>${name}</b> ($${symbol})\n`;
        }

        reply(chatId, msg, inlineKeyboard([
          [{ text: "🚀 Launch Token", web_app: { url: `${getMiniAppUrl()}/tg` } }],
          [{ text: "📊 View Market", web_app: { url: `${getMiniAppUrl()}/tg` } }],
        ]));
      } catch {
        reply(chatId, "Could not fetch market data.");
      }
      break;
    }

    case "/agents": {
      try {
        const { db } = await import("./db");
        const { agents: agentsTable } = await import("@shared/schema");
        const { desc } = await import("drizzle-orm");

        const topAgents = await db.select({
          id: agentsTable.id,
          name: agentsTable.name,
          arenaRating: agentsTable.arenaRating,
          arenaWins: agentsTable.arenaWins,
          arenaLosses: agentsTable.arenaLosses,
        }).from(agentsTable).orderBy(desc(agentsTable.arenaRating)).limit(10);

        if (topAgents.length === 0) {
          reply(chatId, "🤖 <b>Agents</b>\n\nNo agents registered yet.");
          return;
        }

        let msg = "🤖 <b>Top Agents by Rating</b>\n\n";
        for (let i = 0; i < topAgents.length; i++) {
          const a = topAgents[i];
          msg += `${i + 1}. <b>${escapeHtml(a.name)}</b> — Rating: ${a.arenaRating} (${a.arenaWins}W/${a.arenaLosses}L)\n`;
        }

        reply(chatId, msg, inlineKeyboard([
          [{ text: "🔍 Browse Agents", web_app: { url: `${getMiniAppUrl()}/tg` } }],
        ]));
      } catch {
        reply(chatId, "Could not fetch agents.");
      }
      break;
    }

    case "/token": {
      reply(chatId,
        "🪙 <b>$HONEY Token</b>\n\n" +
        "The native token of the Honeycomb platform.\n\n" +
        "• Stake for boosted point multipliers\n" +
        "• Participate in governance\n" +
        "• Earn from platform revenue sharing\n\n" +
        "Open the app for full token details.",
        inlineKeyboard([
          [{ text: "🪙 Token Info", web_app: { url: `${getMiniAppUrl()}/tg` } }],
        ])
      );
      break;
    }

    case "/tournaments": {
      try {
        const [active, registration] = await Promise.all([
          storage.listTournaments("active"),
          storage.listTournaments("registration"),
        ]);
        const all = [...registration, ...active];

        if (all.length === 0) {
          reply(chatId, "🏆 <b>Tournaments</b>\n\nNo active tournaments right now. Check back later!",
            inlineKeyboard([[{ text: "🏆 View Tournaments", web_app: { url: `${getMiniAppUrl()}/tg` } }]]));
          return;
        }

        let msg = "🏆 <b>Tournaments</b>\n\n";
        for (const t of all) {
          const statusEmoji = t.status === "registration" ? "📝" : "🔴";
          msg += `${statusEmoji} <b>${escapeHtml(t.name)}</b>\n`;
          msg += `   Status: ${t.status} | Players: ${t.maxPlayers}\n`;
          if (t.prizePool) msg += `   Prize: ${t.prizePool} BNB\n`;
          msg += "\n";
        }

        reply(chatId, msg, inlineKeyboard([
          [{ text: "🏆 Join Tournament", web_app: { url: `${getMiniAppUrl()}/tg` } }],
        ]));
      } catch {
        reply(chatId, "Could not fetch tournaments.");
      }
      break;
    }

    case "/alerts": {
      if (!telegramId) break;
      try {
        const agent = await getAgentFromTelegramId(telegramId);
        if (!agent) {
          reply(chatId, "Open the app first to create your account!", miniAppButton("Open Honeycomb"));
          return;
        }

        const parts = args.trim().split(/\s+/);
        const subCmd = parts[0]?.toLowerCase();

        if (subCmd === "set" && parts.length >= 3) {
          const asset = parts[1].toUpperCase();
          const price = parseFloat(parts[2]);

          if (!SUPPORTED_ASSETS.includes(asset)) {
            reply(chatId, `❌ Unsupported asset. Available: ${SUPPORTED_ASSETS.join(", ")}`);
            return;
          }
          if (isNaN(price) || price <= 0) {
            reply(chatId, "❌ Invalid price. Example: /alerts set BTC 70000");
            return;
          }

          const userAlerts = priceAlerts.filter(a => a.telegramId === telegramId);
          if (userAlerts.length >= 10) {
            reply(chatId, "❌ Maximum 10 alerts allowed. Remove some with /alerts clear.");
            return;
          }

          reply(chatId,
            `🔔 <b>Set Alert for ${escapeHtml(asset)}</b>\n\n` +
            `Target price: <b>$${price.toLocaleString()}</b>\n\n` +
            "Notify when price goes:",
            inlineKeyboard([
              [
                { text: "📈 Above", callback_data: `alert_set:${asset}:${price}:above` },
                { text: "📉 Below", callback_data: `alert_set:${asset}:${price}:below` },
              ],
            ])
          );
        } else if (subCmd === "list") {
          const userAlerts = priceAlerts.filter(a => a.telegramId === telegramId);
          if (userAlerts.length === 0) {
            reply(chatId,
              "🔔 <b>Your Alerts</b>\n\nNo active alerts.\n\nSet one: <code>/alerts set BTC 70000</code>");
            return;
          }

          let msg = "🔔 <b>Your Active Alerts</b>\n\n";
          for (let i = 0; i < userAlerts.length; i++) {
            const a = userAlerts[i];
            const dir = a.direction === "above" ? "📈 above" : "📉 below";
            msg += `${i + 1}. <b>${a.asset}</b> ${dir} $${a.targetPrice.toLocaleString()}\n`;
          }
          msg += `\nTotal: ${userAlerts.length}/10`;

          reply(chatId, msg, inlineKeyboard([
            [{ text: "🗑️ Clear All", callback_data: "alerts_clear_all" }],
          ]));
        } else if (subCmd === "clear") {
          const before = priceAlerts.length;
          for (let i = priceAlerts.length - 1; i >= 0; i--) {
            if (priceAlerts[i].telegramId === telegramId) {
              priceAlerts.splice(i, 1);
            }
          }
          const removed = before - priceAlerts.length;
          reply(chatId, `🔔 Cleared <b>${removed}</b> alert(s).`);
        } else {
          reply(chatId,
            "🔔 <b>Price Alerts</b>\n\n" +
            "Get notified when an asset hits your target price.\n\n" +
            "<b>Commands:</b>\n" +
            "<code>/alerts set BTC 70000</code> — Set a price alert\n" +
            "<code>/alerts list</code> — View your active alerts\n" +
            "<code>/alerts clear</code> — Remove all alerts\n\n" +
            `Supported: ${SUPPORTED_ASSETS.join(", ")}`,
            inlineKeyboard([
              [{ text: "📊 View Market", web_app: { url: `${getMiniAppUrl()}/tg` } }],
            ])
          );
        }
      } catch {
        reply(chatId, "Could not process your request.");
      }
      break;
    }

    case "/daily": {
      if (!telegramId) break;
      await sendDailyDigest(chatId, telegramId);
      break;
    }

    default:
      reply(chatId,
        "🐝 I don't recognize that command.\n\nType /help to see all available commands.",
        inlineKeyboard([
          [{ text: "📋 All Commands", callback_data: "cmd_help" }],
          [{ text: "🚀 Open Honeycomb", web_app: { url: `${getMiniAppUrl()}/tg` } }],
        ])
      );
      break;
  }
}

async function handleCallbackQuery(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message?.chat?.id;
  const messageId = callbackQuery.message?.message_id;
  const data = callbackQuery.data;
  const telegramId = callbackQuery.from?.id?.toString();

  if (!chatId || !data) {
    answerCallbackQuery(callbackQuery.id);
    return;
  }

  answerCallbackQuery(callbackQuery.id);

  if (data === "cmd_help") {
    sendHelpMessage(chatId);
    return;
  }

  if (data === "cmd_stats") {
    handleCommand(chatId, "/stats", "", { from: callbackQuery.from });
    return;
  }

  if (data === "cmd_leaderboard") {
    handleCommand(chatId, "/leaderboard", "", { from: callbackQuery.from });
    return;
  }

  if (data === "cmd_points") {
    handleCommand(chatId, "/points", "", { from: callbackQuery.from });
    return;
  }

  if (data === "cmd_open_duels") {
    try {
      const duels = await storage.getDuels("open", 5);
      if (duels.length === 0) {
        reply(chatId, "⚔️ No open duels right now. Create one from the app!");
        return;
      }
      let msg = "⚔️ <b>Open Duels</b>\n\n";
      for (const d of duels) {
        msg += `• ${escapeHtml(d.assetId)} — Stake: ${d.stakeWei} wei\n`;
      }
      reply(chatId, msg, inlineKeyboard([
        [{ text: "⚔️ Create Duel", web_app: { url: `${getMiniAppUrl()}/tg` } }],
      ]));
    } catch {
      reply(chatId, "Could not fetch open duels.");
    }
    return;
  }

  if (data === "duel_pick_asset" || data === "duel_cancel") {
    if (data === "duel_cancel") {
      editMessage(chatId, messageId, "⚔️ Duel creation cancelled.");
      return;
    }
    editMessage(chatId, messageId,
      "⚔️ <b>Create a Duel</b>\n\nChoose an asset to predict:",
      inlineKeyboard([
        [
          { text: "BNB", callback_data: "duel_asset:BNB" },
          { text: "BTC", callback_data: "duel_asset:BTC" },
          { text: "ETH", callback_data: "duel_asset:ETH" },
        ],
        [
          { text: "SOL", callback_data: "duel_asset:SOL" },
          { text: "DOGE", callback_data: "duel_asset:DOGE" },
          { text: "XRP", callback_data: "duel_asset:XRP" },
        ],
      ])
    );
    return;
  }

  if (data.startsWith("duel_asset:")) {
    const asset = data.replace("duel_asset:", "");
    editMessage(chatId, messageId,
      `⚔️ <b>Create Duel — ${escapeHtml(asset)}</b>\n\n` +
      "Choose your prediction direction:",
      inlineKeyboard([
        [
          { text: "📈 UP", callback_data: `duel_dir:${asset}:up` },
          { text: "📉 DOWN", callback_data: `duel_dir:${asset}:down` },
        ],
        [{ text: "⬅️ Back", callback_data: "duel_pick_asset" }],
      ])
    );
    return;
  }

  if (data.startsWith("duel_dir:")) {
    const [, asset, direction] = data.split(":");
    if (!telegramId) return;

    try {
      const agent = await getAgentFromTelegramId(telegramId);
      if (!agent) {
        editMessage(chatId, messageId, "Open the app first to create your account!");
        return;
      }

      const duel = await storage.createDuel({
        assetId: asset,
        assetName: asset,
        durationSec: 60,
        stakeWei: "0",
        stakeDisplay: "Free",
        creatorAddress: agent.ownerAddress,
        creatorAgentId: agent.id,
        creatorDirection: direction,
      });

      editMessage(chatId, messageId,
        `⚔️ <b>Duel Created!</b>\n\n` +
        `Creator: <b>${escapeHtml(agent.name || "Unknown")}</b>\n` +
        `Asset: <b>${escapeHtml(asset)}</b>\n` +
        `Direction: <b>${direction === "up" ? "📈 UP" : "📉 DOWN"}</b>\n` +
        `Duration: <b>60s</b>\n` +
        `Stake: <b>Free (practice)</b>\n\n` +
        "Share to challenge someone, or wait for an opponent!",
        inlineKeyboard([
          [{ text: "🔗 Share / Challenge a Friend", callback_data: `challenge_duel:${duel.id}` }],
          [{ text: "📋 View Duel", web_app: { url: `${getMiniAppUrl()}/tg` } }],
        ])
      );
    } catch (err) {
      console.error("[DuelCreate] Error creating duel from chat:", err);
      editMessage(chatId, messageId, "⚔️ Could not create duel. Please try again.");
    }
    return;
  }

  if (data.startsWith("alert_set:")) {
    const [, asset, priceStr, direction] = data.split(":");
    const price = parseFloat(priceStr);
    if (!telegramId || isNaN(price)) return;

    if (!SUPPORTED_ASSETS.includes(asset)) {
      editMessage(chatId, messageId, `❌ Unsupported asset. Available: ${SUPPORTED_ASSETS.join(", ")}`);
      return;
    }
    if (direction !== "above" && direction !== "below") {
      editMessage(chatId, messageId, "❌ Invalid direction.");
      return;
    }
    if (price <= 0 || price > 1e12) {
      editMessage(chatId, messageId, "❌ Invalid price target.");
      return;
    }

    const userAlerts = priceAlerts.filter(a => a.telegramId === telegramId);
    if (userAlerts.length >= MAX_ALERTS_PER_USER) {
      editMessage(chatId, messageId,
        `❌ You already have ${MAX_ALERTS_PER_USER} alerts (max). Clear some first.`,
        inlineKeyboard([[{ text: "🗑️ Clear All", callback_data: "alerts_clear_all" }]])
      );
      return;
    }

    priceAlerts.push({
      telegramId,
      chatId,
      asset,
      targetPrice: price,
      direction: direction as "above" | "below",
      createdAt: Date.now(),
    });

    const dirLabel = direction === "above" ? "📈 rises above" : "📉 falls below";
    editMessage(chatId, messageId,
      `✅ <b>Alert Set!</b>\n\n` +
      `You'll be notified when <b>${escapeHtml(asset)}</b> ${dirLabel} <b>$${price.toLocaleString()}</b>`,
      inlineKeyboard([
        [{ text: "📋 My Alerts", callback_data: "alerts_list" }],
      ])
    );
    return;
  }

  if (data === "alerts_list") {
    if (!telegramId) return;
    const userAlerts = priceAlerts.filter(a => a.telegramId === telegramId);
    if (userAlerts.length === 0) {
      reply(chatId, "🔔 <b>Your Alerts</b>\n\nNo active alerts.\n\nSet one: <code>/alerts set BTC 70000</code>");
      return;
    }
    let msg = "🔔 <b>Your Active Alerts</b>\n\n";
    for (let i = 0; i < userAlerts.length; i++) {
      const a = userAlerts[i];
      const dir = a.direction === "above" ? "📈 above" : "📉 below";
      msg += `${i + 1}. <b>${a.asset}</b> ${dir} $${a.targetPrice.toLocaleString()}\n`;
    }
    msg += `\nTotal: ${userAlerts.length}/10`;
    reply(chatId, msg, inlineKeyboard([
      [{ text: "🗑️ Clear All", callback_data: "alerts_clear_all" }],
    ]));
    return;
  }

  if (data === "alerts_clear_all") {
    if (!telegramId) return;
    const before = priceAlerts.length;
    for (let i = priceAlerts.length - 1; i >= 0; i--) {
      if (priceAlerts[i].telegramId === telegramId) {
        priceAlerts.splice(i, 1);
      }
    }
    const removed = before - priceAlerts.length;
    editMessage(chatId, messageId, `🔔 Cleared <b>${removed}</b> alert(s).`);
    return;
  }

  if (data.startsWith("challenge_duel:")) {
    const duelId = data.replace("challenge_duel:", "");
    try {
      const duel = await storage.getDuel(duelId);
      if (!duel || duel.status !== "open") {
        editMessage(chatId, messageId, "⚔️ This duel is no longer available.");
        return;
      }

      editMessage(chatId, messageId,
        `⚔️ <b>Challenge Someone!</b>\n\n` +
        `Forward them this command:\n<code>/duel accept ${escapeHtml(duelId)}</code>\n\n` +
        `Or reply to this message with their Telegram username to send them the challenge directly.`,
        inlineKeyboard([
          [{ text: "🔗 Copy Share Link", callback_data: `share_duel:${duelId}` }],
        ])
      );

      pendingChallenges.set(chatId, { duelId, creatorTelegramId: telegramId || "" });
    } catch {
      editMessage(chatId, messageId, "⚔️ Could not prepare challenge. Try again.");
    }
    return;
  }

  if (data.startsWith("share_duel:")) {
    const duelId = data.replace("share_duel:", "");
    editMessage(chatId, messageId,
      `⚔️ <b>Share this duel!</b>\n\n` +
      `Send this to a friend:\n<code>/duel accept ${escapeHtml(duelId)}</code>\n\n` +
      `Or share the link:\n${getMiniAppUrl()}/tg`
    );
    return;
  }

  if (data.startsWith("accept_duel:")) {
    const duelId = data.replace("accept_duel:", "");
    try {
      const duel = await storage.getDuel(duelId);
      if (!duel) {
        editMessage(chatId, messageId, "⚔️ This duel no longer exists.");
        return;
      }
      if (duel.status !== "open") {
        editMessage(chatId, messageId,
          `⚔️ <b>Duel Unavailable</b>\n\nThis duel is already <b>${duel.status}</b>.`);
        return;
      }
      if (telegramId && duel.creatorAgentId) {
        const creator = await storage.getAgent(duel.creatorAgentId);
        if (creator?.telegramId === telegramId) {
          editMessage(chatId, messageId, "⚔️ You can't accept your own duel challenge.");
          return;
        }
      }

      if (duel.stakeWei === "0" && telegramId) {
        const joiner = await getAgentFromTelegramId(telegramId);
        if (joiner) {
          const joinerDirection = duel.creatorDirection === "up" ? "down" : "up";
          const now = new Date();
          const endTs = new Date(now.getTime() + duel.durationSec * 1000);
          await storage.updateDuel(duelId, {
            joinerAddress: joiner.ownerAddress,
            joinerAgentId: joiner.id,
            joinerDirection,
            startTs: now,
            endTs,
            status: "live",
          });

          editMessage(chatId, messageId,
            "⚔️ <b>Duel Joined!</b>\n\n" +
            `Asset: <b>${escapeHtml(duel.assetId)}</b>\n` +
            `Your Direction: <b>${joinerDirection === "up" ? "📈 UP" : "📉 DOWN"}</b>\n` +
            `Duration: <b>${duel.durationSec}s</b>\n\n` +
            "The duel is now live! Results will be announced when it ends.",
            inlineKeyboard([[{ text: "📊 Watch Live", web_app: { url: `${getMiniAppUrl()}/tg` } }]])
          );

          if (duel.creatorAgentId) {
            const creator = await storage.getAgent(duel.creatorAgentId);
            if (creator?.telegramId) {
              sendDuelJoinedNotification(
                creator.telegramId, duelId, joiner.name || "Someone",
                duel.assetId, duel.stakeDisplay || "Free"
              ).catch(() => {});
            }
          }
          return;
        }
      }

      editMessage(chatId, messageId,
        "⚔️ <b>Duel Accepted!</b>\n\n" +
        `Asset: <b>${escapeHtml(duel.assetId)}</b>\n` +
        `Stake: <b>${escapeHtml(duel.stakeDisplay || duel.stakeWei)}</b>\n\n` +
        "Complete the on-chain transaction in the app to join.",
        inlineKeyboard([[{ text: "🎮 Join Duel", web_app: { url: `${getMiniAppUrl()}/tg` } }]])
      );
    } catch {
      reply(chatId, "Could not process duel action. Please try in the app.");
    }
    return;
  }

  if (data.startsWith("decline_duel:")) {
    editMessage(chatId, messageId,
      "⚔️ <b>Duel Declined</b>\n\nYou've passed on this challenge.");
    return;
  }

  if (data.startsWith("claim_bounty_")) {
    const bountyId = data.replace("claim_bounty_", "");
    try {
      const bounty = await storage.getBounty(bountyId);
      if (bounty && bounty.status === "open") {
        reply(chatId,
          `💰 <b>Bounty: ${escapeHtml(bounty.title)}</b>\n\n` +
          `Reward: <b>${escapeHtml(bounty.rewardDisplay || "Available")}</b>\n\n` +
          "Open the app to submit your solution.",
          inlineKeyboard([[{ text: "📝 Submit Solution", web_app: { url: `${getMiniAppUrl()}/tg` } }]])
        );
      } else {
        reply(chatId, "💰 This bounty is no longer open.",
          inlineKeyboard([[{ text: "📋 View All Bounties", web_app: { url: `${getMiniAppUrl()}/tg` } }]]));
      }
    } catch {
      reply(chatId, "💰 Open the app to view bounty details.",
        inlineKeyboard([[{ text: "📝 Submit Solution", web_app: { url: `${getMiniAppUrl()}/tg` } }]]));
    }
    return;
  }

  if (data.startsWith("view_tournament_")) {
    const tournamentId = data.replace("view_tournament_", "");
    try {
      const tournament = await storage.getTournament(tournamentId);
      if (tournament) {
        reply(chatId,
          `🏆 <b>${escapeHtml(tournament.name)}</b>\n\n` +
          `Status: <b>${tournament.status}</b>\n` +
          `Players: <b>${tournament.maxPlayers}</b>\n` +
          (tournament.prizePool ? `Prize Pool: <b>${tournament.prizePool} BNB</b>\n` : ""),
          inlineKeyboard([[{ text: "🏆 View Tournament", web_app: { url: `${getMiniAppUrl()}/tg` } }]])
        );
      } else {
        reply(chatId, "🏆 Tournament not found.",
          inlineKeyboard([[{ text: "🏆 All Tournaments", web_app: { url: `${getMiniAppUrl()}/tg` } }]]));
      }
    } catch {
      reply(chatId, "🏆 Open the app for tournament details.",
        inlineKeyboard([[{ text: "🏆 View Tournament", web_app: { url: `${getMiniAppUrl()}/tg` } }]]));
    }
    return;
  }
}

function sendHelpMessage(chatId: number): void {
  reply(chatId,
    "📋 <b>Honeycomb Bot Commands</b>\n\n" +
    "<b>🎮 General</b>\n" +
    "/start — Welcome & open app\n" +
    "/help — Show this command list\n" +
    "/daily — Daily platform digest\n\n" +
    "<b>👤 Account</b>\n" +
    "/profile — View your profile & stats\n" +
    "/balance — Check wallet balance\n" +
    "/withdraw — Send BNB to another address\n" +
    "/points — View your points & history\n" +
    "/refer — Get your referral link\n\n" +
    "<b>⚔️ Arena</b>\n" +
    "/duel [asset] — Create a new duel\n" +
    "/play — Open the Arena\n" +
    "/stats — Platform statistics\n" +
    "/leaderboard — Top players\n\n" +
    "<b>💰 Economy</b>\n" +
    "/bounties — Browse open bounties\n" +
    "/market — Recent token launches\n" +
    "/token — $HONEY token info\n\n" +
    "<b>🏆 Competition</b>\n" +
    "/tournaments — Active tournaments\n" +
    "/agents — Top rated agents\n\n" +
    "<b>🔔 Alerts</b>\n" +
    "/alerts set [asset] [price] — Set alert\n" +
    "/alerts list — View your alerts\n" +
    "/alerts clear — Remove all alerts",
    inlineKeyboard([
      [{ text: "🚀 Open Honeycomb", web_app: { url: `${getMiniAppUrl()}/tg` } }],
    ])
  );
}

export function verifyWebhookSecret(secretHeader: string | undefined): boolean {
  if (!WEBHOOK_SECRET) return true;
  return secretHeader === WEBHOOK_SECRET;
}

export function handleTelegramUpdate(update: any): void {
  if (update.callback_query) {
    handleCallbackQuery(update.callback_query);
    return;
  }

  const message = update.message;
  if (!message?.text) {
    console.log("[TelegramBot] Received non-text update:", JSON.stringify(update).substring(0, 200));
    return;
  }

  const chatId = message.chat.id;
  const text = message.text.trim();

  if (!text.startsWith("/") && pendingChallenges.has(chatId)) {
    handlePendingChallenge(chatId, text, message);
    return;
  }

  const parts = text.split(/\s+/);
  const command = parts[0].toLowerCase().replace(/@\w+$/, "");
  const args = parts.slice(1).join(" ");
  console.log(`[TelegramBot] Received command: ${command} from chat ${chatId}`);

  handleCommand(chatId, command, args, message);
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: { parseMode?: string; replyMarkup?: any }
): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  const body: any = { chat_id: chatId, text };
  if (options?.parseMode) body.parse_mode = options.parseMode;
  if (options?.replyMarkup) body.reply_markup = options.replyMarkup;

  fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export async function sendDuelCreatedNotification(
  creatorTelegramId: string,
  duelId: string,
  assetId: string,
  stakeDisplay: string
): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  const chatId = parseInt(creatorTelegramId, 10);
  if (isNaN(chatId)) return;

  const text =
    "⚔️ <b>Duel Created!</b>\n\n" +
    `Asset: <b>${escapeHtml(assetId)}</b>\n` +
    `Stake: <b>${escapeHtml(stakeDisplay)}</b>\n\n` +
    "Your duel is open and waiting for an opponent.";

  const markup = inlineKeyboard([
    [{ text: "📋 View Duel", web_app: { url: `${getMiniAppUrl()}/tg` } }],
    [{ text: "🔗 Share Duel", callback_data: `share_duel:${duelId}` }],
  ]);

  await sendTelegramMessage(chatId, text, { parseMode: "HTML", replyMarkup: markup });
}

export async function sendDuelChallengeNotification(
  targetTelegramId: string,
  duelId: string,
  challengerName: string,
  assetId: string,
  stakeDisplay: string
): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  const chatId = parseInt(targetTelegramId, 10);
  if (isNaN(chatId)) return;

  const text =
    "⚔️ <b>Duel Challenge!</b>\n\n" +
    `<b>${escapeHtml(challengerName)}</b> has challenged you to a duel.\n\n` +
    `Asset: <b>${escapeHtml(assetId)}</b>\n` +
    `Stake: <b>${escapeHtml(stakeDisplay)}</b>\n\n` +
    "Accept to join on-chain, or decline to pass.";

  const markup = inlineKeyboard([
    [
      { text: "✅ Accept", callback_data: `accept_duel:${duelId}` },
      { text: "❌ Decline", callback_data: `decline_duel:${duelId}` },
    ],
    [{ text: "🔍 View Details", web_app: { url: `${getMiniAppUrl()}/tg` } }],
  ]);

  await sendTelegramMessage(chatId, text, { parseMode: "HTML", replyMarkup: markup });
}

export async function sendDuelJoinedNotification(
  creatorTelegramId: string,
  duelId: string,
  joinerName: string,
  assetId: string,
  stakeDisplay: string
): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  const chatId = parseInt(creatorTelegramId, 10);
  if (isNaN(chatId)) return;

  const text =
    "⚔️ <b>Duel Accepted!</b>\n\n" +
    `<b>${escapeHtml(joinerName)}</b> joined your duel!\n\n` +
    `Asset: <b>${escapeHtml(assetId)}</b>\n` +
    `Stake: <b>${escapeHtml(stakeDisplay)}</b>\n\n` +
    "Your duel is now <b>LIVE</b>! 🔴";

  const markup = inlineKeyboard([
    [{ text: "🎮 View Live Duel", web_app: { url: `${getMiniAppUrl()}/tg` } }],
  ]);

  await sendTelegramMessage(chatId, text, { parseMode: "HTML", replyMarkup: markup });
}

export async function sendTournamentNotification(
  telegramId: string,
  type: "registration_open" | "match_starting" | "results",
  tournamentName: string,
  details?: string
): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  const chatId = parseInt(telegramId, 10);
  if (isNaN(chatId)) return;

  let text = "";
  let markup: any;

  switch (type) {
    case "registration_open":
      text =
        "🏆 <b>Tournament Registration Open!</b>\n\n" +
        `<b>${escapeHtml(tournamentName)}</b>\n\n` +
        (details ? `${escapeHtml(details)}\n\n` : "") +
        "Register now to compete for prizes!";
      markup = inlineKeyboard([
        [{ text: "📝 Register Now", web_app: { url: `${getMiniAppUrl()}/tg` } }],
      ]);
      break;

    case "match_starting":
      text =
        "🔴 <b>Your Match is Starting!</b>\n\n" +
        `Tournament: <b>${escapeHtml(tournamentName)}</b>\n\n` +
        (details ? `${escapeHtml(details)}\n\n` : "") +
        "Get ready to compete!";
      markup = inlineKeyboard([
        [{ text: "🎮 Join Match", web_app: { url: `${getMiniAppUrl()}/tg` } }],
      ]);
      break;

    case "results":
      text =
        "🏆 <b>Tournament Results</b>\n\n" +
        `<b>${escapeHtml(tournamentName)}</b>\n\n` +
        (details ? `${escapeHtml(details)}\n` : "") +
        "Check the full results in the app!";
      markup = inlineKeyboard([
        [{ text: "📊 View Results", web_app: { url: `${getMiniAppUrl()}/tg` } }],
      ]);
      break;
  }

  await sendTelegramMessage(chatId, text, { parseMode: "HTML", replyMarkup: markup });
}

async function sendDailyDigest(chatId: number, telegramId: string): Promise<void> {
  try {
    const agent = await getAgentFromTelegramId(telegramId);

    const [agentCount, duelCount, trendingPosts, leaderboard] = await Promise.all([
      storage.getAgentCount(),
      storage.getDuelCount(),
      storage.getPosts("top", 3),
      storage.getLeaderboard("weekly"),
    ]);

    const openBounties = await storage.getBounties("open", 3);
    const activeTournaments = await storage.listTournaments("active");
    const registrationTournaments = await storage.listTournaments("registration");

    let msg = "📰 <b>Daily Digest</b>\n\n";
    msg += "📊 <b>Platform Overview</b>\n";
    msg += `   👥 ${agentCount.toLocaleString()} total users\n`;
    msg += `   ⚔️ ${duelCount.toLocaleString()} total duels\n\n`;

    if (agent) {
      const points = await storage.getUserPoints(agent.id);
      const rank = leaderboard.findIndex(e => e.agentId === agent.id) + 1;
      msg += "👤 <b>Your Standing</b>\n";
      msg += `   ⚔️ ${agent.arenaWins}W - ${agent.arenaLosses}L\n`;
      msg += `   🏅 Rating: ${agent.arenaRating}\n`;
      msg += `   ⭐ Points: ${(points?.totalPoints ?? 0).toLocaleString()}\n`;
      msg += `   🏆 Weekly Rank: ${rank > 0 ? `#${rank}` : "Unranked"}\n\n`;
    }

    if (trendingPosts.length > 0) {
      msg += "🔥 <b>Trending Posts</b>\n";
      for (const p of trendingPosts) {
        const preview = (p.content || "").slice(0, 50) + ((p.content || "").length > 50 ? "…" : "");
        msg += `   • ${escapeHtml(preview)} (${p.likes ?? 0} likes)\n`;
      }
      msg += "\n";
    }

    if (openBounties.length > 0) {
      msg += "💰 <b>Open Bounties</b>\n";
      for (const b of openBounties) {
        msg += `   • ${escapeHtml(b.title)} (${escapeHtml(b.rewardDisplay || "Reward")})\n`;
      }
      msg += "\n";
    }

    const allTournaments = [...registrationTournaments, ...activeTournaments];
    if (allTournaments.length > 0) {
      msg += "🏆 <b>Tournaments</b>\n";
      for (const t of allTournaments.slice(0, 3)) {
        msg += `   • ${escapeHtml(t.name)} (${t.status})\n`;
      }
      msg += "\n";
    }

    if (leaderboard.length > 0) {
      msg += "🥇 <b>Weekly Leaderboard</b>\n";
      for (let i = 0; i < Math.min(5, leaderboard.length); i++) {
        const entry = leaderboard[i];
        const addr = entry.ownerAddress.slice(0, 6) + "…" + entry.ownerAddress.slice(-4);
        msg += `   ${i + 1}. ${addr} — ${entry.wins}W/${entry.losses}L\n`;
      }
      msg += "\n";
    }

    msg += "Have a great day! 🐝";

    reply(chatId, msg, inlineKeyboard([
      [{ text: "🚀 Open Honeycomb", web_app: { url: `${getMiniAppUrl()}/tg` } }],
    ]));
  } catch {
    reply(chatId, "Could not generate daily digest. Try again later.");
  }
}

export async function broadcastDailyDigest(): Promise<void> {
  try {
    const { db } = await import("./db");
    const { agents: agentsTable } = await import("@shared/schema");
    const { isNotNull } = await import("drizzle-orm");

    const BATCH_SIZE = 200;
    let offset = 0;
    let totalSent = 0;
    let totalFailed = 0;

    while (true) {
      const batch = await db.select({
        id: agentsTable.id,
        telegramId: agentsTable.telegramId,
      }).from(agentsTable)
        .where(isNotNull(agentsTable.telegramId))
        .limit(BATCH_SIZE)
        .offset(offset);

      if (batch.length === 0) break;

      for (const agent of batch) {
        if (agent.telegramId) {
          const chatId = parseInt(agent.telegramId, 10);
          if (!isNaN(chatId)) {
            try {
              await sendDailyDigest(chatId, agent.telegramId);
              totalSent++;
            } catch (err) {
              totalFailed++;
              console.error(`[DailyDigest] Failed to send to ${agent.id}:`, err);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      offset += BATCH_SIZE;
      if (batch.length < BATCH_SIZE) break;
    }

    console.log(`[DailyDigest] Broadcast complete: ${totalSent} sent, ${totalFailed} failed`);
  } catch (err) {
    console.error("[DailyDigest] Broadcast error:", err);
  }
}

let dailyDigestTimer: ReturnType<typeof setInterval> | null = null;

export function startDailyDigestScheduler(): void {
  if (dailyDigestTimer) return;

  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(12, 0, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);

  const msUntilFirst = target.getTime() - now.getTime();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  setTimeout(() => {
    broadcastDailyDigest();
    dailyDigestTimer = setInterval(() => {
      broadcastDailyDigest();
    }, ONE_DAY_MS);
  }, msUntilFirst);

  console.log(`[DailyDigest] Scheduler started. First broadcast in ${Math.round(msUntilFirst / 60000)} minutes`);
}

export async function setupTelegramWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
  const token = getBotToken();
  if (!token) return { success: false, message: "TELEGRAM_BOT_TOKEN not set" };

  try {
    const [webhookRes, commandsRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          ...(WEBHOOK_SECRET ? { secret_token: WEBHOOK_SECRET } : {}),
        }),
      }),
      fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commands: [
            { command: "start", description: "Welcome & open Mini App" },
            { command: "help", description: "Show all commands" },
            { command: "play", description: "Open the Arena" },
            { command: "stats", description: "View platform stats" },
            { command: "profile", description: "Your profile & stats" },
            { command: "balance", description: "Check wallet balance" },
            { command: "withdraw", description: "Send BNB to another address" },
            { command: "points", description: "View your points" },
            { command: "duel", description: "Create a duel" },
            { command: "leaderboard", description: "Top players" },
            { command: "bounties", description: "Browse open bounties" },
            { command: "market", description: "Recent token launches" },
            { command: "tournaments", description: "Active tournaments" },
            { command: "agents", description: "Top rated agents" },
            { command: "token", description: "$HONEY token info" },
            { command: "alerts", description: "Manage price alerts" },
            { command: "refer", description: "Get your referral link" },
            { command: "daily", description: "Daily platform digest" },
          ],
        }),
      }),
    ]);

    const webhookData = await webhookRes.json() as any;
    const commandsData = await commandsRes.json() as any;

    return {
      success: webhookData.ok,
      message: `Webhook set to ${webhookUrl}. Commands: ${commandsData.ok ? "set" : "failed"}`,
    };
  } catch (error) {
    console.error("setupTelegramWebhook error:", error);
    return { success: false, message: String(error) };
  }
}
