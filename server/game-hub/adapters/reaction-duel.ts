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

export const reactionDuelAdapter: GameAdapter = {
  id: "reaction-duel",
  name: "Reaction Duel",
  version: "1.0.0",
  description: "Press the button the instant you see 'GO!' - fastest reaction wins! Best of 3 rounds.",
  icon: "zap",
  modeSupport: ["PVP", "PVE"],
  defaultDurationMs: 30000,

  init({ matchId, players, seed, durationMs }) {
    const rng = seededRandom(seed);
    const delays = [
      1500 + Math.floor(rng() * 3000),
      1500 + Math.floor(rng() * 3000),
      1500 + Math.floor(rng() * 3000),
    ];

    return {
      matchId,
      players: players.map((p) => ({
        ...p,
        reactionTimes: [] as number[],
        pressed: false,
        tooEarly: false,
      })),
      round: 0,
      totalRounds: 3,
      goSignalDelays: delays,
      roundStartedAt: null as number | null,
      goShownAt: null as number | null,
      roundPhase: "waiting" as "waiting" | "delay" | "go" | "done",
      durationMs,
      finished: false,
    };
  },

  onInput(state: GameState, input: PlayerInput): GameState {
    const s = { ...state, players: state.players.map((p: any) => ({ ...p })) };
    const player = s.players.find((p: any) => p.id === input.playerId);
    if (!player || s.finished) return s;

    if (input.action === "start_round" && s.roundPhase === "waiting") {
      s.roundPhase = "delay";
      s.roundStartedAt = input.timestamp;
      s.goShownAt = null;
      s.players.forEach((p: any) => { p.pressed = false; p.tooEarly = false; });
      return s;
    }

    if (input.action === "press") {
      if (s.roundPhase === "delay") {
        player.tooEarly = true;
        player.reactionTimes.push(9999);
        player.pressed = true;
      } else if (s.roundPhase === "go" && !player.pressed) {
        const reactionTime = input.timestamp - (s.goShownAt || input.timestamp);
        player.reactionTimes.push(Math.max(0, reactionTime));
        player.pressed = true;
      }

      const allPressed = s.players.every((p: any) => p.pressed || p.tooEarly);
      if (allPressed) {
        s.round++;
        s.roundPhase = s.round >= s.totalRounds ? "done" : "waiting";
        if (s.round >= s.totalRounds) s.finished = true;
      }
    }

    return s;
  },

  tick(state: GameState, _dt: number, elapsed: number): GameState {
    const s = { ...state };

    if (s.roundPhase === "delay" && s.roundStartedAt) {
      const delayMs = s.goSignalDelays[s.round] || 2000;
      if (elapsed - s.roundStartedAt >= delayMs / 1000 * 1000) {
        s.roundPhase = "go";
        s.goShownAt = elapsed;
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
      let roundWins = 0;
      for (let r = 0; r < Math.min(p.reactionTimes.length, state.totalRounds); r++) {
        const opponent = state.players.find((op: any) => op.id !== p.id);
        if (opponent && opponent.reactionTimes[r] !== undefined) {
          if (p.reactionTimes[r] < opponent.reactionTimes[r]) roundWins++;
        }
      }
      scores[p.id] = roundWins;
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
        reason = `${state.players.find((p: any) => p.id === a)?.name} had faster reactions!`;
      } else if (scores[b] > scores[a]) {
        winnerId = b;
        reason = `${state.players.find((p: any) => p.id === b)?.name} had faster reactions!`;
      } else {
        reason = "Both players tied!";
      }
    }

    return { winnerId, scores, reason };
  },
};
