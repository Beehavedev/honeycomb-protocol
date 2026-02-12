import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Gamepad2,
  Zap,
  Crosshair,
  TrendingUp,
  Trophy,
  Play,
  Bot,
  Loader2,
  Clock,
  Users,
  Target,
  ChevronRight,
  Star,
  Medal,
  Crown,
  Swords,
  Shield,
  ArrowLeft,
  Volume2,
  RefreshCw,
} from "lucide-react";

interface HubGame {
  id: string;
  name: string;
  description: string;
  icon: string;
  modeSupport: string[];
  defaultDurationMs: number;
  active: boolean;
}

interface HubMatchPlayer {
  id: string;
  matchId: string;
  playerName: string;
  playerAddress: string | null;
  slot: number;
  score: number;
  escrowLocked: boolean;
  isBot: boolean;
}

interface HubMatch {
  id: string;
  gameId: string;
  mode: string;
  status: string;
  stakeWei: string;
  durationMs: number;
  seed: string;
  stateJson: string;
  resultJson: string | null;
  winnerId: string | null;
  potWei: string;
  feeWei: string;
  isBotMatch: boolean;
  botName: string | null;
  players: HubMatchPlayer[];
  gameState?: any;
  elapsed?: number | null;
  humanPlayerId?: string;
}

interface LeaderboardEntry {
  id: string;
  gameId: string;
  playerName: string;
  wins: number;
  losses: number;
  draws: number;
  totalScore: number;
  matchesPlayed: number;
}

const GAME_ICONS: Record<string, any> = {
  zap: Zap,
  crosshair: Crosshair,
  "trending-up": TrendingUp,
  gamepad: Gamepad2,
};

const GAME_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  "reaction-duel": { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  "aim-trainer": { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
  "pnl-duel": { text: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/30" },
};

function ReactionDuelClient({ match, playerId, onAction }: { match: HubMatch; playerId: string; onAction: (action: string, data?: any) => void }) {
  const state = match.gameState || {};
  const player = state.players?.find((p: any) => p.id === playerId);
  const opponent = state.players?.find((p: any) => p.id !== playerId);

  return (
    <div className="space-y-4" data-testid="reaction-duel-client">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Round {Math.min((state.round || 0) + 1, state.totalRounds || 3)} of {state.totalRounds || 3}
        </p>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{player?.name || "You"}</p>
            <p className="text-2xl font-black">{player?.reactionTimes?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Rounds won</p>
          </div>
          <div className="text-lg font-black text-muted-foreground">VS</div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{opponent?.name || "Bot"}</p>
            <p className="text-2xl font-black">{opponent?.reactionTimes?.length || 0}</p>
            <p className="text-[10px] text-muted-foreground">Rounds won</p>
          </div>
        </div>
      </div>

      <div
        className={`rounded-lg p-8 sm:p-12 flex flex-col items-center justify-center min-h-[200px] transition-all ${
          state.roundPhase === "go"
            ? "bg-green-500/20 border-2 border-green-500"
            : state.roundPhase === "delay"
            ? "bg-red-500/10 border-2 border-red-500/30"
            : "bg-muted/50 border-2 border-muted"
        }`}
      >
        {state.roundPhase === "waiting" && (
          <div className="text-center space-y-3">
            <p className="text-lg font-bold">Get Ready!</p>
            <Button onClick={() => onAction("start_round")} data-testid="button-start-round">
              <Play className="w-4 h-4 mr-1.5" /> Start Round
            </Button>
          </div>
        )}
        {state.roundPhase === "delay" && (
          <div className="text-center space-y-3">
            <p className="text-2xl font-black text-red-400 animate-pulse">WAIT...</p>
            <p className="text-sm text-muted-foreground">Press as soon as it turns green!</p>
            <Button
              variant="outline"
              className="border-red-500/30"
              onClick={() => onAction("press")}
              data-testid="button-press-reaction"
            >
              <Zap className="w-5 h-5 mr-1.5" /> Press!
            </Button>
          </div>
        )}
        {state.roundPhase === "go" && (
          <div className="text-center space-y-3">
            <p className="text-4xl font-black text-green-400">GO!</p>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
              onClick={() => onAction("press")}
              data-testid="button-press-reaction"
            >
              <Zap className="w-6 h-6 mr-2" /> PRESS NOW!
            </Button>
          </div>
        )}
        {state.roundPhase === "done" && (
          <div className="text-center space-y-2">
            <p className="text-xl font-bold">All rounds complete!</p>
          </div>
        )}
      </div>

      {player?.reactionTimes?.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Reaction Times</p>
          <div className="flex gap-2 flex-wrap">
            {player.reactionTimes.map((t: number, i: number) => (
              <Badge key={i} variant="outline" className={t >= 9999 ? "text-red-400" : "text-green-400"}>
                R{i + 1}: {t >= 9999 ? "Too early!" : `${t}ms`}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AimTrainerClient({ match, playerId, onAction }: { match: HubMatch; playerId: string; onAction: (action: string, data?: any) => void }) {
  const state = match.gameState || {};
  const player = state.players?.find((p: any) => p.id === playerId);
  const opponent = state.players?.find((p: any) => p.id !== playerId);
  const activeTargets = (state.targets || []).filter((t: any) => t.active && !t.hitBy);

  return (
    <div className="space-y-3" data-testid="aim-trainer-client">
      <div className="flex items-center justify-between gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{player?.name || "You"}</p>
          <p className="text-xl font-black text-green-400">{player?.hits || 0}</p>
        </div>
        <div className="text-xs text-muted-foreground">HITS</div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{opponent?.name || "Bot"}</p>
          <p className="text-xl font-black text-red-400">{opponent?.hits || 0}</p>
        </div>
      </div>

      <div
        className="relative rounded-lg border-2 border-muted overflow-hidden"
        style={{
          height: "300px",
          background: "linear-gradient(135deg, rgba(10,10,15,0.95) 0%, rgba(20,20,30,0.95) 100%)",
        }}
        data-testid="aim-trainer-canvas"
      >
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }} />

        {activeTargets.map((target: any) => (
          <button
            key={target.id}
            className="absolute rounded-full border-2 border-red-500 bg-red-500/20 hover:bg-red-500/40 transition-all cursor-crosshair animate-pulse"
            style={{
              left: `${target.x}%`,
              top: `${target.y}%`,
              width: `${target.size}px`,
              height: `${target.size}px`,
              transform: "translate(-50%, -50%)",
            }}
            onClick={() => onAction("click", { targetId: target.id })}
            data-testid={`aim-target-${target.id}`}
          >
            <Crosshair className="w-full h-full p-1 text-red-400" />
          </button>
        ))}

        {activeTargets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground animate-pulse">Waiting for targets...</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Target className="w-3 h-3" />
        <span>Misses: {player?.misses || 0}</span>
        {player?.avgReactionMs > 0 && <span>Avg: {player.avgReactionMs}ms</span>}
      </div>
    </div>
  );
}

function PnlDuelClient({ match, playerId, onAction }: { match: HubMatch; playerId: string; onAction: (action: string, data?: any) => void }) {
  const state = match.gameState || {};
  const player = state.players?.find((p: any) => p.id === playerId);
  const opponent = state.players?.find((p: any) => p.id !== playerId);
  const price = state.currentPrice || 1000;
  const priceTicks = state.priceTicks || [];
  const currentTick = state.currentTick || 0;

  const visibleTicks = priceTicks.slice(Math.max(0, currentTick - 30), currentTick + 1);
  const minP = Math.min(...visibleTicks.map(Number));
  const maxP = Math.max(...visibleTicks.map(Number));
  const range = maxP - minP || 1;

  return (
    <div className="space-y-3" data-testid="pnl-duel-client">
      <div className="flex items-center justify-between gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{player?.name || "You"}</p>
          <p className={`text-lg font-black ${(player?.pnl || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
            ${Math.round(player?.pnl || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-muted-foreground">{player?.trades || 0} trades</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Price</p>
          <p className="text-xl font-black">${price.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{opponent?.name || "Bot"}</p>
          <p className={`text-lg font-black ${(opponent?.pnl || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
            ${Math.round(opponent?.pnl || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div
        className="relative rounded-lg border border-muted overflow-hidden"
        style={{ height: "160px", background: "rgba(10,10,15,0.9)" }}
        data-testid="pnl-chart"
      >
        <svg viewBox={`0 0 ${visibleTicks.length} 100`} className="w-full h-full" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="rgba(245,158,11,0.8)"
            strokeWidth="1.5"
            points={visibleTicks.map((p: number, i: number) => `${i},${100 - ((p - minP) / range) * 90 - 5}`).join(" ")}
          />
        </svg>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={`text-xs ${
            player?.position > 0 ? "text-green-400 border-green-500/40" :
            player?.position < 0 ? "text-red-400 border-red-500/40" :
            "text-muted-foreground"
          }`}
        >
          {player?.position > 0 ? `LONG x${player.position}` : player?.position < 0 ? `SHORT x${Math.abs(player.position)}` : "No Position"}
        </Badge>
        {player?.entryPrice > 0 && (
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Entry: ${player.entryPrice.toFixed(2)}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          className="border-green-500/30 text-green-400"
          onClick={() => onAction("long")}
          disabled={player?.position > 0}
          data-testid="button-pnl-long"
        >
          <TrendingUp className="w-4 h-4 mr-1" /> Long
        </Button>
        <Button
          variant="outline"
          className="border-red-500/30 text-red-400"
          onClick={() => onAction("short")}
          disabled={player?.position < 0}
          data-testid="button-pnl-short"
        >
          <TrendingUp className="w-4 h-4 mr-1 rotate-180" /> Short
        </Button>
        <Button
          variant="outline"
          onClick={() => onAction("close")}
          disabled={player?.position === 0}
          data-testid="button-pnl-close"
        >
          <Shield className="w-4 h-4 mr-1" /> Close
        </Button>
      </div>
    </div>
  );
}

function GameClientRenderer({ match, playerId, onAction }: { match: HubMatch; playerId: string; onAction: (action: string, data?: any) => void }) {
  switch (match.gameId) {
    case "reaction-duel":
      return <ReactionDuelClient match={match} playerId={playerId} onAction={onAction} />;
    case "aim-trainer":
      return <AimTrainerClient match={match} playerId={playerId} onAction={onAction} />;
    case "pnl-duel":
      return <PnlDuelClient match={match} playerId={playerId} onAction={onAction} />;
    default:
      return <p className="text-muted-foreground text-sm">Unknown game type</p>;
  }
}

function MatchRoom({ matchId, playerId: initialPlayerId, gameId, onBack }: { matchId: string; playerId: string; gameId: string; onBack: () => void }) {
  const { toast } = useToast();
  const [playerId] = useState(initialPlayerId);

  const { data: match, isLoading } = useQuery<HubMatch>({
    queryKey: ["/api/hub/matches", matchId],
    queryFn: async () => {
      const res = await fetch(`/api/hub/matches/${matchId}`);
      return res.json();
    },
    refetchInterval: (query) => {
      const m = query.state.data;
      return m?.status === "settled" ? false : 500;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, data }: { action: string; data?: any }) => {
      return await apiRequest<any>("POST", `/api/hub/matches/${matchId}/action`, { playerId, action, data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hub/matches", matchId] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleAction = useCallback((action: string, data?: any) => {
    actionMutation.mutate({ action, data });
  }, [actionMutation]);

  if (isLoading || !match) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        <p className="text-sm text-muted-foreground">Loading match...</p>
      </div>
    );
  }

  const isSettled = match.status === "settled";
  const result = isSettled && match.resultJson ? JSON.parse(match.resultJson) : null;
  const myPlayer = match.players?.find((p) => p.id === playerId);
  const opponentPlayer = match.players?.find((p) => p.id !== playerId);
  const didWin = result?.winnerId === playerId;
  const isDraw = result && !result.winnerId;

  const elapsed = match.elapsed || 0;
  const remaining = Math.max(0, match.durationMs - elapsed);
  const remainingSec = Math.ceil(remaining / 1000);

  return (
    <div className="space-y-4" data-testid="match-room">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-hub">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {!isSettled && (
          <Badge variant="outline" className="text-amber-400 border-amber-500/30 ml-auto gap-1">
            <Clock className="w-3 h-3" /> {remainingSec}s
          </Badge>
        )}
        <Badge variant="outline" className={`${
          match.status === "live" ? "text-green-400 border-green-500/30" :
          match.status === "settled" ? "text-amber-400 border-amber-500/30" :
          "text-muted-foreground"
        }`}>{match.status.toUpperCase()}</Badge>
      </div>

      {match.status === "live" && match.gameState && (
        <GameClientRenderer match={match} playerId={playerId} onAction={handleAction} />
      )}

      {isSettled && result && (
        <Card data-testid="match-result-card">
          <CardContent className="p-6 text-center space-y-4">
            <div className="space-y-2">
              {didWin ? (
                <>
                  <Trophy className="w-12 h-12 mx-auto text-amber-400" />
                  <p className="text-2xl font-black text-amber-400">YOU WIN!</p>
                </>
              ) : isDraw ? (
                <>
                  <Swords className="w-12 h-12 mx-auto text-muted-foreground" />
                  <p className="text-2xl font-black">DRAW!</p>
                </>
              ) : (
                <>
                  <Star className="w-12 h-12 mx-auto text-red-400" />
                  <p className="text-2xl font-black text-red-400">YOU LOSE</p>
                </>
              )}
              <p className="text-sm text-muted-foreground">{result.reason}</p>
            </div>

            <div className="flex items-center justify-center gap-6">
              {match.players?.map((p) => (
                <div key={p.id} className="text-center">
                  <p className="text-xs text-muted-foreground">{p.playerName}</p>
                  <p className="text-lg font-bold">{result.scores?.[p.id] ?? p.score}</p>
                </div>
              ))}
            </div>

            <Button onClick={onBack} data-testid="button-play-again">
              <RefreshCw className="w-4 h-4 mr-1.5" /> Play Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GameLobby({ game, onBack }: { game: HubGame; onBack: () => void }) {
  const { agent } = useAuth();
  const { toast } = useToast();
  const playerName = agent?.name || "Player";
  const [activeMatch, setActiveMatch] = useState<{ matchId: string; playerId: string } | null>(null);

  const colors = GAME_COLORS[game.id] || { text: "text-foreground", bg: "bg-muted", border: "border-muted" };

  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/hub/leaderboard", game.id],
    queryFn: async () => {
      const res = await fetch(`/api/hub/leaderboard/${game.id}`);
      return res.json();
    },
  });

  const { data: recentMatches } = useQuery<HubMatch[]>({
    queryKey: ["/api/hub/matches", game.id],
    queryFn: async () => {
      const res = await fetch(`/api/hub/matches?gameId=${game.id}&limit=5`);
      return res.json();
    },
  });

  const playBotMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<any>("POST", "/api/hub/play-bot", {
        gameId: game.id,
        playerName,
      });
    },
    onSuccess: (data: any) => {
      setActiveMatch({ matchId: data.id, playerId: data.humanPlayerId });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (activeMatch) {
    return (
      <MatchRoom
        matchId={activeMatch.matchId}
        playerId={activeMatch.playerId}
        gameId={game.id}
        onBack={() => {
          setActiveMatch(null);
          queryClient.invalidateQueries({ queryKey: ["/api/hub/leaderboard", game.id] });
          queryClient.invalidateQueries({ queryKey: ["/api/hub/matches", game.id] });
        }}
      />
    );
  }

  const IconComp = GAME_ICONS[game.icon] || Gamepad2;

  return (
    <div className="space-y-4" data-testid={`game-lobby-${game.id}`}>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="button-back-hub">
          <ArrowLeft className="w-4 h-4 mr-1" /> Games
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <IconComp className={`w-5 h-5 ${colors.text}`} />
            {game.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{game.description}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" /> {game.defaultDurationMs / 1000}s
            </Badge>
            {game.modeSupport?.map((m) => (
              <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
            ))}
          </div>
          <Button
            onClick={() => playBotMutation.mutate()}
            disabled={playBotMutation.isPending}
            data-testid="button-play-bot"
          >
            {playBotMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Starting...</>
            ) : (
              <><Bot className="w-4 h-4 mr-1.5" /> Play vs Bot</>
            )}
          </Button>
        </CardContent>
      </Card>

      {recentMatches && recentMatches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <Clock className="w-4 h-4 text-muted-foreground" /> Recent Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {recentMatches.map((m) => (
                <div key={m.id} className="flex items-center gap-2 p-2 rounded-md text-xs" data-testid={`recent-match-${m.id}`}>
                  <Badge variant="outline" className={`text-[10px] ${
                    m.status === "settled" ? "text-amber-400" : "text-green-400"
                  }`}>{m.status}</Badge>
                  <span className="flex-1 truncate text-muted-foreground">
                    {m.players?.map((p) => p.playerName).join(" vs ")}
                  </span>
                  {m.winnerId && m.players && (
                    <span className="font-bold">
                      {m.players.find((p) => p.id === m.winnerId)?.playerName || "?"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {leaderboard && leaderboard.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <Trophy className="w-4 h-4 text-amber-400" /> Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {leaderboard.map((entry, i) => (
                <div key={entry.id} className="flex items-center gap-2 p-2 rounded-md" data-testid={`leaderboard-hub-${i}`}>
                  <span className="text-sm font-bold w-6 text-center text-muted-foreground">
                    {i === 0 ? <Crown className="w-4 h-4 text-amber-400 mx-auto" /> : i === 1 ? <Medal className="w-4 h-4 text-gray-400 mx-auto" /> : `${i + 1}`}
                  </span>
                  <span className="text-sm font-medium flex-1 truncate">{entry.playerName}</span>
                  <Badge variant="outline" className="text-green-400 text-xs">{entry.wins}W</Badge>
                  <Badge variant="outline" className="text-red-400 text-xs">{entry.losses}L</Badge>
                  <Badge variant="outline" className="text-muted-foreground text-xs">{entry.matchesPlayed} played</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function GameHub() {
  const [selectedGame, setSelectedGame] = useState<HubGame | null>(null);

  const { data: games, isLoading } = useQuery<HubGame[]>({
    queryKey: ["/api/hub/games"],
  });

  if (selectedGame) {
    return <GameLobby game={selectedGame} onBack={() => setSelectedGame(null)} />;
  }

  return (
    <div className="space-y-4" data-testid="game-hub">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold">Game Hub</h3>
        <p className="text-sm text-muted-foreground">Drop-in HTML5 games with wagered matches</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="grid gap-3">
        {games?.map((game) => {
          const colors = GAME_COLORS[game.id] || { text: "text-foreground", bg: "bg-muted", border: "border-muted" };
          const IconComp = GAME_ICONS[game.icon] || Gamepad2;

          return (
            <Card
              key={game.id}
              className="cursor-pointer hover-elevate"
              onClick={() => setSelectedGame(game)}
              data-testid={`game-card-${game.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-md ${colors.bg} border ${colors.border} flex items-center justify-center shrink-0`}>
                    <IconComp className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{game.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{game.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {game.modeSupport?.map((m) => (
                      <Badge key={m} variant="outline" className="text-[9px]">{m}</Badge>
                    ))}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
