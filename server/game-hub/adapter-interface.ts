export interface GameState {
  [key: string]: any;
}

export interface GameResult {
  winnerId: string | null;
  scores: Record<string, number>;
  reason: string;
}

export interface PlayerInput {
  playerId: string;
  action: string;
  data?: any;
  timestamp: number;
}

export interface GameAdapter {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  modeSupport: string[];
  defaultDurationMs: number;

  init(config: {
    matchId: string;
    players: Array<{ id: string; name: string; slot: number }>;
    seed: string;
    durationMs: number;
  }): GameState;

  onInput(state: GameState, input: PlayerInput): GameState;

  tick(state: GameState, dt: number, elapsed: number): GameState;

  getScores(state: GameState): Record<string, number>;

  isOver(state: GameState, elapsedMs: number): boolean;

  getResult(state: GameState): GameResult;
}

export const adapterRegistry = new Map<string, GameAdapter>();

export function registerAdapter(adapter: GameAdapter) {
  adapterRegistry.set(adapter.id, adapter);
}

export function getAdapter(id: string): GameAdapter | undefined {
  return adapterRegistry.get(id);
}

export function getAllAdapters(): GameAdapter[] {
  return Array.from(adapterRegistry.values());
}
