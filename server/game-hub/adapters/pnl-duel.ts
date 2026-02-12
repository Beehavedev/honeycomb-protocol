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

export const pnlDuelAdapter: GameAdapter = {
  id: "pnl-duel",
  name: "PnL Duel",
  version: "1.0.0",
  description: "Simulated trading duel! Go long or short on a random walk price. Highest PnL wins!",
  icon: "trending-up",
  modeSupport: ["PVP", "PVE"],
  defaultDurationMs: 30000,

  init({ matchId, players, seed, durationMs }) {
    const rng = seededRandom(seed);
    const priceTicks: number[] = [1000];
    const tickCount = Math.floor(durationMs / 500);
    for (let i = 1; i <= tickCount; i++) {
      const change = (rng() - 0.48) * 20;
      priceTicks.push(Math.max(100, priceTicks[i - 1] + change));
    }

    return {
      matchId,
      players: players.map((p) => ({
        ...p,
        balance: 10000,
        position: 0,
        entryPrice: 0,
        pnl: 0,
        trades: 0,
      })),
      priceTicks,
      currentTick: 0,
      currentPrice: priceTicks[0],
      durationMs,
      finished: false,
    };
  },

  onInput(state: GameState, input: PlayerInput): GameState {
    const s = { ...state, players: state.players.map((p: any) => ({ ...p })) };
    const player = s.players.find((p: any) => p.id === input.playerId);
    if (!player || s.finished) return s;

    if (input.action === "long" && player.position <= 0) {
      if (player.position < 0) {
        const pnl = (player.entryPrice - s.currentPrice) * Math.abs(player.position);
        player.balance += pnl;
        player.pnl += pnl;
      }
      const size = Math.floor(player.balance / s.currentPrice);
      if (size > 0) {
        player.position = size;
        player.entryPrice = s.currentPrice;
        player.trades++;
      }
    } else if (input.action === "short" && player.position >= 0) {
      if (player.position > 0) {
        const pnl = (s.currentPrice - player.entryPrice) * player.position;
        player.balance += pnl;
        player.pnl += pnl;
      }
      const size = Math.floor(player.balance / s.currentPrice);
      if (size > 0) {
        player.position = -size;
        player.entryPrice = s.currentPrice;
        player.trades++;
      }
    } else if (input.action === "close" && player.position !== 0) {
      if (player.position > 0) {
        const pnl = (s.currentPrice - player.entryPrice) * player.position;
        player.balance += pnl;
        player.pnl += pnl;
      } else {
        const pnl = (player.entryPrice - s.currentPrice) * Math.abs(player.position);
        player.balance += pnl;
        player.pnl += pnl;
      }
      player.position = 0;
      player.entryPrice = 0;
      player.trades++;
    }

    return s;
  },

  tick(state: GameState, _dt: number, elapsed: number): GameState {
    const s = { ...state, players: state.players.map((p: any) => ({ ...p })) };
    const tickIdx = Math.min(Math.floor(elapsed / 500), s.priceTicks.length - 1);

    if (tickIdx > s.currentTick) {
      s.currentTick = tickIdx;
      s.currentPrice = s.priceTicks[tickIdx];
    }

    if (elapsed >= s.durationMs) {
      for (const p of s.players) {
        if (p.position !== 0) {
          if (p.position > 0) {
            p.pnl += (s.currentPrice - p.entryPrice) * p.position;
          } else {
            p.pnl += (p.entryPrice - s.currentPrice) * Math.abs(p.position);
          }
          p.balance += p.pnl;
          p.position = 0;
        }
      }
      s.finished = true;
    }

    return s;
  },

  getScores(state: GameState): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const p of state.players) {
      let unrealized = 0;
      if (p.position > 0) {
        unrealized = (state.currentPrice - p.entryPrice) * p.position;
      } else if (p.position < 0) {
        unrealized = (p.entryPrice - state.currentPrice) * Math.abs(p.position);
      }
      scores[p.id] = Math.round(p.pnl + unrealized);
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
        reason = `${state.players.find((p: any) => p.id === a)?.name} finished with PnL $${scores[a].toLocaleString()} vs $${scores[b].toLocaleString()}!`;
      } else if (scores[b] > scores[a]) {
        winnerId = b;
        reason = `${state.players.find((p: any) => p.id === b)?.name} finished with PnL $${scores[b].toLocaleString()} vs $${scores[a].toLocaleString()}!`;
      } else {
        reason = `Both players tied with PnL $${scores[a].toLocaleString()}!`;
      }
    }

    return { winnerId, scores, reason };
  },
};
