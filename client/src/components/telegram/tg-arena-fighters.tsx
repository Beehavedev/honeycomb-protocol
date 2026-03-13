import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Swords, Trophy, Flame, Bot, Loader2, Shield, RotateCcw, Zap,
  Sparkles, ArrowLeft, Crown, Star,
} from "lucide-react";
import type { TgAgentInfo, FighterDuel } from "./tg-arena-types";

interface FighterLeaderboardEntry {
  agentName?: string;
  name?: string;
  wins?: number;
  totalWins?: number;
}

const FIGHTERS = [
  { id: "satoshi", name: "Satoshi", type: "bitcoin", emoji: "₿" },
  { id: "vitalik", name: "Vitalik", type: "ethereum", emoji: "Ξ" },
  { id: "changpeng", name: "CZ", type: "bnb", emoji: "◆" },
  { id: "doge", name: "Doge", type: "doge", emoji: "🐕" },
  { id: "cardano", name: "Charles", type: "cardano", emoji: "♦" },
  { id: "sol", name: "Solana", type: "solana", emoji: "◎" },
];

const MOVE_INFO = [
  { id: "attack", label: "ATK", icon: Swords, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  { id: "defend", label: "DEF", icon: Shield, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  { id: "special", label: "SPL", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  { id: "counter", label: "CTR", icon: RotateCcw, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
];

export function FightersSubTab({ agent }: { agent?: TgAgentInfo }) {
  const [activeDuelId, setActiveDuelId] = useState<string | null>(null);

  if (!agent) {
    return (
      <Card className="p-6 bg-[#242444] border-gray-700/50 text-center">
        <Flame className="w-10 h-10 text-red-500/50 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Open via @honeycombot to fight</p>
      </Card>
    );
  }

  if (activeDuelId) {
    return <FighterBattleView duelId={activeDuelId} agent={agent} onBack={() => setActiveDuelId(null)} />;
  }

  return <FighterLobbyView agent={agent} onStartDuel={setActiveDuelId} />;
}

function FighterLobbyView({ agent, onStartDuel }: { agent: TgAgentInfo; onStartDuel: (id: string) => void }) {
  const [selectedFighter, setSelectedFighter] = useState("satoshi");

  const { data: leaderboard } = useQuery<FighterLeaderboardEntry[]>({
    queryKey: ["/api/fighters/leaderboard"],
  });

  const playBotMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<FighterDuel>("POST", "/api/fighters/play-vs-bot", {
        creatorName: agent.name,
        creatorAddress: agent.ownerAddress,
        fighterId: selectedFighter,
      });
    },
    onSuccess: (data: FighterDuel) => {
      onStartDuel(data.id);
    },
  });

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-gradient-to-br from-red-500/10 to-orange-600/10 border-red-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-red-400" />
          <span className="text-sm font-semibold text-white">Crypto Fighters</span>
        </div>
        <p className="text-[10px] text-gray-400 mb-3">Pick your fighter and battle vs AI</p>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {FIGHTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedFighter(f.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                selectedFighter === f.id
                  ? "bg-red-500/20 border border-red-500/40"
                  : "bg-[#1a1a2e] border border-gray-700/50"
              }`}
              data-testid={`button-tg-fighter-${f.id}`}
            >
              <span className="text-lg">{f.emoji}</span>
              <span className="text-[10px] text-gray-300">{f.name}</span>
            </button>
          ))}
        </div>

        <Button
          className="w-full gap-2"
          onClick={() => playBotMutation.mutate()}
          disabled={playBotMutation.isPending}
          data-testid="button-tg-play-fighter"
        >
          {playBotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
          Fight!
        </Button>
      </Card>

      {leaderboard && leaderboard.length > 0 && (
        <Card className="p-3 bg-[#242444] border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-white">Top Fighters</span>
          </div>
          <div className="space-y-1">
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div key={i} className="flex items-center justify-between py-1" data-testid={`tg-fighter-leaderboard-${i}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-4 text-right">
                    {i === 0 ? <Crown className="w-3 h-3 text-amber-400 inline" /> : `#${i + 1}`}
                  </span>
                  <span className="text-xs text-white truncate max-w-[100px]">{entry.agentName || entry.name}</span>
                </div>
                <span className="text-[10px] text-green-400">{entry.wins || entry.totalWins}W</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function FighterBattleView({ duelId, agent, onBack }: { duelId: string; agent: TgAgentInfo; onBack: () => void }) {
  const { data: duel } = useQuery<FighterDuel>({
    queryKey: [`/api/fighters/duels/${duelId}`],
    refetchInterval: (query) => {
      const d = query.state.data;
      return d?.status === "settled" ? false : 1000;
    },
  });

  const moveMutation = useMutation({
    mutationFn: async (move: string) => {
      return await apiRequest<FighterDuel>("POST", `/api/fighters/duels/${duelId}/move`, {
        playerName: agent.name,
        move,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fighters/duels/${duelId}`] });
    },
  });

  if (!duel) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-red-400" />
        <p className="text-xs text-gray-400 mt-2">Loading battle...</p>
      </div>
    );
  }

  const isSettled = duel.status === "settled";
  const isDraw = isSettled && (!duel.winnerId || duel.winnerId === "draw" || duel.winnerId === "none");
  const creatorWon = isSettled && !isDraw && duel.winnerId === "creator";
  const isCreator = agent.name === duel.creatorName;
  const iWon = isSettled && !isDraw && ((isCreator && creatorWon) || (!isCreator && !creatorWon));

  const myHp = isCreator ? duel.creatorHp : duel.joinerHp;
  const myMaxHp = isCreator ? duel.creatorMaxHp : duel.joinerMaxHp;
  const opHp = isCreator ? duel.joinerHp : duel.creatorHp;
  const opMaxHp = isCreator ? duel.joinerMaxHp : duel.creatorMaxHp;
  const opName = isCreator ? duel.joinerName : duel.creatorName;

  const lastTurn = duel.lastTurn || (duel.battleLog && duel.battleLog.length > 0 ? duel.battleLog[duel.battleLog.length - 1] : null);

  if (isSettled) {
    return (
      <div className="text-center space-y-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
          isDraw ? "bg-gray-700/50" : iWon ? "bg-green-500/20" : "bg-red-500/20"
        }`}>
          {isDraw ? <Swords className="w-8 h-8 text-gray-400" /> :
           iWon ? <Trophy className="w-8 h-8 text-amber-500" /> :
           <Star className="w-8 h-8 text-red-400" />}
        </div>
        <h3 className={`text-xl font-bold ${isDraw ? "text-gray-300" : iWon ? "text-green-400" : "text-red-400"}`}>
          {isDraw ? "Draw!" : iWon ? "Victory!" : "Defeat"}
        </h3>
        <p className="text-sm text-gray-400">
          {agent.name} vs {opName}
        </p>
        {duel.xpResult && duel.xpResult.xpGained > 0 && (
          <Badge className="bg-amber-500/20 text-amber-400">
            +{duel.xpResult.xpGained} XP {duel.xpResult.levelUp && "LEVEL UP!"}
          </Badge>
        )}
        <Button onClick={onBack} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white" data-testid="button-tg-fighter-again">
          <Sparkles className="w-4 h-4 mr-1" /> Fight Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-400"><ArrowLeft className="w-5 h-5" /></button>
        <Badge className="bg-gray-700/50 text-gray-300 font-mono">
          Turn {duel.currentTurn}/{duel.maxTurns}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1 mb-1">
            <span className="text-[10px] font-bold text-white truncate">{agent.name}</span>
          </div>
          <div className="w-full h-4 bg-black/60 rounded-sm overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
              style={{ width: `${Math.max(0, (myHp / myMaxHp) * 100)}%` }}
            />
          </div>
          <span className="text-[9px] text-gray-400">{myHp}/{myMaxHp} HP</span>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 mb-1 justify-end">
            <span className="text-[10px] font-bold text-white truncate">{opName}</span>
          </div>
          <div className="w-full h-4 bg-black/60 rounded-sm overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all float-right"
              style={{ width: `${Math.max(0, (opHp / opMaxHp) * 100)}%` }}
            />
          </div>
          <span className="text-[9px] text-gray-400">{opHp}/{opMaxHp} HP</span>
        </div>
      </div>

      {lastTurn && (
        <Card className="p-2 bg-[#1a1a2e] border-gray-700/30">
          <p className="text-[10px] text-gray-300 text-center">{lastTurn.narrative}</p>
        </Card>
      )}

      <div className="grid grid-cols-4 gap-2">
        {MOVE_INFO.map((move) => {
          const Icon = move.icon;
          return (
            <Button
              key={move.id}
              variant="outline"
              className={`flex flex-col gap-1 h-16 ${move.bg} ${move.color}`}
              onClick={() => moveMutation.mutate(move.id)}
              disabled={moveMutation.isPending || isSettled}
              data-testid={`button-tg-move-${move.id}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px]">{move.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
