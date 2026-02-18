import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import { useAccount, useSignMessage, useChainId } from "wagmi";
import { parseEther } from "viem";
import {
  useCreateDuel,
  useJoinDuel,
  useSettleDuel,
  useCancelDuel,
  useGetAgentByOwner,
  useRegisterAgent,
  usePredictDuelAddress,
} from "@/contracts/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Trophy,
  Plus,
  Users,
  Loader2,
  Zap,
  Target,
  DollarSign,
  ArrowUp,
  ArrowDown,
  X,
  Swords,
  Crown,
  Timer,
  Activity,
  Flame,
  XCircle,
  Shield,
  Crosshair,
  Skull,
  Star,
  ChevronRight,
  Bot,
  Cpu,
  Search,
  ChevronDown,
  Repeat2,
  BarChart3,
  Medal,
  Share2,
  Eye,
  Copy,
  Brain,
  Gamepad2,
  ArrowLeft,
  Volume2,
  VolumeX,
  Sparkles,
  Hash,
  Gauge,
} from "lucide-react";
import type { TradingDuel, TradingPosition } from "@shared/schema";
import { ArenaChat } from "@/components/arena-chat";
import arenaTradingImg from "../assets/images/arena-trading.png";
import arenaPredictImg from "../assets/images/arena-predict.png";
import arenaTriviaImg from "../assets/images/arena-trivia.png";
import arenaFighterImg from "../assets/images/arena-fighter.png";
import arenaGamehubImg from "../assets/images/arena-gamehub.png";
import arenaRunnerImg from "../assets/images/arena-runner.png";
import arenaNfaTunnelImg from "../assets/images/arena-nfa-tunnel.png";

const LazyPredict = lazy(() => import("@/pages/predict"));
const LazyTrivia = lazy(() => import("@/pages/trivia-battle"));
const LazyFighter = lazy(() => import("@/pages/fighter-battle"));
const LazyGameHub = lazy(() => import("@/pages/game-hub"));
const LazyHoneyRunner = lazy(() => import("@/pages/honey-runner"));
const LazyNfaTunnelDash = lazy(() => import("@/pages/nfa-tunnel-dash"));

function PredictContent() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
        <p className="text-sm text-muted-foreground">Loading Predict Duel...</p>
      </div>
    }>
      <LazyPredict />
    </Suspense>
  );
}

function TriviaContent() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        <p className="text-sm text-muted-foreground">Loading Trivia Battle...</p>
      </div>
    }>
      <LazyTrivia />
    </Suspense>
  );
}

function FighterContent() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-red-400" />
        <p className="text-sm text-muted-foreground">Loading Crypto Fighters...</p>
      </div>
    }>
      <LazyFighter />
    </Suspense>
  );
}

function GameHubContent() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-green-400" />
        <p className="text-sm text-muted-foreground">Loading Game Hub...</p>
      </div>
    }>
      <LazyGameHub />
    </Suspense>
  );
}

function HoneyRunnerContent() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
        <p className="text-sm text-muted-foreground">Loading HoneyRunner...</p>
      </div>
    }>
      <LazyHoneyRunner />
    </Suspense>
  );
}

function NfaTunnelDashContent() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <p className="text-sm text-muted-foreground">Loading NFA Tunnel Dash...</p>
      </div>
    }>
      <LazyNfaTunnelDash />
    </Suspense>
  );
}

const ASSETS = [
  { symbol: "BTCUSDT", name: "Bitcoin", short: "BTC" },
  { symbol: "ETHUSDT", name: "Ethereum", short: "ETH" },
  { symbol: "BNBUSDT", name: "BNB", short: "BNB" },
  { symbol: "SOLUSDT", name: "Solana", short: "SOL" },
  { symbol: "XRPUSDT", name: "XRP", short: "XRP" },
  { symbol: "DOGEUSDT", name: "Dogecoin", short: "DOGE" },
  { symbol: "ADAUSDT", name: "Cardano", short: "ADA" },
  { symbol: "AVAXUSDT", name: "Avalanche", short: "AVAX" },
  { symbol: "DOTUSDT", name: "Polkadot", short: "DOT" },
  { symbol: "LINKUSDT", name: "Chainlink", short: "LINK" },
  { symbol: "MATICUSDT", name: "Polygon", short: "MATIC" },
  { symbol: "SHIBUSDT", name: "Shiba Inu", short: "SHIB" },
  { symbol: "LTCUSDT", name: "Litecoin", short: "LTC" },
  { symbol: "UNIUSDT", name: "Uniswap", short: "UNI" },
  { symbol: "ATOMUSDT", name: "Cosmos", short: "ATOM" },
  { symbol: "XLMUSDT", name: "Stellar", short: "XLM" },
  { symbol: "ETCUSDT", name: "Ethereum Classic", short: "ETC" },
  { symbol: "FILUSDT", name: "Filecoin", short: "FIL" },
  { symbol: "APTUSDT", name: "Aptos", short: "APT" },
  { symbol: "NEARUSDT", name: "NEAR Protocol", short: "NEAR" },
  { symbol: "AAVEUSDT", name: "Aave", short: "AAVE" },
  { symbol: "GRTUSDT", name: "The Graph", short: "GRT" },
  { symbol: "ALGOUSDT", name: "Algorand", short: "ALGO" },
  { symbol: "FTMUSDT", name: "Fantom", short: "FTM" },
  { symbol: "SANDUSDT", name: "The Sandbox", short: "SAND" },
  { symbol: "MANAUSDT", name: "Decentraland", short: "MANA" },
  { symbol: "AXSUSDT", name: "Axie Infinity", short: "AXS" },
  { symbol: "THETAUSDT", name: "Theta Network", short: "THETA" },
  { symbol: "EOSUSDT", name: "EOS", short: "EOS" },
  { symbol: "ARUSDT", name: "Arweave", short: "AR" },
  { symbol: "ICPUSDT", name: "Internet Computer", short: "ICP" },
  { symbol: "VETUSDT", name: "VeChain", short: "VET" },
  { symbol: "FLOWUSDT", name: "Flow", short: "FLOW" },
  { symbol: "RUNEUSDT", name: "THORChain", short: "RUNE" },
  { symbol: "INJUSDT", name: "Injective", short: "INJ" },
  { symbol: "SUIUSDT", name: "Sui", short: "SUI" },
  { symbol: "SEIUSDT", name: "Sei", short: "SEI" },
  { symbol: "TIAUSDT", name: "Celestia", short: "TIA" },
  { symbol: "OPUSDT", name: "Optimism", short: "OP" },
  { symbol: "ARBUSDT", name: "Arbitrum", short: "ARB" },
  { symbol: "MKRUSDT", name: "Maker", short: "MKR" },
  { symbol: "SNXUSDT", name: "Synthetix", short: "SNX" },
  { symbol: "COMPUSDT", name: "Compound", short: "COMP" },
  { symbol: "CRVUSDT", name: "Curve DAO", short: "CRV" },
  { symbol: "LDOUSDT", name: "Lido DAO", short: "LDO" },
  { symbol: "APEUSDT", name: "ApeCoin", short: "APE" },
  { symbol: "DYDXUSDT", name: "dYdX", short: "DYDX" },
  { symbol: "GMXUSDT", name: "GMX", short: "GMX" },
  { symbol: "LRCUSDT", name: "Loopring", short: "LRC" },
  { symbol: "ENJUSDT", name: "Enjin Coin", short: "ENJ" },
  { symbol: "CHZUSDT", name: "Chiliz", short: "CHZ" },
  { symbol: "GALAUSDT", name: "Gala", short: "GALA" },
  { symbol: "IMXUSDT", name: "Immutable X", short: "IMX" },
  { symbol: "1INCHUSDT", name: "1inch", short: "1INCH" },
  { symbol: "CELOUSDT", name: "Celo", short: "CELO" },
  { symbol: "ZRXUSDT", name: "0x", short: "ZRX" },
  { symbol: "BATUSDT", name: "Basic Attention", short: "BAT" },
  { symbol: "ANKRUSDT", name: "Ankr", short: "ANKR" },
  { symbol: "SKLUSDT", name: "SKALE", short: "SKL" },
  { symbol: "COTIUSDT", name: "COTI", short: "COTI" },
  { symbol: "STORJUSDT", name: "Storj", short: "STORJ" },
  { symbol: "IOTAUSDT", name: "IOTA", short: "IOTA" },
  { symbol: "KAVAUSDT", name: "Kava", short: "KAVA" },
  { symbol: "WOOUSDT", name: "WOO Network", short: "WOO" },
  { symbol: "ZILUSDT", name: "Zilliqa", short: "ZIL" },
  { symbol: "ONEUSDT", name: "Harmony", short: "ONE" },
  { symbol: "HOTUSDT", name: "Holo", short: "HOT" },
  { symbol: "ONTUSDT", name: "Ontology", short: "ONT" },
  { symbol: "IOSTUSDT", name: "IOST", short: "IOST" },
  { symbol: "RVNUSDT", name: "Ravencoin", short: "RVN" },
  { symbol: "ZENUSDT", name: "Horizen", short: "ZEN" },
  { symbol: "XTZUSDT", name: "Tezos", short: "XTZ" },
  { symbol: "DASHUSDT", name: "Dash", short: "DASH" },
  { symbol: "NEOUSDT", name: "NEO", short: "NEO" },
  { symbol: "WAVESUSDT", name: "Waves", short: "WAVES" },
  { symbol: "QTUMUSDT", name: "Qtum", short: "QTUM" },
  { symbol: "ZECUSDT", name: "Zcash", short: "ZEC" },
  { symbol: "SXPUSDT", name: "Solar", short: "SXP" },
  { symbol: "KSMUSDT", name: "Kusama", short: "KSM" },
  { symbol: "YFIUSDT", name: "yearn.finance", short: "YFI" },
  { symbol: "BAKEUSDT", name: "BakeryToken", short: "BAKE" },
  { symbol: "CAKEUSDT", name: "PancakeSwap", short: "CAKE" },
  { symbol: "TRXUSDT", name: "TRON", short: "TRX" },
  { symbol: "PEPEUSDT", name: "Pepe", short: "PEPE" },
  { symbol: "WLDUSDT", name: "Worldcoin", short: "WLD" },
  { symbol: "FETUSDT", name: "Fetch.ai", short: "FET" },
  { symbol: "RENDERUSDT", name: "Render", short: "RENDER" },
  { symbol: "PENDLEUSDT", name: "Pendle", short: "PENDLE" },
  { symbol: "JUPUSDT", name: "Jupiter", short: "JUP" },
  { symbol: "STXUSDT", name: "Stacks", short: "STX" },
  { symbol: "WIFUSDT", name: "dogwifhat", short: "WIF" },
  { symbol: "ONDOUSDT", name: "Ondo", short: "ONDO" },
  { symbol: "PYTHUSDT", name: "Pyth Network", short: "PYTH" },
  { symbol: "BONKUSDT", name: "Bonk", short: "BONK" },
  { symbol: "FLOKIUSDT", name: "Floki", short: "FLOKI" },
  { symbol: "ORDIUSDT", name: "ORDI", short: "ORDI" },
  { symbol: "BCHUSDT", name: "Bitcoin Cash", short: "BCH" },
  { symbol: "HBARUSDT", name: "Hedera", short: "HBAR" },
];

const DURATIONS = [
  { value: 120, label: "2 min" },
  { value: 300, label: "5 min" },
  { value: 600, label: "10 min" },
  { value: 900, label: "15 min" },
];

const audioCtxRef = { current: null as AudioContext | null };
function getAudioCtx(): AudioContext {
  if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
  if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
  return audioCtxRef.current;
}

function tone(ctx: AudioContext, freq: number, type: OscillatorType, vol: number, start: number, dur: number, endFreq?: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, start + dur * 0.8);
  g.gain.setValueAtTime(vol, start);
  g.gain.setValueAtTime(vol * 0.9, start + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.001, start + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(start);
  o.stop(start + dur);
}

function chip(ctx: AudioContext, freq: number, start: number, vol = 0.06) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, start);
  o.frequency.exponentialRampToValueAtTime(freq * 0.65, start + 0.12);
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.001, start + 0.12);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(start);
  o.stop(start + 0.12);
}

function chips(ctx: AudioContext, t: number, count: number, delay: number) {
  for (let i = 0; i < count; i++) {
    const d = delay + i * (0.035 + Math.random() * 0.025);
    chip(ctx, 4000 + Math.random() * 5000, t + d, 0.04 + Math.random() * 0.03);
  }
}

function playTradeSound(type: "open" | "close" | "victory" | "defeat" | "tick" | "countdown" | "start" | "leadchange" | "streak" | "profit") {
  try {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;

    if (type === "open") {
      tone(ctx, 220, "sine", 0.18, t, 0.06);
      tone(ctx, 660, "triangle", 0.14, t + 0.02, 0.08);
      tone(ctx, 880, "sine", 0.16, t + 0.04, 0.12, 1320);
      tone(ctx, 1320, "sine", 0.10, t + 0.08, 0.15, 1760);
      tone(ctx, 60, "sine", 0.20, t, 0.08);
      chips(ctx, t, 4, 0.06);
    } else if (type === "close") {
      tone(ctx, 880, "sine", 0.15, t, 0.1, 440);
      tone(ctx, 660, "triangle", 0.12, t + 0.03, 0.1, 330);
      tone(ctx, 440, "sine", 0.10, t + 0.06, 0.15, 220);
      tone(ctx, 80, "sine", 0.18, t, 0.06);
      chips(ctx, t, 3, 0.08);
    } else if (type === "victory") {
      const notes = [523, 659, 784, 1047, 1319, 1568, 2093];
      notes.forEach((freq, i) => {
        tone(ctx, freq, "sine", 0.16 - i * 0.01, t + i * 0.1, 0.45);
        if (i > 2) tone(ctx, freq * 1.5, "triangle", 0.06, t + i * 0.1 + 0.02, 0.3);
      });
      tone(ctx, 130, "sine", 0.15, t, 0.12);
      tone(ctx, 65, "sine", 0.12, t + 0.05, 0.1);
      chips(ctx, t, 8, 0.3);
      chips(ctx, t, 12, 0.7);
      chips(ctx, t, 10, 1.1);
      chips(ctx, t, 6, 1.5);
      tone(ctx, 3520, "sine", 0.08, t + 0.6, 1.2);
      tone(ctx, 4186, "sine", 0.05, t + 0.8, 0.8);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(2093, t + 0.7);
      g.gain.setValueAtTime(0.1, t + 0.7);
      g.gain.setValueAtTime(0.08, t + 1.0);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t + 0.7);
      o.stop(t + 2.2);
    } else if (type === "defeat") {
      tone(ctx, 440, "sawtooth", 0.07, t, 0.3, 220);
      tone(ctx, 330, "sine", 0.08, t + 0.1, 0.35, 165);
      tone(ctx, 220, "sine", 0.06, t + 0.3, 0.4, 110);
      tone(ctx, 55, "square", 0.05, t + 0.1, 0.4);
    } else if (type === "tick") {
      tone(ctx, 3200 + Math.random() * 600, "sine", 0.04, t, 0.025);
    } else if (type === "countdown") {
      tone(ctx, 1760, "sine", 0.14, t, 0.2);
      tone(ctx, 880, "sine", 0.08, t, 0.12);
      tone(ctx, 3520, "sine", 0.04, t + 0.01, 0.03);
    } else if (type === "start") {
      [330, 440, 554, 659, 880].forEach((freq, i) => {
        tone(ctx, freq, i < 3 ? "square" : "sine", 0.12, t + i * 0.07, 0.18);
      });
      tone(ctx, 220, "sawtooth", 0.06, t + 0.3, 0.2, 440);
      tone(ctx, 100, "sine", 0.15, t, 0.1);
      chips(ctx, t, 6, 0.35);
    } else if (type === "leadchange") {
      tone(ctx, 1200, "sine", 0.12, t, 0.08, 2000);
      tone(ctx, 2000, "sine", 0.10, t + 0.06, 0.08, 1200);
      tone(ctx, 1600, "triangle", 0.08, t + 0.12, 0.1, 2400);
      tone(ctx, 80, "sine", 0.14, t, 0.1, 40);
    } else if (type === "streak") {
      [880, 1047, 1319, 1568, 2093].forEach((freq, i) => {
        tone(ctx, freq, "sine", 0.10, t + i * 0.05, 0.25);
      });
      tone(ctx, 100, "sine", 0.12, t, 0.08);
      chips(ctx, t, 8, 0.2);
    } else if (type === "profit") {
      tone(ctx, 1047, "sine", 0.10, t, 0.08, 1568);
      tone(ctx, 1568, "sine", 0.08, t + 0.05, 0.1, 2093);
      tone(ctx, 80, "sine", 0.12, t, 0.05);
      chips(ctx, t, 3, 0.06);
    }
  } catch {}
}

function formatMoney(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : "";
  if (abs >= 1000000) return `${sign}$${(abs / 1000000).toFixed(2)}M`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function ArenaBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(245,158,11,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.4) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          animation: "arena-grid-scroll 4s linear infinite",
        }}
      />
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)",
          animation: "arena-glow-pulse 4s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)",
          animation: "arena-glow-pulse 5s 1s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-1/3 right-1/3 w-32 h-32 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(239,68,68,0.05) 0%, transparent 70%)",
          animation: "arena-glow-pulse 6s 2s ease-in-out infinite",
        }}
      />
    </div>
  );
}

function ConfettiExplosion() {
  const colors = ["#f59e0b", "#22c55e", "#3b82f6", "#ef4444", "#a855f7", "#ec4899"];
  const particles = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * 360;
    const distance = 40 + Math.random() * 60;
    const x = Math.cos((angle * Math.PI) / 180) * distance;
    const y = Math.sin((angle * Math.PI) / 180) * distance;
    const color = colors[i % colors.length];
    const size = 4 + Math.random() * 6;
    const delay = Math.random() * 0.3;
    return { x, y, color, size, delay, angle };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible" aria-hidden="true">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: i % 3 === 0 ? "50%" : i % 3 === 1 ? "2px" : "0",
            transform: `translate(${p.x}px, ${p.y}px)`,
            animation: `arena-confetti 1.5s ${p.delay}s ease-out both`,
          }}
        />
      ))}
    </div>
  );
}

function CountdownTimer({ endsAt, onExpired }: { endsAt: string; onExpired?: () => void }) {
  const [timeLeft, setTimeLeft] = useState(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const end = new Date(endsAt).getTime();
      const left = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(prev => {
        if (prev !== left && left <= 10 && left > 0) playTradeSound("countdown");
        return left;
      });
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpired?.();
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpired]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isUrgent = timeLeft < 30;
  const totalSeconds = timeLeft;
  const progress = Math.min(100, (totalSeconds / 900) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
          <circle
            cx="22" cy="22" r="18" fill="none"
            stroke={isUrgent ? "#ef4444" : "#f59e0b"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 18}`}
            strokeDashoffset={`${2 * Math.PI * 18 * (1 - progress / 100)}`}
            className="transition-all duration-1000"
            style={isUrgent ? { filter: "drop-shadow(0 0 4px rgba(239,68,68,0.5))" } : {}}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Timer className={`w-4 h-4 ${isUrgent ? "text-red-500" : "text-amber-400"}`} />
        </div>
      </div>
      <div
        className={`font-mono text-2xl font-bold tracking-wider ${isUrgent ? "text-red-500" : "text-amber-400"}`}
        style={isUrgent ? { animation: "arena-count-pulse 1s ease-in-out infinite" } : {}}
      >
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </div>
    </div>
  );
}

interface TradeMarker {
  time: number;
  price: number;
  side: "long" | "short";
  action: "open" | "close";
  leverage?: number;
  pnl?: number;
}

function LiveLineChart({
  priceTicks,
  width = 600,
  height = 300,
  tradeMarkers = [],
  openPositions = [],
  currentPrice,
}: {
  priceTicks: { time: number; price: number }[];
  width?: number;
  height?: number;
  tradeMarkers?: TradeMarker[];
  openPositions?: { side: string; entryPrice: string; leverage: number }[];
  currentPrice?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pulseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    let running = true;
    const render = () => {
      if (!running) return;
      pulseRef.current = (pulseRef.current + 0.05) % (Math.PI * 2);
      const pulse = Math.sin(pulseRef.current) * 0.5 + 0.5;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = "#080a0e";
      ctx.fillRect(0, 0, width, height);

      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
      bgGrad.addColorStop(0, "rgba(245,158,11,0.015)");
      bgGrad.addColorStop(1, "transparent");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      for (let y = 0; y < height; y += 3) {
        ctx.fillStyle = `rgba(0,0,0,${0.08 + Math.sin(y * 0.1 + pulseRef.current * 2) * 0.03})`;
        ctx.fillRect(0, y, width, 1);
      }

      if (priceTicks.length < 2) {
        ctx.fillStyle = "rgba(245,158,11,0.4)";
        ctx.font = "bold 13px monospace";
        ctx.textAlign = "center";
        ctx.fillText("INITIALIZING PRICE FEED...", width / 2, height / 2 - 10);
        ctx.fillStyle = "rgba(245,158,11,0.2)";
        ctx.font = "10px monospace";
        ctx.fillText("CONNECTING TO EXCHANGE", width / 2, height / 2 + 10);
        ctx.textAlign = "start";
        return;
      }

      const padding = { top: 20, right: 70, bottom: 30, left: 10 };
      const chartW = width - padding.left - padding.right;
      const chartH = height - padding.top - padding.bottom;

      const prices = priceTicks.map(t => t.price);
      const allPrices = [...prices];
      if (currentPrice) allPrices.push(currentPrice);
      openPositions.forEach(p => {
        const ep = parseFloat(p.entryPrice);
        if (!isNaN(ep)) allPrices.push(ep);
      });
      tradeMarkers.forEach(m => {
        if (!isNaN(m.price)) allPrices.push(m.price);
      });

      let minP = Math.min(...allPrices);
      let maxP = Math.max(...allPrices);
      const pRange = maxP - minP || 1;
      minP -= pRange * 0.05;
      maxP += pRange * 0.05;
      const range = maxP - minP;

      const toX = (i: number) => padding.left + (i / (priceTicks.length - 1)) * chartW;
      const toY = (p: number) => padding.top + ((maxP - p) / range) * chartH;

      const gridLines = 5;
      ctx.font = "10px monospace";
      for (let i = 0; i <= gridLines; i++) {
        const y = padding.top + (chartH / gridLines) * i;
        ctx.strokeStyle = "rgba(245,158,11,0.06)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
        ctx.setLineDash([]);
        const price = maxP - (range / gridLines) * i;
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        ctx.fillText(formatPrice(price), width - padding.right + 6, y + 3);
      }

      for (let x = padding.left; x < width - padding.right; x += 80) {
        ctx.strokeStyle = "rgba(245,158,11,0.03)";
        ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartH);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const firstPrice = priceTicks[0].price;
      const lastPrice = currentPrice || priceTicks[priceTicks.length - 1].price;
      const isUp = lastPrice >= firstPrice;
      const lineColor = isUp ? "#0ecb81" : "#ea3943";
      const glowColor = isUp ? "rgba(14,203,129," : "rgba(234,57,67,";

      const grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
      grad.addColorStop(0, glowColor + "0.25)");
      grad.addColorStop(0.5, glowColor + "0.08)");
      grad.addColorStop(1, glowColor + "0.0)");

      ctx.beginPath();
      ctx.moveTo(toX(0), toY(priceTicks[0].price));
      for (let i = 1; i < priceTicks.length; i++) {
        const x0 = toX(i - 1), y0 = toY(priceTicks[i - 1].price);
        const x1 = toX(i), y1 = toY(priceTicks[i].price);
        const cx = (x0 + x1) / 2;
        ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
      }
      const lastX = toX(priceTicks.length - 1);
      const lastY = toY(priceTicks[priceTicks.length - 1].price);

      ctx.lineTo(lastX, padding.top + chartH);
      ctx.lineTo(toX(0), padding.top + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.save();
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 12 + pulse * 8;
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(priceTicks[0].price));
      for (let i = 1; i < priceTicks.length; i++) {
        const x0 = toX(i - 1), y0 = toY(priceTicks[i - 1].price);
        const x1 = toX(i), y1 = toY(priceTicks[i].price);
        const cx = (x0 + x1) / 2;
        ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
      }
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.3 + pulse * 0.15;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(toX(0), toY(priceTicks[0].price));
      for (let i = 1; i < priceTicks.length; i++) {
        const x0 = toX(i - 1), y0 = toY(priceTicks[i - 1].price);
        const x1 = toX(i), y1 = toY(priceTicks[i].price);
        const cx = (x0 + x1) / 2;
        ctx.bezierCurveTo(cx, y0, cx, y1, x1, y1);
      }
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();

      const dotRadius = 5 + pulse * 3;
      ctx.save();
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 15 + pulse * 10;
      ctx.beginPath();
      ctx.arc(lastX, lastY, dotRadius, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();
      ctx.restore();

      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.arc(lastX, lastY, dotRadius + r * 6 + pulse * r * 2, 0, Math.PI * 2);
        ctx.strokeStyle = glowColor + (0.15 / r) + ")";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      openPositions.forEach(pos => {
        const entryPx = parseFloat(pos.entryPrice);
        const ey = toY(entryPx);
        const isLong = pos.side === "long";
        const posColor = isLong ? "#0ecb81" : "#ea3943";

        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = posColor;
        ctx.globalAlpha = 0.7 + pulse * 0.2;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = posColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(padding.left, ey);
        ctx.lineTo(width - padding.right, ey);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        const pnlZoneTop = Math.min(ey, lastY);
        const pnlZoneBot = Math.max(ey, lastY);
        const isProfitable = isLong ? lastY < ey : lastY > ey;
        const zoneGrad = ctx.createLinearGradient(0, pnlZoneTop, 0, pnlZoneBot);
        const zoneColor = isProfitable ? "rgba(14,203,129," : "rgba(234,57,67,";
        zoneGrad.addColorStop(0, zoneColor + "0.18)");
        zoneGrad.addColorStop(1, zoneColor + "0.03)");
        ctx.fillStyle = zoneGrad;
        ctx.fillRect(padding.left, pnlZoneTop, lastX - padding.left, pnlZoneBot - pnlZoneTop);

        const cp = currentPrice || 0;
        const pnlPct = cp > 0 && entryPx > 0
          ? (isLong
            ? ((cp - entryPx) / entryPx * 100 * pos.leverage)
            : ((entryPx - cp) / entryPx * 100 * pos.leverage))
          : 0;
        const pnlStr = `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(1)}%`;

        const lbl = `${isLong ? "LONG" : "SHORT"} ${pos.leverage}x  $${formatPrice(entryPx)}`;
        ctx.font = "bold 10px monospace";
        const tw = ctx.measureText(lbl).width + 14;
        const pnlTw = ctx.measureText(pnlStr).width + 10;

        ctx.save();
        ctx.shadowColor = posColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = posColor;
        const ly = ey - 14;
        ctx.beginPath();
        ctx.roundRect(padding.left + 4, ly - 10, tw, 20, 4);
        ctx.fill();
        ctx.fillStyle = "#0b0e11";
        ctx.font = "bold 10px monospace";
        ctx.fillText(lbl, padding.left + 11, ly + 4);
        ctx.restore();

        ctx.save();
        ctx.shadowColor = isProfitable ? "#0ecb81" : "#ea3943";
        ctx.shadowBlur = 8;
        ctx.fillStyle = isProfitable ? "#0ecb81" : "#ea3943";
        ctx.beginPath();
        ctx.roundRect(padding.left + tw + 10, ly - 10, pnlTw, 20, 4);
        ctx.fill();
        ctx.fillStyle = "#0b0e11";
        ctx.font = "bold 10px monospace";
        ctx.fillText(pnlStr, padding.left + tw + 15, ly + 4);
        ctx.restore();

        ctx.save();
        ctx.fillStyle = posColor;
        ctx.shadowColor = posColor;
        ctx.shadowBlur = 10 + pulse * 6;
        ctx.beginPath();
        ctx.arc(padding.left + 2, ey, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const rightLblW = 58;
        const rightLblH = 18;
        ctx.save();
        ctx.shadowColor = posColor;
        ctx.shadowBlur = 6;
        ctx.fillStyle = posColor;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(width - padding.right, ey);
        ctx.lineTo(width - padding.right + 5, ey - rightLblH / 2);
        ctx.lineTo(width - padding.right + 5 + rightLblW, ey - rightLblH / 2);
        ctx.lineTo(width - padding.right + 5 + rightLblW, ey + rightLblH / 2);
        ctx.lineTo(width - padding.right + 5, ey + rightLblH / 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#0b0e11";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(formatPrice(entryPx), width - padding.right + 5 + rightLblW / 2, ey + 3);
        ctx.textAlign = "start";
        ctx.restore();
      });

      const startTime = priceTicks[0].time;
      const endTime = priceTicks[priceTicks.length - 1].time;
      const timeSpan = endTime - startTime || 1;

      tradeMarkers.forEach(marker => {
        const tFrac = (marker.time - startTime) / timeSpan;
        const mx = padding.left + tFrac * chartW;
        const my = toY(marker.price);

        if (mx < padding.left || mx > padding.left + chartW) return;

        const isOpen = marker.action === "open";
        const isLong = marker.side === "long";
        const mColor = isLong ? "#0ecb81" : "#ea3943";

        ctx.save();
        ctx.shadowColor = mColor;
        ctx.shadowBlur = 12;

        if (isOpen) {
          const sz = 10;
          ctx.fillStyle = mColor;
          ctx.beginPath();
          if (isLong) {
            ctx.moveTo(mx, my - sz);
            ctx.lineTo(mx + sz * 0.75, my + sz * 0.5);
            ctx.lineTo(mx - sz * 0.75, my + sz * 0.5);
          } else {
            ctx.moveTo(mx, my + sz);
            ctx.lineTo(mx + sz * 0.75, my - sz * 0.5);
            ctx.lineTo(mx - sz * 0.75, my - sz * 0.5);
          }
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = mColor;
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          const lbl = `${isLong ? "BUY" : "SELL"} ${marker.leverage || ""}x`;
          const prLbl = `$${formatPrice(marker.price)}`;
          const lblY = isLong ? my + sz + 13 : my - sz - 6;
          ctx.fillText(lbl, mx, lblY);
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = "9px monospace";
          ctx.fillText(prLbl, mx, lblY + 11);
          ctx.textAlign = "start";
        } else {
          ctx.beginPath();
          ctx.arc(mx, my, 7, 0, Math.PI * 2);
          ctx.fillStyle = "#0b0e11";
          ctx.fill();
          ctx.strokeStyle = mColor;
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.fillStyle = mColor;
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("X", mx, my + 3.5);
          ctx.textAlign = "start";

          if (marker.pnl !== undefined) {
            const pnlStr = (marker.pnl >= 0 ? "+" : "") + formatMoney(marker.pnl);
            const pnlBg = marker.pnl >= 0 ? "#0ecb81" : "#ea3943";
            ctx.font = "bold 10px monospace";
            const pw = ctx.measureText(pnlStr).width + 8;
            ctx.fillStyle = pnlBg;
            ctx.globalAlpha = 0.9;
            ctx.beginPath();
            ctx.roundRect(mx - pw / 2, my - 24, pw, 16, 3);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#0b0e11";
            ctx.textAlign = "center";
            ctx.fillText(pnlStr, mx, my - 12);
            ctx.textAlign = "start";
          }
        }
        ctx.restore();
      });

      const liveP = currentPrice || priceTicks[priceTicks.length - 1].price;
      const liveY = toY(liveP);
      const isLiveUp = liveP >= firstPrice;
      const lblBg = isLiveUp ? "#0ecb81" : "#ea3943";

      ctx.setLineDash([1, 4]);
      ctx.strokeStyle = lblBg;
      ctx.globalAlpha = 0.3 + pulse * 0.1;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, liveY);
      ctx.lineTo(width - padding.right, liveY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      const lblW = 66;
      const lblH = 22;
      ctx.save();
      ctx.shadowColor = lblBg;
      ctx.shadowBlur = 8;
      ctx.fillStyle = lblBg;
      ctx.beginPath();
      ctx.moveTo(width - padding.right, liveY);
      ctx.lineTo(width - padding.right + 6, liveY - lblH / 2);
      ctx.lineTo(width - padding.right + 6 + lblW, liveY - lblH / 2);
      ctx.lineTo(width - padding.right + 6 + lblW, liveY + lblH / 2);
      ctx.lineTo(width - padding.right + 6, liveY + lblH / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(formatPrice(liveP), width - padding.right + 6 + lblW / 2, liveY + 4);
      ctx.textAlign = "start";

      ctx.fillStyle = "rgba(245,158,11,0.15)";
      ctx.font = "bold 9px monospace";
      ctx.fillText("LIVE", padding.left + 4, height - 18);

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "9px monospace";
      ctx.fillText(`${mins}m ${secs}s`, padding.left + 4, height - 6);

      const now = new Date();
      ctx.fillText(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), width - padding.right - 60, height - 6);

      const tickCount2 = priceTicks.length;
      ctx.fillStyle = "rgba(245,158,11,0.12)";
      ctx.fillText(`${tickCount2} ticks`, width / 2 - 20, height - 6);

    };

    render();
    const interval = setInterval(render, 33);
    return () => {
      running = false;
      clearInterval(interval);
    };
  }, [priceTicks, width, height, currentPrice, tradeMarkers, openPositions]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, background: "#0b0e11" }}
      className="rounded-md"
      data-testid="chart-canvas"
    />
  );
}

function StatBadge({ icon: Icon, label, value, color = "amber" }: { icon: any; label: string; value: string; color?: string }) {
  const colorMap: Record<string, string> = {
    amber: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/20",
    green: "from-green-500/20 to-green-500/5 text-green-400 border-green-500/20",
    red: "from-red-500/20 to-red-500/5 text-red-400 border-red-500/20",
    blue: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/20",
  };
  return (
    <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border bg-gradient-to-r ${colorMap[color]}`}>
      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-xs sm:text-sm font-bold font-mono whitespace-nowrap">{value}</p>
      </div>
    </div>
  );
}

function CreateDuelPanel({ onCreated }: { onCreated: () => void }) {
  const { agent, authenticate, isAuthenticating } = useAuth();
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [asset, setAsset] = useState("BTCUSDT");
  const [duration, setDuration] = useState("300");
  const [potAmount, setPotAmount] = useState("0.01");
  const [mode, setMode] = useState<"practice" | "pvp" | "ava">("practice");
  const [botDifficulty, setBotDifficulty] = useState<"easy" | "normal" | "degen">("normal");
  const [botStrategy, setBotStrategy] = useState<"momentum" | "mean_reversion">("momentum");
  const [tokenSearch, setTokenSearch] = useState("");
  const [tokenDropOpen, setTokenDropOpen] = useState(false);
  const tokenDropRef = useRef<HTMLDivElement>(null);
  const [pvpCreating, setPvpCreating] = useState(false);

  const { data: onChainAgentId, refetch: refetchAgentId } = useGetAgentByOwner(address as `0x${string}`);
  const hasAgent = onChainAgentId && onChainAgentId > BigInt(0);
  const {
    registerAgent,
    isPending: isRegistering,
    isConfirming: isRegConfirming,
    isSuccess: regSuccess,
    hash: regHash,
  } = useRegisterAgent();

  const {
    createDuel: contractCreateDuel,
    hash: createHash,
    isPending: isCreatePending,
    isConfirming: isCreateConfirming,
    isSuccess: createSuccess,
    error: createError,
    receipt: createReceipt,
  } = useCreateDuel();

  const predictDuelAddress = usePredictDuelAddress();

  useEffect(() => {
    if (regSuccess && regHash) {
      toast({ title: "Agent registered on-chain!" });
      refetchAgentId();
    }
  }, [regSuccess, regHash]);

  useEffect(() => {
    if (createSuccess && createHash && createReceipt) {
      const logs = createReceipt.logs;
      let onChainDuelId: string | null = null;
      const DUEL_CREATED_TOPIC = "0x688046adaf759d2e556524bfd3f6b4f0728f2dd2c03078bccb42c67a77740cb1";
      for (const log of logs) {
        if (
          log.address?.toLowerCase() === predictDuelAddress?.toLowerCase() &&
          log.topics?.[0]?.toLowerCase() === DUEL_CREATED_TOPIC &&
          log.topics?.[1]
        ) {
          try {
            onChainDuelId = BigInt(log.topics[1]).toString();
            break;
          } catch {}
        }
      }

      if (!onChainDuelId) {
        toast({ title: "Failed to parse duel ID", description: "Your BNB is safe. Please contact support with tx: " + createHash, variant: "destructive" });
        setPvpCreating(false);
        return;
      }

      toast({ title: "Duel created on-chain!", description: `${potAmount} BNB sent to escrow. Syncing...` });

      const syncParams = {
        onChainDuelId,
        txHash: createHash,
        assetSymbol: asset,
        potAmount,
        durationSeconds: parseInt(duration),
        creatorOnChainAgentId: onChainAgentId?.toString() || "0",
        matchType: mode,
      };

      const doSync = async (retried = false) => {
        const token = localStorage.getItem("honeycomb_jwt");
        try {
          const res = await fetch("/api/trading-duels/sync-create", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(syncParams),
          });

          if (res.ok) {
            toast({ title: "Duel is live!", description: "Waiting for an opponent to join." });
            queryClient.invalidateQueries({ queryKey: ["/api/trading-duels"] });
            onCreated();
          } else if (res.status === 401 && !retried && address) {
            try {
              const nonceRes = await fetch("/api/auth/nonce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address }),
              });
              const { nonce } = await nonceRes.json();
              const message = `Sign this message to authenticate with Honeycomb.\n\nNonce: ${nonce}`;
              const signature = await signMessageAsync({ message });
              const verifyRes = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, signature, nonce }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.token) {
                localStorage.setItem("honeycomb_jwt", verifyData.token);
                await doSync(true);
              }
            } catch {
              toast({ title: "Session expired", description: "Please sign in again. Your BNB is safe in the on-chain escrow.", variant: "destructive" });
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            toast({ title: "Sync failed", description: errData.message || "Duel created on-chain but failed to save.", variant: "destructive" });
          }
        } catch {
          toast({ title: "Network error", description: "Duel created on-chain but failed to sync. Please refresh.", variant: "destructive" });
        }
        setPvpCreating(false);
      };
      doSync();
    }
  }, [createSuccess, createHash, createReceipt]);

  useEffect(() => {
    if (createError) {
      const errorMsg = createError.message?.includes("user rejected")
        ? "Transaction rejected"
        : createError.message?.slice(0, 100) || "Failed to create duel";
      toast({ title: "Transaction failed", description: errorMsg, variant: "destructive" });
      setPvpCreating(false);
    }
  }, [createError]);

  const handlePvpCreate = async () => {
    if (!agent || !address) return;
    setPvpCreating(true);

    if (!hasAgent) {
      toast({ title: "Registering on-chain agent...", description: "First-time setup required" });
      registerAgent("bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku");
      let regDone = false;
      const waitForReg = setInterval(async () => {
        const result = await refetchAgentId();
        if (result.data && result.data > BigInt(0)) {
          regDone = true;
          clearInterval(waitForReg);
          const stakeWei = parseEther(potAmount);
          contractCreateDuel(result.data, "ARENA", 0, BigInt(parseInt(duration)), stakeWei);
        }
      }, 2000);
      setTimeout(() => {
        if (!regDone) {
          clearInterval(waitForReg);
          setPvpCreating(false);
          toast({ title: "Registration timed out", description: "Please try again", variant: "destructive" });
        }
      }, 60000);
      return;
    }

    const stakeWei = parseEther(potAmount);
    contractCreateDuel(onChainAgentId!, "ARENA", 0, BigInt(parseInt(duration)), stakeWei);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tokenDropRef.current && !tokenDropRef.current.contains(e.target as Node)) {
        setTokenDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAssets = ASSETS.filter(a =>
    a.name.toLowerCase().includes(tokenSearch.toLowerCase()) ||
    a.short.toLowerCase().includes(tokenSearch.toLowerCase()) ||
    a.symbol.toLowerCase().includes(tokenSearch.toLowerCase())
  );
  const selectedAsset = ASSETS.find(a => a.symbol === asset) || ASSETS[0];

  const playBotMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/trading-duels/play-vs-bot", {
      creatorId: agent?.id,
      assetSymbol: asset,
      durationSeconds: parseInt(duration),
      botDifficulty,
      botStrategy,
    }),
    onSuccess: (data: any) => {
      toast({ title: "Practice Started!", description: `Training against ${data.botName}` });
      queryClient.invalidateQueries({ queryKey: ["/api/trading-duels"] });
      navigate(`/arena/${data.id}`);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const playBo3Mutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/trading-duels/play-vs-bot-bo3", {
      creatorId: agent?.id,
      assetSymbol: asset,
      durationSeconds: parseInt(duration),
    }),
    onSuccess: (data: any) => {
      toast({ title: "Best of 3 Started!", description: `Round 1 vs ${data.botName}` });
      queryClient.invalidateQueries({ queryKey: ["/api/trading-duels"] });
      navigate(`/arena/${data.id}`);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!agent) {
    return (
      <Card className="arena-glow-card">
        <CardContent className="p-6 text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center mb-3 arena-float">
            <Zap className="w-7 h-7 text-amber-400" />
          </div>
          {isConnected ? (
            <>
              <p className="text-muted-foreground text-sm">Sign in to start trading</p>
              <Button
                onClick={() => authenticate().catch((e: Error) => toast({ title: "Sign-in failed", description: e.message, variant: "destructive" }))}
                disabled={isAuthenticating}
                data-testid="button-arena-signin"
              >
                {isAuthenticating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                {isAuthenticating ? "Signing in..." : "Sign In to Play"}
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Connect your wallet to enter the arena</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 arena-animate-right">
      <Card className="arena-glow-card overflow-visible" style={{ boxShadow: "0 0 20px rgba(245,158,11,0.08)" }}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-amber-500/20 flex items-center justify-center">
              <Crosshair className="w-4 h-4 text-amber-400" />
            </div>
            Enter the Arena
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={mode === "practice" ? "default" : "outline"}
              onClick={() => setMode("practice")}
              data-testid="button-mode-practice"
            >
              <Bot className="w-4 h-4 mr-1.5" /> Practice
            </Button>
            <Button
              variant={mode === "pvp" ? "default" : "outline"}
              onClick={() => setMode("pvp")}
              data-testid="button-mode-pvp"
            >
              <Users className="w-4 h-4 mr-1.5" /> PvP
            </Button>
            <Button
              variant={mode === "ava" ? "default" : "outline"}
              onClick={() => setMode("ava")}
              data-testid="button-mode-ava"
            >
              <Cpu className="w-4 h-4 mr-1.5" /> AvA
            </Button>
          </div>

          {mode === "practice" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-500/10 border border-green-500/20">
              <Shield className="w-4 h-4 text-green-400 shrink-0" />
              <p className="text-xs text-green-300/80">Free skill training vs AI. No tokens required!</p>
            </div>
          )}
          {mode === "pvp" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20">
              <Swords className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-amber-300/80">Human vs Human. Stake BNB and compete for real rewards.</p>
            </div>
          )}
          {mode === "ava" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-purple-500/10 border border-purple-500/20">
              <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
              <p className="text-xs text-purple-300/80">Agent vs Agent. AI agents battle each other only.</p>
            </div>
          )}

          <div className="space-y-2" ref={tokenDropRef}>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Trading Pair</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setTokenDropOpen(!tokenDropOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-background text-sm"
                data-testid="select-trading-pair"
              >
                <span className="font-mono font-semibold">{selectedAsset.short}/USDT</span>
                <span className="text-muted-foreground text-xs truncate">{selectedAsset.name}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
              {tokenDropOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg" style={{ maxHeight: 280 }}>
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search tokens..."
                        value={tokenSearch}
                        onChange={e => setTokenSearch(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 text-sm rounded-md bg-muted/50 border-0 outline-none placeholder:text-muted-foreground"
                        autoFocus
                        data-testid="input-token-search"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
                    {filteredAssets.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-4" data-testid="text-no-tokens">No tokens found</p>
                    ) : (
                      filteredAssets.map(a => (
                        <button
                          key={a.symbol}
                          type="button"
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover-elevate ${a.symbol === asset ? "bg-muted" : ""}`}
                          onClick={() => { setAsset(a.symbol); setTokenDropOpen(false); setTokenSearch(""); }}
                          data-testid={`token-option-${a.short}`}
                        >
                          <span className="font-mono font-semibold w-14">{a.short}</span>
                          <span className="text-muted-foreground text-xs truncate">{a.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger data-testid="select-duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map(d => (
                  <SelectItem key={d.value} value={d.value.toString()}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {mode !== "practice" && (
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pot (BNB per player)</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                value={potAmount}
                onChange={e => setPotAmount(e.target.value)}
                data-testid="input-pot-amount"
              />
              <p className="text-[11px] text-muted-foreground">Winner takes 90% of total pot. 10% platform fee.</p>
            </div>
          )}

          {mode === "practice" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Gauge className="w-3 h-3" /> Bot Difficulty
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    { value: "easy", label: "Easy", desc: "Slow, low leverage" },
                    { value: "normal", label: "Normal", desc: "Balanced play" },
                    { value: "degen", label: "Degen", desc: "Fast, high leverage" },
                  ] as const).map(d => (
                    <button
                      key={d.value}
                      onClick={() => setBotDifficulty(d.value)}
                      className={`p-2 rounded-md border text-center transition-all ${
                        botDifficulty === d.value
                          ? "border-amber-500/50 bg-amber-500/10"
                          : "border-border hover-elevate"
                      }`}
                      data-testid={`button-difficulty-${d.value}`}
                    >
                      <span className="text-xs font-medium block">{d.label}</span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">{d.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Brain className="w-3 h-3" /> Bot Strategy
                </Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { value: "momentum", label: "Momentum", desc: "Follows trends" },
                    { value: "mean_reversion", label: "Mean Revert", desc: "Fades extremes" },
                  ] as const).map(s => (
                    <button
                      key={s.value}
                      onClick={() => setBotStrategy(s.value)}
                      className={`p-2 rounded-md border text-center transition-all ${
                        botStrategy === s.value
                          ? "border-purple-500/50 bg-purple-500/10"
                          : "border-border hover-elevate"
                      }`}
                      data-testid={`button-strategy-${s.value}`}
                    >
                      <span className="text-xs font-medium block">{s.label}</span>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => playBotMutation.mutate()}
                disabled={playBotMutation.isPending || playBo3Mutation.isPending}
                data-testid="button-play-bot"
              >
                {playBotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Bot className="w-4 h-4 mr-1.5" />}
                Quick Practice (Free)
              </Button>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => playBo3Mutation.mutate()}
                disabled={playBo3Mutation.isPending || playBotMutation.isPending}
                data-testid="button-play-bo3"
              >
                {playBo3Mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Trophy className="w-4 h-4 mr-1.5" />}
                Best of 3 Series (Free)
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">Skill training mode - completely free, no tokens needed</p>
            </div>
          ) : mode === "pvp" ? (
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handlePvpCreate}
                disabled={pvpCreating || isCreatePending || isCreateConfirming || isRegistering || isRegConfirming}
                data-testid="button-create-duel"
              >
                {(pvpCreating || isCreatePending || isCreateConfirming || isRegistering || isRegConfirming) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Swords className="w-4 h-4" />
                )}
                <span className="ml-2">
                  {isRegistering || isRegConfirming ? "Registering Agent..." :
                   isCreatePending ? "Confirm in Wallet..." :
                   isCreateConfirming ? "Confirming on-chain..." :
                   `Stake ${potAmount} BNB & Create PvP Duel`}
                </span>
              </Button>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-300/80">On-chain escrow: BNB locked in smart contract. Humans only.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={handlePvpCreate}
                disabled={pvpCreating || isCreatePending || isCreateConfirming || isRegistering || isRegConfirming}
                data-testid="button-create-ava-duel"
              >
                {(pvpCreating || isCreatePending || isCreateConfirming || isRegistering || isRegConfirming) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Cpu className="w-4 h-4" />
                )}
                <span className="ml-2">
                  {isRegistering || isRegConfirming ? "Registering Agent..." :
                   isCreatePending ? "Confirm in Wallet..." :
                   isCreateConfirming ? "Confirming on-chain..." :
                   `Stake ${potAmount} BNB & Create Agent Duel`}
                </span>
              </Button>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-purple-500/10 border border-purple-500/20">
                <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
                <p className="text-xs text-purple-300/80">Agent vs Agent: Only AI agents can join this duel.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DuelLobbyCard({ duel, onJoin, index }: { duel: TradingDuel; onJoin: (id: string) => void; index: number }) {
  const { agent } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const assetInfo = ASSETS.find(a => a.symbol === duel.assetSymbol) || ASSETS[0];
  const durationInfo = DURATIONS.find(d => d.value === duel.durationSeconds);
  const isCreator = agent?.id === duel.creatorId;

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/trading-duels/${duel.id}/cancel`, { agentId: agent?.id }),
    onSuccess: () => {
      toast({ title: "Duel cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/trading-duels"] });
    },
    onError: (e: Error) => toast({ title: "Cancel failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Card
      className="hover-elevate overflow-visible"
      style={{ animation: `arena-slide-up 0.4s ${index * 0.05}s ease-out both` }}
      data-testid={`card-duel-${duel.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-md bg-gradient-to-br from-amber-500/30 to-orange-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-amber-400" />
              </div>
              {duel.status === "active" && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500" style={{ animation: "arena-glow-pulse 2s ease-in-out infinite", boxShadow: "0 0 6px rgba(34,197,94,0.6)" }} />
              )}
            </div>
            <div>
              <p className="font-semibold">{assetInfo.short}/USDT</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{durationInfo?.label || `${duel.durationSeconds}s`}</span>
                {duel.status === "active" && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-400 border-green-500/30">LIVE</Badge>}
              </div>
            </div>
          </div>
          <div className="text-right">
            {duel.matchType === "practice" ? (
              <>
                <p className="font-mono font-bold text-green-400">FREE</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">practice</p>
              </>
            ) : (
              <>
                <p className="font-mono font-bold text-amber-400">{duel.potAmount} BNB</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {duel.isOnChain ? "on-chain escrow" : "per player"}
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[9px] py-0 px-1.5 ${
              duel.matchType === "pvp" ? "border-amber-500/30 text-amber-400" :
              duel.matchType === "ava" ? "border-purple-500/30 text-purple-400" :
              "border-green-500/30 text-green-400"
            }`}>
              {duel.matchType === "pvp" ? "PvP" : duel.matchType === "ava" ? "AvA" : "Practice"}
            </Badge>
            {duel.status === "active" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 border-green-500/30 text-green-400"
                onClick={() => navigate(`/arena/${duel.id}/spectate`)}
                data-testid={`button-watch-${duel.id}`}
              >
                <Eye className="w-3.5 h-3.5" /> Watch
              </Button>
            )}
            {duel.status === "waiting" && !isCreator && agent && (
              <Button size="sm" onClick={() => onJoin(duel.id)} data-testid={`button-join-${duel.id}`}>
                <Zap className="w-4 h-4 mr-1" /> Fight
              </Button>
            )}
            {duel.status === "waiting" && isCreator && (
              <div className="flex items-center gap-1.5">
                {(duel as any).joinCode && (
                  <Badge
                    variant="outline"
                    className="gap-1 text-[9px] py-0 px-1.5 cursor-pointer border-amber-500/30 text-amber-300"
                    onClick={() => {
                      navigator.clipboard.writeText((duel as any).joinCode);
                      toast({ title: "Code copied!", description: (duel as any).joinCode });
                    }}
                    data-testid={`badge-join-code-${duel.id}`}
                  >
                    <Copy className="w-2.5 h-2.5" /> {(duel as any).joinCode}
                  </Badge>
                )}
                <Badge variant="outline" className="gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Waiting
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-red-500/30 text-red-400"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  data-testid={`button-cancel-${duel.id}`}
                >
                  {cancelMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Cancel
                </Button>
              </div>
            )}
            {duel.status === "settled" && (
              <Badge variant="secondary">Settled</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TradingPanel({
  duelId,
  agentId,
  currentPrice,
  duel,
  onTradeEffect,
}: {
  duelId: string;
  agentId: string;
  currentPrice: number;
  duel: TradingDuel;
  onTradeEffect?: (side: "long" | "short") => void;
}) {
  const { toast } = useToast();
  const [side, setSide] = useState<"long" | "short">("long");
  const [leverage, setLeverage] = useState("5");
  const [sizePercent, setSizePercent] = useState("25");

  const { data: positions = [], refetch: refetchPositions } = useQuery<TradingPosition[]>({
    queryKey: ["/api/trading-duels", duelId, "positions", `?agentId=${agentId}`],
    refetchInterval: 2000,
  });

  const openPositions = positions.filter(p => p.isOpen);
  const closedPositions = positions.filter(p => !p.isOpen);

  const initialBal = parseFloat(duel.initialBalance);
  const realizedPnl = closedPositions.reduce((sum, p) => sum + (p.pnl ? parseFloat(p.pnl) : 0), 0);
  const usedBalance = openPositions.reduce((sum, p) => sum + parseFloat(p.sizeUsdt), 0);
  const availableBalance = initialBal + realizedPnl - usedBalance;

  const unrealizedPnl = openPositions.reduce((sum, p) => {
    const entry = parseFloat(p.entryPrice);
    const size = parseFloat(p.sizeUsdt);
    if (p.side === "long") {
      return sum + ((currentPrice - entry) / entry) * size * p.leverage;
    } else {
      return sum + ((entry - currentPrice) / entry) * size * p.leverage;
    }
  }, 0);

  const totalBalance = availableBalance + usedBalance + unrealizedPnl;
  const totalPnl = totalBalance - initialBal;
  const pnlPercent = (totalPnl / initialBal) * 100;

  const sizeUsdt = (availableBalance * parseFloat(sizePercent) / 100).toFixed(2);

  const lastTradeRef = useRef(0);
  const [cooldownActive, setCooldownActive] = useState(false);
  const triggerCooldown = useCallback(() => {
    lastTradeRef.current = Date.now();
    setCooldownActive(true);
    setTimeout(() => setCooldownActive(false), 350);
  }, []);

  const openMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/trading-duels/${duelId}/open-position`, {
      agentId,
      side,
      leverage: parseInt(leverage),
      sizeUsdt,
    }),
    onSuccess: (data: any) => {
      triggerCooldown();
      playTradeSound("open");
      onTradeEffect?.(side);
      const ep = data.entryPrice ? formatPrice(parseFloat(data.entryPrice)) : formatPrice(currentPrice);
      toast({ title: `${side.toUpperCase()} opened!`, description: `${leverage}x leverage at $${ep}` });
      refetchPositions();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeMutation = useMutation({
    mutationFn: (posId: string) => apiRequest("POST", `/api/trading-duels/${duelId}/close-position`, {
      positionId: posId,
      agentId,
    }),
    onSuccess: () => {
      triggerCooldown();
      playTradeSound("close");
      toast({ title: "Position closed!" });
      refetchPositions();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-0 h-full" style={{ background: "#0b0e11" }}>
      <div className="p-3 border-b" style={{ borderColor: "#1e2329" }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "#848e9c" }}>Portfolio Value</p>
            <p className="text-xl font-bold font-mono text-white" key={Math.round(totalBalance)} data-testid="text-portfolio-value">{formatMoney(totalBalance)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider" style={{ color: "#848e9c" }}>Unrealized P&L</p>
            <p className="text-lg font-bold font-mono" style={{ color: totalPnl >= 0 ? "#0ecb81" : "#ea3943" }} data-testid="text-pnl">
              {totalPnl >= 0 ? "+" : ""}{formatMoney(totalPnl)} ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
            </p>
          </div>
        </div>
        <div className="h-1 rounded-full overflow-visible relative" style={{ background: "#1e2329" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(2, (totalBalance / (initialBal * 2)) * 100))}%`,
              background: totalPnl >= 0 ? "#0ecb81" : "#ea3943",
            }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px]" style={{ color: "#848e9c" }}>Avbl: {formatMoney(availableBalance)}</span>
          <span className="text-[10px]" style={{ color: "#848e9c" }}>In use: {formatMoney(usedBalance)}</span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setSide("long")}
            className="py-2 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-1"
            style={{
              background: side === "long" ? "#0ecb81" : "#1e2329",
              color: side === "long" ? "#0b0e11" : "#848e9c",
            }}
            data-testid="button-long"
          >
            <ArrowUp className="w-4 h-4" /> Long/Buy
          </button>
          <button
            onClick={() => setSide("short")}
            className="py-2 rounded-md text-sm font-semibold transition-all flex items-center justify-center gap-1"
            style={{
              background: side === "short" ? "#ea3943" : "#1e2329",
              color: side === "short" ? "#fff" : "#848e9c",
            }}
            data-testid="button-short"
          >
            <ArrowDown className="w-4 h-4" /> Short/Sell
          </button>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "#848e9c" }}>Leverage</p>
          <div className="flex gap-1">
            {["1", "2", "5", "10", "20", "50"].map(l => (
              <button
                key={l}
                onClick={() => setLeverage(l)}
                className="flex-1 py-1.5 rounded-md text-xs font-mono font-semibold transition-all"
                style={{
                  background: leverage === l ? "#f0b90b" : "#1e2329",
                  color: leverage === l ? "#0b0e11" : "#848e9c",
                }}
                data-testid={`button-leverage-${l}`}
              >
                {l}x
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "#848e9c" }}>
            Size ({sizePercent}% = {formatMoney(parseFloat(sizeUsdt))})
          </p>
          <div className="flex gap-1">
            {["10", "25", "50", "75", "100"].map(p => (
              <button
                key={p}
                onClick={() => setSizePercent(p)}
                className="flex-1 py-1.5 rounded-md text-xs font-mono font-semibold transition-all"
                style={{
                  background: sizePercent === p ? "#f0b90b" : "#1e2329",
                  color: sizePercent === p ? "#0b0e11" : "#848e9c",
                }}
                data-testid={`button-size-${p}`}
              >
                {p}%
              </button>
            ))}
          </div>
        </div>

        <div className="p-2 rounded-md text-xs space-y-1" style={{ background: "#1e2329" }}>
          <div className="flex justify-between">
            <span style={{ color: "#848e9c" }}>Entry Price</span>
            <span className="font-mono text-white">${formatPrice(currentPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "#848e9c" }}>Order Value</span>
            <span className="font-mono text-white">{formatMoney(parseFloat(sizeUsdt))}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "#848e9c" }}>Leverage</span>
            <span className="font-mono" style={{ color: "#f0b90b" }}>{leverage}x</span>
          </div>
        </div>

        <div className="relative">
          <button
            className={`w-full py-3.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${side === "long" ? "arena-btn-glow-green" : "arena-btn-glow-red"}`}
            style={{
              background: side === "long"
                ? "linear-gradient(135deg, #0ecb81, #0aa870)"
                : "linear-gradient(135deg, #ea3943, #d63342)",
              color: side === "long" ? "#0b0e11" : "#fff",
              opacity: openMutation.isPending || parseFloat(sizeUsdt) <= 0 ? 0.5 : 1,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontSize: "14px",
              boxShadow: side === "long"
                ? "0 4px 20px rgba(14,203,129,0.3), inset 0 1px 0 rgba(255,255,255,0.15)"
                : "0 4px 20px rgba(234,57,67,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
            onClick={() => openMutation.mutate()}
            disabled={openMutation.isPending || parseFloat(sizeUsdt) <= 0 || cooldownActive}
            data-testid="button-open-position"
          >
            {openMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            {side === "long" ? "Buy / Long" : "Sell / Short"} {leverage}x
            <span className="text-xs opacity-75">({formatMoney(parseFloat(sizeUsdt))})</span>
          </button>
          {cooldownActive && (
            <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
              <div
                className="h-full"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  animation: "arena-cooldown-sweep 0.35s linear",
                }}
              />
            </div>
          )}
        </div>
      </div>

      {openPositions.length > 0 && (
        <div className="border-t px-3 py-3" style={{ borderColor: "#1e2329" }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#f0b90b" }}>
              <Target className="w-3.5 h-3.5" />
              Open Positions ({openPositions.length})
            </p>
            {openPositions.length > 1 && (
              <button
                onClick={() => openPositions.forEach(p => closeMutation.mutate(p.id))}
                disabled={closeMutation.isPending || cooldownActive}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-all"
                style={{ background: "rgba(234,57,67,0.1)", color: "#ea3943", border: "1px solid rgba(234,57,67,0.2)" }}
                data-testid="button-close-all"
              >
                Close All
              </button>
            )}
          </div>
          <div className="space-y-2">
            {openPositions.map((pos, i) => {
              const entry = parseFloat(pos.entryPrice);
              const size = parseFloat(pos.sizeUsdt);
              let pnl = 0;
              if (currentPrice > 0 && !isNaN(entry)) {
                if (pos.side === "long") {
                  pnl = ((currentPrice - entry) / entry) * size * pos.leverage;
                } else {
                  pnl = ((entry - currentPrice) / entry) * size * pos.leverage;
                }
              }
              const pnlPct = size > 0 ? (pnl / size) * 100 : 0;
              const pnlColor = pnl >= 0 ? "#0ecb81" : "#ea3943";
              const borderGlow = pnl >= 0 ? "rgba(14,203,129,0.25)" : "rgba(234,57,67,0.25)";
              return (
                <div
                  key={pos.id}
                  className="rounded-lg overflow-hidden"
                  style={{
                    background: "#161a1e",
                    border: `1px solid ${borderGlow}`,
                    boxShadow: `0 0 12px ${pnl >= 0 ? "rgba(14,203,129,0.08)" : "rgba(234,57,67,0.08)"}`,
                  }}
                  data-testid={`position-card-${pos.id}`}
                >
                  <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: pos.side === "long" ? "rgba(14,203,129,0.08)" : "rgba(234,57,67,0.08)" }}>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {pos.side === "long" ? <ArrowUp className="w-4 h-4" style={{ color: "#0ecb81" }} /> : <ArrowDown className="w-4 h-4" style={{ color: "#ea3943" }} />}
                        <span
                          className="text-sm font-bold"
                          style={{ color: pos.side === "long" ? "#0ecb81" : "#ea3943" }}
                        >
                          {pos.side.toUpperCase()} {pos.leverage}x
                        </span>
                      </div>
                      <span className="text-xs font-mono" style={{ color: "#848e9c" }}>{formatMoney(size)}</span>
                    </div>
                    <div
                      className="text-right"
                    >
                      <span
                        className="text-base font-mono font-bold"
                        style={{ color: pnlColor, textShadow: `0 0 8px ${pnlColor}40` }}
                        data-testid={`pnl-value-${pos.id}`}
                      >
                        {pnl >= 0 ? "+" : ""}{formatMoney(pnl)}
                      </span>
                      <span className="text-[10px] font-mono block" style={{ color: pnlColor }}>
                        {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider block" style={{ color: "#848e9c" }}>Entry</span>
                        <span className="text-xs font-mono font-semibold text-white">${formatPrice(entry)}</span>
                      </div>
                      <div className="flex items-center">
                        <ChevronRight className="w-3 h-3" style={{ color: "#848e9c" }} />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider block" style={{ color: "#848e9c" }}>Current</span>
                        <span className="text-xs font-mono font-semibold" style={{ color: pnlColor }}>${formatPrice(currentPrice)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => closeMutation.mutate(pos.id)}
                      disabled={closeMutation.isPending || cooldownActive}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all"
                      style={{
                        background: "rgba(234,57,67,0.15)",
                        color: "#ea3943",
                        border: "1px solid rgba(234,57,67,0.3)",
                      }}
                      data-testid={`button-close-${pos.id}`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Close
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getRankTier(rating: number): { name: string; color: string; icon: typeof Medal } {
  if (rating >= 1500) return { name: "Gold", color: "#f0b90b", icon: Medal };
  if (rating >= 1200) return { name: "Silver", color: "#94a3b8", icon: Medal };
  return { name: "Bronze", color: "#cd7f32", icon: Medal };
}

function SettledResultsView({
  duel, duelId, isWinner, creatorFinal, joinerFinal, potTotal, winnerPayout, durationLabel, agentId, botInfo, navigate,
}: {
  duel: TradingDuel; duelId: string; isWinner: boolean; creatorFinal: number; joinerFinal: number;
  potTotal: number; winnerPayout: number; durationLabel: string; agentId?: string;
  botInfo?: { creatorIsBot: boolean; joinerIsBot: boolean };
  navigate: (to: string) => void;
}) {
  const { toast } = useToast();

  const { data: resultsData } = useQuery<{
    duel: TradingDuel;
    result: {
      settlementPrice: string;
      creatorPnl: string;
      joinerPnl: string;
      creatorPnlPct: string;
      joinerPnlPct: string;
      creatorTrades: number;
      joinerTrades: number;
      potBnb: string;
      platformFee: string;
      winnerPayout: string;
      isTie: boolean;
    } | null;
    creatorTrades: TradingPosition[];
    joinerTrades: TradingPosition[];
    creatorPositions: TradingPosition[];
    joinerPositions: TradingPosition[];
    creatorStats: { arenaWins: number; arenaLosses: number; arenaWinStreak: number; arenaBestStreak: number; arenaRating: number } | null;
    joinerStats: { arenaWins: number; arenaLosses: number; arenaWinStreak: number; arenaBestStreak: number; arenaRating: number } | null;
    leadChanges: number;
    clutchFlag: boolean;
  }>({
    queryKey: ["/api/trading-duels", duelId, "results"],
  });

  const rematchMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/trading-duels/${duelId}/rematch`, { agentId }),
    onSuccess: (data: any) => {
      playTradeSound("start");
      toast({ title: "Rematch created!" });
      navigate(`/arena/${data.id}`);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const nextRoundMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/trading-duels/${duelId}/rematch-bo3`, { agentId }),
    onSuccess: (data: any) => {
      playTradeSound("start");
      toast({ title: `Round ${data.seriesRound} starting!` });
      navigate(`/arena/${data.id}`);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const { data: seriesData } = useQuery<{
    seriesId: string;
    duels: TradingDuel[];
    score: Record<string, number>;
    currentRound: number;
    isComplete: boolean;
    seriesWinner: string | null;
  }>({
    queryKey: ["/api/trading-duels/series", duel.seriesId],
    enabled: !!duel.seriesId,
  });

  const myStats = agentId === duel.creatorId ? resultsData?.creatorStats : resultsData?.joinerStats;
  const myPositions = agentId === duel.creatorId
    ? (resultsData?.creatorTrades || resultsData?.creatorPositions)
    : (resultsData?.joinerTrades || resultsData?.joinerPositions);
  const resultBreakdown = resultsData?.result;

  const myRank = myStats ? getRankTier(myStats.arenaRating) : null;

  return (
    <div className="relative max-w-2xl mx-auto px-3 sm:p-4 py-4 space-y-4">
      <ArenaBackground />
      <Card className="overflow-visible relative">
        {isWinner && <ConfettiExplosion />}
        <CardContent className="p-5 sm:p-8 text-center space-y-4 sm:space-y-5 relative z-10">
          <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 flex items-center justify-center arena-trophy">
            {duel.winnerId ? (
              isWinner ? <Trophy className="w-9 h-9 sm:w-12 sm:h-12 text-amber-400" /> : <Skull className="w-9 h-9 sm:w-12 sm:h-12 text-muted-foreground" />
            ) : (
              <Swords className="w-9 h-9 sm:w-12 sm:h-12 text-muted-foreground" />
            )}
          </div>
          <div className="arena-animate-up">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {duel.winnerId ? (isWinner ? "VICTORY" : "DEFEAT") : "DRAW"}
            </h2>
            {duel.winnerId && (
              <p className="text-muted-foreground text-sm mt-1">
                Winner takes <span className="text-amber-400 font-bold">{winnerPayout.toFixed(4)} BNB</span>
              </p>
            )}
            {resultsData?.clutchFlag && (
              <Badge variant="outline" className="mt-2 text-[10px] py-0.5 px-2 gap-1 border-amber-400/50 text-amber-400 arena-heartbeat" data-testid="badge-clutch">
                <Zap className="w-3 h-3" /> CLUTCH!
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap arena-animate-up">
            {resultsData?.leadChanges ? (
              <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1">
                <Activity className="w-3 h-3" /> {resultsData.leadChanges} Lead Changes
              </Badge>
            ) : null}
            {myStats && myStats.arenaWinStreak >= 2 && (
              <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1 border-orange-400/50 text-orange-400" data-testid="badge-streak">
                <Flame className="w-3 h-3" /> {myStats.arenaWinStreak} Win Streak
              </Badge>
            )}
            {myRank && (
              <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1" style={{ borderColor: `${myRank.color}50`, color: myRank.color }} data-testid="badge-rank">
                <Medal className="w-3 h-3" /> {myRank.name} ({myStats?.arenaRating})
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-4 arena-animate-up-d1">
            <div className={`relative p-3 sm:p-5 rounded-md border transition-all ${duel.winnerId === duel.creatorId ? "bg-green-500/10 border-green-500/30" : "bg-muted/30 border-border"}`}>
              {duel.winnerId === duel.creatorId && <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 absolute -top-2 left-1/2 -translate-x-1/2" />}
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                  {agentId === duel.creatorId ? "You" : botInfo?.creatorIsBot ? "AI Bot" : "Player 1"}
                </p>
                {botInfo?.creatorIsBot && <Bot className="w-3 h-3 text-purple-400" />}
              </div>
              <p className="text-lg sm:text-2xl font-bold font-mono mt-1">{formatMoney(creatorFinal)}</p>
              <p className={`text-xs sm:text-sm font-mono ${creatorFinal >= 1000000 ? "text-green-400" : "text-red-400"}`}>
                {creatorFinal >= 1000000 ? "+" : ""}{formatMoney(creatorFinal - 1000000)}
              </p>
              {resultsData?.creatorStats && (
                <p className="text-[9px] mt-1" style={{ color: "#848e9c" }}>
                  {resultsData.creatorStats.arenaWins}W-{resultsData.creatorStats.arenaLosses}L
                </p>
              )}
            </div>
            <div className={`relative p-3 sm:p-5 rounded-md border transition-all ${duel.winnerId === duel.joinerId ? "bg-green-500/10 border-green-500/30" : "bg-muted/30 border-border"}`}>
              {duel.winnerId === duel.joinerId && <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 absolute -top-2 left-1/2 -translate-x-1/2" />}
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">
                  {agentId === duel.joinerId ? "You" : botInfo?.joinerIsBot ? "AI Bot" : "Player 2"}
                </p>
                {botInfo?.joinerIsBot && <Bot className="w-3 h-3 text-purple-400" />}
              </div>
              <p className="text-lg sm:text-2xl font-bold font-mono mt-1">{formatMoney(joinerFinal)}</p>
              <p className={`text-xs sm:text-sm font-mono ${joinerFinal >= 1000000 ? "text-green-400" : "text-red-400"}`}>
                {joinerFinal >= 1000000 ? "+" : ""}{formatMoney(joinerFinal - 1000000)}
              </p>
              {resultsData?.joinerStats && (
                <p className="text-[9px] mt-1" style={{ color: "#848e9c" }}>
                  {resultsData.joinerStats.arenaWins}W-{resultsData.joinerStats.arenaLosses}L
                </p>
              )}
            </div>
          </div>

          {resultBreakdown && (
            <div className="arena-animate-up-d2 text-left">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Match Breakdown
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-md border border-border">
                  <p className="text-[9px] text-muted-foreground">Settlement Price</p>
                  <p className="text-xs font-mono font-medium">${parseFloat(resultBreakdown.settlementPrice).toLocaleString()}</p>
                </div>
                <div className="p-2 rounded-md border border-border">
                  <p className="text-[9px] text-muted-foreground">Total Trades</p>
                  <p className="text-xs font-mono font-medium">{resultBreakdown.creatorTrades + resultBreakdown.joinerTrades}</p>
                </div>
                <div className="p-2 rounded-md border border-border">
                  <p className="text-[9px] text-muted-foreground">Your PnL %</p>
                  <p className={`text-xs font-mono font-medium ${
                    parseFloat(agentId === duel.creatorId ? resultBreakdown.creatorPnlPct : resultBreakdown.joinerPnlPct) >= 0
                      ? "text-green-400" : "text-red-400"
                  }`}>
                    {parseFloat(agentId === duel.creatorId ? resultBreakdown.creatorPnlPct : resultBreakdown.joinerPnlPct) >= 0 ? "+" : ""}
                    {agentId === duel.creatorId ? resultBreakdown.creatorPnlPct : resultBreakdown.joinerPnlPct}%
                  </p>
                </div>
                <div className="p-2 rounded-md border border-border">
                  <p className="text-[9px] text-muted-foreground">Prize Pool</p>
                  <p className="text-xs font-mono font-medium text-amber-400">
                    {parseFloat(resultBreakdown.potBnb) > 0 ? `${resultBreakdown.potBnb} BNB` : "Practice"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {myPositions && myPositions.length > 0 && (
            <div className="arena-animate-up-d2 text-left">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" /> Trade Timeline
              </p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {myPositions.sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()).map((p, i) => {
                  const pnlVal = p.pnl ? parseFloat(p.pnl) : 0;
                  const isProfit = pnlVal >= 0;
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded text-[10px] font-mono" style={{ background: "#0d1117" }} data-testid={`trade-timeline-${i}`}>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] py-0 px-1" style={{
                          borderColor: p.side === "long" ? "#0ecb8130" : "#ea394330",
                          color: p.side === "long" ? "#0ecb81" : "#ea3943",
                        }}>
                          {p.side.toUpperCase()} {p.leverage}x
                        </Badge>
                        <span style={{ color: "#848e9c" }}>${parseFloat(p.entryPrice).toFixed(2)}</span>
                        {p.exitPrice && (
                          <>
                            <ChevronRight className="w-2.5 h-2.5" style={{ color: "#848e9c" }} />
                            <span style={{ color: "#848e9c" }}>${parseFloat(p.exitPrice).toFixed(2)}</span>
                          </>
                        )}
                      </div>
                      <span style={{ color: isProfit ? "#0ecb81" : "#ea3943" }}>
                        {isProfit ? "+" : ""}{formatMoney(pnlVal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {seriesData && !seriesData.isComplete && (
            <div className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5 text-center arena-animate-up-d3">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300" data-testid="text-series-score">
                  Best of 3 - Score: {seriesData.score[duel.creatorId] || 0} - {seriesData.score[duel.joinerId || "opponent"] || 0}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Round {seriesData.currentRound} of 3 complete. First to 2 wins!
              </p>
              <Button
                className="w-full"
                onClick={() => nextRoundMutation.mutate()}
                disabled={nextRoundMutation.isPending || !agentId}
                data-testid="button-next-round"
              >
                {nextRoundMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Swords className="w-4 h-4 mr-2" />}
                Next Round
              </Button>
            </div>
          )}

          {seriesData?.isComplete && (
            <div className="p-3 rounded-md border border-green-500/30 bg-green-500/5 text-center arena-animate-up-d3">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold text-green-400" data-testid="text-series-winner">
                  {seriesData.seriesWinner === agentId ? "SERIES VICTORY!" : "SERIES DEFEAT"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Final Score: {seriesData.score[duel.creatorId] || 0} - {seriesData.score[duel.joinerId || "opponent"] || 0}
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 arena-animate-up-d3">
            {!duel.seriesId && (
              <Button
                className="flex-1"
                onClick={() => rematchMutation.mutate()}
                disabled={rematchMutation.isPending || !agentId}
                data-testid="button-rematch"
              >
                {rematchMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Repeat2 className="w-4 h-4 mr-2" />}
                Run It Back
              </Button>
            )}
            <Button variant="outline" className={duel.seriesId ? "flex-1" : ""} onClick={() => navigate("/arena")} data-testid="button-back-lobby">
              <Swords className="w-4 h-4 mr-2" /> Back to Arena
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActiveDuelView({ duelId }: { duelId: string }) {
  const { agent } = useAuth();
  const { toast } = useToast();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [, navigate] = useLocation();
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [chartWidth, setChartWidth] = useState(600);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 640);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [priceTicks, setPriceTicks] = useState<{ time: number; price: number }[]>([]);
  const [tradeMarkers, setTradeMarkers] = useState<TradeMarker[]>([]);
  const prevPositionIdsRef = useRef<Set<string>>(new Set());
  const prevOpenIdsRef = useRef<Set<string>>(new Set());
  const settledSoundRef = useRef(false);
  const [tradeEffect, setTradeEffect] = useState<string | null>(null);
  const arenaContainerRef = useRef<HTMLDivElement>(null);
  const [leadHeartbeat, setLeadHeartbeat] = useState(false);
  const prevLeadChangesRef = useRef(0);

  const triggerTradeEffect = useCallback((side: "long" | "short") => {
    const effectClass = side === "long" ? "arena-flash-green" : "arena-flash-red";
    setTradeEffect(effectClass);
    if (arenaContainerRef.current) {
      arenaContainerRef.current.classList.add("arena-shake");
      setTimeout(() => {
        arenaContainerRef.current?.classList.remove("arena-shake");
        setTradeEffect(null);
      }, 400);
    }
  }, []);

  const { data: duel, refetch: refetchDuel } = useQuery<TradingDuel>({
    queryKey: ["/api/trading-duels", duelId],
    refetchInterval: 3000,
  });

  const { data: botInfo } = useQuery<{ creatorIsBot: boolean; joinerIsBot: boolean }>({
    queryKey: ["/api/trading-duels", duelId, "bot-info"],
    enabled: !!duel,
  });

  const { data: seriesData } = useQuery<{
    seriesId: string;
    duels: TradingDuel[];
    score: Record<string, number>;
    currentRound: number;
    isComplete: boolean;
    seriesWinner: string | null;
  }>({
    queryKey: ["/api/trading-duels/series", duel?.seriesId],
    enabled: !!duel?.seriesId,
    refetchInterval: 5000,
  });

  const { data: myPositions = [] } = useQuery<TradingPosition[]>({
    queryKey: ["/api/trading-duels", duelId, "positions", agent?.id ? `?agentId=${agent.id}` : ""],
    enabled: !!duel && !!agent?.id,
    refetchInterval: 2000,
  });

  const { data: matchStatus } = useQuery<{
    relativeStatus: string;
    myMomentum: number;
    oppMomentum: number;
    leadChanges: number;
    leadJustChanged: boolean;
    myPnlPercent: number;
  }>({
    queryKey: ["/api/trading-duels", duelId, "status", agent?.id ? `?agentId=${agent.id}` : ""],
    enabled: !!duel && duel.status === "active" && !!agent?.id,
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (matchStatus && matchStatus.leadChanges > prevLeadChangesRef.current) {
      prevLeadChangesRef.current = matchStatus.leadChanges;
      setLeadHeartbeat(true);
      playTradeSound("leadchange");
      setTimeout(() => setLeadHeartbeat(false), 1500);
    }
  }, [matchStatus?.leadChanges]);

  useEffect(() => {
    if (duel?.status === "settled" && !settledSoundRef.current) {
      settledSoundRef.current = true;
      const isWinner = duel.winnerId === agent?.id;
      setTimeout(() => playTradeSound(duel.winnerId ? (isWinner ? "victory" : "defeat") : "defeat"), 300);
    }
  }, [duel?.status, duel?.winnerId, agent?.id]);

  useEffect(() => {
    if (!myPositions.length || !currentPrice) return;
    const allIds = new Set(myPositions.map(p => p.id));
    const openIds = new Set(myPositions.filter(p => p.isOpen).map(p => p.id));

    myPositions.forEach(p => {
      if (!prevPositionIdsRef.current.has(p.id)) {
        setTradeMarkers(prev => [...prev, {
          time: Date.now(),
          price: parseFloat(p.entryPrice),
          side: p.side as "long" | "short",
          action: "open",
          leverage: p.leverage,
        }]);
      }
    });

    prevOpenIdsRef.current.forEach(id => {
      if (!openIds.has(id)) {
        const closed = myPositions.find(p => p.id === id && !p.isOpen);
        if (closed) {
          const pnlVal = closed.pnl ? parseFloat(closed.pnl) : 0;
          setTradeMarkers(prev => [...prev, {
            time: Date.now(),
            price: currentPrice,
            side: closed.side as "long" | "short",
            action: "close",
            pnl: pnlVal || undefined,
          }]);
          if (pnlVal > 0) {
            setTimeout(() => playTradeSound("profit"), 100);
          }
        }
      }
    });

    prevPositionIdsRef.current = allIds;
    prevOpenIdsRef.current = openIds;
  }, [myPositions, currentPrice]);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setChartWidth(Math.max(300, entry.contentRect.width - 20));
      }
    });
    if (chartContainerRef.current) obs.observe(chartContainerRef.current);
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!duel?.assetSymbol) return;
    const MAX_TICKS = 300;
    const TICK_INTERVAL = 250;
    let lastTickTime = 0;
    let latestPrice = 0;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let dead = false;

    const connectWs = () => {
      if (dead) return;
      const symbol = duel.assetSymbol.toLowerCase();
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`);

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          const p = parseFloat(data.p);
          if (!p || isNaN(p)) return;
          latestPrice = p;
          setCurrentPrice(prev => {
            if (prev > 0) setPriceChange(((p - prev) / prev) * 100);
            return p;
          });
          const now = Date.now();
          if (now - lastTickTime >= TICK_INTERVAL) {
            lastTickTime = now;
            setPriceTicks(prev => {
              const next = [...prev, { time: now, price: p }];
              return next.length > MAX_TICKS ? next.slice(next.length - MAX_TICKS) : next;
            });
          }
        } catch {}
      };

      ws.onclose = () => {
        if (!dead) reconnectTimer = setTimeout(connectWs, 2000);
      };
      ws.onerror = () => ws?.close();
    };

    const fetchInitialPrice = async () => {
      try {
        const res = await fetch(`/api/trading-duels/binance/ticker?symbol=${duel.assetSymbol}`);
        const data = await res.json();
        if (data.price) {
          const p = parseFloat(data.price);
          latestPrice = p;
          setCurrentPrice(p);
          setPriceTicks([{ time: Date.now(), price: p }]);
        }
      } catch {}
    };

    fetchInitialPrice().then(connectWs);

    return () => {
      dead = true;
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [duel?.assetSymbol]);

  const {
    settleDuel: contractSettleDuel,
    hash: settleHash,
    isPending: isSettlePending,
    isConfirming: isSettleConfirming,
    isSuccess: settleOnChainSuccess,
    error: settleOnChainError,
  } = useSettleDuel();

  const [settlingOnChain, setSettlingOnChain] = useState(false);

  useEffect(() => {
    if (settleOnChainSuccess && settleHash && duel) {
      const doSyncSettle = async (retried = false) => {
        const token = localStorage.getItem("honeycomb_jwt");
        try {
          const res = await fetch(`/api/trading-duels/${duelId}/sync-settle`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              txHash: settleHash,
              winnerId: duel.winnerId,
            }),
          });

          if (res.ok) {
            setSettlingOnChain(false);
            refetchDuel();
            toast({ title: "Duel settled on-chain!" });
          } else if (res.status === 401 && !retried && address) {
            try {
              const nonceRes = await fetch("/api/auth/nonce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address }),
              });
              const { nonce } = await nonceRes.json();
              const message = `Sign this message to authenticate with Honeycomb.\n\nNonce: ${nonce}`;
              const sig = await signMessageAsync({ message });
              const verifyRes = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, signature: sig, nonce }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.token) {
                localStorage.setItem("honeycomb_jwt", verifyData.token);
                await doSyncSettle(true);
                return;
              }
            } catch {}
            setSettlingOnChain(false);
            toast({ title: "Sync failed", description: "Settlement succeeded on-chain but failed to sync. Please refresh.", variant: "destructive" });
          } else {
            setSettlingOnChain(false);
            toast({ title: "Sync failed", description: "Settlement succeeded on-chain but failed to sync. Please refresh.", variant: "destructive" });
          }
        } catch {
          setSettlingOnChain(false);
          toast({ title: "Network error", description: "Settlement succeeded on-chain. Refresh to see results.", variant: "destructive" });
        }
      };
      doSyncSettle();
    }
  }, [settleOnChainSuccess, settleHash]);

  useEffect(() => {
    if (settleOnChainError) {
      setSettlingOnChain(false);
      toast({ title: "On-chain settlement failed", description: settleOnChainError.message?.slice(0, 100), variant: "destructive" });
    }
  }, [settleOnChainError]);

  const settleMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/trading-duels/${duelId}/settle`, {}),
    onSuccess: async (data: any) => {
      refetchDuel();
      if (data.isOnChain && data.onChainDuelId && data.onChainDuelId !== "0") {
        setSettlingOnChain(true);
        toast({ title: "Settling on-chain...", description: "Confirm the transaction to release BNB" });
        const creatorWins = data.winnerId === data.creatorId;
        const endPrice = creatorWins ? BigInt(200) : BigInt(50);
        contractSettleDuel(BigInt(data.onChainDuelId), endPrice);
      } else {
        toast({ title: "Duel Settled!" });
      }
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleExpired = useCallback(() => {
    if (duel?.status === "active") {
      setTimeout(() => settleMutation.mutate(), 2000);
    }
  }, [duel?.status]);

  if (!duel) return (
    <div className="flex flex-col items-center justify-center p-16 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      <p className="text-muted-foreground text-sm">Loading arena...</p>
    </div>
  );

  const assetInfo = ASSETS.find(a => a.symbol === duel.assetSymbol) || ASSETS[0];
  const isParticipant = agent?.id === duel.creatorId || agent?.id === duel.joinerId;
  const hasBot = botInfo?.creatorIsBot || botInfo?.joinerIsBot;
  const opponentIsBot = (agent?.id === duel.creatorId && botInfo?.joinerIsBot) || (agent?.id === duel.joinerId && botInfo?.creatorIsBot);

  if (duel.status === "settled") {
    const isWinner = duel.winnerId === agent?.id;
    const creatorFinal = parseFloat(duel.creatorFinalBalance || "0");
    const joinerFinal = parseFloat(duel.joinerFinalBalance || "0");
    const potTotal = parseFloat(duel.potAmount) * 2;
    const winnerPayout = potTotal * 0.9;
    const durationLabel = DURATIONS.find(d => d.value === duel.durationSeconds)?.label || `${duel.durationSeconds}s`;

    return <SettledResultsView
      duel={duel}
      duelId={duelId}
      isWinner={isWinner}
      creatorFinal={creatorFinal}
      joinerFinal={joinerFinal}
      potTotal={potTotal}
      winnerPayout={winnerPayout}
      durationLabel={durationLabel}
      agentId={agent?.id}
      botInfo={botInfo}
      navigate={navigate}
    />;
  }

  if (duel.status === "ready" && isParticipant) {
    return (
      <div className="relative max-w-md mx-auto px-3 sm:p-4 py-4 space-y-4">
        <ArenaBackground />
        <Card className="overflow-visible relative">
          <CardContent className="p-6 sm:p-10 text-center space-y-5 sm:space-y-6">
            <div className="flex items-center justify-center gap-4 sm:gap-6">
              <div className="arena-animate-left">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${botInfo?.creatorIsBot ? "bg-gradient-to-br from-purple-500/30 to-purple-600/10" : "bg-gradient-to-br from-blue-500/30 to-blue-600/10"}`}>
                  {botInfo?.creatorIsBot ? <Bot className="w-8 h-8 text-purple-400" /> : <Shield className="w-8 h-8 text-blue-400" />}
                </div>
                <p className="text-xs text-muted-foreground mt-2 uppercase">
                  {agent?.id === duel.creatorId ? "You" : botInfo?.creatorIsBot ? "AI Bot" : "Player 1"}
                </p>
              </div>
              <div className="arena-vs">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/40 to-red-500/20 flex items-center justify-center" style={{ boxShadow: "0 0 20px rgba(245,158,11,0.3)" }}>
                  <span className="text-xl font-black text-amber-400">VS</span>
                </div>
              </div>
              <div className="arena-animate-right">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${botInfo?.joinerIsBot ? "bg-gradient-to-br from-purple-500/30 to-purple-600/10" : "bg-gradient-to-br from-red-500/30 to-red-600/10"}`}>
                  {botInfo?.joinerIsBot ? <Bot className="w-8 h-8 text-purple-400" /> : <Shield className="w-8 h-8 text-red-400" />}
                </div>
                <p className="text-xs text-muted-foreground mt-2 uppercase">
                  {agent?.id === duel.joinerId ? "You" : botInfo?.joinerIsBot ? "AI Bot" : "Player 2"}
                </p>
              </div>
            </div>
            <div className="arena-animate-up-d1">
              <h2 className="text-2xl font-bold">{opponentIsBot ? "Bot Opponent Matched" : "Opponent Found"}</h2>
              <p className="text-muted-foreground mt-1">{assetInfo.short}/USDT  -  {DURATIONS.find(d => d.value === duel.durationSeconds)?.label}</p>
            </div>
            <div className="flex justify-center gap-3 arena-animate-up-d2">
              <StatBadge icon={DollarSign} label="Starting" value="$1M" color="green" />
              <StatBadge icon={Target} label="Max Lev" value="50x" color="amber" />
              <StatBadge icon={Trophy} label="Pot" value={`${(parseFloat(duel.potAmount) * 2).toFixed(3)} BNB`} color="blue" />
            </div>
            <Button
              className="w-full arena-animate-up-d3"
              onClick={async () => {
                playTradeSound("start");
                await apiRequest("POST", `/api/trading-duels/${duelId}/start`, {});
                refetchDuel();
              }}
              data-testid="button-start-duel"
            >
              <Flame className="w-5 h-5 mr-2" /> Start Trading
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (duel.status === "waiting") {
    return (
      <div className="relative max-w-md mx-auto px-3 sm:p-4 py-4 space-y-4">
        <ArenaBackground />
        <Card className="arena-glow-card overflow-visible">
          <CardContent className="p-6 sm:p-10 text-center space-y-5">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/5 flex items-center justify-center arena-float">
              <Swords className="w-10 h-10 text-amber-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Searching for Opponent</h2>
              <p className="text-muted-foreground mt-1">{assetInfo.short}/USDT - {DURATIONS.find(d => d.value === duel.durationSeconds)?.label} - {duel.potAmount} BNB</p>
            </div>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-amber-400"
                  style={{ animation: `arena-glow-pulse 1.5s ${i * 0.3}s ease-in-out infinite` }}
                />
              ))}
            </div>
            <Button variant="outline" onClick={() => navigate("/arena")} data-testid="button-cancel-wait">
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priceUp = priceChange >= 0;
  const sessionHigh = priceTicks.length > 0 ? Math.max(...priceTicks.map(t => t.price)) : 0;
  const sessionLow = priceTicks.length > 0 ? Math.min(...priceTicks.map(t => t.price)) : 0;
  const tickCount = priceTicks.length;

  const chartOpenPositions = myPositions.filter(p => p.isOpen).map(p => ({
    side: p.side,
    entryPrice: p.entryPrice,
    leverage: p.leverage,
  }));

  return (
    <div ref={arenaContainerRef} className="relative space-y-0" style={{ background: "#0b0e11", minHeight: "100vh" }}>
      {tradeEffect && (
        <div className={`absolute inset-0 z-50 pointer-events-none ${tradeEffect}`} />
      )}
      <div className="border-b" style={{ borderColor: "#1e2329", background: "#0b0e11" }}>
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-sm sm:text-lg text-white whitespace-nowrap">{assetInfo.short}<span style={{ color: "#848e9c" }}>/USDT</span></span>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1 shrink-0" style={{ borderColor: "#0ecb81", color: "#0ecb81" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#0ecb81", boxShadow: "0 0 4px #0ecb81" }} />
                LIVE
              </Badge>
              {opponentIsBot && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1 text-purple-400 border-purple-400/30 shrink-0">
                  <Bot className="w-3 h-3" /> vs AI
                </Badge>
              )}
              {seriesData && duel.seriesId && (
                <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1 shrink-0" style={{ borderColor: "#f0b90b", color: "#f0b90b" }} data-testid="badge-series-score">
                  <Trophy className="w-3 h-3" />
                  Bo3 R{duel.seriesRound || seriesData.currentRound}: {seriesData.score[duel.creatorId] || 0}-{seriesData.score[duel.joinerId || "opponent"] || 0}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {duel.endsAt && (
                <CountdownTimer endsAt={duel.endsAt.toString()} onExpired={handleExpired} />
              )}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  const url = `${window.location.origin}/arena/${duelId}/spectate`;
                  navigator.clipboard.writeText(url);
                  toast({ title: "Spectator link copied!" });
                }}
                data-testid="button-share-spectate"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="font-mono text-xl sm:text-2xl font-bold transition-colors"
              style={{ color: priceUp ? "#0ecb81" : "#ea3943" }}
              key={Math.round(currentPrice * 10000)}
              data-testid="text-live-price"
            >
              {formatPrice(currentPrice)}
            </span>
            {priceChange !== 0 && (
              <span className="text-[11px] font-mono" style={{ color: priceUp ? "#0ecb81" : "#ea3943" }}>
                {priceUp ? "+" : ""}{priceChange.toFixed(3)}%
              </span>
            )}
            <div className="hidden sm:flex items-center gap-4 ml-auto text-[11px]">
              <div>
                <span style={{ color: "#848e9c" }}>High </span>
                <span className="font-mono text-white" data-testid="text-session-high">{formatPrice(sessionHigh)}</span>
              </div>
              <div>
                <span style={{ color: "#848e9c" }}>Low </span>
                <span className="font-mono text-white" data-testid="text-session-low">{formatPrice(sessionLow)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {matchStatus && duel.status === "active" && (
        <div className="border-b px-3 py-1.5" style={{ borderColor: "#1e2329", background: "#0d1117" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex items-center gap-1.5 ${leadHeartbeat ? "arena-heartbeat" : ""}`}>
                {matchStatus.relativeStatus.includes("LEADING") || matchStatus.relativeStatus.includes("SLIGHT LEAD") ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                ) : matchStatus.relativeStatus.includes("BEHIND") ? (
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{
                    color: matchStatus.relativeStatus.includes("LEADING") || matchStatus.relativeStatus.includes("SLIGHT LEAD")
                      ? "#0ecb81"
                      : matchStatus.relativeStatus.includes("BEHIND") ? "#ea3943" : "#f0b90b",
                  }}
                  data-testid="text-relative-status"
                >
                  {matchStatus.relativeStatus}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {matchStatus.leadChanges > 0 && (
                <div className={`flex items-center gap-1 ${leadHeartbeat ? "arena-heartbeat" : ""}`} data-testid="text-lead-changes">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span className="text-[10px] font-mono" style={{ color: "#f0b90b" }}>
                    {matchStatus.leadChanges} LEAD {matchStatus.leadChanges === 1 ? "CHANGE" : "CHANGES"}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] uppercase font-bold" style={{ color: matchStatus.myMomentum >= matchStatus.oppMomentum ? "#0ecb81" : "#848e9c" }}>YOU</span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden relative" style={{ background: "#1e2329" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${matchStatus.myMomentum}%`,
                  background: matchStatus.myMomentum > 50
                    ? "linear-gradient(90deg, #0ecb81, #00ff88)"
                    : matchStatus.myMomentum > 30
                      ? "linear-gradient(90deg, #f0b90b, #fcd535)"
                      : "linear-gradient(90deg, #ea3943, #ff6b6b)",
                  boxShadow: matchStatus.myMomentum > 60 ? "0 0 12px rgba(14,203,129,0.6), inset 0 1px 0 rgba(255,255,255,0.2)" : "none",
                  transition: "width 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                data-testid="bar-my-momentum"
              />
            </div>
            <span className="text-[11px] font-mono font-bold w-10 text-right" style={{ color: matchStatus.myMomentum > 50 ? "#0ecb81" : matchStatus.myMomentum > 30 ? "#f0b90b" : "#ea3943" }}>
              {matchStatus.myMomentum}%
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] uppercase font-bold" style={{ color: matchStatus.oppMomentum > matchStatus.myMomentum ? "#ea3943" : "#848e9c" }}>OPP</span>
            <div className="flex-1 h-2.5 rounded-full overflow-hidden relative" style={{ background: "#1e2329" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${matchStatus.oppMomentum}%`,
                  background: matchStatus.oppMomentum > 50
                    ? "linear-gradient(90deg, #ea3943, #ff6b6b)"
                    : matchStatus.oppMomentum > 30
                      ? "linear-gradient(90deg, #f0b90b, #fcd535)"
                      : "linear-gradient(90deg, #0ecb81, #00ff88)",
                  boxShadow: matchStatus.oppMomentum > 60 ? "0 0 12px rgba(234,57,67,0.6), inset 0 1px 0 rgba(255,255,255,0.2)" : "none",
                  transition: "width 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                data-testid="bar-opp-momentum"
              />
            </div>
            <span className="text-[11px] font-mono font-bold w-10 text-right" style={{ color: matchStatus.oppMomentum > 50 ? "#ea3943" : matchStatus.oppMomentum > 30 ? "#f0b90b" : "#0ecb81" }}>
              {matchStatus.oppMomentum}%
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        <div ref={chartContainerRef} className="flex-1 min-w-0 lg:border-r relative" style={{ borderColor: "#1e2329" }}>
          <div className="absolute inset-0 pointer-events-none z-10 arena-scanlines" />
          <div className="p-1 relative">
            <LiveLineChart
              priceTicks={priceTicks}
              width={chartWidth}
              height={isMobile ? 260 : 460}
              currentPrice={currentPrice}
              tradeMarkers={tradeMarkers}
              openPositions={chartOpenPositions}
            />
          </div>
        </div>
        <div className="lg:w-[340px] shrink-0 flex flex-col" style={{ background: "#0b0e11" }}>
          {isParticipant && agent && (
            <TradingPanel
              duelId={duelId}
              agentId={agent.id}
              currentPrice={currentPrice}
              duel={duel}
              onTradeEffect={triggerTradeEffect}
            />
          )}
          <ArenaChat scopeType="duel" scopeId={duelId} maxHeight="200px" compact />
        </div>
      </div>
    </div>
  );
}

function ArenaLeaderboard({ agentId }: { agentId?: string }) {
  const [period, setPeriod] = useState<"all" | "daily" | "weekly">("all");

  const { data: leaderboard = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/trading-duels/leaderboard", `?period=${period}`],
    refetchInterval: 30000,
  });

  return (
    <Card className="arena-glow-card overflow-visible">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className="w-7 h-7 rounded-md bg-amber-500/20 flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
          </div>
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1">
          {(["daily", "weekly", "all"] as const).map(p => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "ghost"}
              className="flex-1 text-xs"
              onClick={() => setPeriod(p)}
              data-testid={`button-leaderboard-${p}`}
            >
              {p === "daily" ? "Today" : p === "weekly" ? "This Week" : "All Time"}
            </Button>
          ))}
        </div>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          </div>
        ) : leaderboard.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4" data-testid="text-no-leaderboard">No data yet</p>
        ) : (
          <div className="space-y-1">
            {leaderboard.slice(0, 10).map((player: any, idx: number) => {
              const isMe = player.id === agentId;
              const wins = player.periodWins ?? player.arenaWins ?? 0;
              const losses = player.periodLosses ?? player.arenaLosses ?? 0;
              const rating = player.arenaRating || 1000;
              const rank = getRankTier(rating);

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs ${isMe ? "bg-amber-500/10 border border-amber-500/20" : ""}`}
                  data-testid={`leaderboard-entry-${idx}`}
                >
                  <span className="w-5 text-center font-bold" style={{
                    color: idx === 0 ? "#f0b90b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#cd7f32" : undefined,
                  }}>
                    {idx === 0 ? <Crown className="w-3.5 h-3.5 inline" /> : `#${idx + 1}`}
                  </span>
                  <span className="font-medium truncate flex-1" style={{ color: isMe ? "#f0b90b" : undefined }}>
                    {player.name || "Anon"}
                  </span>
                  <span className="font-mono text-green-400">{wins}W</span>
                  <span className="text-muted-foreground">-</span>
                  <span className="font-mono text-red-400">{losses}L</span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1" style={{ borderColor: `${rank.color}40`, color: rank.color }}>
                    {rating}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TradingArenaLobby() {
  const { agent } = useAuth();
  const { toast } = useToast();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("open");
  const [lobbyMatchType, setLobbyMatchType] = useState<"all" | "pvp" | "ava">("all");
  const [joiningDuelId, setJoiningDuelId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [showJoinCode, setShowJoinCode] = useState(false);

  const { data: onChainAgentId, refetch: refetchAgentId } = useGetAgentByOwner(address as `0x${string}`);
  const hasAgent = onChainAgentId && onChainAgentId > BigInt(0);
  const { registerAgent, isPending: isRegPending, isConfirming: isRegConfirming, isSuccess: regSuccess, hash: regHash } = useRegisterAgent();

  const {
    joinDuel: contractJoinDuel,
    hash: joinHash,
    isPending: isJoinPending,
    isConfirming: isJoinConfirming,
    isSuccess: joinSuccess,
    error: joinError,
  } = useJoinDuel();

  const statusParam = tab === "open" ? "waiting" : tab === "live" ? "active" : tab;
  const matchTypeParam = lobbyMatchType !== "all" ? `&matchType=${lobbyMatchType}` : "";
  const { data: duels = [], isLoading } = useQuery<TradingDuel[]>({
    queryKey: ["/api/trading-duels", `?status=${statusParam}&limit=20${matchTypeParam}`],
    refetchInterval: 5000,
  });

  const { data: myStats } = useQuery<{ arenaWins: number; arenaLosses: number; arenaWinStreak: number; arenaBestStreak: number; arenaRating: number }>({
    queryKey: ["/api/agents", agent?.id, "arena-stats"],
    queryFn: async () => {
      if (!agent?.id) return null;
      const res = await fetch(`/api/trading-duels/leaderboard`);
      const data = await res.json();
      const me = data.find((p: any) => p.id === agent.id);
      return me || { arenaWins: 0, arenaLosses: 0, arenaWinStreak: 0, arenaBestStreak: 0, arenaRating: 1000 };
    },
    enabled: !!agent?.id,
  });

  useEffect(() => {
    if (regSuccess && regHash) {
      toast({ title: "Agent registered on-chain!" });
      refetchAgentId();
    }
  }, [regSuccess, regHash]);

  useEffect(() => {
    if (joinSuccess && joinHash && joiningDuelId) {
      toast({ title: "Joined on-chain!", description: "Syncing to server..." });

      const doSyncJoin = async (retried = false) => {
        const token = localStorage.getItem("honeycomb_jwt");
        try {
          const res = await fetch(`/api/trading-duels/${joiningDuelId}/sync-join`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "Authorization": `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              txHash: joinHash,
              joinerOnChainAgentId: onChainAgentId?.toString() || "0",
            }),
          });

          if (res.ok) {
            const data = await res.json();
            toast({ title: "Battle started!" });
            queryClient.invalidateQueries({ queryKey: ["/api/trading-duels"] });
            navigate(`/arena/${data.id}`);
          } else if (res.status === 401 && !retried && address) {
            try {
              const nonceRes = await fetch("/api/auth/nonce", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address }),
              });
              const { nonce } = await nonceRes.json();
              const message = `Sign this message to authenticate with Honeycomb.\n\nNonce: ${nonce}`;
              const signature = await signMessageAsync({ message });
              const verifyRes = await fetch("/api/auth/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, signature, nonce }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.token) {
                localStorage.setItem("honeycomb_jwt", verifyData.token);
                await doSyncJoin(true);
              }
            } catch {
              toast({ title: "Session expired", description: "BNB is safe on-chain. Please refresh.", variant: "destructive" });
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            toast({ title: "Sync failed", description: errData.message || "Joined on-chain but failed to sync.", variant: "destructive" });
          }
        } catch {
          toast({ title: "Network error", description: "Joined on-chain but failed to sync. Please refresh.", variant: "destructive" });
        }
        setJoiningDuelId(null);
      };
      doSyncJoin();
    }
  }, [joinSuccess, joinHash, joiningDuelId]);

  useEffect(() => {
    if (joinError) {
      const errorMsg = joinError.message?.includes("user rejected")
        ? "Transaction rejected"
        : joinError.message?.slice(0, 100) || "Failed to join duel";
      toast({ title: "Transaction failed", description: errorMsg, variant: "destructive" });
      setJoiningDuelId(null);
    }
  }, [joinError]);

  const handleOnChainJoin = async (duel: TradingDuel) => {
    if (!agent || !address) return;

    if (!duel.onChainDuelId || duel.onChainDuelId === "0") {
      toast({ title: "Invalid duel", description: "This duel has no valid on-chain ID.", variant: "destructive" });
      return;
    }

    setJoiningDuelId(duel.id);

    if (!hasAgent) {
      toast({ title: "Registering on-chain agent...", description: "First-time setup required" });
      registerAgent("bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku");
      const waitForReg = setInterval(async () => {
        const result = await refetchAgentId();
        if (result.data && result.data > BigInt(0)) {
          clearInterval(waitForReg);
          const stakeWei = parseEther(duel.potAmount);
          const onChainId = BigInt(duel.onChainDuelId!);
          contractJoinDuel(onChainId, result.data, BigInt(100), stakeWei);
        }
      }, 2000);
      setTimeout(() => { clearInterval(waitForReg); setJoiningDuelId(null); }, 60000);
      return;
    }

    const stakeWei = parseEther(duel.potAmount);
    const onChainId = BigInt(duel.onChainDuelId);
    contractJoinDuel(onChainId, onChainAgentId!, BigInt(100), stakeWei);
  };

  const joinMutation = useMutation({
    mutationFn: (duelId: string) => apiRequest("POST", `/api/trading-duels/${duelId}/join`, {
      joinerId: agent?.id,
    }),
    onSuccess: (data: any) => {
      toast({ title: "Joined!" });
      navigate(`/arena/${data.id}`);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const joinByCodeMutation = useMutation({
    mutationFn: (code: string) => apiRequest("POST", "/api/trading-duels/join-by-code", {
      joinCode: code,
      joinerId: agent?.id,
    }),
    onSuccess: (data: any) => {
      toast({ title: "Joined via code!" });
      setJoinCode("");
      setShowJoinCode(false);
      navigate(`/arena/${data.id}`);
    },
    onError: (e: Error) => toast({ title: "Invalid code", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      {myStats && (myStats.arenaWins > 0 || myStats.arenaLosses > 0) && (
        <div className="flex items-center gap-3 flex-wrap arena-animate-up mb-2" data-testid="player-arena-stats">
          <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1" style={{
            borderColor: `${getRankTier(myStats.arenaRating).color}50`,
            color: getRankTier(myStats.arenaRating).color,
          }}>
            <Medal className="w-3 h-3" /> {getRankTier(myStats.arenaRating).name} {myStats.arenaRating}
          </Badge>
          <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1">
            <Trophy className="w-3 h-3" /> {myStats.arenaWins}W-{myStats.arenaLosses}L
          </Badge>
          {myStats.arenaWinStreak >= 2 && (
            <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1 border-orange-400/50 text-orange-400">
              <Flame className="w-3 h-3" /> {myStats.arenaWinStreak} Streak
            </Badge>
          )}
          {myStats.arenaBestStreak >= 3 && (
            <Badge variant="outline" className="text-[10px] py-0.5 px-2 gap-1 border-amber-400/30 text-amber-300">
              <Star className="w-3 h-3" /> Best: {myStats.arenaBestStreak}
            </Badge>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 arena-animate-up-d1 mb-4 sm:mb-6">
        <StatBadge icon={DollarSign} label="Start" value="$1M Fake" color="green" />
        <StatBadge icon={Target} label="Leverage" value="Up to 50x" color="amber" />
        <StatBadge icon={Trophy} label="Winner" value="Takes 90%" color="blue" />
        <StatBadge icon={Activity} label="Charts" value="Real-Time" color="red" />
      </div>

      {showJoinCode ? (
        <Card className="arena-glow-card mb-4 arena-animate-up">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-amber-400 shrink-0" />
              <Input
                placeholder="Enter 6-digit join code"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                className="font-mono text-center tracking-widest uppercase"
                maxLength={6}
                data-testid="input-join-code"
              />
              <Button
                size="sm"
                onClick={() => joinByCodeMutation.mutate(joinCode)}
                disabled={joinCode.length !== 6 || joinByCodeMutation.isPending || !agent}
                data-testid="button-submit-join-code"
              >
                {joinByCodeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setShowJoinCode(false); setJoinCode(""); }}
                data-testid="button-close-join-code"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end mb-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowJoinCode(true)}
            data-testid="button-open-join-code"
          >
            <Hash className="w-3.5 h-3.5 mr-1.5" /> Join by Code
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 arena-animate-left">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="open" className="flex-1 gap-1" data-testid="tab-open">
                <Users className="w-4 h-4" /> Open Duels
              </TabsTrigger>
              <TabsTrigger value="live" className="flex-1 gap-1" data-testid="tab-live">
                <Activity className="w-4 h-4" /> Live
              </TabsTrigger>
              <TabsTrigger value="settled" className="flex-1 gap-1" data-testid="tab-settled">
                <Trophy className="w-4 h-4" /> Completed
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2 mt-2 mb-1">
              <span className="text-xs text-muted-foreground mr-1">Filter:</span>
              {(["all", "pvp", "ava"] as const).map(mt => (
                <Button
                  key={mt}
                  size="sm"
                  variant={lobbyMatchType === mt ? "default" : "outline"}
                  onClick={() => setLobbyMatchType(mt)}
                  data-testid={`button-filter-${mt}`}
                  className="text-xs h-7 px-2.5"
                >
                  {mt === "all" ? "All" : mt === "pvp" ? "PvP" : "AvA"}
                </Button>
              ))}
            </div>
            <TabsContent value={tab} className="space-y-2 mt-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                  <p className="text-sm text-muted-foreground">Loading duels...</p>
                </div>
              ) : duels.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <div className="w-14 h-14 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-3">
                      <Swords className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No {tab} duels found</p>
                    <p className="text-xs text-muted-foreground mt-1">Create one to start battling</p>
                  </CardContent>
                </Card>
              ) : (
                duels.map((d, i) => (
                  <DuelLobbyCard
                    key={d.id}
                    duel={d}
                    index={i}
                    onJoin={(id) => {
                      if (!agent) {
                        toast({ title: "Connect wallet first", variant: "destructive" });
                        return;
                      }
                      const duel = duels.find(dd => dd.id === id);
                      if (duel?.isOnChain) {
                        handleOnChainJoin(duel);
                      } else {
                        joinMutation.mutate(id);
                      }
                    }}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
        <div className="space-y-4">
          <CreateDuelPanel onCreated={() => setTab("open")} />
          <Card className="arena-glow-card overflow-visible">
            <ArenaChat scopeType="lobby" maxHeight="240px" />
          </Card>
          <ArenaLeaderboard agentId={agent?.id} />
        </div>
      </div>
    </>
  );
}

interface SpectatePosition {
  id: string;
  side: string;
  leverage: number;
  sizeUsdt: string;
  entryPrice: string;
  exitPrice: string | null;
  pnl: string | null;
  isOpen: boolean;
  openedAt: string;
  closedAt: string | null;
}

interface SpectatePlayer {
  id: string;
  name: string;
  avatarUrl: string | null;
  isBot: boolean;
  relPnlPct: number;
  balance: number;
  openPositions: number;
  positions: SpectatePosition[];
}

interface SpectateData {
  id: string;
  status: string;
  assetSymbol: string;
  durationSeconds: number;
  initialBalance: string;
  startedAt: string;
  endsAt: string;
  winnerId: string | null;
  leadChanges: number;
  clutchFlag: boolean;
  seriesId: string | null;
  seriesRound: number | null;
  potAmount: string;
  matchType: string;
  creator: SpectatePlayer;
  joiner: SpectatePlayer | null;
  leading: string | null;
}

function FighterHPBar({
  player,
  side,
  isLeading,
  initialBalance,
}: {
  player: SpectatePlayer;
  side: "left" | "right";
  isLeading: boolean;
  initialBalance: number;
}) {
  const hpPct = Math.max(0, Math.min(200, ((player.balance / initialBalance) * 100)));
  const hpNorm = Math.min(100, hpPct);
  const isUp = player.relPnlPct >= 0;
  const barColor = isUp
    ? "linear-gradient(90deg, #0ecb81 0%, #00ff88 100%)"
    : "linear-gradient(90deg, #ea3943 0%, #ff6b6b 100%)";
  const glowColor = isUp ? "rgba(14,203,129,0.5)" : "rgba(234,57,67,0.5)";

  return (
    <div className={`flex-1 min-w-0 ${side === "right" ? "text-right" : ""}`}>
      <div className={`flex items-center gap-2 mb-1 ${side === "right" ? "flex-row-reverse" : ""}`}>
        <div className="relative shrink-0">
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-md flex items-center justify-center ${isLeading ? "ring-2 ring-amber-400" : ""}`}
            style={{
              background: player.isBot
                ? "linear-gradient(135deg, #7c3aed30, #a855f720)"
                : side === "left"
                  ? "linear-gradient(135deg, #3b82f630, #2563eb20)"
                  : "linear-gradient(135deg, #ef444430, #dc262620)",
              boxShadow: isLeading ? "0 0 12px rgba(245,158,11,0.4)" : undefined,
            }}
          >
            {player.isBot ? (
              <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            ) : (
              <Shield className={`w-5 h-5 sm:w-6 sm:h-6 ${side === "left" ? "text-blue-400" : "text-red-400"}`} />
            )}
          </div>
          {isLeading && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "#f0b90b", boxShadow: "0 0 6px rgba(240,185,11,0.6)" }}>
              <Crown className="w-2.5 h-2.5 text-black" />
            </div>
          )}
        </div>
        <div className={`min-w-0 ${side === "right" ? "text-right" : ""}`}>
          <div className="flex items-center gap-1.5 flex-wrap" style={{ justifyContent: side === "right" ? "flex-end" : "flex-start" }}>
            <span className="font-bold text-sm sm:text-base text-white truncate max-w-[120px]" data-testid={`text-spectate-${side}-name`}>
              {player.name}
            </span>
            {player.isBot && (
              <span className="text-[9px] px-1 py-0 rounded font-bold" style={{ background: "#7c3aed30", color: "#a78bfa" }}>AI</span>
            )}
          </div>
          <div className="text-[10px] sm:text-xs font-mono" style={{ color: "#848e9c" }}>
            {player.openPositions > 0 && (
              <span className="mr-2" style={{ color: "#f0b90b" }}>
                {player.openPositions} open
              </span>
            )}
            {formatMoney(player.balance)}
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-2 ${side === "right" ? "flex-row-reverse" : ""}`}>
        <div className="flex-1 h-5 sm:h-6 rounded-sm overflow-hidden relative" style={{ background: "#1a1d23", border: "1px solid #2a2d35" }}>
          <div
            className="h-full rounded-sm transition-all duration-700"
            style={{
              width: `${hpNorm}%`,
              background: barColor,
              boxShadow: `0 0 8px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.15)`,
              [side === "right" ? "marginLeft" : "marginRight"]: side === "right" ? "auto" : undefined,
              float: side === "right" ? "right" : undefined,
            }}
            data-testid={`bar-spectate-${side}-hp`}
          />
          <div className="absolute inset-0 flex items-center" style={{ justifyContent: side === "right" ? "flex-end" : "flex-start", padding: "0 6px" }}>
            <span
              className="text-[10px] sm:text-xs font-bold font-mono drop-shadow-lg"
              style={{ color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
              data-testid={`text-spectate-${side}-pnl`}
            >
              {isUp ? "+" : ""}{player.relPnlPct.toFixed(2)}%
            </span>
          </div>
          {hpPct > 100 && (
            <div className="absolute top-0 h-full w-1 rounded-full" style={{
              [side === "right" ? "left" : "right"]: 0,
              background: "#f0b90b",
              boxShadow: "0 0 6px rgba(240,185,11,0.8)",
              animation: "arena-glow-pulse 1s ease-in-out infinite",
            }} />
          )}
        </div>
      </div>
    </div>
  );
}

function TradeFeed({ positions, playerName, side }: { positions: SpectatePosition[]; playerName: string; side: "left" | "right" }) {
  const sorted = [...positions].sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()).slice(0, 8);
  const sideColor = side === "left" ? "#3b82f6" : "#ef4444";

  if (sorted.length === 0) {
    return (
      <div className="text-center py-3">
        <span className="text-[10px]" style={{ color: "#848e9c" }}>No trades yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sorted.map((pos) => {
        const pnlVal = pos.pnl ? parseFloat(pos.pnl) : null;
        const isLong = pos.side === "long";
        return (
          <div
            key={pos.id}
            className="flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] sm:text-[11px]"
            style={{ background: "#0d1117", borderLeft: `2px solid ${sideColor}40` }}
            data-testid={`trade-feed-${pos.id}`}
          >
            <span style={{ color: isLong ? "#0ecb81" : "#ea3943" }} className="font-bold shrink-0">
              {isLong ? "LONG" : "SHORT"}
            </span>
            <span className="font-mono shrink-0" style={{ color: "#f0b90b" }}>
              {pos.leverage}x
            </span>
            <span className="font-mono truncate" style={{ color: "#848e9c" }}>
              ${parseFloat(pos.sizeUsdt).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="ml-auto font-mono font-bold shrink-0" style={{
              color: pos.isOpen ? "#f0b90b" : pnlVal && pnlVal >= 0 ? "#0ecb81" : "#ea3943",
            }}>
              {pos.isOpen ? "OPEN" : pnlVal ? `${pnlVal >= 0 ? "+" : ""}$${Math.abs(pnlVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "CLOSED"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SpectatorView({ duelId }: { duelId: string }) {
  const { toast } = useToast();
  const [currentPrice, setCurrentPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [priceTicks, setPriceTicks] = useState<{ time: number; price: number }[]>([]);
  const [chartWidth, setChartWidth] = useState(600);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const prevLeadRef = useRef<string | null>(null);
  const [leadFlash, setLeadFlash] = useState(false);
  const [showWinnerSplash, setShowWinnerSplash] = useState(false);
  const prevStatusRef = useRef<string>("");

  const { data: spectateData, isLoading } = useQuery<SpectateData>({
    queryKey: ["/api/trading-duels", duelId, "spectate"],
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (spectateData?.leading && prevLeadRef.current && spectateData.leading !== prevLeadRef.current) {
      setLeadFlash(true);
      playTradeSound("leadchange");
      setTimeout(() => setLeadFlash(false), 1500);
    }
    prevLeadRef.current = spectateData?.leading || null;
  }, [spectateData?.leading]);

  useEffect(() => {
    if (spectateData?.status === "settled" && prevStatusRef.current === "active") {
      setShowWinnerSplash(true);
      playTradeSound(spectateData.winnerId ? "victory" : "defeat");
      setTimeout(() => setShowWinnerSplash(false), 5000);
    }
    prevStatusRef.current = spectateData?.status || "";
  }, [spectateData?.status]);

  useEffect(() => {
    if (!spectateData?.assetSymbol) return;
    const MAX_TICKS = 300;
    const TICK_INTERVAL = 250;
    let lastTickTime = 0;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let dead = false;

    const connectWs = () => {
      if (dead) return;
      const symbol = spectateData.assetSymbol.toLowerCase();
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`);
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          const p = parseFloat(data.p);
          if (!p || isNaN(p)) return;
          setCurrentPrice(prev => {
            if (prev > 0) setPriceChange(((p - prev) / prev) * 100);
            return p;
          });
          const now = Date.now();
          if (now - lastTickTime >= TICK_INTERVAL) {
            lastTickTime = now;
            setPriceTicks(prev => {
              const next = [...prev, { time: now, price: p }];
              return next.length > MAX_TICKS ? next.slice(next.length - MAX_TICKS) : next;
            });
          }
        } catch {}
      };
      ws.onclose = () => { if (!dead) reconnectTimer = setTimeout(connectWs, 2000); };
      ws.onerror = () => ws?.close();
    };

    const fetchInitialPrice = async () => {
      try {
        const res = await fetch(`/api/trading-duels/binance/ticker?symbol=${spectateData.assetSymbol}`);
        const data = await res.json();
        if (data.price) {
          const p = parseFloat(data.price);
          setCurrentPrice(p);
          setPriceTicks([{ time: Date.now(), price: p }]);
        }
      } catch {}
    };

    fetchInitialPrice().then(connectWs);
    return () => { dead = true; clearTimeout(reconnectTimer); if (ws) ws.close(); };
  }, [spectateData?.assetSymbol]);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) setChartWidth(Math.max(300, entry.contentRect.width - 20));
    });
    if (chartContainerRef.current) obs.observe(chartContainerRef.current);
    return () => obs.disconnect();
  }, []);

  if (isLoading || !spectateData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3" style={{ background: "#0b0e11" }}>
        <div className="relative">
          <div className="w-16 h-16 rounded-md flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b30, #ea580c20)" }}>
            <Eye className="w-8 h-8 text-amber-400" />
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-amber-400 absolute -bottom-1 -right-1" />
        </div>
        <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Connecting to Arena...</span>
      </div>
    );
  }

  const assetInfo = ASSETS.find(a => a.symbol === spectateData.assetSymbol) || ASSETS[0];
  const isActive = spectateData.status === "active";
  const isSettled = spectateData.status === "settled";
  const initBal = parseFloat(spectateData.initialBalance || "1000000");
  const priceUp = priceChange >= 0;

  const allTradeMarkers: TradeMarker[] = [];
  const allPlayerPositions = [
    ...(spectateData.creator.positions || []),
    ...(spectateData.joiner?.positions || []),
  ];
  for (const p of allPlayerPositions) {
    if (p.isOpen) {
      allTradeMarkers.push({
        time: new Date(p.openedAt).getTime(),
        price: parseFloat(p.entryPrice),
        side: p.side as "long" | "short",
        action: "open",
        leverage: p.leverage,
      });
    } else {
      allTradeMarkers.push({
        time: new Date(p.openedAt).getTime(),
        price: parseFloat(p.entryPrice),
        side: p.side as "long" | "short",
        action: "open",
        leverage: p.leverage,
      });
      if (p.exitPrice) {
        allTradeMarkers.push({
          time: new Date(p.closedAt || p.openedAt).getTime(),
          price: parseFloat(p.exitPrice),
          side: p.side as "long" | "short",
          action: "close",
          pnl: p.pnl ? parseFloat(p.pnl) : undefined,
        });
      }
    }
  }

  return (
    <div className="min-h-screen relative" style={{ background: "#0b0e11" }}>
      <style>{`
        @keyframes spectate-flash { 0%,100%{opacity:0} 50%{opacity:1} }
        @keyframes spectate-winner-in { 0%{transform:scale(0.5) rotate(-5deg);opacity:0} 50%{transform:scale(1.1) rotate(2deg);opacity:1} 100%{transform:scale(1) rotate(0deg);opacity:1} }
        @keyframes spectate-pulse-ring { 0%{transform:scale(1);opacity:0.5} 100%{transform:scale(2);opacity:0} }
        @keyframes spectate-crown-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      `}</style>

      {leadFlash && (
        <div className="absolute inset-0 z-50 pointer-events-none" style={{ background: "radial-gradient(circle at center, rgba(240,185,11,0.15), transparent 70%)", animation: "spectate-flash 0.7s ease-out" }} />
      )}

      {showWinnerSplash && spectateData.winnerId && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div style={{ animation: "spectate-winner-in 0.8s ease-out forwards" }} className="text-center">
            <div className="relative inline-block mb-4">
              <Crown className="w-16 h-16 text-amber-400" style={{ animation: "spectate-crown-bounce 1s ease-in-out infinite", filter: "drop-shadow(0 0 20px rgba(245,158,11,0.6))" }} />
              <div className="absolute inset-0 rounded-full" style={{ animation: "spectate-pulse-ring 1.5s ease-out infinite", border: "2px solid rgba(245,158,11,0.4)" }} />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white mb-2" data-testid="text-spectate-winner-splash">
              {spectateData.winnerId === spectateData.creator.id ? spectateData.creator.name : spectateData.joiner?.name}
            </div>
            <div className="text-xl font-bold" style={{ color: "#f0b90b", textShadow: "0 0 20px rgba(240,185,11,0.5)" }}>
              WINS!
            </div>
            <div className="text-sm mt-2" style={{ color: "#848e9c" }}>
              Prize: {(parseFloat(spectateData.potAmount) * 2 * 0.9).toFixed(3)} BNB
            </div>
          </div>
        </div>
      )}

      <div className="border-b" style={{ borderColor: "#1e2329", background: "linear-gradient(180deg, #0f1218, #0b0e11)" }}>
        <div className="px-2 sm:px-4 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">SPECTATING</span>
              <Badge variant="outline" className="text-[9px] py-0 px-1 gap-1" style={{
                borderColor: isActive ? "#0ecb81" : isSettled ? "#848e9c" : "#f0b90b",
                color: isActive ? "#0ecb81" : isSettled ? "#848e9c" : "#f0b90b",
              }}>
                {isActive && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#0ecb81", boxShadow: "0 0 4px #0ecb81", animation: "arena-glow-pulse 1.5s ease-in-out infinite" }} />}
                {isActive ? "LIVE" : isSettled ? "FINISHED" : spectateData.status.toUpperCase()}
              </Badge>
              {spectateData.matchType && (
                <Badge variant="outline" className="text-[9px] py-0 px-1" style={{
                  borderColor: spectateData.matchType === "ava" ? "#7c3aed40" : "#f0b90b40",
                  color: spectateData.matchType === "ava" ? "#a78bfa" : "#f0b90b",
                }}>
                  {spectateData.matchType === "ava" ? "AvA" : spectateData.matchType === "pvp" ? "PvP" : "Practice"}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-white">{assetInfo.short}<span style={{ color: "#848e9c" }}>/USDT</span></span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Spectator link copied!" });
                }}
                data-testid="button-copy-spectate-link"
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-2 sm:px-4 py-2 sm:py-3 border-b" style={{ borderColor: "#1e2329", background: "#0d1117" }}>
        <div className="flex items-start gap-2 sm:gap-3">
          <FighterHPBar
            player={spectateData.creator}
            side="left"
            isLeading={spectateData.leading === spectateData.creator.id}
            initialBalance={initBal}
          />

          <div className="shrink-0 flex flex-col items-center gap-1 px-1">
            {isActive && spectateData.endsAt ? (
              <CountdownTimer endsAt={spectateData.endsAt} />
            ) : (
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center"
                style={{
                  background: isSettled
                    ? "linear-gradient(135deg, #f0b90b40, #f59e0b20)"
                    : "linear-gradient(135deg, #f59e0b30, #ea580c20)",
                  boxShadow: "0 0 15px rgba(245,158,11,0.2)",
                }}
              >
                <span className="text-base sm:text-lg font-black" style={{ color: "#f0b90b" }}>VS</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-mono" style={{ color: "#848e9c" }}>{spectateData.potAmount} BNB</span>
              {spectateData.leadChanges > 0 && (
                <span className="text-[9px] font-mono" style={{ color: "#f0b90b" }}>
                  <Zap className="w-2.5 h-2.5 inline" />{spectateData.leadChanges}
                </span>
              )}
            </div>
            {spectateData.clutchFlag && (
              <Badge variant="outline" className="text-[8px] py-0 px-1 border-red-500/30 text-red-400">CLUTCH</Badge>
            )}
          </div>

          <FighterHPBar
            player={spectateData.joiner || { id: "", name: "Waiting...", avatarUrl: null, isBot: false, relPnlPct: 0, balance: initBal, openPositions: 0, positions: [] }}
            side="right"
            isLeading={spectateData.leading === spectateData.joiner?.id}
            initialBalance={initBal}
          />
        </div>
      </div>

      {isActive && currentPrice > 0 && (
        <div className="px-2 sm:px-4 py-1 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: "#1e2329" }}>
          <span className="font-mono text-lg sm:text-xl font-bold" style={{ color: priceUp ? "#0ecb81" : "#ea3943" }} data-testid="text-spectate-price">
            {formatPrice(currentPrice)}
          </span>
          {priceChange !== 0 && (
            <span className="text-[11px] font-mono" style={{ color: priceUp ? "#0ecb81" : "#ea3943" }}>
              {priceUp ? "+" : ""}{priceChange.toFixed(3)}%
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        <div ref={chartContainerRef} className="flex-1 min-w-0 lg:border-r relative" style={{ borderColor: "#1e2329" }}>
          <div className="absolute inset-0 pointer-events-none z-10 arena-scanlines" />
          <div className="p-1 relative">
            <LiveLineChart
              priceTicks={priceTicks}
              width={chartWidth}
              height={window.innerWidth < 640 ? 240 : 380}
              currentPrice={currentPrice}
              tradeMarkers={allTradeMarkers}
              openPositions={[]}
            />
          </div>
        </div>

        <div className="lg:w-[320px] shrink-0" style={{ background: "#0b0e11" }}>
          <div className="border-b" style={{ borderColor: "#1e2329" }}>
            <div className="px-3 py-2 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">Live Trade Feed</span>
            </div>
          </div>

          <div className="border-b" style={{ borderColor: "#1e2329" }}>
            <div className="px-3 py-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: "#3b82f6" }} />
              <span className="text-[11px] font-bold text-white truncate" data-testid="text-feed-creator">{spectateData.creator.name}</span>
              {spectateData.creator.isBot && <Cpu className="w-3 h-3 text-purple-400 shrink-0" />}
            </div>
            <div className="px-2 pb-2 max-h-[140px] overflow-y-auto">
              <TradeFeed positions={spectateData.creator.positions || []} playerName={spectateData.creator.name} side="left" />
            </div>
          </div>

          <div>
            <div className="px-3 py-1.5 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />
              <span className="text-[11px] font-bold text-white truncate" data-testid="text-feed-joiner">{spectateData.joiner?.name || "Waiting..."}</span>
              {spectateData.joiner?.isBot && <Cpu className="w-3 h-3 text-purple-400 shrink-0" />}
            </div>
            <div className="px-2 pb-2 max-h-[140px] overflow-y-auto">
              <TradeFeed positions={spectateData.joiner?.positions || []} playerName={spectateData.joiner?.name || ""} side="right" />
            </div>
          </div>

          {isSettled && spectateData.winnerId && !showWinnerSplash && (
            <div className="px-3 py-3 border-t" style={{ borderColor: "#1e2329" }}>
              <div className="p-3 rounded-md text-center" style={{ background: "linear-gradient(135deg, #f0b90b15, #f59e0b08)", border: "1px solid #f0b90b30" }} data-testid="card-spectate-winner">
                <Crown className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <div className="text-sm font-bold" style={{ color: "#f0b90b" }}>
                  {spectateData.winnerId === spectateData.creator.id ? spectateData.creator.name : spectateData.joiner?.name} WINS!
                </div>
                <div className="text-[11px] mt-1" style={{ color: "#848e9c" }}>
                  Prize: {(parseFloat(spectateData.potAmount) * 2 * 0.9).toFixed(3)} BNB
                </div>
              </div>
            </div>
          )}

          <ArenaChat scopeType="duel" scopeId={duelId} maxHeight="160px" compact />
        </div>
      </div>
    </div>
  );
}

const ARENA_GAMES = [
  {
    id: "runner",
    name: "HoneyRunner",
    tagline: "Earn Nectar Points Now",
    description: "Dodge obstacles, collect coins, and rack up Nectar Points. Every run earns you $HONEY allocation. Play now to maximize your share!",
    icon: Zap,
    color: "#f59e0b",
    colorDim: "rgba(245,158,11,0.12)",
    tags: ["Play Now", "Earn Points", "Solo"],
    players: "Solo",
    featured: true,
    comingSoon: false,
    image: arenaRunnerImg,
  },
  {
    id: "trading",
    name: "Trading Arena",
    tagline: "1v1 Leveraged Trading Battles",
    description: "Trade with $1M fake USDT on real charts. Open long/short positions with up to 50x leverage. Winner takes the pot.",
    icon: TrendingUp,
    color: "#0ecb81",
    colorDim: "rgba(14,203,129,0.12)",
    tags: ["PvP", "BNB Stakes", "Live Charts"],
    players: "1v1",
    featured: false,
    comingSoon: false,
    image: arenaTradingImg,
  },
  {
    id: "predict",
    name: "Predict Duel",
    tagline: "Price Prediction Showdown",
    description: "Predict if crypto prices go up or down. Stake BNB and battle opponents on real market movements.",
    icon: Target,
    color: "#a855f7",
    colorDim: "rgba(168,85,247,0.12)",
    tags: ["PvP", "BNB Stakes", "On-Chain"],
    players: "1v1",
    featured: false,
    comingSoon: false,
    image: arenaPredictImg,
  },
  {
    id: "trivia",
    name: "Trivia Battle",
    tagline: "Test Your Crypto Knowledge",
    description: "Answer crypto trivia questions faster than your opponent. Multiple categories and difficulty levels.",
    icon: Brain,
    color: "#f59e0b",
    colorDim: "rgba(245,158,11,0.12)",
    tags: ["PvP", "Knowledge", "Timed"],
    players: "1v1",
    comingSoon: false,
    image: arenaTriviaImg,
  },
  {
    id: "fighter",
    name: "Crypto Fighters",
    tagline: "Turn-Based Combat",
    description: "Pick your crypto fighter and battle with unique moves. Attack, defend, counter, or unleash special abilities.",
    icon: Swords,
    color: "#ef4444",
    colorDim: "rgba(239,68,68,0.12)",
    tags: ["PvP", "Strategy", "Turn-Based"],
    players: "1v1",
    comingSoon: false,
    image: arenaFighterImg,
  },
  {
    id: "nfa-tunnel",
    name: "NFA Tunnel Dash",
    tagline: "NFA-Gated Tunnel Runner",
    description: "Race through a neon tunnel with your NFA agent. Traits modify gameplay — agility, focus, and luck shape your run. Ranked leaderboard.",
    icon: Zap,
    color: "#00f0ff",
    colorDim: "rgba(0,240,255,0.12)",
    tags: ["NFA-Gated", "Earn Points", "Solo"],
    players: "Solo",
    featured: false,
    comingSoon: false,
    image: arenaNfaTunnelImg,
  },
];

const uiSoundEnabled = { current: true };

function playUISound(type: "hover" | "select" | "back") {
  if (!uiSoundEnabled.current) return;
  try {
    const ctx = getAudioCtx();
    const t = ctx.currentTime;
    if (type === "hover") {
      tone(ctx, 2400, "sine", 0.03, t, 0.04);
    } else if (type === "select") {
      tone(ctx, 440, "sine", 0.1, t, 0.06);
      tone(ctx, 880, "sine", 0.08, t + 0.04, 0.08);
      tone(ctx, 1320, "sine", 0.06, t + 0.08, 0.1);
      chips(ctx, t, 3, 0.06);
    } else if (type === "back") {
      tone(ctx, 880, "sine", 0.08, t, 0.06, 440);
      tone(ctx, 440, "sine", 0.06, t + 0.03, 0.08, 220);
    }
  } catch {}
}

function GameCardParticles({ color }: { color: string }) {
  const particles = Array.from({ length: 6 }, (_, i) => ({
    left: 15 + Math.random() * 70,
    delay: i * 0.4 + Math.random() * 0.5,
    size: 2 + Math.random() * 3,
    dur: 2 + Math.random() * 1.5,
  }));
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: "hidden" }} aria-hidden="true">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: color,
            left: `${p.left}%`,
            bottom: "10%",
            opacity: 0,
            animation: `arena-particle-float ${p.dur}s ${p.delay}s ease-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

function FuturisticHero() {
  return (
    <div className="relative text-center py-8 sm:py-12 arena-animate-up">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-amber-500/10"
          style={{ animation: "arena-hex-rotate 20s linear infinite" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full border border-amber-500/5"
          style={{ animation: "arena-hex-rotate 30s linear infinite reverse" }} />
      </div>

      <div className="relative z-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 arena-badge-blink">
          <Flame className="w-3 h-3 text-amber-400" />
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400/80">Earn Points Now</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight arena-title-glow"
          style={{ color: "hsl(var(--foreground))" }}>
          GAMES ARENA
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
          Play HoneyRunner to earn Nectar Points. Mint your Bee agent to start earning and claim your $HONEY allocation.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
          <Link href="/register">
            <Button size="sm" className="text-xs gap-1.5 bg-amber-500 text-black border-amber-600" data-testid="button-mint-agent-cta">
              <Sparkles className="w-3 h-3" />
              Mint Your Bee Agent
            </Button>

          </Link>
          <Link href="/points">
            <Button variant="outline" size="sm" className="text-xs gap-1.5" data-testid="button-view-points">
              <Star className="w-3 h-3" />
              View Points Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function GameCard({ game, index, onSelect }: {
  game: typeof ARENA_GAMES[0];
  index: number;
  onSelect: (id: string) => void;
}) {
  const Icon = game.icon;
  const revealClass = `arena-card-reveal${index > 0 ? `-d${Math.min(index, 4)}` : ""}`;
  const isComingSoon = (game as any).comingSoon;
  const isFeaturedRunner = game.id === "runner";

  return (
    <div
      className={`arena-game-card rounded-md ${revealClass} ${isFeaturedRunner ? "sm:col-span-2 lg:col-span-3" : ""}`}
      onClick={() => { if (!isComingSoon) { playUISound("select"); onSelect(game.id); } }}
      onMouseEnter={() => { if (!isComingSoon) playUISound("hover"); }}
      data-testid={`card-game-${game.id}`}
      role={isComingSoon ? undefined : "button"}
      tabIndex={isComingSoon ? -1 : 0}
      onKeyDown={(e) => { if (!isComingSoon && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); playUISound("select"); onSelect(game.id); } }}
      style={isComingSoon ? { cursor: "default" } : undefined}
    >
      <div className={`relative rounded-md border bg-card overflow-hidden ${isComingSoon ? "border-border/30 opacity-60" : "border-border/50"} ${isFeaturedRunner ? "border-amber-500/40" : ""}`}>
        <div className={`relative overflow-hidden ${isFeaturedRunner ? "h-40 sm:h-48" : "h-28 sm:h-32"}`}>
          <img
            src={game.image}
            alt={game.name}
            className={`w-full h-full object-cover ${isComingSoon ? "grayscale" : ""}`}
            loading="lazy"
          />
          <div className="absolute inset-0" style={{
            background: `linear-gradient(to top, hsl(var(--card)) 0%, hsl(var(--card) / 0.7) 30%, transparent 100%)`,
          }} />
          <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg, ${game.color}20 0%, transparent 60%)`,
          }} />
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            {isComingSoon ? (
              <Badge variant="secondary" className="text-[10px] font-mono">
                <Clock className="w-3 h-3 mr-0.5" /> COMING SOON
              </Badge>
            ) : game.featured ? (
              <Badge variant="secondary" className="text-[10px] font-mono bg-amber-500/20 text-amber-400 border-amber-500/30">
                <Sparkles className="w-3 h-3 mr-0.5" /> PLAY TO EARN
              </Badge>
            ) : null}
            {!isComingSoon && (
              <Badge variant="outline" className="text-[10px] font-mono bg-background/60 backdrop-blur-sm">
                {game.players}
              </Badge>
            )}
          </div>

          {isComingSoon && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="px-4 py-2 rounded-md bg-background/80 backdrop-blur-sm border border-border/50">
                <p className="text-sm font-bold text-muted-foreground">Coming Soon</p>
              </div>
            </div>
          )}

          <div className={`absolute bottom-3 left-4 flex items-center gap-2.5 ${isFeaturedRunner ? "bottom-4 left-5" : ""}`}>
            <div className={`rounded-md flex items-center justify-center shrink-0 backdrop-blur-sm ${isFeaturedRunner ? "w-12 h-12" : "w-10 h-10"}`}
              style={{ background: `${game.color}30`, border: `1px solid ${game.color}40` }}>
              <Icon className={`arena-icon-pulse ${isFeaturedRunner ? "w-6 h-6" : "w-5 h-5"}`} style={{ color: isComingSoon ? undefined : game.color }} />
            </div>
            <div>
              <h3 className={`font-bold tracking-tight leading-tight ${isFeaturedRunner ? "text-lg sm:text-2xl" : "text-base sm:text-lg"}`} style={{ color: isComingSoon ? "hsl(var(--muted-foreground))" : game.color }}>
                {game.name}
              </h3>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">
                {game.tagline}
              </p>
            </div>
          </div>
        </div>

        {!isComingSoon && (
          <>
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ overflow: "hidden" }}>
              <div className="absolute left-0 right-0 h-[1px]" style={{
                background: `linear-gradient(90deg, transparent, ${game.color}15, transparent)`,
                animation: "arena-scan-line 3s linear infinite",
              }} />
            </div>
            <GameCardParticles color={game.color} />
          </>
        )}

        <div className="relative px-4 pb-4 pt-1">
          <p className={`text-sm text-muted-foreground leading-relaxed mb-3 ${isComingSoon ? "opacity-60" : ""}`}>
            {game.description}
          </p>

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {game.tags.map((tag) => (
                <span key={tag} className={`text-[10px] font-mono px-2 py-0.5 rounded-sm ${isComingSoon ? "opacity-50" : ""}`}
                  style={{ background: `${game.color}10`, color: `${game.color}cc`, border: `1px solid ${game.color}20` }}>
                  {tag}
                </span>
              ))}
            </div>
            {!isComingSoon && (
              <div className="flex items-center gap-1 text-xs font-mono" style={{ color: game.color }}>
                PLAY <ChevronRight className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {isFeaturedRunner && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 gap-1">
                <Star className="w-3 h-3" /> Up to 60 pts/session
              </Badge>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 gap-1">
                <Trophy className="w-3 h-3" /> No daily cap
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GamesArenaLanding({ onSelectGame }: { onSelectGame: (id: string) => void }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  useEffect(() => { uiSoundEnabled.current = soundEnabled; }, [soundEnabled]);

  return (
    <div className="relative max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-6">
      <ArenaBackground />

      <div className="relative z-10">
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setSoundEnabled(!soundEnabled)}
            data-testid="button-toggle-sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-muted-foreground" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </Button>
        </div>

        <FuturisticHero />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {ARENA_GAMES.map((game, i) => (
            <GameCard key={game.id} game={game} index={i} onSelect={onSelectGame} />
          ))}
        </div>

        <CommunityGames onSelectGame={onSelectGame} />

        <div className="mt-8 text-center arena-animate-up-d3">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-md border border-amber-500/20 bg-amber-500/5">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-muted-foreground">Earn Nectar Points with every HoneyRunner session — more games unlocking soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunityGames({ onSelectGame }: { onSelectGame: (id: string) => void }) {
  const { data } = useQuery<{ games: any[] }>({
    queryKey: ["/api/devs/arena/games"],
  });

  if (!data?.games?.length) return null;

  return (
    <div className="mt-8 space-y-4 arena-animate-up-d3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-bold tracking-wider uppercase">Community Games</h2>
        <Badge variant="secondary" className="text-[10px]">{data.games.length}</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {data.games.map((game: any, i: number) => (
          <div
            key={game.id}
            className="arena-game-card rounded-md cursor-pointer"
            onClick={() => { playUISound("select"); onSelectGame(`community-${game.id}`); }}
            onMouseEnter={() => playUISound("hover")}
            data-testid={`card-community-game-${game.id}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); playUISound("select"); onSelectGame(`community-${game.id}`); } }}
          >
            <div className="relative rounded-md border border-border/50 bg-card overflow-hidden">
              <div className="relative h-28 sm:h-32 overflow-hidden">
                {game.thumbnailUrl ? (
                  <img src={game.thumbnailUrl} alt={game.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${game.color}15, ${game.color}30)` }}>
                    <Gamepad2 className="w-10 h-10" style={{ color: `${game.color}80` }} />
                  </div>
                )}
                <div className="absolute inset-0"
                  style={{ background: `linear-gradient(to top, hsl(var(--card)) 0%, transparent 50%, ${game.color}08 100%)` }} />
              </div>
              <div className="absolute top-2 right-2 z-10">
                <Badge variant="outline" className="text-[9px] font-mono border-amber-500/30 text-amber-500 bg-background/80">
                  Community
                </Badge>
              </div>
              <div className="relative px-4 pb-4 pt-1">
                <h3 className="font-bold text-sm mb-0.5" style={{ color: game.color }}>{game.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{game.tagline || game.description}</p>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="text-[10px]">{game.genre}</Badge>
                  <div className="flex items-center gap-1 text-xs font-mono" style={{ color: game.color }}>
                    PLAY <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunityGameEmbed({ gameId, onBack }: { gameId: number; onBack: () => void }) {
  const { data } = useQuery<{ games: any[] }>({
    queryKey: ["/api/devs/arena/games"],
  });
  const game = data?.games?.find((g: any) => g.id === gameId);

  if (!game) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 arena-animate-up">
        <Button size="icon" variant="ghost" onClick={() => { playUISound("back"); onBack(); }} data-testid="button-back-from-community-game">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ background: `${game.color}15`, border: `1px solid ${game.color}25` }}>
            <Gamepad2 className="w-4 h-4" style={{ color: game.color }} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: game.color }}>{game.name}</h2>
            <p className="text-[10px] text-muted-foreground font-mono">{game.studioName} — Community Game</p>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-border/50 overflow-hidden bg-card arena-animate-up">
        <iframe
          src={game.iframeUrl}
          className="w-full border-0"
          style={{ height: "70vh", minHeight: "500px" }}
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title={game.name}
          data-testid={`iframe-community-game-${game.id}`}
        />
      </div>
    </div>
  );
}

function ActiveGameHeader({ gameId, onBack }: { gameId: string; onBack: () => void }) {
  const game = ARENA_GAMES.find(g => g.id === gameId);
  if (!game) return null;
  const Icon = game.icon;

  return (
    <div className="flex items-center gap-3 mb-4 arena-animate-up">
      <Button size="icon" variant="ghost" onClick={() => { playUISound("back"); onBack(); }} data-testid="button-back-to-arena">
        <ArrowLeft className="w-4 h-4" />
      </Button>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-md flex items-center justify-center"
          style={{ background: game.colorDim, border: `1px solid ${game.color}25` }}>
          <Icon className="w-4 h-4" style={{ color: game.color }} />
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: game.color }}>{game.name}</h2>
          <p className="text-[10px] text-muted-foreground font-mono">{game.tagline}</p>
        </div>
      </div>
    </div>
  );
}

export default function TradingArena() {
  const [matchSpectate, paramsSpectate] = useRoute("/arena/:id/spectate");
  const [match, params] = useRoute("/arena/:id");
  const [gameMode, setGameMode] = useState<string | null>(null);

  if (matchSpectate && paramsSpectate?.id) {
    return <SpectatorView duelId={paramsSpectate.id} />;
  }

  if (match && params?.id) {
    return <ActiveDuelView duelId={params.id} />;
  }

  if (!gameMode) {
    return <GamesArenaLanding onSelectGame={setGameMode} />;
  }

  if (gameMode.startsWith("community-")) {
    const communityId = parseInt(gameMode.replace("community-", ""), 10);
    return (
      <div className="relative max-w-5xl mx-auto px-3 sm:p-4 py-4 space-y-2">
        <ArenaBackground />
        <div className="relative z-10">
          <CommunityGameEmbed gameId={communityId} onBack={() => setGameMode(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-5xl mx-auto px-3 sm:p-4 py-4 space-y-2">
      <ArenaBackground />
      <div className="relative z-10">
        <ActiveGameHeader gameId={gameMode} onBack={() => setGameMode(null)} />
        {gameMode === "trading" ? (
          <TradingArenaLobby />
        ) : gameMode === "predict" ? (
          <PredictContent />
        ) : gameMode === "trivia" ? (
          <TriviaContent />
        ) : gameMode === "gamehub" ? (
          null
        ) : gameMode === "runner" ? (
          <HoneyRunnerContent />
        ) : gameMode === "nfa-tunnel" ? (
          <NfaTunnelDashContent />
        ) : (
          <FighterContent />
        )}
      </div>
    </div>
  );
}
