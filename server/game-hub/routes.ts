import { Router, Request, Response } from "express";
import { db } from "../db";
import { hubGames, hubMatches, hubMatchPlayers, hubLeaderboard } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import crypto from "crypto";
import { getAdapter, getAllAdapters, registerAdapter, GameState } from "./adapter-interface";
import { reactionDuelAdapter } from "./adapters/reaction-duel";
import { aimTrainerAdapter } from "./adapters/aim-trainer";
import { pnlDuelAdapter } from "./adapters/pnl-duel";
import { beepayService, bap578Service } from "./mock-services";

registerAdapter(reactionDuelAdapter);
registerAdapter(aimTrainerAdapter);
registerAdapter(pnlDuelAdapter);

const router = Router();

const BOT_NAMES_BY_GAME: Record<string, string[]> = {
  "reaction-duel": ["FlashBot", "QuickDraw", "LightningAI", "ReflexPro", "SpeedDemon"],
  "aim-trainer": ["AimbotX", "TargetHawk", "PixelSniper", "DeadEye", "SharpShot"],
  "pnl-duel": ["AlgoTrader", "DipBuyer", "MomentumAI", "WhaleBot", "YieldHunter"],
};

const activeMatches = new Map<string, { state: GameState; interval: NodeJS.Timeout | null; startTime: number }>();

async function seedGames() {
  for (const adapter of getAllAdapters()) {
    const [existing] = await db.select().from(hubGames).where(eq(hubGames.id, adapter.id));
    if (!existing) {
      await db.insert(hubGames).values({
        id: adapter.id,
        name: adapter.name,
        description: adapter.description,
        icon: adapter.icon,
        modeSupport: adapter.modeSupport,
        defaultDurationMs: adapter.defaultDurationMs,
      });
    }
  }
}

seedGames().catch(console.error);

router.get("/games", async (_req: Request, res: Response) => {
  const games = await db.select().from(hubGames).where(eq(hubGames.active, true));
  const adapters = getAllAdapters();
  const enriched = games.map((g) => {
    const adapter = adapters.find((a) => a.id === g.id);
    return { ...g, adapterLoaded: !!adapter };
  });
  res.json(enriched);
});

router.get("/games/:id", async (req: Request, res: Response) => {
  const [game] = await db.select().from(hubGames).where(eq(hubGames.id, req.params.id));
  if (!game) return res.status(404).json({ error: "Game not found" });
  const adapter = getAdapter(game.id);
  res.json({ ...game, adapterLoaded: !!adapter });
});

router.post("/matches/create", async (req: Request, res: Response) => {
  const { gameId, mode = "PVE", stakeWei = "0", durationMs, playerName, playerAddress } = req.body;
  if (!gameId || !playerName) return res.status(400).json({ error: "gameId and playerName required" });

  const adapter = getAdapter(gameId);
  if (!adapter) return res.status(404).json({ error: "Game adapter not found" });

  const game = (await db.select().from(hubGames).where(eq(hubGames.id, gameId)))[0];
  const dur = durationMs || game?.defaultDurationMs || adapter.defaultDurationMs;
  const seed = crypto.randomUUID();

  const [match] = await db.insert(hubMatches).values({
    gameId,
    mode,
    status: "waiting",
    stakeWei,
    durationMs: dur,
    seed,
    potWei: mode === "PVE" ? "0" : (BigInt(stakeWei) * 2n).toString(),
    isBotMatch: mode === "PVE",
  }).returning();

  await db.insert(hubMatchPlayers).values({
    matchId: match.id,
    playerName,
    playerAddress: playerAddress || null,
    slot: 0,
  });

  if (mode === "PVE") {
    const botNames = BOT_NAMES_BY_GAME[gameId] || ["Bot"];
    const botName = botNames[Math.floor(Math.random() * botNames.length)];
    await db.insert(hubMatchPlayers).values({
      matchId: match.id,
      playerName: botName,
      slot: 1,
      isBot: true,
      escrowLocked: true,
    });
    await db.update(hubMatches).set({ botName, status: "ready" }).where(eq(hubMatches.id, match.id));
  }

  const updated = (await db.select().from(hubMatches).where(eq(hubMatches.id, match.id)))[0];
  const players = await db.select().from(hubMatchPlayers).where(eq(hubMatchPlayers.matchId, match.id));
  res.json({ ...updated, players });
});

router.post("/matches/:id/join", async (req: Request, res: Response) => {
  const { playerName, playerAddress } = req.body;
  const matchId = req.params.id;
  if (!playerName) return res.status(400).json({ error: "playerName required" });

  const [match] = await db.select().from(hubMatches).where(eq(hubMatches.id, matchId));
  if (!match) return res.status(404).json({ error: "Match not found" });
  if (match.status !== "waiting") return res.status(400).json({ error: "Match not open for joining" });

  const existingPlayers = await db.select().from(hubMatchPlayers).where(eq(hubMatchPlayers.matchId, matchId));
  if (existingPlayers.length >= 2) return res.status(400).json({ error: "Match is full" });

  await db.insert(hubMatchPlayers).values({
    matchId,
    playerName,
    playerAddress: playerAddress || null,
    slot: 1,
  });

  await db.update(hubMatches).set({ status: "ready" }).where(eq(hubMatches.id, matchId));
  const updated = (await db.select().from(hubMatches).where(eq(hubMatches.id, matchId)))[0];
  const players = await db.select().from(hubMatchPlayers).where(eq(hubMatchPlayers.matchId, matchId));
  res.json({ ...updated, players });
});

router.post("/matches/:id/escrow/lock", async (req: Request, res: Response) => {
  const matchId = req.params.id;
  const { playerName } = req.body;

  const [match] = await db.select().from(hubMatches).where(eq(hubMatches.id, matchId));
  if (!match) return res.status(404).json({ error: "Match not found" });

  const players = await db.select().from(hubMatchPlayers).where(eq(hubMatchPlayers.matchId, matchId));
  const player = players.find((p) => p.playerName === playerName);
  if (!player) return res.status(404).json({ error: "Player not in match" });

  const result = await beepayService.lockEscrow(matchId, match.stakeWei, playerName);
  await bap578Service.executeAction("ACTION_LOCK_ESCROW", { matchId, playerName, amount: match.stakeWei });

  await db.update(hubMatchPlayers).set({ escrowLocked: true }).where(eq(hubMatchPlayers.id, player.id));

  if (!match.escrowMockId) {
    await db.update(hubMatches).set({ escrowMockId: result.lockId }).where(eq(hubMatches.id, matchId));
  }

  const allPlayers = await db.select().from(hubMatchPlayers).where(eq(hubMatchPlayers.matchId, matchId));
  const allLocked = allPlayers.every((p) => p.escrowLocked);
  if (allLocked) {
    await db.update(hubMatches).set({ status: "escrow_locked" }).where(eq(hubMatches.id, matchId));
  }

  res.json({ ok: true, lockId: result.lockId, allLocked });
});

router.post("/matches/:id/start", async (req: Request, res: Response) => {
  const matchId = req.params.id;
  const [match] = await db.select().from(hubMatches).where(eq(hubMatches.id, matchId));
  if (!match) return res.status(404).json({ error: "Match not found" });
  if (match.status !== "ready" && match.status !== "escrow_locked") {
    return res.status(400).json({ error: `Cannot start match in status: ${match.status}` });
  }

  const adapter = getAdapter(match.gameId);
  if (!adapter) return res.status(500).json({ error: "Adapter not loaded" });

  const players = await db.select().from(hubMatchPlayers).where(eq(hubMatchPlayers.matchId, matchId));
  const gameState = adapter.init({
    matchId,
    players: players.map((p) => ({ id: p.id, name: p.playerName, slot: p.slot })),
    seed: match.seed,
    durationMs: match.durationMs,
  });

  await bap578Service.executeAction("ACTION_START_MATCH", { matchId });
  const now = new Date();
  await db.update(hubMatches).set({
    status: "live",
    stateJson: JSON.stringify(gameState),
    startedAt: now,
  }).where(eq(hubMatches.id, matchId));

  const startTime = Date.now();
  const interval = setInterval(async () => {
    try {
      const active = activeMatches.get(matchId);
      if (!active) { clearInterval(interval); return; }

      const elapsed = Date.now() - active.startTime;
      let state = adapter.tick(active.state, 500, elapsed);
      active.state = state;

      if (adapter.isOver(state, elapsed)) {
        clearInterval(interval);
        await finishMatch(matchId, adapter, state);
        activeMatches.delete(matchId);
      }

      if (match.isBotMatch) {
        const botPlayer = players.find((p) => p.isBot);
        if (botPlayer) {
          state = runBotLogic(adapter, state, botPlayer.id, match.gameId, elapsed);
          active.state = state;
        }
      }
    } catch (e) {
      console.error(`[GameHub] Tick error for ${matchId}:`, e);
    }
  }, 500);

  activeMatches.set(matchId, { state: gameState, interval, startTime });

  const updated = (await db.select().from(hubMatches).where(eq(hubMatches.id, matchId)))[0];
  res.json({ ...updated, players, gameState });
});

function runBotLogic(adapter: any, state: GameState, botId: string, gameId: string, elapsed: number): GameState {
  const rng = Math.random();

  if (gameId === "reaction-duel") {
    if (state.roundPhase === "waiting" && rng > 0.3) {
      state = adapter.onInput(state, { playerId: botId, action: "start_round", timestamp: elapsed });
    }
    if (state.roundPhase === "go") {
      const botDelay = 150 + Math.floor(Math.random() * 300);
      if (elapsed - (state.goShownAt || 0) >= botDelay) {
        state = adapter.onInput(state, { playerId: botId, action: "press", timestamp: elapsed });
      }
    }
  } else if (gameId === "aim-trainer") {
    const activeTarget = state.targets.find((t: any) => t.active && !t.hitBy);
    if (activeTarget && rng > 0.3) {
      state = adapter.onInput(state, { playerId: botId, action: "click", data: { targetId: activeTarget.id }, timestamp: elapsed });
    }
  } else if (gameId === "pnl-duel") {
    if (rng > 0.85) {
      const actions = ["long", "short", "close"];
      const action = actions[Math.floor(Math.random() * actions.length)];
      state = adapter.onInput(state, { playerId: botId, action, timestamp: elapsed });
    }
  }

  return state;
}

async function finishMatch(matchId: string, adapter: any, state: GameState) {
  const result = adapter.getResult(state);
  const scores = adapter.getScores(state);

  await bap578Service.executeAction("ACTION_FINISH_MATCH", { matchId, result });

  const [match] = await db.select().from(hubMatches).where(eq(hubMatches.id, matchId));
  const players = await db.select().from(hubMatchPlayers).where(eq(hubMatchPlayers.matchId, matchId));

  for (const p of players) {
    const score = scores[p.id] || 0;
    await db.update(hubMatchPlayers).set({ score }).where(eq(hubMatchPlayers.id, p.id));
  }

  let feeWei = "0";
  let settleTxHash: string | undefined;

  if (match && BigInt(match.stakeWei) > 0n) {
    const feeBps = 1000;
    const pot = BigInt(match.potWei);
    const fee = (pot * BigInt(feeBps)) / 10000n;
    feeWei = fee.toString();

    if (result.winnerId) {
      const releaseResult = await beepayService.releaseEscrow(match.escrowMockId || "", result.winnerId, (pot - fee).toString());
      settleTxHash = releaseResult.txHash;
    } else {
      if (match.escrowMockId) {
        const refundResult = await beepayService.refundEscrow(match.escrowMockId);
        settleTxHash = refundResult.txHash;
      }
    }
  }

  const settleResult = await bap578Service.executeAction("ACTION_SETTLE", { matchId, result });

  await db.update(hubMatches).set({
    status: "settled",
    stateJson: JSON.stringify(state),
    resultJson: JSON.stringify(result),
    winnerId: result.winnerId,
    feeWei,
    settleTxHash: settleTxHash || settleResult.txHash,
    finishedAt: new Date(),
    settledAt: new Date(),
  }).where(eq(hubMatches.id, matchId));

  if (match) {
    for (const p of players) {
      const isWinner = result.winnerId === p.id;
      const isDraw = !result.winnerId;

      const [existing] = await db.select().from(hubLeaderboard).where(
        and(eq(hubLeaderboard.gameId, match.gameId), eq(hubLeaderboard.playerName, p.playerName))
      );

      if (existing) {
        await db.update(hubLeaderboard).set({
          wins: isWinner ? existing.wins + 1 : existing.wins,
          losses: !isWinner && !isDraw ? existing.losses + 1 : existing.losses,
          draws: isDraw ? existing.draws + 1 : existing.draws,
          totalScore: existing.totalScore + (scores[p.id] || 0),
          matchesPlayed: existing.matchesPlayed + 1,
          updatedAt: new Date(),
        }).where(eq(hubLeaderboard.id, existing.id));
      } else {
        await db.insert(hubLeaderboard).values({
          gameId: match.gameId,
          playerName: p.playerName,
          wins: isWinner ? 1 : 0,
          losses: !isWinner && !isDraw ? 1 : 0,
          draws: isDraw ? 1 : 0,
          totalScore: scores[p.id] || 0,
          matchesPlayed: 1,
        });
      }
    }
  }

  console.log(`[GameHub] Match ${matchId} settled. Winner: ${result.winnerId || "draw"}. Reason: ${result.reason}`);
}

router.post("/matches/:id/action", async (req: Request, res: Response) => {
  const matchId = req.params.id;
  const { playerId, action, data } = req.body;
  if (!playerId || !action) return res.status(400).json({ error: "playerId and action required" });

  const active = activeMatches.get(matchId);
  if (!active) return res.status(400).json({ error: "Match not active" });

  const adapter = getAdapter((await db.select().from(hubMatches).where(eq(hubMatches.id, matchId)))[0]?.gameId || "");
  if (!adapter) return res.status(500).json({ error: "Adapter not found" });

  const elapsed = Date.now() - active.startTime;
  active.state = adapter.onInput(active.state, { playerId, action, data, timestamp: elapsed });

  if (adapter.isOver(active.state, elapsed)) {
    if (active.interval) clearInterval(active.interval);
    await finishMatch(matchId, adapter, active.state);
    activeMatches.delete(matchId);
  } else {
    await db.update(hubMatches).set({ stateJson: JSON.stringify(active.state) }).where(eq(hubMatches.id, matchId));
  }

  const [match] = await db.select().from(hubMatches).where(eq(hubMatches.id, matchId));
  const players = await db.select().from(hubMatchPlayers).where(eq(hubMatchPlayers.matchId, matchId));
  res.json({ ...match, players, gameState: active.state || JSON.parse(match?.stateJson || "{}") });
});

router.get("/matches/:id", async (req: Request, res: Response) => {
  const [match] = await db.select().from(hubMatches).where(eq(hubMatches.id, req.params.id));
  if (!match) return res.status(404).json({ error: "Match not found" });

  const players = await db.select().from(hubMatchPlayers).where(eq(hubMatchPlayers.matchId, match.id));
  const active = activeMatches.get(match.id);

  res.json({
    ...match,
    players,
    gameState: active ? active.state : JSON.parse(match.stateJson || "{}"),
    elapsed: active ? Date.now() - active.startTime : null,
  });
});

router.get("/matches", async (req: Request, res: Response) => {
  const { gameId, status, limit = "20" } = req.query;
  let query = db.select().from(hubMatches);

  const conditions = [];
  if (gameId && typeof gameId === "string") conditions.push(eq(hubMatches.gameId, gameId));
  if (status && typeof status === "string") conditions.push(eq(hubMatches.status, status));

  const results = conditions.length > 0
    ? await query.where(and(...conditions)).orderBy(desc(hubMatches.createdAt)).limit(Number(limit))
    : await query.orderBy(desc(hubMatches.createdAt)).limit(Number(limit));

  const enriched = await Promise.all(results.map(async (m) => {
    const players = await db.select().from(hubMatchPlayers).where(eq(hubMatchPlayers.matchId, m.id));
    return { ...m, players };
  }));

  res.json(enriched);
});

router.get("/leaderboard/:gameId", async (req: Request, res: Response) => {
  const entries = await db.select()
    .from(hubLeaderboard)
    .where(eq(hubLeaderboard.gameId, req.params.gameId))
    .orderBy(desc(hubLeaderboard.wins))
    .limit(20);
  res.json(entries);
});

router.post("/play-bot", async (req: Request, res: Response) => {
  const { gameId, playerName, playerAddress, durationMs } = req.body;
  if (!gameId || !playerName) return res.status(400).json({ error: "gameId and playerName required" });

  const adapter = getAdapter(gameId);
  if (!adapter) return res.status(404).json({ error: "Game adapter not found" });

  const game = (await db.select().from(hubGames).where(eq(hubGames.id, gameId)))[0];
  const dur = durationMs || game?.defaultDurationMs || adapter.defaultDurationMs;
  const seed = crypto.randomUUID();
  const botNames = BOT_NAMES_BY_GAME[gameId] || ["Bot"];
  const botName = botNames[Math.floor(Math.random() * botNames.length)];

  const [match] = await db.insert(hubMatches).values({
    gameId,
    mode: "PVE",
    status: "live",
    stakeWei: "0",
    durationMs: dur,
    seed,
    isBotMatch: true,
    botName,
    startedAt: new Date(),
  }).returning();

  const [humanPlayer] = await db.insert(hubMatchPlayers).values({
    matchId: match.id,
    playerName,
    playerAddress: playerAddress || null,
    slot: 0,
  }).returning();

  const [botPlayer] = await db.insert(hubMatchPlayers).values({
    matchId: match.id,
    playerName: botName,
    slot: 1,
    isBot: true,
    escrowLocked: true,
  }).returning();

  const gameState = adapter.init({
    matchId: match.id,
    players: [
      { id: humanPlayer.id, name: playerName, slot: 0 },
      { id: botPlayer.id, name: botName, slot: 1 },
    ],
    seed,
    durationMs: dur,
  });

  await db.update(hubMatches).set({ stateJson: JSON.stringify(gameState) }).where(eq(hubMatches.id, match.id));

  const startTime = Date.now();
  const interval = setInterval(async () => {
    try {
      const active = activeMatches.get(match.id);
      if (!active) { clearInterval(interval); return; }

      const elapsed = Date.now() - active.startTime;
      let state = adapter.tick(active.state, 500, elapsed);

      state = runBotLogic(adapter, state, botPlayer.id, gameId, elapsed);
      active.state = state;

      if (adapter.isOver(state, elapsed)) {
        clearInterval(interval);
        await finishMatch(match.id, adapter, state);
        activeMatches.delete(match.id);
      }
    } catch (e) {
      console.error(`[GameHub] Bot tick error for ${match.id}:`, e);
    }
  }, 500);

  activeMatches.set(match.id, { state: gameState, interval, startTime });

  const updated = (await db.select().from(hubMatches).where(eq(hubMatches.id, match.id)))[0];
  const players = await db.select().from(hubMatchPlayers).where(eq(hubMatchPlayers.matchId, match.id));
  res.json({ ...updated, players, gameState, humanPlayerId: humanPlayer.id });
});

export default router;
