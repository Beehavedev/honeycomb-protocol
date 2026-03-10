import crypto from "crypto";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

function getMiniAppUrl(): string {
  if (process.env.TELEGRAM_MINI_APP_URL) return process.env.TELEGRAM_MINI_APP_URL;
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return "https://thehoneycomb.social";
}

function getBotToken(): string | null {
  if (!BOT_TOKEN) {
    console.warn("TELEGRAM_BOT_TOKEN not set, Telegram bot functions are no-op");
    return null;
  }
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

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: { parseMode?: string; replyMarkup?: any }
): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  try {
    const body: any = {
      chat_id: chatId,
      text,
    };
    if (options?.parseMode) body.parse_mode = options.parseMode;
    if (options?.replyMarkup) body.reply_markup = options.replyMarkup;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.text();
      console.error("Telegram sendMessage error:", errData);
    }
  } catch (error) {
    console.error("Telegram sendMessage failed:", error);
  }
}

export async function handleTelegramUpdate(update: any): Promise<void> {
  const token = getBotToken();
  if (!token) return;

  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();
  const command = text.split(" ")[0].toLowerCase();

  switch (command) {
    case "/start": {
      await sendTelegramMessage(chatId, 
        "Welcome to Honeycomb! The decentralized AI agent platform on BNB Chain.\n\nTap the button below to open the Mini App and start exploring.",
        {
          parseMode: "HTML",
          replyMarkup: {
            inline_keyboard: [[
              {
                text: "Open Honeycomb",
                web_app: { url: `${getMiniAppUrl()}/tg` },
              },
            ]],
          },
        }
      );
      break;
    }

    case "/play": {
      await sendTelegramMessage(chatId,
        "Ready to compete? Open the Arena and challenge other players!",
        {
          replyMarkup: {
            inline_keyboard: [[
              {
                text: "Open Arena",
                web_app: { url: `${getMiniAppUrl()}/tg` },
              },
            ]],
          },
        }
      );
      break;
    }

    case "/stats": {
      try {
        const { storage } = await import("./storage");
        const allAgents = await storage.getAgentCount();
        const duelCount = await storage.getDuelCount();

        await sendTelegramMessage(chatId,
          `Honeycomb Platform Stats:\n\nTotal Users: ${allAgents}\nTotal Duels: ${duelCount}\n\nJoin the action now!`,
          {
            replyMarkup: {
              inline_keyboard: [[
                {
                  text: "View Stats",
                  web_app: { url: `${getMiniAppUrl()}/tg` },
                },
              ]],
            },
          }
        );
      } catch (error) {
        console.error("Error fetching stats:", error);
        await sendTelegramMessage(chatId, "Could not fetch stats at this time. Please try again later.");
      }
      break;
    }

    case "/refer": {
      try {
        const { storage } = await import("./storage");
        const telegramId = message.from?.id?.toString();
        if (!telegramId) {
          await sendTelegramMessage(chatId, "Could not identify your Telegram account.");
          break;
        }

        const agent = await storage.getAgentByTelegramId(telegramId);
        if (!agent) {
          await sendTelegramMessage(chatId, "You haven't linked your account yet. Open the Mini App to get started!",
            {
              replyMarkup: {
                inline_keyboard: [[
                  {
                    text: "Open Honeycomb",
                    web_app: { url: `${getMiniAppUrl()}/tg` },
                  },
                ]],
              },
            }
          );
          break;
        }

        const referralCode = `BEE${agent.id.substring(0, 11).toUpperCase().replace(/-/g, "")}`;
        const referralLink = `${getMiniAppUrl()}/r/${referralCode}`;
        await sendTelegramMessage(chatId,
          `Your referral link:\n${referralLink}\n\nShare it with friends to earn rewards!`
        );
      } catch (error) {
        console.error("Error getting referral:", error);
        await sendTelegramMessage(chatId, "Could not fetch your referral info. Please try again later.");
      }
      break;
    }

    default:
      break;
  }
}

export async function setupTelegramWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
  const token = getBotToken();
  if (!token) return { success: false, message: "TELEGRAM_BOT_TOKEN not set" };

  try {
    const webhookRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });

    const webhookData = await webhookRes.json() as any;
    if (!webhookData.ok) {
      return { success: false, message: `setWebhook failed: ${webhookData.description}` };
    }

    const commandsRes = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "start", description: "Welcome & open Mini App" },
          { command: "play", description: "Open the Arena" },
          { command: "stats", description: "View platform stats" },
          { command: "refer", description: "Get your referral link" },
        ],
      }),
    });

    const commandsData = await commandsRes.json() as any;

    return {
      success: true,
      message: `Webhook set to ${webhookUrl}. Commands: ${commandsData.ok ? "set" : "failed"}`,
    };
  } catch (error) {
    console.error("setupTelegramWebhook error:", error);
    return { success: false, message: String(error) };
  }
}
