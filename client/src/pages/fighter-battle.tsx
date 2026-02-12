import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  playPunchSound,
  playHeavyPunchSound,
  playSpecialSound,
  playBlockSound,
  playCounterSound,
  playKOSound,
  playRoundSound,
  playFightSound,
  playVictorySound,
  playMissSound,
  playMoveSelectSound,
  playChipDamageSound,
} from "@/lib/fight-sounds";
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
  Volume2,
  VolumeX,
} from "lucide-react";

import satoshiImg from "@assets/fighters/satoshi.png";
import vitalikImg from "@assets/fighters/vitalik.png";
import czImg from "@assets/fighters/cz.png";
import dogeImg from "@assets/fighters/doge.png";
import cardanoImg from "@assets/fighters/cardano.png";
import solanaImg from "@assets/fighters/solana.png";

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

const FIGHTER_SPRITES: Record<string, string> = {
  satoshi: satoshiImg,
  vitalik: vitalikImg,
  changpeng: czImg,
  doge: dogeImg,
  cardano: cardanoImg,
  sol: solanaImg,
};

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

const FIGHTER_HP_COLORS: Record<string, string> = {
  bitcoin: "from-amber-400 to-amber-600",
  ethereum: "from-blue-400 to-blue-600",
  bnb: "from-yellow-400 to-yellow-600",
  doge: "from-amber-300 to-amber-500",
  cardano: "from-sky-400 to-sky-600",
  solana: "from-purple-400 to-purple-600",
};

const FIGHTER_GLOW_COLORS: Record<string, string> = {
  bitcoin: "rgba(245,158,11,0.6)",
  ethereum: "rgba(96,165,250,0.6)",
  bnb: "rgba(234,179,8,0.6)",
  doge: "rgba(252,211,77,0.6)",
  cardano: "rgba(56,189,248,0.6)",
  solana: "rgba(192,132,252,0.6)",
};

type AnimState = "idle" | "attack" | "special" | "defend" | "counter" | "hit" | "ko" | "victory";

const MOVE_INFO = [
  { id: "attack", label: "ATTACK", icon: Swords, desc: "Direct damage", color: "text-red-400", bgColor: "bg-red-500/10 border-red-500/30" },
  { id: "defend", label: "DEFEND", icon: Shield, desc: "Block damage", color: "text-blue-400", bgColor: "bg-blue-500/10 border-blue-500/30" },
  { id: "special", label: "SPECIAL", icon: Zap, desc: "Powerful move", color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/30" },
  { id: "counter", label: "COUNTER", icon: RotateCcw, desc: "Reflect attacks", color: "text-green-400", bgColor: "bg-green-500/10 border-green-500/30" },
];

function FighterSprite({ fighterId, side, animState, glowColor }: {
  fighterId: string;
  side: "left" | "right";
  animState: AnimState;
  glowColor: string;
}) {
  const sprite = FIGHTER_SPRITES[fighterId];
  const mirrorStyle = side === "right" ? { transform: "scaleX(-1)" } : {};

  let animClass = "";
  switch (animState) {
    case "idle": animClass = side === "left" ? "fighter-idle-left" : "fighter-idle-right"; break;
    case "attack": animClass = side === "left" ? "fighter-attack-left" : "fighter-attack-right"; break;
    case "special": animClass = side === "left" ? "fighter-special-left" : "fighter-special-right"; break;
    case "defend": animClass = side === "left" ? "fighter-defend-left" : "fighter-defend-right"; break;
    case "counter": animClass = side === "left" ? "fighter-counter-left" : "fighter-counter-right"; break;
    case "hit": animClass = side === "left" ? "fighter-hit-left" : "fighter-hit-right"; break;
    case "ko": animClass = side === "left" ? "fighter-ko-left" : "fighter-ko-right"; break;
    case "victory": animClass = side === "left" ? "fighter-victory-left" : "fighter-victory-right"; break;
  }

  return (
    <div className={`relative ${animClass}`}>
      {animState === "special" && (
        <div className="absolute inset-0 rounded-full energy-charge-effect z-0"
          style={{ color: glowColor, margin: "-8px" }} />
      )}
      {sprite ? (
        <img
          src={sprite}
          alt="fighter"
          className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 object-contain select-none pointer-events-none relative z-10"
          style={{
            ...mirrorStyle,
            filter: animState === "hit"
              ? "brightness(2) saturate(0.5)"
              : animState === "ko"
              ? "brightness(0.5) grayscale(0.7)"
              : animState === "special"
              ? `brightness(1.3) drop-shadow(0 0 15px ${glowColor})`
              : animState === "victory"
              ? `drop-shadow(0 0 10px ${glowColor})`
              : `drop-shadow(0 0 6px ${glowColor})`,
            imageRendering: "auto",
          }}
          draggable={false}
        />
      ) : (
        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-muted rounded-lg flex items-center justify-center text-2xl font-black" style={mirrorStyle}>
          ?
        </div>
      )}
    </div>
  );
}

function HitEffect({ x, y, type, id }: { x: number; y: number; type: string; id: number }) {
  return (
    <div
      className="absolute pointer-events-none z-30 hit-spark-effect"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
    >
      {type === "special" ? (
        <div className="relative">
          <Zap className="w-12 h-12 sm:w-16 sm:h-16 text-amber-400" />
          <div className="absolute inset-0 animate-ping">
            <Zap className="w-12 h-12 sm:w-16 sm:h-16 text-amber-300 opacity-50" />
          </div>
        </div>
      ) : type === "counter" ? (
        <div className="relative">
          <RotateCcw className="w-10 h-10 sm:w-14 sm:h-14 text-green-400" />
        </div>
      ) : type === "block" ? (
        <div className="relative">
          <Shield className="w-10 h-10 sm:w-14 sm:h-14 text-blue-400" />
        </div>
      ) : (
        <div className="relative">
          <svg viewBox="0 0 48 48" className="w-10 h-10 sm:w-14 sm:h-14">
            <polygon points="24,2 28,18 46,18 32,28 36,46 24,34 12,46 16,28 2,18 20,18" fill="none" stroke="#ef4444" strokeWidth="3" />
            <polygon points="24,8 26,18 38,18 30,24 32,38 24,30 16,38 18,24 10,18 22,18" fill="#ef4444" opacity="0.6" />
          </svg>
        </div>
      )}
    </div>
  );
}

function DamagePopup({ damage, x, y, isCrit }: { damage: number; x: number; y: number; isCrit: boolean }) {
  return (
    <div
      className={`absolute pointer-events-none z-30 damage-number-effect font-black ${
        isCrit ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
      }`}
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
        color: damage === 0 ? "#60a5fa" : isCrit ? "#fbbf24" : "#ef4444",
        textShadow: "0 2px 8px rgba(0,0,0,0.9), 0 0 20px currentColor",
        WebkitTextStroke: "1px rgba(0,0,0,0.5)",
      }}
    >
      {damage === 0 ? "BLOCKED!" : `-${damage}`}
    </div>
  );
}

function ArcadeHpBar({ current, max, name, side, color, level }: {
  current: number; max: number; name: string; side: "left" | "right"; color: string; level?: number;
}) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  const isLow = pct <= 25;

  return (
    <div className={`flex flex-col ${side === "right" ? "items-end" : "items-start"} flex-1`}>
      <div className={`flex items-center gap-1.5 mb-0.5 ${side === "right" ? "flex-row-reverse" : ""}`}>
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wide text-white truncate max-w-[90px] sm:max-w-[130px]"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>{name}</span>
        {level && level > 1 && (
          <span className="text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 font-black border border-amber-500/40">
            LV{level}
          </span>
        )}
      </div>
      <div className="w-full h-5 sm:h-6 bg-black/80 rounded-sm border-2 border-white/20 relative overflow-hidden"
        style={{ boxShadow: "inset 0 2px 4px rgba(0,0,0,0.5)" }}>
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-500 ease-out relative ${isLow ? "animate-pulse" : ""}`}
          style={{ width: `${pct}%`, float: side === "right" ? "right" : "left" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" style={{ height: "50%" }} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] sm:text-xs font-black text-white"
            style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
            {current}/{max}
          </span>
        </div>
      </div>
    </div>
  );
}

function BattleView({ duel, onMove, isPending, xpResult, onBack }: {
  duel: DuelData;
  onMove: (move: string) => void;
  isPending: boolean;
  xpResult?: XpResult | null;
  onBack: () => void;
}) {
  const [leftAnim, setLeftAnim] = useState<AnimState>("idle");
  const [rightAnim, setRightAnim] = useState<AnimState>("idle");
  const [effects, setEffects] = useState<Array<{ id: number; x: number; y: number; type: string }>>([]);
  const [damages, setDamages] = useState<Array<{ id: number; damage: number; x: number; y: number; isCrit: boolean }>>([]);
  const [stageShake, setStageShake] = useState(false);
  const [specialFlash, setSpecialFlash] = useState<string | null>(null);
  const [introPhase, setIntroPhase] = useState<"round" | "fight" | "ready" | null>("round");
  const [showKO, setShowKO] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastProcessedTurn, setLastProcessedTurn] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const nextId = useRef(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  const creatorF = duel.creatorFighterData;
  const joinerF = duel.joinerFighterData;
  const isSettled = duel.status === "settled";
  const isDraw = isSettled && (!duel.winnerId || duel.winnerId === "draw" || duel.winnerId === "none");
  const creatorWon = isSettled && !isDraw && duel.winnerId === "creator";
  const joinerWon = isSettled && !isDraw && duel.winnerId === "joiner";

  useEffect(() => {
    if (introPhase === "round") {
      if (soundEnabled) playRoundSound();
      const t = setTimeout(() => setIntroPhase("fight"), 1200);
      return () => clearTimeout(t);
    }
    if (introPhase === "fight") {
      if (soundEnabled) playFightSound();
      const t = setTimeout(() => setIntroPhase("ready"), 1000);
      return () => clearTimeout(t);
    }
    if (introPhase === "ready") {
      const t = setTimeout(() => setIntroPhase(null), 500);
      return () => clearTimeout(t);
    }
  }, [introPhase, soundEnabled]);

  const animateTurn = useCallback((entry: BattleLogEntry) => {
    const { creatorMove, joinerMove, creatorDamage, joinerDamage } = entry;
    const iid = nextId.current++;

    const animMap: Record<string, AnimState> = { attack: "attack", defend: "defend", special: "special", counter: "counter" };
    setLeftAnim(animMap[creatorMove] || "attack");
    setRightAnim(animMap[joinerMove] || "attack");

    if (creatorMove === "special" || joinerMove === "special") {
      if (soundEnabled) playSpecialSound();
      setSpecialFlash(creatorMove === "special" ? (FIGHTER_GLOW_COLORS[creatorF?.icon || ""] || "#fbbf24") : (FIGHTER_GLOW_COLORS[joinerF?.icon || ""] || "#ef4444"));
      setTimeout(() => setSpecialFlash(null), 600);
    }

    const newEffects: typeof effects = [];
    const newDamages: typeof damages = [];

    setTimeout(() => {
      if (joinerDamage > 0) {
        newEffects.push({ id: iid, x: 72, y: 45, type: creatorMove === "special" ? "special" : creatorMove === "counter" ? "counter" : "attack" });
        newDamages.push({ id: iid, damage: joinerDamage, x: 72, y: 28, isCrit: creatorMove === "special" });
        setStageShake(true);
        if (soundEnabled) {
          if (creatorMove === "special") playHeavyPunchSound();
          else if (creatorMove === "counter") playCounterSound();
          else playPunchSound();
        }
        setTimeout(() => setRightAnim("hit"), 100);
      } else if (joinerMove === "defend" && creatorMove === "attack") {
        newEffects.push({ id: iid + 100, x: 72, y: 45, type: "block" });
        newDamages.push({ id: iid + 100, damage: 0, x: 72, y: 28, isCrit: false });
        if (soundEnabled) playBlockSound();
      }

      if (creatorDamage > 0) {
        newEffects.push({ id: iid + 200, x: 28, y: 45, type: joinerMove === "special" ? "special" : joinerMove === "counter" ? "counter" : "attack" });
        newDamages.push({ id: iid + 200, damage: creatorDamage, x: 28, y: 28, isCrit: joinerMove === "special" });
        setStageShake(true);
        if (soundEnabled) {
          if (joinerMove === "special") playHeavyPunchSound();
          else if (joinerMove === "counter") playCounterSound();
          else playPunchSound();
        }
        setTimeout(() => setLeftAnim("hit"), 100);
      } else if (creatorMove === "defend" && joinerMove === "attack") {
        newEffects.push({ id: iid + 300, x: 28, y: 45, type: "block" });
        newDamages.push({ id: iid + 300, damage: 0, x: 28, y: 28, isCrit: false });
        if (soundEnabled) playBlockSound();
      }

      if (creatorDamage === 0 && joinerDamage === 0 && creatorMove !== "defend" && joinerMove !== "defend") {
        if (soundEnabled) playMissSound();
      }

      setEffects(prev => [...prev, ...newEffects]);
      setDamages(prev => [...prev, ...newDamages]);
    }, 200);

    setTimeout(() => {
      setLeftAnim("idle");
      setRightAnim("idle");
      setStageShake(false);
    }, 800);

    setTimeout(() => {
      setEffects(prev => prev.filter(e => !newEffects.find(ne => ne.id === e.id)));
      setDamages(prev => prev.filter(d => !newDamages.find(nd => nd.id === d.id)));
    }, 1200);
  }, [soundEnabled, creatorF, joinerF]);

  useEffect(() => {
    if (duel.battleLog.length > lastProcessedTurn && introPhase === null) {
      const latest = duel.battleLog[duel.battleLog.length - 1];
      animateTurn(latest);
      setLastProcessedTurn(duel.battleLog.length);
    }
  }, [duel.battleLog.length, lastProcessedTurn, introPhase, animateTurn]);

  useEffect(() => {
    if (isSettled && lastProcessedTurn > 0) {
      setTimeout(() => {
        if (creatorWon) {
          setLeftAnim("victory");
          setRightAnim("ko");
          if (soundEnabled) { playKOSound(); setTimeout(playVictorySound, 800); }
        } else if (joinerWon) {
          setLeftAnim("ko");
          setRightAnim("victory");
          if (soundEnabled) playKOSound();
        } else {
          setLeftAnim("idle");
          setRightAnim("idle");
          if (soundEnabled) playKOSound();
        }
        setShowKO(true);
        setTimeout(() => setShowResult(true), 1500);
      }, 900);
    }
  }, [isSettled, creatorWon, joinerWon, isDraw, lastProcessedTurn, soundEnabled]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [duel.battleLog.length]);

  const handleMove = (moveId: string) => {
    if (soundEnabled) playMoveSelectSound();
    onMove(moveId);
  };

  return (
    <div className="space-y-2" data-testid="fighter-battle-view">
      <div
        className={`relative rounded-lg overflow-hidden ${stageShake ? "stage-shake-effect" : ""}`}
        style={{
          background: "linear-gradient(180deg, #0a0a0f 0%, #111118 30%, #0d0d14 60%, #080810 100%)",
          minHeight: "340px",
          border: "2px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 50% at 50% 100%, rgba(245,158,11,0.06) 0%, transparent 70%),
              radial-gradient(ellipse 40% 30% at 20% 80%, ${FIGHTER_GLOW_COLORS[creatorF?.icon || "bitcoin"]}15 0%, transparent 70%),
              radial-gradient(ellipse 40% 30% at 80% 80%, ${FIGHTER_GLOW_COLORS[joinerF?.icon || "ethereum"]}15 0%, transparent 70%)`,
          }} />

        <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none"
          style={{ background: "linear-gradient(90deg, rgba(245,158,11,0.3), rgba(255,255,255,0.1) 50%, rgba(239,68,68,0.3))" }} />

        {specialFlash && (
          <div className="absolute inset-0 z-20 pointer-events-none special-bg-flash-effect"
            style={{ background: `radial-gradient(circle at center, ${specialFlash}40 0%, transparent 70%)` }} />
        )}

        <div className="absolute top-2 left-2 right-2 z-10 flex items-start gap-2 sm:gap-3">
          {creatorF && (
            <ArcadeHpBar
              current={duel.creatorHp}
              max={duel.creatorMaxHp}
              name={duel.creatorName}
              side="left"
              color={FIGHTER_HP_COLORS[creatorF.icon] || "from-green-400 to-green-600"}
              level={duel.creatorProfile?.level}
            />
          )}
          <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
            <span className="text-[9px] sm:text-[10px] font-black text-amber-400/80 font-mono"
              style={{ textShadow: "0 0 10px rgba(245,158,11,0.5)" }}
              data-testid="text-turn-counter">
              {Math.min(duel.currentTurn, duel.maxTurns)}/{duel.maxTurns}
            </span>
            <span className="text-[7px] text-white/30 uppercase tracking-widest">TURN</span>
          </div>
          {joinerF && (
            <ArcadeHpBar
              current={duel.joinerHp}
              max={duel.joinerMaxHp}
              name={duel.joinerName}
              side="right"
              color={FIGHTER_HP_COLORS[joinerF.icon] || "from-red-400 to-red-600"}
            />
          )}
        </div>

        {duel.creatorProfile && duel.creatorProfile.level > 1 && (
          <div className="absolute top-12 left-2 z-10">
            <Badge variant="outline" className="text-[8px] text-amber-300 border-amber-500/30 bg-black/50" data-testid="text-battle-level">
              Lv.{duel.creatorProfile.level} {duel.creatorProfile.title}
            </Badge>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 z-20 text-white/40 h-7 w-7"
          onClick={() => setSoundEnabled(!soundEnabled)}
          data-testid="button-toggle-sound"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </Button>

        <div className="relative flex items-end justify-between px-4 sm:px-10 pt-16 sm:pt-20 pb-6 sm:pb-8"
          style={{ minHeight: "280px" }}>
          <div className="flex flex-col items-center" style={{ width: "35%" }}>
            {creatorF && (
              <>
                <FighterSprite
                  fighterId={creatorF.id}
                  side="left"
                  animState={leftAnim}
                  glowColor={FIGHTER_GLOW_COLORS[creatorF.icon] || "rgba(255,255,255,0.3)"}
                />
                <span className="text-[8px] sm:text-[9px] text-white/40 mt-1 font-mono uppercase tracking-widest"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{creatorF.special}</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-center" style={{ width: "30%" }}>
            <div className="text-white/10">
              <Swords className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          </div>

          <div className="flex flex-col items-center" style={{ width: "35%" }}>
            {joinerF && (
              <>
                <FighterSprite
                  fighterId={joinerF.id}
                  side="right"
                  animState={rightAnim}
                  glowColor={FIGHTER_GLOW_COLORS[joinerF.icon] || "rgba(255,255,255,0.3)"}
                />
                <span className="text-[8px] sm:text-[9px] text-white/40 mt-1 font-mono uppercase tracking-widest"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{joinerF.special}</span>
              </>
            )}
          </div>
        </div>

        {effects.map(e => <HitEffect key={e.id} {...e} />)}
        {damages.map(d => <DamagePopup key={d.id} {...d} />)}

        {introPhase === "round" && (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none bg-black/40">
            <div className="round-announce-effect text-center">
              <span className="text-4xl sm:text-6xl font-black text-white uppercase"
                style={{ textShadow: "0 0 30px rgba(245,158,11,0.8), 0 0 60px rgba(245,158,11,0.4), 0 4px 12px rgba(0,0,0,0.8)", letterSpacing: "0.08em" }}>
                ROUND 1
              </span>
            </div>
          </div>
        )}
        {introPhase === "fight" && (
          <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
            <div className="fight-flash-effect">
              <span className="text-5xl sm:text-7xl font-black text-amber-400 uppercase"
                style={{ textShadow: "0 0 40px rgba(245,158,11,0.9), 0 0 80px rgba(245,158,11,0.5), 0 6px 16px rgba(0,0,0,0.9)", letterSpacing: "0.15em" }}>
                FIGHT!
              </span>
            </div>
          </div>
        )}

        {showKO && isSettled && (creatorWon || joinerWon) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/50">
            <div className="ko-text-effect">
              <span className="text-6xl sm:text-8xl font-black text-red-500 uppercase"
                style={{ textShadow: "0 0 40px rgba(239,68,68,0.9), 0 0 80px rgba(239,68,68,0.5), 0 6px 16px rgba(0,0,0,0.9)", letterSpacing: "0.12em" }}>
                K.O.!
              </span>
            </div>
            {showResult && (
              <div className="mt-6 text-center space-y-4 round-announce-effect">
                <p className="text-2xl sm:text-3xl font-black uppercase tracking-wider"
                  style={{
                    color: creatorWon ? "#fbbf24" : "#ef4444",
                    textShadow: `0 0 20px ${creatorWon ? "rgba(251,191,36,0.6)" : "rgba(239,68,68,0.6)"}`,
                  }}>
                  {creatorWon ? `${duel.creatorName} WINS!` : `${duel.joinerName} WINS!`}
                </p>
                {xpResult && (
                  <div className="space-y-2" data-testid="xp-reward-section">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <span className="text-lg font-black text-amber-400" data-testid="text-xp-gained"
                        style={{ textShadow: "0 0 10px rgba(251,191,36,0.5)" }}>
                        +{xpResult.xpGained} XP
                      </span>
                    </div>
                    {xpResult.levelUp && (
                      <div className="flex items-center justify-center gap-2">
                        <Award className="w-5 h-5 text-amber-400 animate-bounce" />
                        <span className="text-sm font-black text-amber-400" data-testid="text-level-up">
                          LEVEL UP! Lv.{xpResult.oldLevel} &rarr; Lv.{xpResult.newLevel}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={onBack} className="border-white/20 text-white" data-testid="button-back-fighter-lobby">
                  <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back to Lobby
                </Button>
              </div>
            )}
          </div>
        )}

        {showKO && isSettled && isDraw && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-40 bg-black/50">
            <div className="round-announce-effect text-center space-y-4">
              <span className="text-4xl sm:text-6xl font-black text-white uppercase"
                style={{ textShadow: "0 0 30px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.8)", letterSpacing: "0.08em" }}>
                DRAW!
              </span>
              {showResult && xpResult && (
                <div className="space-y-2" data-testid="xp-reward-section">
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span className="text-lg font-black text-amber-400" data-testid="text-xp-gained">+{xpResult.xpGained} XP</span>
                  </div>
                </div>
              )}
              {showResult && (
                <Button variant="outline" size="sm" onClick={onBack} className="border-white/20 text-white" data-testid="button-back-fighter-lobby">
                  <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back to Lobby
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {duel.battleLog.length > 0 && (
        <div className="rounded-lg border border-white/10 p-2 sm:p-3"
          style={{ background: "linear-gradient(180deg, rgba(10,10,15,0.9) 0%, rgba(15,15,20,0.95) 100%)" }}>
          <div className="flex items-center gap-2 mb-1.5">
            <Flame className="w-3 h-3 text-orange-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Combat Log</span>
          </div>
          <div className="max-h-20 overflow-y-auto space-y-1">
            {duel.battleLog.map((entry, i) => (
              <div key={i} className="text-[10px] sm:text-xs text-white/60 flex items-start gap-1.5" data-testid={`battle-log-entry-${i}`}>
                <span className="text-amber-400/60 font-mono shrink-0 w-5">T{entry.turn}</span>
                <span className="flex-1">
                  <span className="text-white/80 font-bold">{creatorF?.name?.split(" ")[0]}</span>
                  <span className="mx-0.5 uppercase text-[8px] px-1 py-0.5 rounded bg-white/5 text-amber-400/70">{entry.creatorMove}</span>
                  <span className="text-white/30 mx-0.5">vs</span>
                  <span className="text-white/80 font-bold">{joinerF?.name?.split(" ")[0]}</span>
                  <span className="mx-0.5 uppercase text-[8px] px-1 py-0.5 rounded bg-white/5 text-red-400/70">{entry.joinerMove}</span>
                  {entry.joinerDamage > 0 && <span className="text-red-400 font-bold ml-1">-{entry.joinerDamage}</span>}
                  {entry.creatorDamage > 0 && <span className="text-orange-400 font-bold ml-1">(-{entry.creatorDamage})</span>}
                </span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {!isSettled && introPhase === null && (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {MOVE_INFO.map((m) => (
            <Button
              key={m.id}
              variant="outline"
              className={`flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-2 sm:py-3 ${m.bgColor} border relative`}
              onClick={() => handleMove(m.id)}
              disabled={isPending}
              data-testid={`button-move-${m.id}`}
            >
              <m.icon className={`w-5 h-5 sm:w-7 sm:h-7 ${m.color}`} />
              <span className="text-[9px] sm:text-xs font-black tracking-wider">{m.label}</span>
            </Button>
          ))}
        </div>
      )}

      {isPending && (
        <div className="flex items-center justify-center gap-2 py-1">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <span className="text-[10px] text-white/40 uppercase tracking-widest animate-pulse">Executing...</span>
        </div>
      )}
    </div>
  );
}

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
  const sprite = FIGHTER_SPRITES[fighter.id];

  return (
    <Card
      className={`cursor-pointer transition-all ${selected ? "ring-2 ring-amber-400 bg-amber-500/10" : "hover-elevate"} ${disabled ? "opacity-50 pointer-events-none" : ""}`}
      onClick={onClick}
      data-testid={`fighter-card-${fighter.id}`}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {sprite ? (
            <img src={sprite} alt={fighter.name} className="w-12 h-12 object-contain rounded-md" />
          ) : (
            <div className={`w-12 h-12 rounded-md bg-gradient-to-br ${FIGHTER_BG[fighter.icon] || "from-gray-500/20 to-gray-600/5"} flex items-center justify-center`}>
              <span className={`text-lg font-bold ${FIGHTER_COLORS[fighter.icon] || "text-foreground"}`}>{fighter.type.slice(0, 3)}</span>
            </div>
          )}
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

function FighterSelectScreen({ fighters, onSelect, profile }: { fighters: Fighter[]; onSelect: (id: string) => void; profile?: FighterProfile | null }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-4" data-testid="fighter-select-screen">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold uppercase tracking-wider">Choose Your Fighter</h3>
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
    <div className="space-y-2">
      {duel.status !== "settled" && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBackToLobby} data-testid="button-back-fighter-lobby">
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Forfeit
          </Button>
        </div>
      )}
      <BattleView
        duel={duel}
        onMove={(m) => moveMutation.mutate(m)}
        isPending={moveMutation.isPending}
        xpResult={lastXpResult}
        onBack={handleBackToLobby}
      />
    </div>
  );
}
