import crypto from "crypto";
import { storage } from "./storage";

interface AlertPayload {
  type: string;
  platform: string;
  timestamp: string;
  data: Record<string, any>;
}

const MAX_RETRIES = 3;
const RETRY_DELAYS = [5000, 15000, 60000];
const MAX_FAIL_COUNT = 10;

export async function dispatchAlert(alertType: string, data: Record<string, any>) {
  try {
    const subs = await storage.getOpenclawAlertSubsByType(alertType);
    if (subs.length === 0) return;

    const payload: AlertPayload = {
      type: alertType,
      platform: "honeycomb",
      timestamp: new Date().toISOString(),
      data,
    };

    for (const sub of subs) {
      if (!sub.isActive) continue;

      if (sub.filters) {
        try {
          const filters = JSON.parse(sub.filters);
          if (!matchesFilters(data, filters)) continue;
        } catch {}
      }

      await storage.createOpenclawAlertEvent({
        subscriptionId: sub.id,
        webhookId: sub.webhookId,
        alertType,
        payload: JSON.stringify(payload),
        status: "pending",
        attempts: 0,
      });
    }

    processQueue();
  } catch (error) {
    console.error("[AlertDispatcher] Error dispatching alert:", error);
  }
}

function matchesFilters(data: Record<string, any>, filters: Record<string, any>): boolean {
  for (const [key, value] of Object.entries(filters)) {
    if (data[key] !== undefined && data[key] !== value) return false;
  }
  return true;
}

let processing = false;

async function processQueue() {
  if (processing) return;
  processing = true;

  try {
    const events = await storage.getPendingAlertEvents(50);
    for (const event of events) {
      await deliverEvent(event);
    }
  } catch (error) {
    console.error("[AlertDispatcher] Queue processing error:", error);
  } finally {
    processing = false;
  }
}

async function deliverEvent(event: { id: string; webhookId: string; payload: string; attempts: number }) {
  try {
    const webhook = await storage.getOpenclawWebhook(event.webhookId);
    if (!webhook || !webhook.isActive) {
      await storage.updateAlertEventStatus(event.id, "skipped", event.attempts);
      return;
    }

    if (webhook.failCount >= MAX_FAIL_COUNT) {
      await storage.updateOpenclawWebhook(webhook.id, { isActive: false });
      await storage.updateAlertEventStatus(event.id, "disabled", event.attempts);
      return;
    }

    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(event.payload)
      .digest("hex");

    const parsedPayload = JSON.parse(event.payload);

    const response = await fetch(webhook.webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Honeycomb-Signature": signature,
        "X-Honeycomb-Event": parsedPayload.type || "alert",
      },
      body: event.payload,
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      await storage.markAlertEventDelivered(event.id);
      await storage.resetWebhookFailCount(webhook.id);
    } else {
      const newAttempts = event.attempts + 1;
      if (newAttempts >= MAX_RETRIES) {
        await storage.updateAlertEventStatus(event.id, "failed", newAttempts);
        await storage.incrementWebhookFailCount(webhook.id);
      } else {
        await storage.updateAlertEventStatus(event.id, "pending", newAttempts);
        await storage.incrementWebhookFailCount(webhook.id);
        const delay = RETRY_DELAYS[newAttempts - 1] || 60000;
        setTimeout(() => processQueue(), delay);
      }
    }
  } catch (error: any) {
    const newAttempts = event.attempts + 1;
    if (newAttempts >= MAX_RETRIES) {
      await storage.updateAlertEventStatus(event.id, "failed", newAttempts);
    } else {
      await storage.updateAlertEventStatus(event.id, "pending", newAttempts);
      const delay = RETRY_DELAYS[newAttempts - 1] || 60000;
      setTimeout(() => processQueue(), delay);
    }
    console.error(`[AlertDispatcher] Delivery error for event ${event.id}:`, error.message);
  }
}

export function dispatchTokenLaunchAlert(tokenData: {
  name: string;
  symbol: string;
  address?: string;
  launchedBy?: string;
  imageUrl?: string;
}) {
  dispatchAlert("token_launch", tokenData);
}

export function dispatchBountyAlert(bountyData: {
  id: string;
  title: string;
  amount: string;
  creatorId: string;
  event: "new" | "solved";
}) {
  const alertType = bountyData.event === "new" ? "bounty_new" : "bounty_solved";
  dispatchAlert(alertType, bountyData);
}

export function dispatchNfaMintAlert(nfaData: {
  tokenId: number;
  name: string;
  owner: string;
  agentType?: string;
}) {
  dispatchAlert("nfa_mint", nfaData);
}

export function dispatchPriceAlert(priceData: {
  asset: string;
  price: number;
  change24h?: number;
  trigger?: string;
}) {
  dispatchAlert("price_alert", priceData);
}

export function startAlertProcessor(intervalMs = 30000) {
  setInterval(() => processQueue(), intervalMs);
  console.log(`[AlertDispatcher] Started processing queue every ${intervalMs / 1000}s`);
}
