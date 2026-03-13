import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Swords, Trophy, TrendingUp, TrendingDown, Zap, Crosshair,
  Gamepad2, Play, Bot, Loader2, Shield, Users, ArrowLeft, Star,
  Clock, Copy, RefreshCw,
} from "lucide-react";
import type { TgAgentInfo, HubMatch, HubPlayer } from "./tg-arena-types";

const GAME_LIST = [
  { id: "reaction-duel", name: "Reaction Duel", desc: "Test your reflexes", icon: Zap, color: "text-amber-400", bg: "from-amber-500/10 to-yellow-600/10" },
  { id: "aim-trainer", name: "Aim Trainer", desc: "Hit the targets", icon: Crosshair, color: "text-red-400", bg: "from-red-500/10 to-orange-600/10" },
  { id: "pnl-duel", name: "PNL Duel", desc: "Trade better than AI", icon: TrendingUp, color: "text-green-400", bg: "from-green-500/10 to-emerald-600/10" },
];

export function GamesSubTab({ agent }: { agent?: TgAgentInfo }) {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [activeMatch, setActiveMatch] = useState<{ matchId: string; playerId: string } | null>(null);

  if (!agent) {
    return (
      <Card className="p-6 bg-[#242444] border-gray-700/50 text-center">
        <Gamepad2 className="w-10 h-10 text-green-500/50 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Open via @honeycombot to play</p>
      </Card>
    );
  }

  if (activeMatch && selectedGame) {
    return (
      <GameHubMatchView
        matchId={activeMatch.matchId}
        playerId={activeMatch.playerId}
        gameId={selectedGame}
        agent={agent}
        onBack={() => { setActiveMatch(null); setSelectedGame(null); }}
      />
    );
  }

  return <GameHubLobbyView agent={agent} onStartMatch={(matchId, playerId, gameId) => {
    setActiveMatch({ matchId, playerId });
    setSelectedGame(gameId);
  }} />;
}

function GameHubLobbyView({ agent, onStartMatch }: {
  agent: TgAgentInfo;
  onStartMatch: (matchId: string, playerId: string, gameId: string) => void;
}) {
  const [starting, setStarting] = useState<string | null>(null);
  const [pvpGame, setPvpGame] = useState<string | null>(null);
  const [pvpMatchId, setPvpMatchId] = useState<string | null>(null);
  const [pvpCreatorPlayerId, setPvpCreatorPlayerId] = useState<string | null>(null);
  const [joinMatchId, setJoinMatchId] = useState("");
  const [pvpError, setPvpError] = useState("");

  useQuery<HubMatch>({
    queryKey: ["/api/hub/matches", pvpMatchId, "poll"],
    queryFn: async () => {
      const res = await fetch(`/api/hub/matches/${pvpMatchId}`);
      return res.json();
    },
    enabled: !!pvpMatchId && !!pvpGame,
    refetchInterval: 3000,
    select: (data: HubMatch) => {
      if (data?.status === "ready" || data?.status === "escrow_locked" || data?.status === "live") {
        onStartMatch(data.id, pvpCreatorPlayerId || "", pvpGame || data.gameId);
      }
      return data;
    },
  });

  const startBotGame = async (gameId: string) => {
    if (starting) return;
    setStarting(gameId);
    try {
      const createRes = await apiRequest<{ id: string; humanPlayerId: string }>("POST", "/api/hub/play-bot", {
        gameId,
        playerName: agent.name,
        playerAddress: agent.ownerAddress,
      });
      if (createRes.id) {
        onStartMatch(createRes.id, createRes.humanPlayerId, gameId);
      }
    } catch (e) {
      console.error("Start game error:", e);
    }
    setStarting(null);
  };

  const createPvpLobby = async (gameId: string) => {
    if (starting) return;
    setStarting(gameId);
    setPvpError("");
    try {
      const res = await apiRequest<HubMatch>("POST", "/api/hub/matches/create", {
        gameId,
        mode: "PVP",
        playerName: agent.name,
        playerAddress: agent.ownerAddress,
      });
      if (res.id) {
        const players = res.players || [];
        const me = players.find((p) => p.playerAddress === agent.ownerAddress) || players.find((p) => p.playerName === agent.name);
        setPvpCreatorPlayerId(me?.id || "");
        setPvpMatchId(res.id);
        setPvpGame(gameId);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create lobby";
      setPvpError(msg);
    }
    setStarting(null);
  };

  const joinMatch = async () => {
    if (!joinMatchId.trim()) return;
    setPvpError("");
    try {
      const res = await apiRequest<HubMatch>("POST", `/api/hub/matches/${joinMatchId.trim()}/join`, {
        playerName: agent.name,
        playerAddress: agent.ownerAddress,
      });
      if (res.id) {
        const players = res.players || [];
        const me = players.find((p) => p.playerAddress === agent.ownerAddress) || players.find((p) => p.playerName === agent.name);
        onStartMatch(res.id, me?.id || "", res.gameId);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to join match";
      setPvpError(msg);
    }
  };

  if (pvpGame && pvpMatchId) {
    const game = GAME_LIST.find(g => g.id === pvpGame);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <button onClick={() => { setPvpGame(null); setPvpMatchId(null); }} className="text-gray-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-white">{game?.name || "Game"} - PvP Lobby</span>
        </div>
        <Card className="p-4 bg-[#242444] border-green-500/20">
          <p className="text-xs text-gray-400 mb-2">Share this Match ID with your opponent:</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-green-400 break-all flex-1" data-testid="text-tg-hub-match-id">{pvpMatchId}</span>
            <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => navigator.clipboard.writeText(pvpMatchId)} data-testid="button-tg-hub-copy-id">
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <p className="text-[9px] text-gray-500">
            <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
            Waiting for opponent to join...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1 px-1">
        <Gamepad2 className="w-4 h-4 text-green-400" />
        <span className="text-sm font-semibold text-white">Mini Games</span>
      </div>
      {GAME_LIST.map((game) => {
        const Icon = game.icon;
        return (
          <Card
            key={game.id}
            className={`p-4 bg-gradient-to-br ${game.bg} border-gray-700/30`}
            data-testid={`card-tg-game-${game.id}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-[#1a1a2e] flex items-center justify-center">
                <Icon className={`w-5 h-5 ${game.color}`} />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-white">{game.name}</span>
                <p className="text-[10px] text-gray-400">{game.desc}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gap-1 text-xs"
                onClick={() => startBotGame(game.id)}
                disabled={starting === game.id}
                data-testid={`button-tg-game-bot-${game.id}`}
              >
                {starting === game.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
                vs Bot
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                onClick={() => createPvpLobby(game.id)}
                disabled={!!starting}
                data-testid={`button-tg-game-pvp-${game.id}`}
              >
                <Users className="w-3 h-3" /> PvP
              </Button>
            </div>
          </Card>
        );
      })}

      <Card className="p-3 bg-[#242444] border-gray-700/50">
        <p className="text-xs text-gray-400 mb-2">Join a PvP match by ID</p>
        <div className="flex gap-2">
          <input
            value={joinMatchId}
            onChange={(e) => { setJoinMatchId(e.target.value); setPvpError(""); }}
            placeholder="Match ID..."
            className="flex-1 bg-[#1a1a2e] border border-gray-700/50 rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-gray-500"
            data-testid="input-tg-hub-join-id"
          />
          <Button size="sm" onClick={joinMatch} disabled={!joinMatchId.trim()} data-testid="button-tg-hub-join">
            Join
          </Button>
        </div>
        {pvpError && <p className="text-[10px] text-red-400 mt-1">{pvpError}</p>}
      </Card>
    </div>
  );
}

function GameHubMatchView({ matchId, playerId, gameId, agent, onBack }: {
  matchId: string;
  playerId: string;
  gameId: string;
  agent: TgAgentInfo;
  onBack: () => void;
}) {
  const { data: match } = useQuery<HubMatch>({
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
    mutationFn: async ({ action, data }: { action: string; data?: Record<string, unknown> }) => {
      return await apiRequest<HubMatch>("POST", `/api/hub/matches/${matchId}/action`, { playerId, action, data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hub/matches", matchId] });
    },
  });

  const handleAction = useCallback((action: string, data?: Record<string, unknown>) => {
    actionMutation.mutate({ action, data });
  }, [actionMutation]);

  if (!match) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-green-400" />
        <p className="text-xs text-gray-400 mt-2">Loading match...</p>
      </div>
    );
  }

  const isSettled = match.status === "settled";
  const result = isSettled && match.resultJson ? JSON.parse(match.resultJson) : null;
  const didWin = result?.winnerId === playerId;
  const isDraw = result && !result.winnerId;

  const elapsed = match.elapsed || 0;
  const remaining = Math.max(0, match.durationMs - elapsed);
  const remainingSec = Math.ceil(remaining / 1000);

  if (isSettled && result) {
    return (
      <div className="text-center space-y-4" data-testid="tg-match-result">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
          isDraw ? "bg-gray-700/50" : didWin ? "bg-green-500/20" : "bg-red-500/20"
        }`}>
          {isDraw ? <Swords className="w-8 h-8 text-gray-400" /> :
           didWin ? <Trophy className="w-8 h-8 text-amber-500" /> :
           <Star className="w-8 h-8 text-red-400" />}
        </div>
        <h3 className={`text-xl font-bold ${isDraw ? "text-gray-300" : didWin ? "text-green-400" : "text-red-400"}`}>
          {isDraw ? "Draw!" : didWin ? "You Win!" : "You Lose"}
        </h3>
        <p className="text-sm text-gray-400">{result.reason}</p>
        <div className="flex items-center justify-center gap-6">
          {match.players?.map((p) => (
            <div key={p.id} className="text-center">
              <p className="text-[10px] text-gray-400">{p.playerName}</p>
              <p className="text-lg font-bold">{result.scores?.[p.id] ?? p.score}</p>
            </div>
          ))}
        </div>
        <Button onClick={onBack} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white" data-testid="button-tg-game-again">
          <RefreshCw className="w-4 h-4 mr-1" /> Play Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-400"><ArrowLeft className="w-5 h-5" /></button>
        {!isSettled && (
          <Badge variant="outline" className="text-amber-400 border-amber-500/30 gap-1">
            <Clock className="w-3 h-3" /> {remainingSec}s
          </Badge>
        )}
      </div>

      {match.status === "live" && match.gameState && (
        <TgGameRenderer match={match} playerId={playerId} onAction={handleAction} />
      )}
    </div>
  );
}

function TgGameRenderer({ match, playerId, onAction }: {
  match: HubMatch;
  playerId: string;
  onAction: (action: string, data?: Record<string, unknown>) => void;
}) {
  const state = (match.gameState || {}) as Record<string, unknown>;
  const players = (state.players || []) as HubPlayer[];
  const player = players.find((p) => p.id === playerId);
  const opponent = players.find((p) => p.id !== playerId);

  if (match.gameId === "reaction-duel") {
    const roundPhase = state.roundPhase as string;
    const totalRounds = (state.totalRounds as number) || 3;
    const round = (state.round as number) || 0;
    return (
      <div className="space-y-3" data-testid="tg-reaction-duel">
        <div className="text-center">
          <p className="text-xs text-gray-400">Round {Math.min(round + 1, totalRounds)} of {totalRounds}</p>
          <div className="flex items-center justify-center gap-6 mt-2">
            <div className="text-center">
              <p className="text-[10px] text-gray-400">{player?.name || "You"}</p>
              <p className="text-xl font-black">{player?.reactionTimes?.length || 0}</p>
            </div>
            <span className="text-sm text-gray-500 font-bold">VS</span>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">{opponent?.name || "Bot"}</p>
              <p className="text-xl font-black">{opponent?.reactionTimes?.length || 0}</p>
            </div>
          </div>
        </div>
        <div className={`rounded-lg p-8 flex flex-col items-center justify-center min-h-[180px] transition-all ${
          roundPhase === "go" ? "bg-green-500/20 border-2 border-green-500" :
          roundPhase === "delay" ? "bg-red-500/10 border-2 border-red-500/30" :
          "bg-[#1a1a2e] border-2 border-gray-700/30"
        }`}>
          {roundPhase === "waiting" && (
            <div className="text-center space-y-3">
              <p className="text-lg font-bold text-white">Get Ready!</p>
              <Button onClick={() => onAction("start_round")} data-testid="button-tg-start-round">
                <Play className="w-4 h-4 mr-1" /> Start Round
              </Button>
            </div>
          )}
          {roundPhase === "delay" && (
            <div className="text-center space-y-3">
              <p className="text-2xl font-black text-red-400 animate-pulse">WAIT...</p>
              <Button variant="outline" className="border-red-500/30" onClick={() => onAction("press")} data-testid="button-tg-press-reaction">
                <Zap className="w-5 h-5 mr-1" /> Press!
              </Button>
            </div>
          )}
          {roundPhase === "go" && (
            <div className="text-center space-y-3">
              <p className="text-4xl font-black text-green-400">GO!</p>
              <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg" onClick={() => onAction("press")} data-testid="button-tg-press-reaction">
                <Zap className="w-6 h-6 mr-2" /> PRESS NOW!
              </Button>
            </div>
          )}
          {roundPhase === "done" && (
            <p className="text-lg font-bold text-white">All rounds complete!</p>
          )}
        </div>
      </div>
    );
  }

  if (match.gameId === "aim-trainer") {
    const targets = ((state.targets || []) as Array<{ id: string; active: boolean; hitBy?: string; x: number; y: number; size: number }>).filter(t => t.active && !t.hitBy);
    return (
      <div className="space-y-3" data-testid="tg-aim-trainer">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-[10px] text-gray-400">{player?.name || "You"}</p>
            <p className="text-xl font-black text-green-400">{player?.hits || 0}</p>
          </div>
          <span className="text-xs text-gray-500">HITS</span>
          <div className="text-center">
            <p className="text-[10px] text-gray-400">{opponent?.name || "Bot"}</p>
            <p className="text-xl font-black text-red-400">{opponent?.hits || 0}</p>
          </div>
        </div>
        <div
          className="relative rounded-lg border-2 border-gray-700/30 overflow-hidden"
          style={{ height: "250px", background: "linear-gradient(135deg, rgba(10,10,15,0.95) 0%, rgba(20,20,30,0.95) 100%)" }}
        >
          {targets.map((target) => (
            <button
              key={target.id}
              className="absolute rounded-full border-2 border-red-500 bg-red-500/20 hover:bg-red-500/40 cursor-crosshair animate-pulse"
              style={{
                left: `${target.x}%`, top: `${target.y}%`,
                width: `${target.size}px`, height: `${target.size}px`,
                transform: "translate(-50%, -50%)",
              }}
              onClick={() => onAction("click", { targetId: target.id })}
              data-testid={`tg-aim-target-${target.id}`}
            >
              <Crosshair className="w-full h-full p-1 text-red-400" />
            </button>
          ))}
          {targets.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-gray-500 animate-pulse">Waiting for targets...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (match.gameId === "pnl-duel") {
    const price = (state.currentPrice as number) || 1000;
    return (
      <div className="space-y-3" data-testid="tg-pnl-duel">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-[10px] text-gray-400">{player?.name || "You"}</p>
            <p className={`text-lg font-black ${(player?.pnl || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
              ${Math.round(player?.pnl || 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400">Price</p>
            <p className="text-xl font-black">${price.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400">{opponent?.name || "Bot"}</p>
            <p className={`text-lg font-black ${(opponent?.pnl || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
              ${Math.round(opponent?.pnl || 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 justify-center">
          <Badge variant="outline" className={`text-xs ${
            (player?.position || 0) > 0 ? "text-green-400 border-green-500/40" :
            (player?.position || 0) < 0 ? "text-red-400 border-red-500/40" :
            "text-gray-400"
          }`}>
            {(player?.position || 0) > 0 ? `LONG x${player?.position}` : (player?.position || 0) < 0 ? `SHORT x${Math.abs(player?.position || 0)}` : "No Position"}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="border-green-500/30 text-green-400"
            onClick={() => onAction("long")} disabled={(player?.position || 0) > 0} data-testid="button-tg-pnl-long">
            <TrendingUp className="w-4 h-4 mr-1" /> Long
          </Button>
          <Button variant="outline" className="border-red-500/30 text-red-400"
            onClick={() => onAction("short")} disabled={(player?.position || 0) < 0} data-testid="button-tg-pnl-short">
            <TrendingDown className="w-4 h-4 mr-1" /> Short
          </Button>
          <Button variant="outline"
            onClick={() => onAction("close")} disabled={(player?.position || 0) === 0} data-testid="button-tg-pnl-close">
            <Shield className="w-4 h-4 mr-1" /> Close
          </Button>
        </div>
      </div>
    );
  }

  return <p className="text-gray-400 text-sm text-center">Unknown game type</p>;
}
