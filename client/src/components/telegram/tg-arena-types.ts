export type ArenaSubTab = "trading" | "predict" | "trivia" | "fighters" | "games" | "runner";

export interface TgAgentInfo {
  id: string;
  name: string;
  ownerAddress: string;
}

export interface ActiveDuel {
  id: string;
  assetSymbol: string;
  durationSeconds: number;
  endsAt: string;
  startedAt: string;
  creatorId: string;
  joinerId: string;
  initialBalance: string;
  botName?: string;
  joinCode?: string;
}

export interface Position {
  id: string;
  side: string;
  leverage: number;
  sizeUsdt: string;
  entryPrice: string;
  isOpen: boolean;
  pnl?: string;
}

export interface DuelResult {
  winnerId: string | null;
  creatorPnl: string;
  joinerPnl: string;
}

export interface TriviaQuestion {
  question: string;
  options: string[];
  correctAnswer?: number;
}

export interface TriviaDuel {
  id: string;
  joinCode?: string;
  status: string;
  currentQuestion?: number;
  totalQuestions?: number;
  questions?: TriviaQuestion[];
  creatorName?: string;
  joinerName?: string;
  creatorScore?: number;
  joinerScore?: number;
  winnerId?: string;
  category?: string;
  difficulty?: string;
}

export interface FighterDuel {
  id: string;
  status: string;
  creatorName: string;
  joinerName: string;
  creatorHp: number;
  creatorMaxHp: number;
  joinerHp: number;
  joinerMaxHp: number;
  currentTurn: number;
  maxTurns: number;
  winnerId?: string;
  lastTurn?: { narrative: string };
  battleLog?: { narrative: string }[];
  xpResult?: { xpGained: number; levelUp: boolean };
}

export interface HubMatch {
  id: string;
  gameId: string;
  status: string;
  durationMs: number;
  elapsed?: number;
  gameState?: Record<string, unknown>;
  resultJson?: string;
  players?: HubPlayer[];
}

export interface HubPlayer {
  id: string;
  playerName: string;
  playerAddress?: string;
  slot: number;
  score?: number;
  isBot?: boolean;
  reactionTimes?: number[];
  hits?: number;
  pnl?: number;
  position?: number;
  name?: string;
}
