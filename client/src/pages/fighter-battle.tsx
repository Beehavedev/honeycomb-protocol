import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Swords,
  Shield,
  Zap,
  RotateCcw,
  Bot,
  Trophy,
  Heart,
  Flame,
  Crown,
  Skull,
  Loader2,
  ChevronRight,
  Star,
  Medal,
  Target,
} from "lucide-react";

interface Fighter {
  id: string;
  name: string;
  type: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  special: string;
  specialPower: number;
  icon: string;
}

interface BattleLogEntry {
  turn: number;
  creatorMove: string;
  joinerMove: string;
  creatorDamage: number;
  joinerDamage: number;
  creatorHpAfter: number;
  joinerHpAfter: number;
  narrative: string;
}

interface DuelData {
  id: string;
  creatorName: string;
  joinerName: string;
  creatorFighter: string;
  joinerFighter: string;
  creatorHp: number;
  joinerHp: number;
  creatorMaxHp: number;
  joinerMaxHp: number;
  currentTurn: number;
  maxTurns: number;
  status: string;
  winnerId: string | null;
  isBotMatch: boolean;
  botName: string | null;
  battleLog: BattleLogEntry[];
  creatorFighterData: Fighter | null;
  joinerFighterData: Fighter | null;
  lastTurn?: BattleLogEntry;
}

const FIGHTER_COLORS: Record<string, string> = {
  bitcoin: "text-amber-500",
  ethereum: "text-blue-400",
  bnb: "text-yellow-500",
  doge: "text-amber-300",
  cardano: "text-sky-400",
  solana: "text-purple-400",
};

const FIGHTER_BG: Record<string, string> = {
  bitcoin: "from-amber-500/20 to-amber-600/5",
  ethereum: "from-blue-500/20 to-blue-600/5",
  bnb: "from-yellow-500/20 to-yellow-600/5",
  doge: "from-amber-300/20 to-amber-400/5",
  cardano: "from-sky-400/20 to-sky-500/5",
  solana: "from-purple-500/20 to-purple-600/5",
};

const MOVE_INFO = [
  { id: "attack", label: "Attack", icon: Swords, desc: "Deal direct damage", color: "text-red-400" },
  { id: "defend", label: "Defend", icon: Shield, desc: "Block incoming damage", color: "text-blue-400" },
  { id: "special", label: "Special", icon: Zap, desc: "Powerful unique move", color: "text-amber-400" },
  { id: "counter", label: "Counter", icon: RotateCcw, desc: "Reflect attacks back", color: "text-green-400" },
];

function FighterCard({ fighter, selected, onClick, disabled }: { fighter: Fighter; selected?: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <Card
      className={`cursor-pointer transition-all ${selected ? "ring-2 ring-amber-400 bg-amber-500/10" : "hover-elevate"} ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onClick={onClick}
      data-testid={`fighter-card-${fighter.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-md bg-gradient-to-br ${FIGHTER_BG[fighter.icon] || "from-gray-500/20 to-gray-600/5"} flex items-center justify-center`}>
            <span className={`text-lg font-bold ${FIGHTER_COLORS[fighter.icon] || "text-foreground"}`}>{fighter.type.slice(0, 3)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{fighter.name}</p>
            <p className="text-xs text-muted-foreground">{fighter.type}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 mt-2">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">HP</p>
            <p className="text-xs font-bold text-red-400">{fighter.hp}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">ATK</p>
            <p className="text-xs font-bold text-orange-400">{fighter.atk}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">DEF</p>
            <p className="text-xs font-bold text-blue-400">{fighter.def}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">SPD</p>
            <p className="text-xs font-bold text-green-400">{fighter.spd}</p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] text-muted-foreground">{fighter.special} ({fighter.specialPower} dmg)</span>
        </div>
      </CardContent>
    </Card>
  );
}

function HpBar({ current, max, label, isLeft }: { current: number; max: number; label: string; isLeft: boolean }) {
  const pct = Math.max(0, (current / max) * 100);
  const color = pct > 60 ? "bg-green-500" : pct > 30 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className={`flex flex-col ${isLeft ? "items-start" : "items-end"}`}>
      <div className="flex items-center gap-2 mb-1">
        <Heart className={`w-3 h-3 ${pct > 30 ? "text-red-400" : "text-red-600 animate-pulse"}`} />
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{current}/{max}</span>
      </div>
      <div className="w-full h-3 bg-muted rounded-md overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-700 ease-out rounded-md`}
          style={{ width: `${pct}%`, float: isLeft ? "left" : "right" }}
        />
      </div>
    </div>
  );
}

function FighterSelectScreen({ fighters, onSelect }: { fighters: Fighter[]; onSelect: (id: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-4" data-testid="fighter-select-screen">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold">Choose Your Fighter</h3>
        <p className="text-sm text-muted-foreground">Each fighter has unique stats and a special move</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fighters.map((f) => (
          <FighterCard key={f.id} fighter={f} selected={selected === f.id} onClick={() => setSelected(f.id)} />
        ))}
      </div>
      <div className="flex justify-center">
        <Button
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          data-testid="button-confirm-fighter"
        >
          <Swords className="w-4 h-4 mr-1.5" /> Lock In Fighter
        </Button>
      </div>
    </div>
  );
}

function BattleView({ duel, onMove, isPending }: { duel: DuelData; onMove: (move: string) => void; isPending: boolean }) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [lastNarrative, setLastNarrative] = useState<string | null>(null);
  const [showFlash, setShowFlash] = useState<"creator" | "joiner" | null>(null);

  const creatorF = duel.creatorFighterData;
  const joinerF = duel.joinerFighterData;
  const isSettled = duel.status === "settled";

  useEffect(() => {
    if (duel.battleLog.length > 0) {
      const last = duel.battleLog[duel.battleLog.length - 1];
      setLastNarrative(last.narrative);
      if (last.joinerDamage > 0) {
        setShowFlash("joiner");
        setTimeout(() => setShowFlash(null), 400);
      }
      if (last.creatorDamage > 0) {
        setShowFlash("creator");
        setTimeout(() => setShowFlash(null), 400);
      }
    }
  }, [duel.battleLog.length]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [duel.battleLog.length]);

  return (
    <div className="space-y-4" data-testid="fighter-battle-view">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant="outline">Turn {Math.min(duel.currentTurn, duel.maxTurns)}/{duel.maxTurns}</Badge>
        {isSettled && (
          <Badge variant={duel.winnerId === "creator" ? "default" : duel.winnerId === "joiner" ? "destructive" : "secondary"}>
            {duel.winnerId === "creator" ? "YOU WIN!" : duel.winnerId === "joiner" ? "YOU LOSE" : "DRAW"}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        <div className={`space-y-2 transition-all ${showFlash === "creator" ? "scale-95" : ""}`}>
          {creatorF && (
            <div className={`p-3 rounded-md bg-gradient-to-br ${FIGHTER_BG[creatorF.icon]} border border-border`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-lg font-bold ${FIGHTER_COLORS[creatorF.icon]}`}>{creatorF.type.slice(0, 3)}</span>
                <div>
                  <p className="font-semibold text-sm">{creatorF.name}</p>
                  <p className="text-[10px] text-muted-foreground">{duel.creatorName}</p>
                </div>
              </div>
              <HpBar current={duel.creatorHp} max={duel.creatorMaxHp} label="HP" isLeft={true} />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1">
          <Swords className="w-6 h-6 text-amber-400" />
          <span className="text-xs font-bold text-muted-foreground">VS</span>
        </div>

        <div className={`space-y-2 transition-all ${showFlash === "joiner" ? "scale-95" : ""}`}>
          {joinerF && (
            <div className={`p-3 rounded-md bg-gradient-to-br ${FIGHTER_BG[joinerF.icon]} border border-border`}>
              <div className="flex items-center gap-2 mb-2 justify-end">
                <div className="text-right">
                  <p className="font-semibold text-sm">{joinerF.name}</p>
                  <p className="text-[10px] text-muted-foreground">{duel.joinerName} {duel.isBotMatch && <Bot className="w-3 h-3 inline" />}</p>
                </div>
                <span className={`text-lg font-bold ${FIGHTER_COLORS[joinerF.icon]}`}>{joinerF.type.slice(0, 3)}</span>
              </div>
              <HpBar current={duel.joinerHp} max={duel.joinerMaxHp} label="HP" isLeft={false} />
            </div>
          )}
        </div>
      </div>

      {lastNarrative && (
        <Card className="bg-muted/50">
          <CardContent className="p-3">
            <p className="text-sm text-center font-medium" data-testid="text-battle-narrative">{lastNarrative}</p>
          </CardContent>
        </Card>
      )}

      {!isSettled && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-center">Choose your move:</p>
          <div className="grid grid-cols-2 gap-2">
            {MOVE_INFO.map((m) => (
              <Button
                key={m.id}
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3"
                onClick={() => onMove(m.id)}
                disabled={isPending}
                data-testid={`button-move-${m.id}`}
              >
                <m.icon className={`w-5 h-5 ${m.color}`} />
                <span className="text-sm font-semibold">{m.label}</span>
                <span className="text-[10px] text-muted-foreground">{m.desc}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {isSettled && (
        <Card className={duel.winnerId === "creator" ? "border-amber-400/50 bg-amber-500/5" : duel.winnerId === "joiner" ? "border-red-400/50 bg-red-500/5" : ""}>
          <CardContent className="p-4 text-center space-y-2">
            {duel.winnerId === "creator" ? (
              <>
                <Crown className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-lg font-bold text-amber-400">Victory!</p>
                <p className="text-sm text-muted-foreground">You defeated {duel.joinerName} in {duel.currentTurn - 1} turns</p>
              </>
            ) : duel.winnerId === "joiner" ? (
              <>
                <Skull className="w-8 h-8 text-red-400 mx-auto" />
                <p className="text-lg font-bold text-red-400">Defeated</p>
                <p className="text-sm text-muted-foreground">{duel.joinerName} won in {duel.currentTurn - 1} turns</p>
              </>
            ) : (
              <>
                <Target className="w-8 h-8 text-muted-foreground mx-auto" />
                <p className="text-lg font-bold">Draw!</p>
                <p className="text-sm text-muted-foreground">Evenly matched after {duel.maxTurns} turns</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
            <Flame className="w-4 h-4 text-orange-400" /> Battle Log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 max-h-48 overflow-y-auto">
          {duel.battleLog.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center">Make your first move!</p>
          ) : (
            <div className="space-y-2">
              {duel.battleLog.map((entry, i) => (
                <div key={i} className="text-xs border-b border-border pb-2 last:border-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">Turn {entry.turn}</Badge>
                    <span className="text-muted-foreground">
                      {creatorF?.name}: <span className="capitalize text-foreground">{entry.creatorMove}</span>
                      {" vs "}
                      {joinerF?.name}: <span className="capitalize text-foreground">{entry.joinerMove}</span>
                    </span>
                  </div>
                  <p className="text-muted-foreground">{entry.narrative}</p>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FighterLobby({ onStartDuel }: { onStartDuel: (duelId: string) => void }) {
  const { agent } = useAuth();
  const { toast } = useToast();
  const [showSelect, setShowSelect] = useState(false);

  const { data: fighters, isLoading: fightersLoading } = useQuery<Fighter[]>({
    queryKey: ["/api/fighters"],
  });

  const { data: leaderboard } = useQuery<any[]>({
    queryKey: ["/api/fighters/leaderboard"],
  });

  const playBotMutation = useMutation({
    mutationFn: async (fighterId: string) => {
      return await apiRequest<any>("POST", "/api/fighters/play-vs-bot", {
        playerName: agent?.name || "Fighter",
        playerFighter: fighterId,
      });
    },
    onSuccess: (duel: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fighters/leaderboard"] });
      onStartDuel(duel.id);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (showSelect && fighters) {
    return (
      <FighterSelectScreen
        fighters={fighters}
        onSelect={(id) => {
          playBotMutation.mutate(id);
          setShowSelect(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Swords className="w-5 h-5 text-red-400" />
            Quick Match vs Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose a crypto fighter and battle against an AI opponent. Each fighter has unique stats and a powerful special move.
            Use Attack, Defend, Special, or Counter strategically to win!
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Badge variant="outline"><Swords className="w-3 h-3 mr-1" /> Attack beats Counter</Badge>
            <Badge variant="outline"><Shield className="w-3 h-3 mr-1" /> Defend blocks Attack</Badge>
            <Badge variant="outline"><RotateCcw className="w-3 h-3 mr-1" /> Counter reflects Special</Badge>
            <Badge variant="outline"><Zap className="w-3 h-3 mr-1" /> Special hits hard</Badge>
          </div>
          <Button
            onClick={() => setShowSelect(true)}
            disabled={playBotMutation.isPending || fightersLoading || !fighters}
            data-testid="button-play-fighter-bot"
          >
            {playBotMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Starting...</>
            ) : (
              <><Bot className="w-4 h-4 mr-1.5" /> Play vs Bot</>
            )}
          </Button>
        </CardContent>
      </Card>

      {fightersLoading && (
        <div className="flex items-center justify-center p-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground ml-2">Loading fighters...</span>
        </div>
      )}

      {fighters && fighters.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <Star className="w-4 h-4 text-amber-400" /> Fighters Roster
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fighters.map((f) => (
                <FighterCard key={f.id} fighter={f} disabled />
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
              {leaderboard.slice(0, 10).map((entry, i) => (
                <div key={entry.name} className="flex items-center gap-2 p-2 rounded-md hover-elevate" data-testid={`leaderboard-fighter-${i}`}>
                  <span className="text-sm font-bold w-6 text-center text-muted-foreground">
                    {i === 0 ? <Crown className="w-4 h-4 text-amber-400 mx-auto" /> : i === 1 ? <Medal className="w-4 h-4 text-gray-400 mx-auto" /> : `${i + 1}`}
                  </span>
                  <span className="text-sm font-medium flex-1 truncate">{entry.name}</span>
                  <Badge variant="outline" className="text-green-400 text-xs">{entry.wins}W</Badge>
                  <Badge variant="outline" className="text-red-400 text-xs">{entry.losses}L</Badge>
                  {entry.draws > 0 && <Badge variant="outline" className="text-xs">{entry.draws}D</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FighterBattle() {
  const [duelId, setDuelId] = useState<string | null>(null);
  const { toast } = useToast();
  const { agent } = useAuth();

  const { data: duel, isLoading } = useQuery<DuelData>({
    queryKey: [`/api/fighters/duels/${duelId}`],
    enabled: !!duelId,
    refetchInterval: (query) => {
      const d = query.state.data;
      return d?.status === "settled" ? false : 2000;
    },
  });

  const moveMutation = useMutation({
    mutationFn: async (move: string) => {
      return await apiRequest<DuelData>("POST", `/api/fighters/duels/${duelId}/move`, {
        move,
        playerName: agent?.name || "Fighter",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fighters/duels/${duelId}`] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (!duelId) {
    return <FighterLobby onStartDuel={setDuelId} />;
  }

  if (isLoading || !duel) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-red-400" />
        <p className="text-sm text-muted-foreground">Loading battle...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setDuelId(null)} data-testid="button-back-fighter-lobby">
          <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back to Lobby
        </Button>
      </div>
      <BattleView duel={duel} onMove={(m) => moveMutation.mutate(m)} isPending={moveMutation.isPending} />
    </div>
  );
}
