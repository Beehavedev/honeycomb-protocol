import { storage } from "./storage";
import type { TournamentEntry, TournamentMatch, TournamentRound, TradingDuel } from "@shared/schema";
import { distributeTournamentPrizes } from "./tournament-prizes";

const ROUND_TYPES = ["R16", "QF", "SF", "THIRD", "FINAL"] as const;
const ROUND_LABELS: Record<string, string> = {
  R16: "Round of 16",
  QF: "Quarterfinals",
  SF: "Semifinals",
  THIRD: "Third Place",
  FINAL: "Final",
};

const BREAK_BETWEEN_ROUNDS_MS = 30_000;

function fisherYatesShuffle<T>(arr: T[], seed?: string): { shuffled: T[]; seed: string } {
  const s = seed || Math.random().toString(36).slice(2, 12);
  const copy = [...arr];
  let seedNum = 0;
  for (let i = 0; i < s.length; i++) seedNum += s.charCodeAt(i);
  const rng = () => {
    seedNum = (seedNum * 9301 + 49297) % 233280;
    return seedNum / 233280;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return { shuffled: copy, seed: s };
}

async function resolveTieBreaker(
  duel: TradingDuel,
  match: TournamentMatch
): Promise<{
  winnerEntryId: string | null;
  winnerAgentId: string | null;
  loserEntryId: string | null;
  loserAgentId: string | null;
  tieBreakerReason: string | null;
}> {
  const aId = match.playerAAgentId!;
  const bId = match.playerBAgentId!;

  const aFinal = parseFloat(
    aId === duel.creatorId ? (duel.creatorFinalBalance || "0") : (duel.joinerFinalBalance || "0")
  );
  const bFinal = parseFloat(
    bId === duel.creatorId ? (duel.creatorFinalBalance || "0") : (duel.joinerFinalBalance || "0")
  );

  const setResult = (winnerId: string, reason: string | null) => {
    const isA = winnerId === aId;
    return {
      winnerEntryId: isA ? match.playerAEntryId : match.playerBEntryId,
      winnerAgentId: isA ? aId : bId,
      loserEntryId: isA ? match.playerBEntryId : match.playerAEntryId,
      loserAgentId: isA ? bId : aId,
      tieBreakerReason: reason,
    };
  };

  if (aFinal > bFinal) return setResult(aId, null);
  if (bFinal > aFinal) return setResult(bId, null);

  if (duel.winnerId) return setResult(duel.winnerId, "pnl_tiebreak");

  const initialBal = parseFloat(duel.initialBalance);
  if (initialBal > 0) {
    const aPnlPct = ((aFinal - initialBal) / initialBal) * 100;
    const bPnlPct = ((bFinal - initialBal) / initialBal) * 100;
    if (aPnlPct > bPnlPct) return setResult(aId, "realized_pnl");
    if (bPnlPct > aPnlPct) return setResult(bId, "realized_pnl");
  }

  const aPositions = duel.id ? await storage.getTradingPositions(duel.id, aId) : [];
  const bPositions = duel.id ? await storage.getTradingPositions(duel.id, bId) : [];

  const calcDrawdown = (positions: typeof aPositions) => {
    let totalLoss = 0;
    for (const p of positions) {
      if (p.pnl && parseFloat(p.pnl) < 0) totalLoss += Math.abs(parseFloat(p.pnl));
    }
    return totalLoss;
  };

  const aDrawdown = calcDrawdown(aPositions);
  const bDrawdown = calcDrawdown(bPositions);
  if (aDrawdown < bDrawdown) return setResult(aId, "fewer_drawdown");
  if (bDrawdown < aDrawdown) return setResult(bId, "fewer_drawdown");

  const coinFlip = Math.random() > 0.5;
  console.log(`[Bracket] Coin flip tie-breaker for match ${match.id}: ${coinFlip ? "A" : "B"} wins`);
  return setResult(coinFlip ? aId : bId, "coin_flip");
}

export async function generateBracket(tournamentId: string): Promise<void> {
  const tournament = await storage.getTournament(tournamentId);
  if (!tournament) throw new Error("Tournament not found");

  const entries = await storage.getTournamentEntries(tournamentId);
  if (entries.length < 16) throw new Error("Need exactly 16 players to generate bracket");

  const { shuffled, seed } = fisherYatesShuffle(entries);

  const r16 = await storage.createTournamentRound({
    tournamentId,
    roundNumber: 1,
    roundType: "R16",
    status: "scheduled",
  });
  const qf = await storage.createTournamentRound({
    tournamentId,
    roundNumber: 2,
    roundType: "QF",
    status: "scheduled",
  });
  const sf = await storage.createTournamentRound({
    tournamentId,
    roundNumber: 3,
    roundType: "SF",
    status: "scheduled",
  });
  const third = await storage.createTournamentRound({
    tournamentId,
    roundNumber: 4,
    roundType: "THIRD",
    status: "scheduled",
  });
  const final = await storage.createTournamentRound({
    tournamentId,
    roundNumber: 5,
    roundType: "FINAL",
    status: "scheduled",
  });

  for (let i = 0; i < 8; i++) {
    const playerA = shuffled[i * 2];
    const playerB = shuffled[i * 2 + 1];
    await storage.createTournamentMatch({
      tournamentId,
      roundId: r16.id,
      matchIndex: i,
      playerAEntryId: playerA.id,
      playerBEntryId: playerB.id,
      playerAAgentId: playerA.agentId,
      playerBAgentId: playerB.agentId,
      shuffleSeed: i === 0 ? seed : null,
      status: "scheduled",
    });
  }

  for (let i = 0; i < 4; i++) {
    await storage.createTournamentMatch({
      tournamentId,
      roundId: qf.id,
      matchIndex: i,
      status: "scheduled",
    });
  }
  for (let i = 0; i < 2; i++) {
    await storage.createTournamentMatch({
      tournamentId,
      roundId: sf.id,
      matchIndex: i,
      status: "scheduled",
    });
  }
  await storage.createTournamentMatch({
    tournamentId,
    roundId: third.id,
    matchIndex: 0,
    status: "scheduled",
  });
  await storage.createTournamentMatch({
    tournamentId,
    roundId: final.id,
    matchIndex: 0,
    status: "scheduled",
  });

  await storage.updateTournament(tournamentId, { status: "bracket_ready" });
  console.log(`[Bracket] Generated bracket for tournament ${tournamentId} with seed: ${seed}`);
}

export async function startRound(tournamentId: string, roundType: string): Promise<void> {
  const tournament = await storage.getTournament(tournamentId);
  if (!tournament) return;

  const rounds = await storage.getTournamentRounds(tournamentId);
  const round = rounds.find(r => r.roundType === roundType);
  if (!round || round.status !== "scheduled") return;

  const matches = await storage.getTournamentMatchesByRound(round.id);

  const validMatches = matches.filter(m => {
    if (!m.playerAAgentId || !m.playerBAgentId) {
      console.warn(`[Bracket] Match ${m.id} missing players, cannot start`);
      return false;
    }
    return true;
  });

  const duelPromises = validMatches.map(async (match) => {
    const duel = await storage.createTradingDuel({
      creatorId: match.playerAAgentId!,
      assetSymbol: "BNBUSDT",
      potAmount: "0",
      durationSeconds: 300,
      matchType: "pvp",
    });
    await storage.joinTradingDuel(duel.id, match.playerBAgentId!);
    return { match, duel };
  });
  const prepared = await Promise.all(duelPromises);

  const startTimestamp = new Date();
  await Promise.all(prepared.map(async ({ match, duel }) => {
    const started = await storage.startTradingDuel(duel.id);
    await storage.updateTournamentMatch(match.id, {
      duelId: started.id,
      status: "live",
      startedAt: startTimestamp,
    });
  }));

  await storage.updateTournamentRound(round.id, {
    status: "live",
    startedAt: startTimestamp,
  });

  if (roundType === "R16") {
    await storage.updateTournament(tournamentId, { status: "active", startedAt: new Date() });
  }

  console.log(`[Bracket] Started round ${roundType} for tournament ${tournamentId}`);
}

export async function checkAndAdvanceTournament(tournamentId: string): Promise<void> {
  const tournament = await storage.getTournament(tournamentId);
  if (!tournament || !["active", "bracket_ready"].includes(tournament.status)) return;

  const rounds = await storage.getTournamentRounds(tournamentId);
  const allMatches = await storage.getTournamentMatches(tournamentId);

  for (const round of rounds) {
    if (round.status !== "live") continue;

    const roundMatches = allMatches.filter(m => m.roundId === round.id);
    const liveMatches = roundMatches.filter(m => m.status === "live");

    for (const match of liveMatches) {
      if (!match.duelId) continue;
      const duel = await storage.getTradingDuel(match.duelId);
      if (!duel || duel.status !== "settled") continue;

      let winnerEntryId: string | null = null;
      let winnerAgentId: string | null = null;
      let loserEntryId: string | null = null;
      let loserAgentId: string | null = null;
      let tieBreakerReason: string | null = null;

      const resolved = await resolveTieBreaker(duel, match);
      winnerEntryId = resolved.winnerEntryId;
      winnerAgentId = resolved.winnerAgentId;
      loserEntryId = resolved.loserEntryId;
      loserAgentId = resolved.loserAgentId;
      tieBreakerReason = resolved.tieBreakerReason;

      await storage.updateTournamentMatch(match.id, {
        status: "finished",
        winnerEntryId,
        winnerAgentId,
        loserEntryId,
        loserAgentId,
        playerAScore: duel.creatorFinalBalance || "0",
        playerBScore: duel.joinerFinalBalance || "0",
        tieBreakerReason,
        endedAt: new Date(),
      });

      console.log(`[Bracket] Match ${match.id} finished: winner=${winnerAgentId}`);
    }

    const updatedMatches = await storage.getTournamentMatchesByRound(round.id);
    const allFinished = updatedMatches.every(m => m.status === "finished");

    if (allFinished) {
      await storage.updateTournamentRound(round.id, {
        status: "completed",
        completedAt: new Date(),
      });

      console.log(`[Bracket] Round ${round.roundType} completed for tournament ${tournamentId}`);

      await advanceToNextRound(tournamentId, round.roundType, rounds, updatedMatches);
    }
  }
}

async function advanceToNextRound(
  tournamentId: string,
  completedRoundType: string,
  rounds: TournamentRound[],
  completedMatches: TournamentMatch[]
): Promise<void> {
  const winners = completedMatches.map(m => ({
    entryId: m.winnerEntryId!,
    agentId: m.winnerAgentId!,
  }));
  const losers = completedMatches.map(m => ({
    entryId: m.loserEntryId!,
    agentId: m.loserAgentId!,
  }));

  if (completedRoundType === "R16") {
    const qfRound = rounds.find(r => r.roundType === "QF");
    if (!qfRound) return;
    const qfMatches = await storage.getTournamentMatchesByRound(qfRound.id);
    for (let i = 0; i < 4; i++) {
      await storage.updateTournamentMatch(qfMatches[i].id, {
        playerAEntryId: winners[i * 2].entryId,
        playerAAgentId: winners[i * 2].agentId,
        playerBEntryId: winners[i * 2 + 1].entryId,
        playerBAgentId: winners[i * 2 + 1].agentId,
      });
    }
    setTimeout(() => startRound(tournamentId, "QF"), BREAK_BETWEEN_ROUNDS_MS);
    console.log(`[Bracket] QF matches assigned, starting in ${BREAK_BETWEEN_ROUNDS_MS / 1000}s`);
  } else if (completedRoundType === "QF") {
    const sfRound = rounds.find(r => r.roundType === "SF");
    if (!sfRound) return;
    const sfMatches = await storage.getTournamentMatchesByRound(sfRound.id);
    for (let i = 0; i < 2; i++) {
      await storage.updateTournamentMatch(sfMatches[i].id, {
        playerAEntryId: winners[i * 2].entryId,
        playerAAgentId: winners[i * 2].agentId,
        playerBEntryId: winners[i * 2 + 1].entryId,
        playerBAgentId: winners[i * 2 + 1].agentId,
      });
    }
    setTimeout(() => startRound(tournamentId, "SF"), BREAK_BETWEEN_ROUNDS_MS);
  } else if (completedRoundType === "SF") {
    const thirdRound = rounds.find(r => r.roundType === "THIRD");
    const finalRound = rounds.find(r => r.roundType === "FINAL");
    if (!thirdRound || !finalRound) return;

    const thirdMatches = await storage.getTournamentMatchesByRound(thirdRound.id);
    const finalMatches = await storage.getTournamentMatchesByRound(finalRound.id);

    await storage.updateTournamentMatch(thirdMatches[0].id, {
      playerAEntryId: losers[0].entryId,
      playerAAgentId: losers[0].agentId,
      playerBEntryId: losers[1].entryId,
      playerBAgentId: losers[1].agentId,
    });

    await storage.updateTournamentMatch(finalMatches[0].id, {
      playerAEntryId: winners[0].entryId,
      playerAAgentId: winners[0].agentId,
      playerBEntryId: winners[1].entryId,
      playerBAgentId: winners[1].agentId,
    });

    setTimeout(async () => {
      await startRound(tournamentId, "THIRD");
      await startRound(tournamentId, "FINAL");
    }, BREAK_BETWEEN_ROUNDS_MS);
  } else if (completedRoundType === "THIRD" || completedRoundType === "FINAL") {
    const allRounds = await storage.getTournamentRounds(tournamentId);
    const thirdRound = allRounds.find(r => r.roundType === "THIRD");
    const finalRound = allRounds.find(r => r.roundType === "FINAL");

    if (thirdRound?.status === "completed" && finalRound?.status === "completed") {
      const finalMatches = await storage.getTournamentMatchesByRound(finalRound.id);
      const thirdMatches = await storage.getTournamentMatchesByRound(thirdRound.id);

      const firstPlace = finalMatches[0]?.winnerAgentId;
      const secondPlace = finalMatches[0]?.loserAgentId;
      const thirdPlace = thirdMatches[0]?.winnerAgentId;

      if (firstPlace) {
        const entries = await storage.getTournamentEntries(tournamentId);
        for (const entry of entries) {
          let rank = 0;
          if (entry.agentId === firstPlace) rank = 1;
          else if (entry.agentId === secondPlace) rank = 2;
          else if (entry.agentId === thirdPlace) rank = 3;
          else rank = 4;
          await storage.updateTournamentEntry(entry.id, { rank });
        }
      }

      await storage.updateTournament(tournamentId, {
        status: "settled",
        settledAt: new Date(),
        winnerAgentId: firstPlace || null,
      });
      console.log(`[Bracket] Tournament ${tournamentId} completed! 1st: ${firstPlace}, 2nd: ${secondPlace}, 3rd: ${thirdPlace}`);

      try {
        const prizeResult = await distributeTournamentPrizes(tournamentId);
        if (prizeResult.success) {
          console.log(`[Bracket] Prizes distributed for tournament ${tournamentId}: ${prizeResult.results.length} payments`);
        } else if (prizeResult.errors.length > 0) {
          console.error(`[Bracket] Prize distribution errors for ${tournamentId}:`, prizeResult.errors);
        }
      } catch (prizeErr) {
        console.error(`[Bracket] Failed to distribute prizes for ${tournamentId}:`, prizeErr);
      }
    }
  }
}

export async function bracketAutoAdvanceLoop(): Promise<void> {
  try {
    const activeTournaments = await storage.listTournaments("active");

    for (const t of activeTournaments) {
      if (t.maxPlayers === 16) {
        await checkAndAdvanceTournament(t.id);
      }
    }
  } catch (err) {
    console.error("[BracketEngine] Error in auto-advance loop:", err);
  }
}

export function getBracketRoundLabel(roundType: string): string {
  return ROUND_LABELS[roundType] || roundType;
}
