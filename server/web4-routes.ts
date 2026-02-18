import { Router, Request, Response } from "express";
import { storage } from "./storage";
import {
  web4DepositRequestSchema,
  web4TransferRequestSchema,
  web4TipRequestSchema,
  web4CreateSkillRequestSchema,
  web4PurchaseSkillRequestSchema,
  web4EvolveRequestSchema,
  web4ReplicateRequestSchema,
} from "@shared/schema";
import { verifyToken } from "./auth";
import crypto from "crypto";

const router = Router();

function validatePositiveAmount(amount: string): boolean {
  try {
    const val = BigInt(amount);
    return val > 0n;
  } catch {
    return false;
  }
}

function authMiddleware(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.walletAddress = payload.address;
  next();
}

async function getOrCreateWallet(agentId: string) {
  let wallet = await storage.getAgentWallet(agentId);
  if (!wallet) {
    wallet = await storage.createAgentWallet({
      agentId,
      balance: "0",
      totalEarned: "0",
      totalSpent: "0",
      status: "active",
    });
  }
  return wallet;
}

router.get("/wallet/:agentId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = await storage.getAgent(agentId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    if (agent.ownerAddress.toLowerCase() !== req.walletAddress!.toLowerCase()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const wallet = await getOrCreateWallet(agentId);
    const transactions = await storage.getAgentTransactions(agentId, 50);
    const lineageAsParent = await storage.getAgentLineageAsParent(agentId);
    const lineageAsChild = await storage.getAgentLineageAsChild(agentId);

    res.json({ wallet, transactions, lineageAsParent, lineageAsChild });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/wallet/deposit", authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = web4DepositRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });

    const { agentId, amount } = parsed.data;
    if (!validatePositiveAmount(amount)) return res.status(400).json({ error: "Amount must be a positive integer" });

    const agent = await storage.getAgent(agentId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    if (agent.ownerAddress.toLowerCase() !== req.walletAddress!.toLowerCase()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const wallet = await getOrCreateWallet(agentId);
    const newBalance = (BigInt(wallet.balance) + BigInt(amount)).toString();
    const newEarned = (BigInt(wallet.totalEarned) + BigInt(amount)).toString();

    const updatedWallet = await storage.updateAgentWalletBalance(agentId, newBalance, newEarned);

    await storage.createAgentTransaction({
      agentId,
      type: "deposit",
      amount,
      description: "Wallet deposit",
    });

    if (wallet.status === "dormant") {
      await storage.updateAgentWalletStatus(agentId, "active");
    }

    res.json({ wallet: updatedWallet });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/wallet/withdraw", authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = web4DepositRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

    const { agentId, amount } = parsed.data;
    if (!validatePositiveAmount(amount)) return res.status(400).json({ error: "Amount must be a positive integer" });

    const agent = await storage.getAgent(agentId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    if (agent.ownerAddress.toLowerCase() !== req.walletAddress!.toLowerCase()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const wallet = await getOrCreateWallet(agentId);
    if (BigInt(wallet.balance) < BigInt(amount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const newBalance = (BigInt(wallet.balance) - BigInt(amount)).toString();
    const newSpent = (BigInt(wallet.totalSpent) + BigInt(amount)).toString();

    const updatedWallet = await storage.updateAgentWalletBalance(agentId, newBalance, undefined, newSpent);

    await storage.createAgentTransaction({
      agentId,
      type: "withdraw",
      amount,
      description: "Wallet withdrawal",
    });

    res.json({ wallet: updatedWallet });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/transfer", authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = web4TransferRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

    const { fromAgentId, toAgentId, amount, description } = parsed.data;
    if (!validatePositiveAmount(amount)) return res.status(400).json({ error: "Amount must be a positive integer" });

    const fromAgent = await storage.getAgent(fromAgentId);
    if (!fromAgent) return res.status(404).json({ error: "Sender agent not found" });
    if (fromAgent.ownerAddress.toLowerCase() !== req.walletAddress!.toLowerCase()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const toAgent = await storage.getAgent(toAgentId);
    if (!toAgent) return res.status(404).json({ error: "Recipient agent not found" });

    const fromWallet = await getOrCreateWallet(fromAgentId);
    if (BigInt(fromWallet.balance) < BigInt(amount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const toWallet = await getOrCreateWallet(toAgentId);

    const fromNewBalance = (BigInt(fromWallet.balance) - BigInt(amount)).toString();
    const fromNewSpent = (BigInt(fromWallet.totalSpent) + BigInt(amount)).toString();
    await storage.updateAgentWalletBalance(fromAgentId, fromNewBalance, undefined, fromNewSpent);

    const toNewBalance = (BigInt(toWallet.balance) + BigInt(amount)).toString();
    const toNewEarned = (BigInt(toWallet.totalEarned) + BigInt(amount)).toString();
    await storage.updateAgentWalletBalance(toAgentId, toNewBalance, toNewEarned);

    await storage.createAgentTransaction({
      agentId: fromAgentId,
      type: "spend_transfer",
      amount,
      counterpartyAgentId: toAgentId,
      description: description || `Transfer to ${toAgent.name}`,
    });

    await storage.createAgentTransaction({
      agentId: toAgentId,
      type: "earn_tip",
      amount,
      counterpartyAgentId: fromAgentId,
      description: description || `Received from ${fromAgent.name}`,
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/tip", authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = web4TipRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

    const { fromAgentId, toAgentId, amount, referenceType, referenceId } = parsed.data;
    if (!validatePositiveAmount(amount)) return res.status(400).json({ error: "Amount must be a positive integer" });

    const fromAgent = await storage.getAgent(fromAgentId);
    if (!fromAgent) return res.status(404).json({ error: "Sender not found" });
    if (fromAgent.ownerAddress.toLowerCase() !== req.walletAddress!.toLowerCase()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const toAgent = await storage.getAgent(toAgentId);
    if (!toAgent) return res.status(404).json({ error: "Recipient not found" });

    const fromWallet = await getOrCreateWallet(fromAgentId);
    if (BigInt(fromWallet.balance) < BigInt(amount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const toWallet = await getOrCreateWallet(toAgentId);

    const fromNewBalance = (BigInt(fromWallet.balance) - BigInt(amount)).toString();
    const fromNewSpent = (BigInt(fromWallet.totalSpent) + BigInt(amount)).toString();
    await storage.updateAgentWalletBalance(fromAgentId, fromNewBalance, undefined, fromNewSpent);

    const toNewBalance = (BigInt(toWallet.balance) + BigInt(amount)).toString();
    const toNewEarned = (BigInt(toWallet.totalEarned) + BigInt(amount)).toString();
    await storage.updateAgentWalletBalance(toAgentId, toNewBalance, toNewEarned);

    const lineage = await storage.getAgentLineageAsChild(toAgentId);
    if (lineage) {
      const revenueShare = (BigInt(amount) * BigInt(lineage.revenueShareBps) / BigInt(10000)).toString();
      if (BigInt(revenueShare) > 0) {
        const parentWallet = await getOrCreateWallet(lineage.parentAgentId);
        const parentNewBalance = (BigInt(parentWallet.balance) + BigInt(revenueShare)).toString();
        const parentNewEarned = (BigInt(parentWallet.totalEarned) + BigInt(revenueShare)).toString();
        await storage.updateAgentWalletBalance(lineage.parentAgentId, parentNewBalance, parentNewEarned);

        const newTotalShared = (BigInt(lineage.totalRevenueShared) + BigInt(revenueShare)).toString();
        await storage.updateLineageRevenueShared(lineage.id, newTotalShared);

        await storage.createAgentTransaction({
          agentId: lineage.parentAgentId,
          type: "revenue_share",
          amount: revenueShare,
          counterpartyAgentId: toAgentId,
          description: `Revenue share from ${toAgent.name}`,
        });
      }
    }

    await storage.createAgentTransaction({
      agentId: fromAgentId,
      type: "spend_transfer",
      amount,
      counterpartyAgentId: toAgentId,
      referenceType,
      referenceId,
      description: `Tip to ${toAgent.name}`,
    });

    await storage.createAgentTransaction({
      agentId: toAgentId,
      type: "earn_tip",
      amount,
      counterpartyAgentId: fromAgentId,
      referenceType,
      referenceId,
      description: `Tip from ${fromAgent.name}`,
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/skills", authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = web4CreateSkillRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });

    const { agentId, name, description, priceAmount, category } = parsed.data;

    const agent = await storage.getAgent(agentId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    if (agent.ownerAddress.toLowerCase() !== req.walletAddress!.toLowerCase()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const skill = await storage.createAgentSkill({
      agentId,
      name,
      description,
      priceAmount,
      category,
      isActive: true,
    });

    res.status(201).json({ skill });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/skills", async (_req: Request, res: Response) => {
  try {
    const skills = await storage.getAllActiveSkills(100);
    const skillsWithAgents = await Promise.all(
      skills.map(async (skill) => {
        const agent = await storage.getAgent(skill.agentId);
        return { ...skill, agent: agent ? { id: agent.id, name: agent.name, avatarUrl: agent.avatarUrl, isBot: agent.isBot } : null };
      })
    );
    res.json({ skills: skillsWithAgents });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/skills/agent/:agentId", async (req: Request, res: Response) => {
  try {
    const skills = await storage.getAgentSkillsByAgent(req.params.agentId);
    res.json({ skills });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/skills/purchase", authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = web4PurchaseSkillRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

    const { buyerAgentId, skillId } = parsed.data;

    const buyerAgent = await storage.getAgent(buyerAgentId);
    if (!buyerAgent) return res.status(404).json({ error: "Buyer agent not found" });
    if (buyerAgent.ownerAddress.toLowerCase() !== req.walletAddress!.toLowerCase()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const skill = await storage.getAgentSkill(skillId);
    if (!skill || !skill.isActive) return res.status(404).json({ error: "Skill not found or inactive" });

    if (skill.agentId === buyerAgentId) {
      return res.status(400).json({ error: "Cannot purchase your own skill" });
    }

    const buyerWallet = await getOrCreateWallet(buyerAgentId);
    if (BigInt(buyerWallet.balance) < BigInt(skill.priceAmount)) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const sellerWallet = await getOrCreateWallet(skill.agentId);

    const buyerNewBalance = (BigInt(buyerWallet.balance) - BigInt(skill.priceAmount)).toString();
    const buyerNewSpent = (BigInt(buyerWallet.totalSpent) + BigInt(skill.priceAmount)).toString();
    await storage.updateAgentWalletBalance(buyerAgentId, buyerNewBalance, undefined, buyerNewSpent);

    const sellerNewBalance = (BigInt(sellerWallet.balance) + BigInt(skill.priceAmount)).toString();
    const sellerNewEarned = (BigInt(sellerWallet.totalEarned) + BigInt(skill.priceAmount)).toString();
    await storage.updateAgentWalletBalance(skill.agentId, sellerNewBalance, sellerNewEarned);

    await storage.incrementSkillPurchases(skillId, skill.priceAmount);

    const purchase = await storage.createSkillPurchase({
      skillId,
      buyerAgentId,
      sellerAgentId: skill.agentId,
      amount: skill.priceAmount,
      status: "fulfilled",
    });

    const sellerAgent = await storage.getAgent(skill.agentId);

    await storage.createAgentTransaction({
      agentId: buyerAgentId,
      type: "spend_service",
      amount: skill.priceAmount,
      counterpartyAgentId: skill.agentId,
      referenceType: "skill",
      referenceId: skillId,
      description: `Purchased skill: ${skill.name} from ${sellerAgent?.name || "Unknown"}`,
    });

    await storage.createAgentTransaction({
      agentId: skill.agentId,
      type: "earn_service",
      amount: skill.priceAmount,
      counterpartyAgentId: buyerAgentId,
      referenceType: "skill",
      referenceId: skillId,
      description: `Sold skill: ${skill.name} to ${buyerAgent.name}`,
    });

    const lineage = await storage.getAgentLineageAsChild(skill.agentId);
    if (lineage) {
      const revenueShare = (BigInt(skill.priceAmount) * BigInt(lineage.revenueShareBps) / BigInt(10000)).toString();
      if (BigInt(revenueShare) > 0) {
        const parentWallet = await getOrCreateWallet(lineage.parentAgentId);
        const parentNewBalance = (BigInt(parentWallet.balance) + BigInt(revenueShare)).toString();
        const parentNewEarned = (BigInt(parentWallet.totalEarned) + BigInt(revenueShare)).toString();
        await storage.updateAgentWalletBalance(lineage.parentAgentId, parentNewBalance, parentNewEarned);

        const newTotalShared = (BigInt(lineage.totalRevenueShared) + BigInt(revenueShare)).toString();
        await storage.updateLineageRevenueShared(lineage.id, newTotalShared);

        await storage.createAgentTransaction({
          agentId: lineage.parentAgentId,
          type: "revenue_share",
          amount: revenueShare,
          counterpartyAgentId: skill.agentId,
          description: `Revenue share from skill sale: ${skill.name}`,
        });
      }
    }

    res.json({ purchase });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/evolve", authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = web4EvolveRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request" });

    const { agentId, toModel, reason, metricsJson } = parsed.data;

    const agent = await storage.getAgent(agentId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    if (agent.ownerAddress.toLowerCase() !== req.walletAddress!.toLowerCase()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const currentProfile = await storage.getAgentRuntimeProfile(agentId);
    const fromModel = currentProfile?.modelName || null;

    const verificationHash = crypto.createHash("sha256")
      .update(`${agentId}:${fromModel}:${toModel}:${Date.now()}`)
      .digest("hex");

    const evolution = await storage.createAgentEvolution({
      agentId,
      fromModel,
      toModel,
      reason,
      metricsJson,
      verificationHash,
    });

    await storage.upsertAgentRuntimeProfile(agentId, toModel);

    res.json({ evolution });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/evolutions/:agentId", async (req: Request, res: Response) => {
  try {
    const evolutions = await storage.getAgentEvolutions(req.params.agentId);
    const profile = await storage.getAgentRuntimeProfile(req.params.agentId);
    res.json({ evolutions, currentProfile: profile || null });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/replicate", authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = web4ReplicateRequestSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });

    const { parentAgentId, childName, childBio, revenueShareBps, fundingAmount } = parsed.data;

    const parentAgent = await storage.getAgent(parentAgentId);
    if (!parentAgent) return res.status(404).json({ error: "Parent agent not found" });
    if (parentAgent.ownerAddress.toLowerCase() !== req.walletAddress!.toLowerCase()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const parentWallet = await getOrCreateWallet(parentAgentId);
    if (BigInt(parentWallet.balance) < BigInt(fundingAmount)) {
      return res.status(400).json({ error: "Insufficient balance to fund child agent" });
    }

    const childAgent = await storage.createAgent({
      ownerAddress: parentAgent.ownerAddress,
      name: childName,
      bio: childBio || `Offspring of ${parentAgent.name}. Autonomous agent on BNB Chain.`,
      avatarUrl: parentAgent.avatarUrl,
      capabilities: parentAgent.capabilities || [],
      isBot: true,
    });

    const lineage = await storage.createAgentLineage({
      parentAgentId,
      childAgentId: childAgent.id,
      revenueShareBps,
    });

    const parentNewBalance = (BigInt(parentWallet.balance) - BigInt(fundingAmount)).toString();
    const parentNewSpent = (BigInt(parentWallet.totalSpent) + BigInt(fundingAmount)).toString();
    await storage.updateAgentWalletBalance(parentAgentId, parentNewBalance, undefined, parentNewSpent);

    const childWallet = await storage.createAgentWallet({
      agentId: childAgent.id,
      balance: fundingAmount,
      totalEarned: fundingAmount,
      totalSpent: "0",
      status: "active",
    });

    const parentProfile = await storage.getAgentRuntimeProfile(parentAgentId);
    if (parentProfile) {
      await storage.upsertAgentRuntimeProfile(childAgent.id, parentProfile.modelName, parentProfile.modelVersion);
    }

    await storage.createAgentTransaction({
      agentId: parentAgentId,
      type: "spend_replicate",
      amount: fundingAmount,
      counterpartyAgentId: childAgent.id,
      description: `Funded child agent: ${childName}`,
    });

    await storage.createAgentTransaction({
      agentId: childAgent.id,
      type: "deposit",
      amount: fundingAmount,
      counterpartyAgentId: parentAgentId,
      description: `Genesis funding from parent: ${parentAgent.name}`,
    });

    await storage.createAgentEvolution({
      agentId: childAgent.id,
      fromModel: null,
      toModel: parentProfile?.modelName || "gpt-4o",
      reason: `Genesis: Replicated from ${parentAgent.name}`,
      verificationHash: crypto.createHash("sha256")
        .update(`${childAgent.id}:genesis:${parentAgentId}:${Date.now()}`)
        .digest("hex"),
    });

    res.status(201).json({
      childAgent,
      childWallet,
      lineage,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/lineage/:agentId", async (req: Request, res: Response) => {
  try {
    const asParent = await storage.getAgentLineageAsParent(req.params.agentId);
    const asChild = await storage.getAgentLineageAsChild(req.params.agentId);

    const childrenWithNames = await Promise.all(
      asParent.map(async (l) => {
        const child = await storage.getAgent(l.childAgentId);
        const childWallet = await storage.getAgentWallet(l.childAgentId);
        return {
          ...l,
          childName: child?.name || "Unknown",
          childAvatarUrl: child?.avatarUrl,
          childBalance: childWallet?.balance || "0",
          childStatus: childWallet?.status || "unknown",
        };
      })
    );

    let parentInfo = null;
    if (asChild) {
      const parent = await storage.getAgent(asChild.parentAgentId);
      parentInfo = {
        ...asChild,
        parentName: parent?.name || "Unknown",
        parentAvatarUrl: parent?.avatarUrl,
      };
    }

    res.json({ children: childrenWithNames, parent: parentInfo });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/economy/summary/:agentId", async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = await storage.getAgent(agentId);
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const wallet = await getOrCreateWallet(agentId);
    const transactions = await storage.getAgentTransactions(agentId, 20);
    const skills = await storage.getAgentSkillsByAgent(agentId);
    const evolutions = await storage.getAgentEvolutions(agentId);
    const runtimeProfile = await storage.getAgentRuntimeProfile(agentId);
    const lineageAsParent = await storage.getAgentLineageAsParent(agentId);
    const lineageAsChild = await storage.getAgentLineageAsChild(agentId);

    res.json({
      agent: { id: agent.id, name: agent.name, avatarUrl: agent.avatarUrl, isBot: agent.isBot },
      wallet,
      recentTransactions: transactions,
      skills,
      evolutions,
      runtimeProfile: runtimeProfile || null,
      children: lineageAsParent.length,
      parent: lineageAsChild ? lineageAsChild.parentAgentId : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
