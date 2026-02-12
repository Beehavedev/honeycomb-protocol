import { GameAdapter, GameState, GameResult, PlayerInput } from "../adapter-interface";

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

export const aimTrainerAdapter: GameAdapter = {
  id: "aim-trainer",
  name: "Aim Trainer Duel",
  version: "1.0.0",
  description: "Click the targets as fast as you can! Each hit scores a point. Most hits wins!",
  icon: "crosshair",
  modeSupport: ["PVP", "PVE"],
  defaultDurationMs: 20000,

  init({ matchId, players, seed, durationMs }) {
    const rng = seededRandom(seed);
    const totalTargets = 15;
    const targets = [];
    for (let i = 0; i < totalTargets; i++) {
      targets.push({
        id: i,
        x: 10 + Math.floor(rng() * 80),
        y: 10 + Math.floor(rng() * 80),
        size: 20 + Math.floor(rng() * 30),
        spawnAt: Math.floor((durationMs / totalTargets) * i),
        hitBy: null as string | null,
        active: false,
        expired: false,
      });
    }

    return {
      matchId,
      players: players.map((p) => ({
        ...p,
        hits: 0,
        misses: 0,
        avgReactionMs: 0,
        totalReactionMs: 0,
      })),
      targets,
      currentTargetIdx: 0,
      durationMs,
      finished: false,
      rngSeed: seed,
    };
  },

  onInput(state: GameState, input: PlayerInput): GameState {
    const s = { ...state, players: state.players.map((p: any) => ({ ...p })), targets: state.targets.map((t: any) => ({ ...t })) };
    const player = s.players.find((p: any) => p.id === input.playerId);
    if (!player || s.finished) return s;

    if (input.action === "click") {
      const { targetId } = input.data || {};
      const target = s.targets.find((t: any) => t.id === targetId && t.active && !t.hitBy);

      if (target) {
        target.hitBy = input.playerId;
        target.active = false;
        player.hits++;
        const reactionMs = input.timestamp - target.spawnAt;
        player.totalReactionMs += reactionMs;
        player.avgReactionMs = Math.round(player.totalReactionMs / player.hits);
      } else {
        player.misses++;
      }
    }

    return s;
  },

  tick(state: GameState, _dt: number, elapsed: number): GameState {
    const s = { ...state, targets: state.targets.map((t: any) => ({ ...t })) };

    for (const target of s.targets) {
      if (!target.active && !target.hitBy && !target.expired && elapsed >= target.spawnAt) {
        target.active = true;
      }
      if (target.active && !target.hitBy && elapsed >= target.spawnAt + 2000) {
        target.active = false;
        target.expired = true;
      }
    }

    if (elapsed >= s.durationMs) {
      s.finished = true;
    }

    return s;
  },

  getScores(state: GameState): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const p of state.players) {
      scores[p.id] = p.hits;
    }
    return scores;
  },

  isOver(state: GameState, elapsedMs: number): boolean {
    return state.finished || elapsedMs >= state.durationMs;
  },

  getResult(state: GameState): GameResult {
    const scores = this.getScores(state);
    const playerIds = Object.keys(scores);
    let winnerId: string | null = null;
    let reason = "Match complete";

    if (playerIds.length === 2) {
      const [a, b] = playerIds;
      if (scores[a] > scores[b]) {
        winnerId = a;
        reason = `${state.players.find((p: any) => p.id === a)?.name} scored ${scores[a]} hits vs ${scores[b]}!`;
      } else if (scores[b] > scores[a]) {
        winnerId = b;
        reason = `${state.players.find((p: any) => p.id === b)?.name} scored ${scores[b]} hits vs ${scores[a]}!`;
      } else {
        reason = `Both players tied with ${scores[a]} hits each!`;
      }
    }

    return { winnerId, scores, reason };
  },
};
