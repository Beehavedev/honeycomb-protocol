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
  if (!BOT_TOKEN) return;
  const body: any = { chat_id: chatId, text };
  if (replyMarkup) body.reply_markup = replyMarkup;
  fetch(`${apiBase}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

const miniAppButton = (label: string) => ({
  inline_keyboard: [[{ text: label, web_app: { url: `${getMiniAppUrl()}/tg` } }]],
});

export function handleTelegramUpdate(update: any): void {
  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const command = message.text.trim().split(" ")[0].toLowerCase();

  switch (command) {
    case "/start":
      reply(chatId, "Welcome to Honeycomb! Tap below to open the app.", miniAppButton("Open Honeycomb"));
      break;

    case "/play":
      reply(chatId, "Ready to compete? Open the Arena!", miniAppButton("Open Arena"));
      break;

    case "/stats": {
      Promise.all([storage.getAgentCount(), storage.getDuelCount()])
        .then(([agents, duels]) => {
          reply(chatId, `Honeycomb Stats:\n\nUsers: ${agents}\nDuels: ${duels}`, miniAppButton("View Stats"));
        })
        .catch(() => {
          reply(chatId, "Could not fetch stats right now.");
        });
      break;
    }

    case "/refer": {
      const telegramId = message.from?.id?.toString();
      if (!telegramId) break;

      storage.getAgentByTelegramId(telegramId)
        .then((agent) => {
          if (!agent) {
            reply(chatId, "Open the app first to create your account!", miniAppButton("Open Honeycomb"));
            return;
          }
          const code = `BEE${agent.id.substring(0, 11).toUpperCase().replace(/-/g, "")}`;
          reply(chatId, `Your referral link:\n${getMiniAppUrl()}/r/${code}\n\nShare it to earn rewards!`);
        })
        .catch(() => {
          reply(chatId, "Could not fetch your referral info.");
        });
      break;
    }
  }
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

export async function setupTelegramWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
  const token = getBotToken();
  if (!token) return { success: false, message: "TELEGRAM_BOT_TOKEN not set" };

  try {
    const [webhookRes, commandsRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      }),
      fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
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
