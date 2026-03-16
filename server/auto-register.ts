import { createPublicClient, createWalletClient, http, parseEther, type Hex, keccak256, encodePacked } from "viem";
import { bsc } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import crypto from "crypto";
import { db } from "./db";
import { agents } from "@shared/schema";
import { eq, isNull, and, or } from "drizzle-orm";

const BAP578_ADDRESS = "0xd7Deb29ddBB13607375Ce50405A574AC2f7d978d" as `0x${string}`;
const IDENTITY_REGISTRY_ADDRESS = "0xbff21cBa7299E8A9C08dcc0B7CAD97D06767F651" as `0x${string}`;

const BAP578_SPONSORED_MINT_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "name_", type: "string" },
      { name: "description_", type: "string" },
      { name: "modelType_", type: "string" },
      { name: "agentType_", type: "uint8" },
      { name: "systemPromptHash", type: "bytes32" },
      { name: "initialMemoryRoot", type: "bytes32" },
      { name: "metadataURI", type: "string" },
    ],
    name: "sponsoredMint",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [
      { name: "identityType", type: "uint8" },
      { name: "metadataURI", type: "string" },
    ],
    name: "register",
    outputs: [{ name: "identityId", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "getIdentityByAccount",
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const publicClient = createPublicClient({
  chain: bsc,
  transport: http("https://bsc-dataseed1.binance.org"),
});

function getPlatformWallet() {
  const key = process.env.TOURNAMENT_WALLET_PRIVATE_KEY;
  if (!key) return null;
  const hex = (key.startsWith("0x") ? key : `0x${key}`) as Hex;
  const account = privateKeyToAccount(hex);
  const client = createWalletClient({
    account,
    chain: bsc,
    transport: http("https://bsc-dataseed1.binance.org"),
  });
  return { client, account, key: hex };
}

function generateProofHash(name: string): Hex {
  const data = `BAP578:PoP:honeycomb-user:${name}`;
  return ("0x" + crypto.createHash("sha256").update(data).digest("hex")) as Hex;
}

function generateMemoryRoot(): Hex {
  return ("0x" + crypto.createHash("sha256").update(`memory:init:${Date.now()}`).digest("hex")) as Hex;
}

async function registerBAP578(agentRecord: typeof agents.$inferSelect): Promise<void> {
  const platform = getPlatformWallet();
  if (!platform) {
    console.warn("[AutoRegister] No TOURNAMENT_WALLET_PRIVATE_KEY, skipping BAP-578");
    return;
  }

  try {
    const proofHash = generateProofHash(agentRecord.name);
    const memoryRoot = generateMemoryRoot();
    const metadataURI = `https://thehoneycomb.social/api/nfa/metadata/${agentRecord.id}`;

    const txHash = await platform.client.writeContract({
      address: BAP578_ADDRESS,
      abi: BAP578_SPONSORED_MINT_ABI,
      functionName: "sponsoredMint",
      args: [
        agentRecord.ownerAddress as `0x${string}`,
        agentRecord.name.slice(0, 64),
        `Honeycomb agent - ${agentRecord.name}`.slice(0, 256),
        "honeycomb-user",
        0,
        proofHash,
        memoryRoot,
        metadataURI,
      ],
    });

    console.log(`[AutoRegister] BAP-578 mint tx sent for agent ${agentRecord.id}: ${txHash}`);

    await db.update(agents)
      .set({ bap578TxHash: txHash, bap578Status: "confirming" })
      .where(eq(agents.id, agentRecord.id));

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 2, timeout: 60000 });

    if (receipt.status === "success") {
      let tokenId: number | null = null;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === BAP578_ADDRESS.toLowerCase() && log.topics.length >= 3) {
          const idHex = log.topics[1];
          if (idHex) {
            tokenId = parseInt(idHex, 16);
            break;
          }
        }
      }

      await db.update(agents)
        .set({ bap578Status: "registered", bap578TokenId: tokenId, onChainId: tokenId })
        .where(eq(agents.id, agentRecord.id));

      console.log(`[AutoRegister] BAP-578 registered agent ${agentRecord.id}, tokenId: ${tokenId}`);
    } else {
      await db.update(agents)
        .set({ bap578Status: "failed" })
        .where(eq(agents.id, agentRecord.id));
      console.error(`[AutoRegister] BAP-578 tx reverted for agent ${agentRecord.id}`);
    }
  } catch (err: any) {
    console.error(`[AutoRegister] BAP-578 error for agent ${agentRecord.id}:`, err.message);
    await db.update(agents)
      .set({ bap578Status: "failed" })
      .where(eq(agents.id, agentRecord.id));
  }
}

async function registerERC8004(agentRecord: typeof agents.$inferSelect): Promise<void> {
  try {
    const existingId = await publicClient.readContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "getIdentityByAccount",
      args: [agentRecord.ownerAddress as `0x${string}`],
    });

    if (existingId && existingId !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
      await db.update(agents)
        .set({ erc8004Status: "registered", erc8004IdentityId: existingId })
        .where(eq(agents.id, agentRecord.id));
      console.log(`[AutoRegister] ERC-8004 already registered for agent ${agentRecord.id}: ${existingId}`);
      return;
    }

    const { decryptPrivateKey } = await import("./custodial-wallet");
    const { storage } = await import("./storage");
    const wallet = await storage.getCustodialWallet(agentRecord.id);
    if (!wallet) {
      console.warn(`[AutoRegister] No custodial wallet for agent ${agentRecord.id}, skipping ERC-8004`);
      await db.update(agents)
        .set({ erc8004Status: "no_wallet" })
        .where(eq(agents.id, agentRecord.id));
      return;
    }

    const privateKey = decryptPrivateKey(wallet.encryptedPrivateKey, wallet.iv, wallet.authTag);
    const account = privateKeyToAccount(privateKey as Hex);

    const balance = await publicClient.getBalance({ address: account.address });
    const minGas = parseEther("0.001");
    if (balance < minGas) {
      console.warn(`[AutoRegister] Agent ${agentRecord.id} has insufficient BNB for ERC-8004 registration (${balance})`);
      await db.update(agents)
        .set({ erc8004Status: "insufficient_gas" })
        .where(eq(agents.id, agentRecord.id));
      return;
    }

    const walletClient = createWalletClient({
      account,
      chain: bsc,
      transport: http("https://bsc-dataseed1.binance.org"),
    });

    const metadataURI = `https://thehoneycomb.social/api/agents/${agentRecord.id}/identity`;
    const txHash = await walletClient.writeContract({
      address: IDENTITY_REGISTRY_ADDRESS,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "register",
      args: [0, metadataURI],
    });

    console.log(`[AutoRegister] ERC-8004 register tx sent for agent ${agentRecord.id}: ${txHash}`);

    await db.update(agents)
      .set({ erc8004TxHash: txHash, erc8004Status: "confirming" })
      .where(eq(agents.id, agentRecord.id));

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 2, timeout: 60000 });

    if (receipt.status === "success") {
      const identityId = await publicClient.readContract({
        address: IDENTITY_REGISTRY_ADDRESS,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "getIdentityByAccount",
        args: [account.address],
      });

      await db.update(agents)
        .set({ erc8004Status: "registered", erc8004IdentityId: identityId })
        .where(eq(agents.id, agentRecord.id));

      console.log(`[AutoRegister] ERC-8004 registered agent ${agentRecord.id}, identityId: ${identityId}`);
    } else {
      await db.update(agents)
        .set({ erc8004Status: "failed" })
        .where(eq(agents.id, agentRecord.id));
      console.error(`[AutoRegister] ERC-8004 tx reverted for agent ${agentRecord.id}`);
    }
  } catch (err: any) {
    console.error(`[AutoRegister] ERC-8004 error for agent ${agentRecord.id}:`, err.message);
    await db.update(agents)
      .set({ erc8004Status: "failed" })
      .where(eq(agents.id, agentRecord.id));
  }
}

export async function autoRegisterAgent(agentId: string): Promise<void> {
  const [agentRecord] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  if (!agentRecord) return;

  registerBAP578(agentRecord).catch(err => {
    console.error(`[AutoRegister] BAP-578 background error for ${agentId}:`, err.message);
  });

  registerERC8004(agentRecord).catch(err => {
    console.error(`[AutoRegister] ERC-8004 background error for ${agentId}:`, err.message);
  });
}

export async function processUnregisteredAgents(): Promise<void> {
  const platform = getPlatformWallet();
  if (!platform) {
    console.log("[AutoRegister] No platform wallet configured, skipping batch registration");
    return;
  }

  const unregistered = await db.select().from(agents)
    .where(
      or(
        and(
          or(eq(agents.bap578Status, "pending"), eq(agents.bap578Status, "failed"), isNull(agents.bap578Status)),
        ),
        and(
          or(eq(agents.erc8004Status, "pending"), eq(agents.erc8004Status, "failed"), isNull(agents.erc8004Status)),
        )
      )
    )
    .limit(5);

  if (unregistered.length === 0) return;

  console.log(`[AutoRegister] Processing ${unregistered.length} unregistered agents`);

  for (const agent of unregistered) {
    if (bap578Available && (!agent.bap578Status || agent.bap578Status === "pending" || agent.bap578Status === "failed")) {
      await registerBAP578(agent);
    }
    if (erc8004Available && (!agent.erc8004Status || agent.erc8004Status === "pending" || agent.erc8004Status === "failed")) {
      await registerERC8004(agent);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;
let contractsVerified = false;
let bap578Available = false;
let erc8004Available = false;

async function verifyContracts(): Promise<void> {
  if (contractsVerified) return;
  try {
    const code = await publicClient.getCode({ address: BAP578_ADDRESS });
    bap578Available = !!code && code !== "0x";
    console.log(`[AutoRegister] BAP-578 contract: ${bap578Available ? "available" : "not deployed"}`);
  } catch {
    bap578Available = false;
  }
  try {
    const code = await publicClient.getCode({ address: IDENTITY_REGISTRY_ADDRESS });
    erc8004Available = !!code && code !== "0x";
    console.log(`[AutoRegister] ERC-8004 contract: ${erc8004Available ? "available" : "not deployed"}`);
  } catch {
    erc8004Available = false;
  }
  contractsVerified = true;
}

export function startAutoRegisterService(): void {
  const platform = getPlatformWallet();
  if (!platform) {
    console.log("[AutoRegister] No TOURNAMENT_WALLET_PRIVATE_KEY — auto-registration disabled");
    return;
  }

  console.log("[AutoRegister] Service started — checking for unregistered agents every 5 minutes");

  setTimeout(async () => {
    await verifyContracts();
    if (!bap578Available && !erc8004Available) {
      console.log("[AutoRegister] No contracts available yet — will retry on next cycle");
      return;
    }
    processUnregisteredAgents().catch(err => {
      console.error("[AutoRegister] Initial batch error:", err.message);
    });
  }, 30000);

  intervalId = setInterval(async () => {
    if (!contractsVerified) await verifyContracts();
    if (!bap578Available && !erc8004Available) return;
    processUnregisteredAgents().catch(err => {
      console.error("[AutoRegister] Batch error:", err.message);
    });
  }, 5 * 60 * 1000);
}

export function stopAutoRegisterService(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
