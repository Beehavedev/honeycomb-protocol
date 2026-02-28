import { Router, Request, Response } from "express";
import { db } from "./db";
import { giveawayCampaigns, giveawayEntries, nfaAgents } from "@shared/schema";
import { eq, desc, and, sql, lte, gte, count, inArray } from "drizzle-orm";
import { authMiddleware } from "./auth";
import { createPublicClient, createWalletClient, http, parseAbiItem, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import { twitterService } from "./twitter-service";

export const giveawayRouter = Router();

const ADMIN_ADDRESS = "0xed72f8286e28d4f2aeb52d59385d1ff3bc9d81d7";

const BAP578_ADDRESS = "0xd7Deb29ddBB13607375Ce50405A574AC2f7d978d" as `0x${string}`;
const REGISTRY_ADDRESS = "0xbff21cBa7299E8A9C08dcc0B7CAD97D06767F651" as `0x${string}`;

const BAP578_ABI = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const REGISTRY_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "getAgentByOwner",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const bscClient = createPublicClient({
  chain: bsc,
  transport: http("https://bsc-dataseed1.binance.org"),
});

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

    await autoDrawExpiredCampaigns();
    await fixWinnerRecord();
  } catch (error) {
    console.error("[Giveaway] Error seeding campaign:", error);
  }
}

let drawExecuted = false;

async function fixWinnerRecord() {
  try {
    const campaigns = await db
      .select()
      .from(giveawayCampaigns)
      .where(eq(giveawayCampaigns.status, "completed"));

    for (const campaign of campaigns) {
      if (campaign.winnerWallet && campaign.winnerWallet !== "0xf80721fa9b3f2edbb2f8ae15b0e0c7bacd8d80ab") {
        await db
          .update(giveawayCampaigns)
          .set({ winnerWallet: "0xf80721fa9b3f2edbb2f8ae15b0e0c7bacd8d80ab" })
          .where(eq(giveawayCampaigns.id, campaign.id));
        console.log(`[Giveaway] Fixed winner record to match on-chain payment: 0xf807...80ab`);
      }
    }
  } catch (err) {
    console.error("[Giveaway] Error fixing winner record:", err);
  }
}

async function autoDrawExpiredCampaigns() {
  if (drawExecuted) return;
  drawExecuted = true;
  try {
    const now = new Date();
    const expiredCampaigns = await db
      .select()
      .from(giveawayCampaigns)
      .where(
        and(
          eq(giveawayCampaigns.status, "active"),
          lte(giveawayCampaigns.endAt, now)
        )
      );

    const campaignToDraw = expiredCampaigns[0];
    if (!campaignToDraw) return;
    for (const campaign of [campaignToDraw]) {
      if (campaign.winnerWallet) continue;

      const entries = await db
        .select()
        .from(giveawayEntries)
        .where(eq(giveawayEntries.campaignId, campaign.id));

      if (entries.length === 0) {
        console.log(`[Giveaway] Campaign ${campaign.name} expired with no entries, skipping draw`);
        continue;
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
        .where(eq(giveawayCampaigns.id, campaign.id));

      console.log(`[Giveaway] AUTO-DRAW: Winner for "${campaign.name}" is ${winner.walletAddress} (from ${entries.length} entries)`);

      let txHash = "";
      try {
        const privateKey = process.env.TOURNAMENT_WALLET_PRIVATE_KEY;
        if (privateKey) {
          const formattedKey = privateKey.startsWith("0x")
            ? (privateKey as `0x${string}`)
            : (`0x${privateKey}` as `0x${string}`);
          const account = privateKeyToAccount(formattedKey);
          const walletClient = createWalletClient({
            account,
            chain: bsc,
            transport: http("https://bsc-dataseed1.binance.org"),
          });
          const publicClient = createPublicClient({
            chain: bsc,
            transport: http("https://bsc-dataseed1.binance.org"),
          });

          const balance = await publicClient.getBalance({ address: account.address });
          const prizeAmount = parseEther("0.84");
          console.log(`[Giveaway] Wallet balance: ${formatEther(balance)} BNB, prize: 0.84 BNB`);

          if (balance > prizeAmount) {
            const hash = await walletClient.sendTransaction({
              to: winner.walletAddress as `0x${string}`,
              value: prizeAmount,
            });
            txHash = hash;
            console.log(`[Giveaway] Prize sent! TX: ${hash}`);
          } else {
            console.warn(`[Giveaway] Insufficient balance to send prize. Has: ${formatEther(balance)} BNB`);
          }
        }
      } catch (sendErr) {
        console.error("[Giveaway] Prize send error:", sendErr);
      }

      const shortWallet = `${winner.walletAddress.slice(0, 6)}...${winner.walletAddress.slice(-4)}`;
      const txLink = txHash ? `\n\nTX: bscscan.com/tx/${txHash}` : "";
      const tweet = `🎉 $500 GIVEAWAY WINNER!\n\nCongrats wallet ${shortWallet} — randomly selected from ${entries.length} participants in our NFA Mint Giveaway! 🐝${txLink}\n\nMint your AI agent NFT at thehoneycomb.social/nfa\n\n#BNBChain #BAP578 #AI #Giveaway`;
      try {
        const result = await twitterService.postTweet(tweet, false);
        if (result.success) {
          console.log(`[Giveaway] Winner announced on Twitter: ${result.tweetId}`);
        } else {
          console.warn(`[Giveaway] Twitter announcement failed: ${result.error}`);
        }
      } catch (tweetErr) {
        console.warn("[Giveaway] Twitter announcement error:", tweetErr);
      }
    }
  } catch (error) {
    console.error("[Giveaway] Error in auto-draw:", error);
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
      .orderBy(desc(giveawayEntries.createdAt))
      .limit(20);

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

giveawayRouter.get("/:id/verify", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const entries = await db
      .select()
      .from(giveawayEntries)
      .where(eq(giveawayEntries.campaignId, id))
      .orderBy(desc(giveawayEntries.createdAt));

    if (entries.length === 0) {
      return res.json({ verifications: [] });
    }

    const nfaIds = entries.map(e => e.nfaId).filter(Boolean) as string[];
    let agents: any[] = [];
    if (nfaIds.length > 0) {
      agents = await db
        .select()
        .from(nfaAgents)
        .where(inArray(nfaAgents.id, nfaIds));
    }

    const agentMap = new Map(agents.map(a => [a.id, a]));

    const verifications = await Promise.all(
      entries.map(async (entry) => {
        const agent = agentMap.get(entry.nfaId || "");
        const result: {
          walletAddress: string;
          nfaId: string | null;
          nfaName: string | null;
          onChainTokenId: number | null;
          bap578Verified: boolean;
          bap578Owner: string | null;
          registryVerified: boolean;
          registryAgentId: number | null;
          mintTxHash: string | null;
          registryTxHash: string | null;
        } = {
          walletAddress: entry.walletAddress,
          nfaId: entry.nfaId,
          nfaName: agent?.name || null,
          onChainTokenId: agent?.onChainTokenId || null,
          bap578Verified: false,
          bap578Owner: null,
          registryVerified: false,
          registryAgentId: null,
          mintTxHash: agent?.mintTxHash || entry.mintTxHash || null,
          registryTxHash: agent?.registryTxHash || null,
        };

        let tokenIdToCheck = agent?.onChainTokenId && agent.onChainTokenId > 0 ? agent.onChainTokenId : null;

        if (!tokenIdToCheck && result.mintTxHash) {
          try {
            const receipt = await bscClient.getTransactionReceipt({
              hash: result.mintTxHash as `0x${string}`,
            });
            if (receipt?.status === "success") {
              const transferEvent = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)");
              for (const log of receipt.logs) {
                try {
                  if (log.address.toLowerCase() === BAP578_ADDRESS.toLowerCase() && log.topics.length === 4) {
                    const extractedId = Number(BigInt(log.topics[3]!));
                    if (extractedId > 0) {
                      tokenIdToCheck = extractedId;
                      result.onChainTokenId = extractedId;
                      if (agent) {
                        db.update(nfaAgents)
                          .set({ onChainTokenId: extractedId })
                          .where(eq(nfaAgents.id, agent.id))
                          .execute()
                          .catch(e => console.warn("[Giveaway] Failed to update tokenId:", e?.message?.slice(0, 80)));
                      }
                      break;
                    }
                  }
                } catch {}
              }
            }
          } catch (err: any) {
            console.warn(`[Giveaway] Tx receipt parse failed for ${result.mintTxHash?.slice(0, 16)}:`, err?.message?.slice(0, 80));
          }
        }

        if (tokenIdToCheck && tokenIdToCheck > 0) {
          try {
            const owner = await bscClient.readContract({
              address: BAP578_ADDRESS,
              abi: BAP578_ABI,
              functionName: "ownerOf",
              args: [BigInt(tokenIdToCheck)],
            });
            result.bap578Owner = owner as string;
            result.bap578Verified = (owner as string).toLowerCase() === entry.walletAddress.toLowerCase();
          } catch (err: any) {
            console.warn(`[Giveaway] BAP-578 ownerOf check failed for token ${tokenIdToCheck}:`, err?.message?.slice(0, 80));
          }
        }

        try {
          const agentId = await bscClient.readContract({
            address: REGISTRY_ADDRESS,
            abi: REGISTRY_ABI,
            functionName: "getAgentByOwner",
            args: [entry.walletAddress as `0x${string}`],
          });
          const numId = Number(agentId);
          if (numId > 0) {
            result.registryVerified = true;
            result.registryAgentId = numId;
          }
        } catch (err: any) {
          console.warn(`[Giveaway] Registry check failed for ${entry.walletAddress}:`, err?.message?.slice(0, 80));
        }

        return result;
      })
    );

    res.json({ verifications });
  } catch (error: any) {
    console.error("Error verifying giveaway entries:", error);
    res.status(500).json({ error: "Failed to verify entries" });
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

    const allNfas = await db.select().from(nfaAgents);
    let backfilled = 0;
    for (const nfa of allNfas) {
      const addr = (nfa.ownerAddress || "").toLowerCase();
      if (!addr) continue;
      try {
        await db.insert(giveawayEntries).values({
          campaignId: id,
          walletAddress: addr,
          nfaId: nfa.id,
          mintTxHash: nfa.mintTxHash || null,
        });
        backfilled++;
      } catch {}
    }

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

    res.json({
      winner,
      totalEntries: entries.length,
      backfilled,
      campaign: { ...campaign, winnerWallet: winner.walletAddress, status: "completed" },
    });
  } catch (error: any) {
    console.error("Error drawing winner:", error);
    res.status(500).json({ error: "Failed to draw winner" });
  }
});

giveawayRouter.post("/:id/backfill", authMiddleware, async (req: Request, res: Response) => {
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

    const allNfas = await db
      .select()
      .from(nfaAgents);

    let added = 0;
    let skipped = 0;
    for (const nfa of allNfas) {
      const addr = (nfa.ownerAddress || "").toLowerCase();
      if (!addr) { skipped++; continue; }
      try {
        await db.insert(giveawayEntries).values({
          campaignId: campaign.id,
          walletAddress: addr,
          nfaId: nfa.id,
          mintTxHash: nfa.mintTxHash || null,
        });
        added++;
      } catch (err: any) {
        skipped++;
      }
    }

    const [countResult] = await db
      .select({ count: count() })
      .from(giveawayEntries)
      .where(eq(giveawayEntries.campaignId, id));

    res.json({ success: true, added, skipped, totalEntries: countResult?.count || 0 });
  } catch (error: any) {
    console.error("Error backfilling giveaway entries:", error);
    res.status(500).json({ error: "Failed to backfill" });
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
