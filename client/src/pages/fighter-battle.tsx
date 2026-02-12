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
  TrendingUp,
  Award,
  Sparkles,
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

interface FighterProfile {
  id: string;
  agentName: string;
  level: number;
  xp: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  winStreak: number;
  bestStreak: number;
  title: string;
  bonusHp: number;
  bonusAtk: number;
  bonusDef: number;
  bonusSpd: number;
  bonusSpecial: number;
  xpForNextLevel?: number;
  xpForCurrentLevel?: number;
  xpProgress?: number;
  xpNeeded?: number;
}

interface XpResult {
  xpGained: number;
  newXp: number;
  newLevel: number;
  oldLevel: number;
  levelUp: boolean;
  title: string;
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
  xpResult?: XpResult | null;
  creatorProfile?: FighterProfile | null;
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

function XpBar({ profile }: { profile: FighterProfile }) {
  const progress = profile.xpProgress || 0;
  const needed = profile.xpNeeded || 100;
  const pct = Math.min(100, (progress / needed) * 100);

  return (
    <div className="space-y-1" data-testid="xp-bar">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-amber-400 text-xs" data-testid="text-player-level">
            Lv.{profile.level}
          </Badge>
          <span className="text-xs font-medium text-muted-foreground" data-testid="text-player-title">{profile.title}</span>
        </div>
        <span className="text-[10px] text-muted-foreground" data-testid="text-player-xp">{progress}/{needed} XP</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-md overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-700 ease-out rounded-md"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatBonusDisplay({ profile }: { profile: FighterProfile }) {
  if (profile.level <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap" data-testid="stat-bonuses">
      <span className="text-[10px] text-muted-foreground">Level bonuses:</span>
      {profile.bonusHp > 0 && <Badge variant="outline" className="text-[10px] text-red-400">+{profile.bonusHp} HP</Badge>}
      {profile.bonusAtk > 0 && <Badge variant="outline" className="text-[10px] text-orange-400">+{profile.bonusAtk} ATK</Badge>}
      {profile.bonusDef > 0 && <Badge variant="outline" className="text-[10px] text-blue-400">+{profile.bonusDef} DEF</Badge>}
      {profile.bonusSpd > 0 && <Badge variant="outline" className="text-[10px] text-green-400">+{profile.bonusSpd} SPD</Badge>}
      {profile.bonusSpecial > 0 && <Badge variant="outline" className="text-[10px] text-amber-400">+{profile.bonusSpecial} Special</Badge>}
    </div>
  );
}

function FighterCard({ fighter, selected, onClick, disabled, profile }: { fighter: Fighter; selected?: boolean; onClick?: () => void; disabled?: boolean; profile?: FighterProfile | null }) {
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
            <p className="text-xs font-bold text-red-400">
              {fighter.hp}
              {profile && profile.bonusHp > 0 && <span className="text-green-400 text-[9px]">+{profile.bonusHp}</span>}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">ATK</p>
            <p className="text-xs font-bold text-orange-400">
              {fighter.atk}
              {profile && profile.bonusAtk > 0 && <span className="text-green-400 text-[9px]">+{profile.bonusAtk}</span>}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">DEF</p>
            <p className="text-xs font-bold text-blue-400">
              {fighter.def}
              {profile && profile.bonusDef > 0 && <span className="text-green-400 text-[9px]">+{profile.bonusDef}</span>}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">SPD</p>
            <p className="text-xs font-bold text-green-400">
              {fighter.spd}
              {profile && profile.bonusSpd > 0 && <span className="text-green-400 text-[9px]">+{profile.bonusSpd}</span>}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] text-muted-foreground">
            {fighter.special} ({fighter.specialPower}{profile && profile.bonusSpecial > 0 ? `+${profile.bonusSpecial}` : ""} dmg)
          </span>
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

function FighterSelectScreen({ fighters, onSelect, profile }: { fighters: Fighter[]; onSelect: (id: string) => void; profile?: FighterProfile | null }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-4" data-testid="fighter-select-screen">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold">Choose Your Fighter</h3>
        <p className="text-sm text-muted-foreground">Each fighter has unique stats and a special move</p>
        {profile && profile.level > 1 && (
          <p className="text-xs text-amber-400">
            <TrendingUp className="w-3 h-3 inline mr-1" />
            Your Lv.{profile.level} bonuses will be applied to your chosen fighter
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fighters.map((f) => (
          <FighterCard key={f.id} fighter={f} selected={selected === f.id} onClick={() => setSelected(f.id)} profile={profile} />
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

function BattleView({ duel, onMove, isPending, xpResult }: { duel: DuelData; onMove: (move: string) => void; isPending: boolean; xpResult?: XpResult | null }) {
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
        <Badge variant="outline" data-testid="text-turn-counter">Turn {Math.min(duel.currentTurn, duel.maxTurns)}/{duel.maxTurns}</Badge>
        {duel.creatorProfile && (
          <Badge variant="outline" className="text-amber-400" data-testid="text-battle-level">
            Lv.{duel.creatorProfile.level} {duel.creatorProfile.title}
          </Badge>
        )}
        {isSettled && (
          <Badge variant={duel.winnerId === "creator" ? "default" : duel.winnerId === "joiner" ? "destructive" : "secondary"} data-testid="text-battle-result">
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
          <CardContent className="p-4 text-center space-y-3">
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

            {xpResult && (
              <div className="space-y-2 pt-2 border-t border-border" data-testid="xp-reward-section">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-amber-400" data-testid="text-xp-gained">+{xpResult.xpGained} XP</span>
                </div>
                {xpResult.levelUp && (
                  <div className="flex items-center justify-center gap-2">
                    <Award className="w-5 h-5 text-amber-400 animate-bounce" />
                    <span className="text-sm font-bold text-amber-400" data-testid="text-level-up">
                      LEVEL UP! Lv.{xpResult.oldLevel} &rarr; Lv.{xpResult.newLevel} ({xpResult.title})
                    </span>
                  </div>
                )}
              </div>
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
                <div key={i} className="text-xs border-b border-border pb-2 last:border-0" data-testid={`battle-log-entry-${i}`}>
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
  const playerName = agent?.name || "Fighter";

  const { data: fighters, isLoading: fightersLoading } = useQuery<Fighter[]>({
    queryKey: ["/api/fighters"],
  });

  const { data: profile } = useQuery<FighterProfile>({
    queryKey: [`/api/fighters/profile/${playerName}`],
    enabled: !!playerName,
  });

  const { data: leaderboard } = useQuery<any[]>({
    queryKey: ["/api/fighters/leaderboard"],
  });

  const playBotMutation = useMutation({
    mutationFn: async (fighterId: string) => {
      return await apiRequest<any>("POST", "/api/fighters/play-vs-bot", {
        playerName,
        playerFighter: fighterId,
      });
    },
    onSuccess: (duel: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fighters/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: [`/api/fighters/profile/${playerName}`] });
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
        profile={profile}
        onSelect={(id) => {
          playBotMutation.mutate(id);
          setShowSelect(false);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {profile && (
        <Card data-testid="player-profile-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <Award className="w-4 h-4 text-amber-400" /> Your Fighter Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <XpBar profile={profile} />
            <StatBonusDisplay profile={profile} />
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-400" /> {profile.totalWins}W / {profile.totalLosses}L / {profile.totalDraws}D</span>
              {profile.winStreak > 0 && <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" /> {profile.winStreak} streak</span>}
              {profile.bestStreak > 0 && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> Best: {profile.bestStreak}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Swords className="w-5 h-5 text-red-400" />
            Quick Match vs Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose a crypto fighter and battle against an AI opponent. Win fights to earn XP and level up your agent, unlocking stat bonuses!
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
                <FighterCard key={f.id} fighter={f} disabled profile={profile} />
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
              {leaderboard.slice(0, 10).map((entry: any, i: number) => (
                <div key={entry.name} className="flex items-center gap-2 p-2 rounded-md hover-elevate" data-testid={`leaderboard-fighter-${i}`}>
                  <span className="text-sm font-bold w-6 text-center text-muted-foreground">
                    {i === 0 ? <Crown className="w-4 h-4 text-amber-400 mx-auto" /> : i === 1 ? <Medal className="w-4 h-4 text-gray-400 mx-auto" /> : `${i + 1}`}
                  </span>
                  <span className="text-sm font-medium flex-1 truncate">{entry.name}</span>
                  <Badge variant="outline" className="text-amber-400 text-[10px]">Lv.{entry.level}</Badge>
                  <Badge variant="outline" className="text-green-400 text-xs">{entry.wins}W</Badge>
                  <Badge variant="outline" className="text-red-400 text-xs">{entry.losses}L</Badge>
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
  const [lastXpResult, setLastXpResult] = useState<XpResult | null>(null);
  const { toast } = useToast();
  const { agent } = useAuth();
  const playerName = agent?.name || "Fighter";

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
        playerName,
      });
    },
    onSuccess: (data: DuelData) => {
      queryClient.invalidateQueries({ queryKey: [`/api/fighters/duels/${duelId}`] });
      if (data.xpResult) {
        setLastXpResult(data.xpResult);
      }
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const handleBackToLobby = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/fighters/profile/${playerName}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/fighters/leaderboard"] });
    setDuelId(null);
    setLastXpResult(null);
  };

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
        <Button variant="ghost" size="sm" onClick={handleBackToLobby} data-testid="button-back-fighter-lobby">
          <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back to Lobby
        </Button>
      </div>
      <BattleView duel={duel} onMove={(m) => moveMutation.mutate(m)} isPending={moveMutation.isPending} xpResult={lastXpResult} />
    </div>
  );
}
