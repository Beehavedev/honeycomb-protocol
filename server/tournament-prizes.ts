import { createWalletClient, createPublicClient, http, parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import { storage } from "./storage";
import type { TradingTournament } from "@shared/schema";

const BSC_RPC = "https://bsc-dataseed1.binance.org";

function getTournamentWallet() {
  const privateKey = process.env.TOURNAMENT_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("TOURNAMENT_WALLET_PRIVATE_KEY not configured");
  }

  const formattedKey = privateKey.startsWith("0x")
    ? (privateKey as `0x${string}`)
    : (`0x${privateKey}` as `0x${string}`);

  const account = privateKeyToAccount(formattedKey);

  const walletClient = createWalletClient({
    account,
    chain: bsc,
    transport: http(BSC_RPC),
  });

  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(BSC_RPC),
  });

  return { account, walletClient, publicClient };
}

export async function getTournamentWalletAddress(): Promise<string> {
  const { account } = getTournamentWallet();
  return account.address;
}

export async function getTournamentWalletBalance(): Promise<string> {
  const { account, publicClient } = getTournamentWallet();
  const balance = await publicClient.getBalance({ address: account.address });
  return formatEther(balance);
}

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

interface PrizeResult {
  place: number;
  agentId: string;
  ownerAddress: string;
  amount: string;
  txHash: string;
}

export async function distributeTournamentPrizes(
  tournamentId: string
): Promise<{ success: boolean; results: PrizeResult[]; errors: string[] }> {
  const tournament = await storage.getTournament(tournamentId);
  if (!tournament) {
    return { success: false, results: [], errors: ["Tournament not found"] };
  }

  if (tournament.status !== "settled") {
    return { success: false, results: [], errors: ["Tournament not settled yet"] };
  }

  if (tournament.prizeDistributed) {
    return { success: false, results: [], errors: ["Prizes already distributed"] };
  }

  const poolWei = parseEther(tournament.prizePool);
  if (poolWei <= 0n) {
    console.log(`[Prizes] Tournament ${tournamentId} has no prize pool, skipping distribution`);
    await storage.updateTournament(tournamentId, { prizeDistributed: true });
    return { success: true, results: [], errors: [] };
  }

  const entries = await storage.getTournamentEntries(tournamentId);
  const rankedEntries = entries.filter(e => e.rank && e.rank >= 1 && e.rank <= 3).sort((a, b) => (a.rank || 99) - (b.rank || 99));

  if (rankedEntries.length === 0) {
    return { success: false, results: [], errors: ["No ranked players found"] };
  }

  const prizeBreakdown = [
    { place: 1, pct: BigInt(tournament.prize1Pct) },
    { place: 2, pct: BigInt(tournament.prize2Pct) },
    { place: 3, pct: BigInt(tournament.prize3Pct) },
  ];

  const { walletClient, publicClient, account } = getTournamentWallet();

  const walletBalance = await publicClient.getBalance({ address: account.address });

  if (walletBalance < poolWei) {
    return {
      success: false,
      results: [],
      errors: [
        `Insufficient tournament wallet balance. Has: ${formatEther(walletBalance)} BNB, Needs: ${formatEther(poolWei)} BNB`,
      ],
    };
  }

  const results: PrizeResult[] = [];
  const errors: string[] = [];
  let expectedPayments = 0;

  for (const prize of prizeBreakdown) {
    const entry = rankedEntries.find(e => e.rank === Number(prize.place));
    if (!entry) continue;

    const amountWei = (poolWei * prize.pct) / 100n;
    if (amountWei <= 0n) continue;

    expectedPayments++;

    const agent = await storage.getAgent(entry.agentId);
    if (!agent) {
      errors.push(`Agent ${entry.agentId} not found for place #${prize.place}`);
      continue;
    }

    if (!agent.ownerAddress || !isValidAddress(agent.ownerAddress)) {
      errors.push(`Invalid wallet address for agent ${entry.agentId} (place #${prize.place}): "${agent.ownerAddress || "empty"}"`);
      continue;
    }

    const amountBnb = formatEther(amountWei);

    try {
      console.log(
        `[Prizes] Sending ${amountBnb} BNB to ${agent.ownerAddress} (${agent.username || agent.name}, place #${prize.place})`
      );

      const txHash = await walletClient.sendTransaction({
        to: agent.ownerAddress as `0x${string}`,
        value: amountWei,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 60_000,
      });

      if (receipt.status === "success") {
        results.push({
          place: Number(prize.place),
          agentId: entry.agentId,
          ownerAddress: agent.ownerAddress,
          amount: amountBnb,
          txHash,
        });
        console.log(`[Prizes] Place #${prize.place} paid: ${amountBnb} BNB -> ${agent.ownerAddress} (tx: ${txHash})`);
      } else {
        errors.push(`Transaction reverted for place #${prize.place}: ${txHash}`);
        console.error(`[Prizes] Transaction reverted for place #${prize.place}: ${txHash}`);
      }
    } catch (err: any) {
      const errMsg = `Failed to send prize for place #${prize.place} to ${agent.ownerAddress}: ${err.message}`;
      errors.push(errMsg);
      console.error(`[Prizes] ${errMsg}`);
    }
  }

  const allSucceeded = results.length === expectedPayments && errors.length === 0;

  if (allSucceeded) {
    await storage.updateTournament(tournamentId, { prizeDistributed: true });
    console.log(
      `[Prizes] Tournament ${tournamentId} prizes fully distributed: ${results.length} payments sent`
    );
  } else if (results.length > 0) {
    console.warn(
      `[Prizes] Tournament ${tournamentId} partial distribution: ${results.length}/${expectedPayments} payments sent, ${errors.length} errors. NOT marking as distributed to allow retry.`
    );
  }

  return { success: allSucceeded, results, errors };
}
