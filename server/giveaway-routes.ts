import { Router, Request, Response } from "express";
import { db } from "./db";
import { giveawayCampaigns, giveawayEntries } from "@shared/schema";
import { eq, desc, and, sql, lte, gte, count } from "drizzle-orm";
import { authMiddleware } from "./auth";

export const giveawayRouter = Router();

const ADMIN_ADDRESS = "0xed72f8286e28d4f2aeb52d59385d1ff3bc9d81d7";

export async function seedGiveawayCampaign() {
  try {
    const existing = await db
      .select()
      .from(giveawayCampaigns)
      .where(eq(giveawayCampaigns.taskType, "mint_nfa"))
      .limit(1);

    if (existing.length === 0) {
      const now = new Date();
      const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await db.insert(giveawayCampaigns).values({
        name: "NFA Mint Giveaway",
        description: "Mint a Non-Fungible Agent on-chain and get a chance to win $500! One lucky winner will be randomly selected from all participants who mint an NFA during the campaign period.",
        prizeAmountUsd: 500,
        taskType: "mint_nfa",
        startAt: now,
        endAt: endAt,
        status: "active",
      });
      console.log("[Giveaway] Seeded NFA Mint Giveaway campaign (7-day duration)");
    } else {
      console.log("[Giveaway] Campaign already exists, skipping seed");
    }
  } catch (error) {
    console.error("[Giveaway] Error seeding campaign:", error);
  }
}

giveawayRouter.get("/active", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const campaigns = await db
      .select()
      .from(giveawayCampaigns)
      .where(
        and(
          lte(giveawayCampaigns.startAt, now),
          gte(giveawayCampaigns.endAt, now),
          eq(giveawayCampaigns.status, "active")
        )
      )
      .limit(1);

    let campaign = campaigns[0] || null;

    if (!campaign) {
      const completed = await db
        .select()
        .from(giveawayCampaigns)
        .orderBy(desc(giveawayCampaigns.endAt))
        .limit(1);
      campaign = completed[0] || null;
    }

    if (!campaign) {
      return res.json({ campaign: null, entryCount: 0, entries: [] });
    }

    const [countResult] = await db
      .select({ count: count() })
      .from(giveawayEntries)
      .where(eq(giveawayEntries.campaignId, campaign.id));

    const entries = await db
      .select()
      .from(giveawayEntries)
      .where(eq(giveawayEntries.campaignId, campaign.id))
      .orderBy(desc(giveawayEntries.createdAt));

    res.json({
      campaign,
      entryCount: countResult?.count || 0,
      entries,
    });
  } catch (error: any) {
    console.error("Error fetching active giveaway:", error);
    res.status(500).json({ error: "Failed to fetch giveaway" });
  }
});

giveawayRouter.get("/:id/entries", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entries = await db
      .select()
      .from(giveawayEntries)
      .where(eq(giveawayEntries.campaignId, id))
      .orderBy(desc(giveawayEntries.createdAt));

    res.json({ entries });
  } catch (error: any) {
    console.error("Error fetching giveaway entries:", error);
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

giveawayRouter.get("/:id/my-entry", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const wallet = req.walletAddress?.toLowerCase();
    if (!wallet) return res.status(401).json({ error: "Not authenticated" });

    const entries = await db
      .select()
      .from(giveawayEntries)
      .where(
        and(
          eq(giveawayEntries.campaignId, id),
          eq(giveawayEntries.walletAddress, wallet)
        )
      )
      .limit(1);

    res.json({ entry: entries[0] || null });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to check entry" });
  }
});

giveawayRouter.post("/:id/draw", authMiddleware, async (req: Request, res: Response) => {
  try {
    const wallet = req.walletAddress?.toLowerCase();
    if (wallet !== ADMIN_ADDRESS) {
      return res.status(403).json({ error: "Admin only" });
    }

    const { id } = req.params;

    const campaigns = await db
      .select()
      .from(giveawayCampaigns)
      .where(eq(giveawayCampaigns.id, id))
      .limit(1);

    const campaign = campaigns[0];
    if (!campaign) return res.status(404).json({ error: "Campaign not found" });
    if (campaign.winnerWallet) return res.status(400).json({ error: "Winner already drawn" });

    const entries = await db
      .select()
      .from(giveawayEntries)
      .where(eq(giveawayEntries.campaignId, id));

    if (entries.length === 0) {
      return res.status(400).json({ error: "No entries to draw from" });
    }

    const winnerIndex = Math.floor(Math.random() * entries.length);
    const winner = entries[winnerIndex];

    await db
      .update(giveawayCampaigns)
      .set({
        winnerEntryId: winner.id,
        winnerWallet: winner.walletAddress,
        drawnAt: new Date(),
        status: "completed",
      })
      .where(eq(giveawayCampaigns.id, id));

    res.json({ winner, campaign: { ...campaign, winnerWallet: winner.walletAddress, status: "completed" } });
  } catch (error: any) {
    console.error("Error drawing winner:", error);
    res.status(500).json({ error: "Failed to draw winner" });
  }
});

export async function autoCreateGiveawayEntry(walletAddress: string, nfaId: string, mintTxHash: string | null) {
  try {
    const now = new Date();
    const activeCampaigns = await db
      .select()
      .from(giveawayCampaigns)
      .where(
        and(
          lte(giveawayCampaigns.startAt, now),
          gte(giveawayCampaigns.endAt, now),
          eq(giveawayCampaigns.status, "active"),
          eq(giveawayCampaigns.taskType, "mint_nfa")
        )
      );

    for (const campaign of activeCampaigns) {
      try {
        await db.insert(giveawayEntries).values({
          campaignId: campaign.id,
          walletAddress: walletAddress.toLowerCase(),
          nfaId,
          mintTxHash,
        });
        console.log(`[Giveaway] Auto-entry created for ${walletAddress} in campaign ${campaign.id}`);
      } catch (err: any) {
        if (err?.message?.includes("unique_campaign_wallet")) {
          console.log(`[Giveaway] Wallet ${walletAddress} already entered campaign ${campaign.id}`);
        } else {
          console.error(`[Giveaway] Failed to create entry:`, err);
        }
      }
    }
  } catch (error) {
    console.error("[Giveaway] Error in auto-entry:", error);
  }
}
