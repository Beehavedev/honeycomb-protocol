import { Router, Request, Response } from "express";
import { db } from "./db";
import { verifyToken } from "./auth";
import {
  presalePhases,
  presaleTiers,
  presaleWhitelist,
  presaleContributions,
  presaleAllocations,
  presaleReferrals,
  presaleContributeRequestSchema,
  presaleWhitelistAddSchema,
  agents,
} from "@shared/schema";
import { eq, and, desc, sql, sum } from "drizzle-orm";
import crypto from "crypto";

const router = Router();
const ADMIN_ADDRESS = "0xed72f8286e28d4f2aeb52d59385d1ff3bc9d81d7".toLowerCase();

function getAuthAddress(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  return payload?.address?.toLowerCase() || null;
}

function isAdmin(address: string | null): boolean {
  return address === ADMIN_ADDRESS;
}

router.get("/phases", async (_req: Request, res: Response) => {
  try {
    const phases = await db
      .select()
      .from(presalePhases)
      .orderBy(presalePhases.startTime);

    const now = new Date();
    const phasesWithStatus = phases.map((p) => {
      let computedStatus = p.status;
      if (p.status !== "paused") {
        if (now < new Date(p.startTime)) computedStatus = "upcoming";
        else if (now > new Date(p.endTime)) computedStatus = "completed";
        else computedStatus = "active";
      }
      const progress =
        parseFloat(p.hardCapBnb) > 0
          ? (parseFloat(p.totalRaisedBnb) / parseFloat(p.hardCapBnb)) * 100
          : 0;
      return { ...p, computedStatus, progress: Math.min(progress, 100) };
    });

    res.json(phasesWithStatus);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/phases/:id", async (req: Request, res: Response) => {
  try {
    const [phase] = await db
      .select()
      .from(presalePhases)
      .where(eq(presalePhases.id, req.params.id));

    if (!phase) return res.status(404).json({ error: "Phase not found" });

    const tiers = await db
      .select()
      .from(presaleTiers)
      .where(eq(presaleTiers.phaseId, phase.id))
      .orderBy(presaleTiers.sortOrder);

    const progress =
      parseFloat(phase.hardCapBnb) > 0
        ? (parseFloat(phase.totalRaisedBnb) / parseFloat(phase.hardCapBnb)) * 100
        : 0;

    res.json({ ...phase, tiers, progress: Math.min(progress, 100) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/tiers/:phaseId", async (req: Request, res: Response) => {
  try {
    const tiers = await db
      .select()
      .from(presaleTiers)
      .where(eq(presaleTiers.phaseId, req.params.phaseId))
      .orderBy(presaleTiers.sortOrder);
    res.json(tiers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/whitelist-check/:phaseId", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!address) return res.json({ whitelisted: false });

    const [entry] = await db
      .select()
      .from(presaleWhitelist)
      .where(
        and(
          eq(presaleWhitelist.phaseId, req.params.phaseId),
          eq(presaleWhitelist.walletAddress, address)
        )
      );

    res.json({ whitelisted: !!entry, maxAllocation: entry?.maxAllocation || null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/my-contributions", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!address) return res.status(401).json({ error: "Not authenticated" });

    const contributions = await db
      .select()
      .from(presaleContributions)
      .where(eq(presaleContributions.walletAddress, address))
      .orderBy(desc(presaleContributions.createdAt));

    res.json(contributions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/my-allocation", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!address) return res.status(401).json({ error: "Not authenticated" });

    const [allocation] = await db
      .select()
      .from(presaleAllocations)
      .where(eq(presaleAllocations.walletAddress, address));

    const contributions = await db
      .select()
      .from(presaleContributions)
      .where(
        and(
          eq(presaleContributions.walletAddress, address),
          eq(presaleContributions.status, "confirmed")
        )
      );

    const totalBnb = contributions.reduce(
      (sum, c) => sum + parseFloat(c.bnbAmount),
      0
    );
    const totalTokens = contributions.reduce(
      (sum, c) => sum + parseFloat(c.tokenAmount) + parseFloat(c.bonusTokens),
      0
    );

    res.json({
      allocation,
      totalBnbContributed: totalBnb.toString(),
      totalTokensAllocated: totalTokens.toString(),
      contributionCount: contributions.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/my-referral", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!address) return res.status(401).json({ error: "Not authenticated" });

    let [referral] = await db
      .select()
      .from(presaleReferrals)
      .where(eq(presaleReferrals.referrerWallet, address));

    if (!referral) {
      const code = `HONEY-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      [referral] = await db
        .insert(presaleReferrals)
        .values({
          referrerWallet: address,
          referralCode: code,
        })
        .returning();
    }

    res.json(referral);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const phases = await db.select().from(presalePhases);

    const totalRaised = phases.reduce(
      (sum, p) => sum + parseFloat(p.totalRaisedBnb),
      0
    );
    const totalSold = phases.reduce(
      (sum, p) => sum + parseFloat(p.tokensSold),
      0
    );
    const totalParticipants = phases.reduce(
      (sum, p) => sum + p.participants,
      0
    );

    const activePhase = phases.find((p) => {
      const now = new Date();
      return (
        p.status !== "paused" &&
        now >= new Date(p.startTime) &&
        now <= new Date(p.endTime)
      );
    });

    res.json({
      totalRaisedBnb: totalRaised.toString(),
      totalTokensSold: totalSold.toString(),
      totalParticipants,
      activePhase: activePhase || null,
      phases: phases.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        status: p.status,
        totalRaisedBnb: p.totalRaisedBnb,
        hardCapBnb: p.hardCapBnb,
        participants: p.participants,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function verifyOnChainTx(txHash: string, expectedFrom: string, expectedValueBnb: number): Promise<{ valid: boolean; error?: string }> {
  const apiKey = process.env.BSCSCAN_API_KEY;
  if (!apiKey) return { valid: false, error: "BSCScan API key not configured" };

  try {
    const receiptRes = await fetch(
      `https://api.bscscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${apiKey}`
    );
    const receiptData = await receiptRes.json();
    if (receiptData.status !== "1" || receiptData.result?.status !== "1") {
      return { valid: false, error: "Transaction failed or not confirmed" };
    }

    const txRes = await fetch(
      `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`
    );
    const txData = await txRes.json();
    const tx = txData.result;
    if (!tx) return { valid: false, error: "Transaction not found" };

    if (tx.from?.toLowerCase() !== expectedFrom.toLowerCase()) {
      return { valid: false, error: "Transaction sender does not match authenticated wallet" };
    }

    const txValueWei = BigInt(tx.value || "0");
    const expectedWei = BigInt(Math.floor(expectedValueBnb * 1e18));
    const tolerance = expectedWei / BigInt(100); // 1% tolerance for gas
    if (txValueWei < expectedWei - tolerance) {
      return { valid: false, error: "Transaction value too low" };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: `Verification failed: ${err.message}` };
  }
}

router.post("/contribute", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!address) return res.status(401).json({ error: "Not authenticated" });

    const parsed = presaleContributeRequestSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.message });

    const { phaseId, bnbAmount, referralCode, txHash } = parsed.data;
    const bnb = parseFloat(bnbAmount);
    if (bnb <= 0) return res.status(400).json({ error: "Invalid amount" });

    if (txHash) {
      const existingTx = await db
        .select()
        .from(presaleContributions)
        .where(eq(presaleContributions.txHash, txHash));
      if (existingTx.length > 0) {
        return res.status(400).json({ error: "Transaction already recorded" });
      }

      const verification = await verifyOnChainTx(txHash, address, bnb);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error || "Transaction verification failed" });
      }
    }

    const [phase] = await db
      .select()
      .from(presalePhases)
      .where(eq(presalePhases.id, phaseId));
    if (!phase) return res.status(404).json({ error: "Phase not found" });

    const now = new Date();
    if (phase.status === "paused")
      return res.status(400).json({ error: "Presale is paused" });
    if (now < new Date(phase.startTime))
      return res.status(400).json({ error: "Presale has not started yet" });
    if (now > new Date(phase.endTime))
      return res.status(400).json({ error: "Presale has ended" });

    if (phase.type === "private") {
      const [wl] = await db
        .select()
        .from(presaleWhitelist)
        .where(
          and(
            eq(presaleWhitelist.phaseId, phaseId),
            eq(presaleWhitelist.walletAddress, address)
          )
        );
      if (!wl)
        return res
          .status(403)
          .json({ error: "Wallet not whitelisted for private presale" });
    }

    if (phase.type === "public") {
      const userAgents = await db
        .select()
        .from(agents)
        .where(eq(agents.ownerAddress, address));
      if (userAgents.length === 0)
        return res
          .status(403)
          .json({ error: "Public presale requires an active Honeycomb agent. Create one first at /agents." });
    }

    const existingContribs = await db
      .select()
      .from(presaleContributions)
      .where(
        and(
          eq(presaleContributions.phaseId, phaseId),
          eq(presaleContributions.walletAddress, address),
          eq(presaleContributions.status, "confirmed")
        )
      );

    const totalExisting = existingContribs.reduce(
      (s, c) => s + parseFloat(c.bnbAmount),
      0
    );

    if (totalExisting + bnb > parseFloat(phase.maxContribution))
      return res.status(400).json({
        error: `Exceeds max contribution of ${phase.maxContribution} BNB. Current: ${totalExisting} BNB`,
      });

    if (totalExisting === 0 && bnb < parseFloat(phase.minContribution))
      return res.status(400).json({
        error: `Minimum contribution is ${phase.minContribution} BNB`,
      });

    const currentRaised = parseFloat(phase.totalRaisedBnb);
    if (currentRaised + bnb > parseFloat(phase.hardCapBnb))
      return res.status(400).json({ error: "Hard cap reached" });

    const tokenPrice = parseFloat(phase.tokenPrice);
    const tokenAmount = bnb / tokenPrice;

    let bonusTokens = 0;
    if (referralCode) {
      const [referral] = await db
        .select()
        .from(presaleReferrals)
        .where(eq(presaleReferrals.referralCode, referralCode));

      if (referral && referral.referrerWallet !== address) {
        bonusTokens = tokenAmount * (phase.referralBonusPercent / 100);

        await db
          .update(presaleReferrals)
          .set({
            totalReferrals: referral.totalReferrals + 1,
            totalBonusTokens: (
              parseFloat(referral.totalBonusTokens) + bonusTokens
            ).toString(),
          })
          .where(eq(presaleReferrals.id, referral.id));
      }
    }

    const [contribution] = await db
      .insert(presaleContributions)
      .values({
        phaseId,
        walletAddress: address,
        bnbAmount: bnb.toString(),
        tokenAmount: tokenAmount.toString(),
        bonusTokens: bonusTokens.toString(),
        referralCode: referralCode || null,
        txHash: txHash || null,
        status: "confirmed",
      })
      .returning();

    const isNewParticipant = existingContribs.length === 0;

    await db
      .update(presalePhases)
      .set({
        totalRaisedBnb: (currentRaised + bnb).toString(),
        tokensSold: (parseFloat(phase.tokensSold) + tokenAmount).toString(),
        participants: isNewParticipant
          ? phase.participants + 1
          : phase.participants,
        updatedAt: new Date(),
      })
      .where(eq(presalePhases.id, phaseId));

    const [existingAlloc] = await db
      .select()
      .from(presaleAllocations)
      .where(eq(presaleAllocations.walletAddress, address));

    const totalNewTokens = tokenAmount + bonusTokens;

    if (existingAlloc) {
      await db
        .update(presaleAllocations)
        .set({
          totalTokens: (
            parseFloat(existingAlloc.totalTokens) + totalNewTokens
          ).toString(),
        })
        .where(eq(presaleAllocations.id, existingAlloc.id));
    } else {
      await db.insert(presaleAllocations).values({
        walletAddress: address,
        totalTokens: totalNewTokens.toString(),
        tgeUnlockPercent: phase.tgeUnlockPercent,
      });
    }

    res.json({
      success: true,
      contribution,
      tokensReceived: tokenAmount.toString(),
      bonusTokens: bonusTokens.toString(),
    });
  } catch (error: any) {
    console.error("[Presale] Contribute error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ============ ADMIN ROUTES ============

router.post("/admin/phase", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!isAdmin(address))
      return res.status(403).json({ error: "Admin only" });

    const {
      name, type, startTime, endTime, tokenPrice, totalTokens,
      hardCapBnb, softCapBnb, minContribution, maxContribution,
      vestingCliffDays, vestingDurationDays, tgeUnlockPercent,
      referralBonusPercent, description,
    } = req.body;

    const [phase] = await db
      .insert(presalePhases)
      .values({
        name,
        type,
        status: "upcoming",
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        tokenPrice,
        totalTokens,
        hardCapBnb,
        softCapBnb,
        minContribution,
        maxContribution,
        vestingCliffDays: vestingCliffDays || 0,
        vestingDurationDays: vestingDurationDays || 0,
        tgeUnlockPercent: tgeUnlockPercent || 100,
        referralBonusPercent: referralBonusPercent || 5,
        description: description || null,
      })
      .returning();

    res.json(phase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch("/admin/phase/:id", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!isAdmin(address))
      return res.status(403).json({ error: "Admin only" });

    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.status !== undefined) updates.status = req.body.status;
    if (req.body.startTime !== undefined) updates.startTime = new Date(req.body.startTime);
    if (req.body.endTime !== undefined) updates.endTime = new Date(req.body.endTime);
    if (req.body.tokenPrice !== undefined) updates.tokenPrice = req.body.tokenPrice;
    if (req.body.totalTokens !== undefined) updates.totalTokens = req.body.totalTokens;
    if (req.body.hardCapBnb !== undefined) updates.hardCapBnb = req.body.hardCapBnb;
    if (req.body.softCapBnb !== undefined) updates.softCapBnb = req.body.softCapBnb;
    if (req.body.minContribution !== undefined) updates.minContribution = req.body.minContribution;
    if (req.body.maxContribution !== undefined) updates.maxContribution = req.body.maxContribution;
    if (req.body.vestingCliffDays !== undefined) updates.vestingCliffDays = req.body.vestingCliffDays;
    if (req.body.vestingDurationDays !== undefined) updates.vestingDurationDays = req.body.vestingDurationDays;
    if (req.body.tgeUnlockPercent !== undefined) updates.tgeUnlockPercent = req.body.tgeUnlockPercent;
    if (req.body.referralBonusPercent !== undefined) updates.referralBonusPercent = req.body.referralBonusPercent;
    if (req.body.description !== undefined) updates.description = req.body.description;
    updates.updatedAt = new Date();

    const [phase] = await db
      .update(presalePhases)
      .set(updates)
      .where(eq(presalePhases.id, req.params.id))
      .returning();

    res.json(phase);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/tier", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!isAdmin(address))
      return res.status(403).json({ error: "Admin only" });

    const { phaseId, name, tokenPrice, tokenAllocation, bonusPercent, sortOrder } =
      req.body;

    const [tier] = await db
      .insert(presaleTiers)
      .values({
        phaseId,
        name,
        tokenPrice,
        tokenAllocation,
        bonusPercent: bonusPercent || 0,
        sortOrder: sortOrder || 0,
      })
      .returning();

    res.json(tier);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/whitelist", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!isAdmin(address))
      return res.status(403).json({ error: "Admin only" });

    const parsed = presaleWhitelistAddSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ error: parsed.error.message });

    const { phaseId, wallets, maxAllocation } = parsed.data;
    const added: string[] = [];

    for (const wallet of wallets) {
      const normalized = wallet.toLowerCase().trim();
      if (!normalized.startsWith("0x")) continue;

      const [existing] = await db
        .select()
        .from(presaleWhitelist)
        .where(
          and(
            eq(presaleWhitelist.phaseId, phaseId),
            eq(presaleWhitelist.walletAddress, normalized)
          )
        );

      if (!existing) {
        await db.insert(presaleWhitelist).values({
          phaseId,
          walletAddress: normalized,
          maxAllocation: maxAllocation || null,
          addedBy: address,
        });
        added.push(normalized);
      }
    }

    res.json({ added: added.length, wallets: added });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin/whitelist/:phaseId", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!isAdmin(address))
      return res.status(403).json({ error: "Admin only" });

    const entries = await db
      .select()
      .from(presaleWhitelist)
      .where(eq(presaleWhitelist.phaseId, req.params.phaseId))
      .orderBy(desc(presaleWhitelist.addedAt));

    res.json(entries);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/admin/contributions/:phaseId", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!isAdmin(address))
      return res.status(403).json({ error: "Admin only" });

    const contributions = await db
      .select()
      .from(presaleContributions)
      .where(eq(presaleContributions.phaseId, req.params.phaseId))
      .orderBy(desc(presaleContributions.createdAt));

    res.json(contributions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/admin/seed-defaults", async (req: Request, res: Response) => {
  try {
    const address = getAuthAddress(req);
    if (!isAdmin(address))
      return res.status(403).json({ error: "Admin only" });

    const existing = await db.select().from(presalePhases);
    if (existing.length > 0)
      return res.status(400).json({ error: "Phases already exist" });

    const now = new Date();
    const privateStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const privateEnd = new Date(privateStart.getTime() + 14 * 24 * 60 * 60 * 1000);
    const publicStart = new Date(privateEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
    const publicEnd = new Date(publicStart.getTime() + 14 * 24 * 60 * 60 * 1000);

    const [privatePhase] = await db
      .insert(presalePhases)
      .values({
        name: "Private Sale",
        type: "private",
        status: "upcoming",
        startTime: privateStart,
        endTime: privateEnd,
        tokenPrice: "0.004",
        totalTokens: "25000000",
        hardCapBnb: "170",
        softCapBnb: "50",
        minContribution: "0.5",
        maxContribution: "10",
        vestingCliffDays: 180,
        vestingDurationDays: 365,
        tgeUnlockPercent: 10,
        referralBonusPercent: 5,
        description:
          "Exclusive early access for whitelisted community members. $100K raise at $4M FDV ($0.004/token). 50% discount from TGE price.",
      })
      .returning();

    const [publicPhase] = await db
      .insert(presalePhases)
      .values({
        name: "Public Sale",
        type: "public",
        status: "upcoming",
        startTime: publicStart,
        endTime: publicEnd,
        tokenPrice: "0.007",
        totalTokens: "42857143",
        hardCapBnb: "500",
        softCapBnb: "100",
        minContribution: "0.1",
        maxContribution: "5",
        vestingCliffDays: 0,
        vestingDurationDays: 90,
        tgeUnlockPercent: 25,
        referralBonusPercent: 3,
        description:
          "Open to all participants. $300K raise at $7M FDV ($0.007/token). 12.5% discount from TGE price.",
      })
      .returning();

    await db.insert(presaleTiers).values([
      {
        phaseId: privatePhase.id,
        name: "Early Bee",
        tokenPrice: "0.0035",
        tokenAllocation: "10000000",
        bonusPercent: 15,
        sortOrder: 0,
      },
      {
        phaseId: privatePhase.id,
        name: "Worker Bee",
        tokenPrice: "0.004",
        tokenAllocation: "10000000",
        bonusPercent: 10,
        sortOrder: 1,
      },
      {
        phaseId: privatePhase.id,
        name: "Guardian Bee",
        tokenPrice: "0.0045",
        tokenAllocation: "5000000",
        bonusPercent: 5,
        sortOrder: 2,
      },
      {
        phaseId: publicPhase.id,
        name: "Tier 1",
        tokenPrice: "0.006",
        tokenAllocation: "15000000",
        bonusPercent: 10,
        sortOrder: 0,
      },
      {
        phaseId: publicPhase.id,
        name: "Tier 2",
        tokenPrice: "0.007",
        tokenAllocation: "15000000",
        bonusPercent: 5,
        sortOrder: 1,
      },
      {
        phaseId: publicPhase.id,
        name: "Tier 3",
        tokenPrice: "0.0075",
        tokenAllocation: "12857143",
        bonusPercent: 0,
        sortOrder: 2,
      },
    ]);

    res.json({
      success: true,
      privatePhase,
      publicPhase,
      message: "Default presale phases and tiers created",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/verify-tx/:txHash", async (req: Request, res: Response) => {
  try {
    const { txHash } = req.params;
    const apiKey = process.env.BSCSCAN_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "BSCScan API key not configured" });
    }

    const response = await fetch(
      `https://api.bscscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${txHash}&apikey=${apiKey}`
    );
    const data = await response.json();

    if (data.status === "1" && data.result?.status === "1") {
      const txResponse = await fetch(
        `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${apiKey}`
      );
      const txData = await txResponse.json();
      const tx = txData.result;

      res.json({
        verified: true,
        from: tx?.from,
        to: tx?.to,
        value: tx?.value,
        blockNumber: tx?.blockNumber,
      });
    } else {
      res.json({ verified: false, reason: "Transaction not confirmed or failed" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/treasury", async (_req: Request, res: Response) => {
  res.json({
    treasury: process.env.PRESALE_TREASURY_ADDRESS || null,
    contractDeployed: false,
    note: "Gnosis Safe multisig treasury. Set PRESALE_TREASURY_ADDRESS env var.",
  });
});

export default router;
