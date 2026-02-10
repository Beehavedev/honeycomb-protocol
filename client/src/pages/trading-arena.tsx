import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useAccount } from "wagmi";
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
} from "lucide-react";
import type { TradingDuel, TradingPosition } from "@shared/schema";

const LazyPredict = lazy(() => import("@/pages/predict"));

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

const ASSETS = [
  { symbol: "BTCUSDT", name: "Bitcoin", short: "BTC" },
  { symbol: "ETHUSDT", name: "Ethereum", short: "ETH" },
  { symbol: "BNBUSDT", name: "BNB", short: "BNB" },
  { symbol: "SOLUSDT", name: "Solana", short: "SOL" },
  { symbol: "DOGEUSDT", name: "Dogecoin", short: "DOGE" },
  { symbol: "XRPUSDT", name: "XRP", short: "XRP" },
];

const DURATIONS = [
  { value: 120, label: "2 min" },
  { value: 300, label: "5 min" },
  { value: 600, label: "10 min" },
  { value: 900, label: "15 min" },
];

function formatMoney(val: number): string {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(2)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
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
      setTimeLeft(left);
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

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function MiniChart({ candles, width = 600, height = 300 }: { candles: CandleData[]; width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 60, bottom: 30, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const candleW = Math.max(2, (chartW / candles.length) * 0.7);
    const gap = chartW / candles.length;

    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillRect(0, 0, width, height);

    const gridLines = 5;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      const price = maxPrice - (priceRange / gridLines) * i;
      ctx.fillText(formatPrice(price), width - padding.right + 5, y + 3);
    }

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const x = padding.left + gap * i + gap / 2;
      const isGreen = c.close >= c.open;
      const color = isGreen ? "#22c55e" : "#ef4444";
      const shadowColor = isGreen ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)";

      const highY = padding.top + ((maxPrice - c.high) / priceRange) * chartH;
      const lowY = padding.top + ((maxPrice - c.low) / priceRange) * chartH;
      const openY = padding.top + ((maxPrice - c.open) / priceRange) * chartH;
      const closeY = padding.top + ((maxPrice - c.close) / priceRange) * chartH;

      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = 4;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      const bodyTop = Math.min(openY, closeY);
      const bodyH = Math.max(1, Math.abs(closeY - openY));
      ctx.fillStyle = color;
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }

    if (candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      const lastY = padding.top + ((maxPrice - lastCandle.close) / priceRange) * chartH;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = lastCandle.close >= lastCandle.open ? "rgba(34,197,94,0.6)" : "rgba(239,68,68,0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, lastY);
      ctx.lineTo(width - padding.right, lastY);
      ctx.stroke();
      ctx.setLineDash([]);

      const labelBg = lastCandle.close >= lastCandle.open ? "#22c55e" : "#ef4444";
      ctx.fillStyle = labelBg;
      const labelW = 58;
      const labelH = 16;
      ctx.fillRect(width - padding.right + 2, lastY - labelH / 2, labelW, labelH);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px monospace";
      ctx.fillText(formatPrice(lastCandle.close), width - padding.right + 5, lastY + 4);
    }
  }, [candles, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="rounded-md"
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
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border bg-gradient-to-r ${colorMap[color]}`}>
      <Icon className="w-4 h-4" />
      <div>
        <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-sm font-bold font-mono">{value}</p>
      </div>
    </div>
  );
}

function CreateDuelPanel({ onCreated }: { onCreated: () => void }) {
  const { agent, authenticate, isAuthenticating } = useAuth();
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [asset, setAsset] = useState("BTCUSDT");
  const [duration, setDuration] = useState("300");
  const [potAmount, setPotAmount] = useState("0.01");
  const [mode, setMode] = useState<"bot" | "pvp">("bot");

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/trading-duels", {
      creatorId: agent?.id,
      assetSymbol: asset,
      potAmount,
      durationSeconds: parseInt(duration),
    }),
    onSuccess: () => {
      toast({ title: "Duel Created!", description: "Waiting for an opponent..." });
      queryClient.invalidateQueries({ queryKey: ["/api/trading-duels"] });
      onCreated();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const playBotMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/trading-duels/play-vs-bot", {
      creatorId: agent?.id,
      assetSymbol: asset,
      potAmount,
      durationSeconds: parseInt(duration),
    }),
    onSuccess: (data: any) => {
      toast({ title: "Battle Started!", description: `You're fighting ${data.botName}` });
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
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === "bot" ? "default" : "outline"}
              onClick={() => setMode("bot")}
              data-testid="button-mode-bot"
            >
              <Bot className="w-4 h-4 mr-1.5" /> vs Bot
            </Button>
            <Button
              variant={mode === "pvp" ? "default" : "outline"}
              onClick={() => setMode("pvp")}
              data-testid="button-mode-pvp"
            >
              <Users className="w-4 h-4 mr-1.5" /> vs Player
            </Button>
          </div>

          {mode === "bot" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-purple-500/10 border border-purple-500/20">
              <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
              <p className="text-xs text-purple-300/80">Instant match against an AI trader. No waiting!</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Trading Pair</Label>
            <Select value={asset} onValueChange={setAsset}>
              <SelectTrigger data-testid="select-trading-pair">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSETS.map(a => (
                  <SelectItem key={a.symbol} value={a.symbol}>{a.short}/USDT - {a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          {mode === "bot" ? (
            <Button
              className="w-full bg-gradient-to-r from-purple-600 to-violet-600 text-white border-purple-700"
              onClick={() => playBotMutation.mutate()}
              disabled={playBotMutation.isPending}
              data-testid="button-play-bot"
            >
              {playBotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Bot className="w-4 h-4 mr-1.5" />}
              Quick Play vs Bot - {potAmount} BNB
            </Button>
          ) : (
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              data-testid="button-create-duel"
            >
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
              <span className="ml-2">Enter the Arena - {potAmount} BNB</span>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DuelLobbyCard({ duel, onJoin, index }: { duel: TradingDuel; onJoin: (id: string) => void; index: number }) {
  const { agent } = useAuth();
  const assetInfo = ASSETS.find(a => a.symbol === duel.assetSymbol) || ASSETS[0];
  const durationInfo = DURATIONS.find(d => d.value === duel.durationSeconds);
  const isCreator = agent?.id === duel.creatorId;

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
            <p className="font-mono font-bold text-amber-400">{duel.potAmount} BNB</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">per player</p>
          </div>
          <div>
            {duel.status === "waiting" && !isCreator && agent && (
              <Button size="sm" onClick={() => onJoin(duel.id)} className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600" data-testid={`button-join-${duel.id}`}>
                <Zap className="w-4 h-4 mr-1" /> Fight
              </Button>
            )}
            {duel.status === "waiting" && isCreator && (
              <Badge variant="outline" className="gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Waiting
              </Badge>
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
}: {
  duelId: string;
  agentId: string;
  currentPrice: number;
  duel: TradingDuel;
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

  const openMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/trading-duels/${duelId}/open-position`, {
      agentId,
      side,
      leverage: parseInt(leverage),
      sizeUsdt,
    }),
    onSuccess: (data: any) => {
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
      toast({ title: "Position closed!" });
      refetchPositions();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3 arena-animate-right">
      <Card className="overflow-visible" style={{ boxShadow: totalPnl >= 0 ? "0 0 12px rgba(34,197,94,0.1)" : "0 0 12px rgba(239,68,68,0.1)" }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolio</p>
              <p className="text-xl font-bold font-mono arena-ticker" key={Math.round(totalBalance)}>{formatMoney(totalBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">P&L</p>
              <p className={`text-lg font-bold font-mono ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {totalPnl >= 0 ? "+" : ""}{formatMoney(totalPnl)} ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
              </p>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-muted/50 overflow-visible relative">
            <div
              className={`h-full rounded-full transition-all duration-500 ${totalPnl >= 0 ? "bg-gradient-to-r from-green-600 to-green-400" : "bg-gradient-to-r from-red-600 to-red-400"}`}
              style={{
                width: `${Math.min(100, Math.max(2, (totalBalance / (initialBal * 2)) * 100))}%`,
                boxShadow: totalPnl >= 0 ? "0 0 8px rgba(34,197,94,0.4)" : "0 0 8px rgba(239,68,68,0.4)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground">Available: {formatMoney(availableBalance)}</span>
            <span className="text-[10px] text-muted-foreground">In trades: {formatMoney(usedBalance)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={side === "long" ? "default" : "outline"}
              className={`${side === "long" ? "bg-green-600 text-white border-green-700" : ""}`}
              onClick={() => setSide("long")}
              data-testid="button-long"
            >
              <ArrowUp className="w-4 h-4 mr-1" /> Long
            </Button>
            <Button
              variant={side === "short" ? "default" : "outline"}
              className={`${side === "short" ? "bg-red-600 text-white border-red-700" : ""}`}
              onClick={() => setSide("short")}
              data-testid="button-short"
            >
              <ArrowDown className="w-4 h-4 mr-1" /> Short
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Leverage</Label>
            <div className="flex gap-1">
              {["1", "2", "5", "10", "20", "50"].map(l => (
                <Button
                  key={l}
                  size="sm"
                  variant={leverage === l ? "default" : "outline"}
                  onClick={() => setLeverage(l)}
                  className="flex-1 text-xs"
                  data-testid={`button-leverage-${l}`}
                >
                  {l}x
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Size ({sizePercent}% = {formatMoney(parseFloat(sizeUsdt))})</Label>
            <div className="flex gap-1">
              {["10", "25", "50", "75", "100"].map(p => (
                <Button
                  key={p}
                  size="sm"
                  variant={sizePercent === p ? "default" : "outline"}
                  onClick={() => setSizePercent(p)}
                  className="flex-1 text-xs"
                  data-testid={`button-size-${p}`}
                >
                  {p}%
                </Button>
              ))}
            </div>
          </div>

          <Button
            className={`w-full ${side === "long" ? "bg-green-600 text-white border-green-700" : "bg-red-600 text-white border-red-700"}`}
            onClick={() => openMutation.mutate()}
            disabled={openMutation.isPending || parseFloat(sizeUsdt) <= 0}
            data-testid="button-open-position"
          >
            {openMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Crosshair className="w-4 h-4 mr-1" />}
            {side === "long" ? "Open Long" : "Open Short"} {leverage}x - {formatMoney(parseFloat(sizeUsdt))}
          </Button>
        </CardContent>
      </Card>

      {openPositions.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-4 flex flex-row items-center justify-between gap-1">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              Active ({openPositions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {openPositions.map((pos, i) => {
              const entry = parseFloat(pos.entryPrice);
              const size = parseFloat(pos.sizeUsdt);
              let pnl: number;
              if (pos.side === "long") {
                pnl = ((currentPrice - entry) / entry) * size * pos.leverage;
              } else {
                pnl = ((entry - currentPrice) / entry) * size * pos.leverage;
              }
              const pnlPct = (pnl / size) * 100;
              return (
                <div
                  key={pos.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 flex-wrap"
                  style={{ animation: `arena-slide-up 0.3s ${i * 0.05}s ease-out both` }}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={pos.side === "long" ? "text-green-400 border-green-400/30" : "text-red-400 border-red-400/30"}>
                      {pos.side === "long" ? <ArrowUp className="w-3 h-3 mr-1" /> : <ArrowDown className="w-3 h-3 mr-1" />}
                      {pos.side.toUpperCase()} {pos.leverage}x
                    </Badge>
                    <span className="text-xs font-mono">{formatMoney(size)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-mono font-bold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {pnl >= 0 ? "+" : ""}{formatMoney(pnl)} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => closeMutation.mutate(pos.id)}
                      disabled={closeMutation.isPending}
                      data-testid={`button-close-${pos.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActiveDuelView({ duelId }: { duelId: string }) {
  const { agent } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [currentPrice, setCurrentPrice] = useState(0);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [priceChange, setPriceChange] = useState(0);
  const [chartWidth, setChartWidth] = useState(600);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const { data: duel, refetch: refetchDuel } = useQuery<TradingDuel>({
    queryKey: ["/api/trading-duels", duelId],
    refetchInterval: 3000,
  });

  const { data: botInfo } = useQuery<{ creatorIsBot: boolean; joinerIsBot: boolean }>({
    queryKey: ["/api/trading-duels", duelId, "bot-info"],
    enabled: !!duel,
  });

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setChartWidth(Math.max(300, entry.contentRect.width - 20));
      }
    });
    if (chartContainerRef.current) obs.observe(chartContainerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!duel?.assetSymbol) return;
    const fetchPrice = async () => {
      try {
        const res = await fetch(`/api/trading-duels/binance/ticker?symbol=${duel.assetSymbol}`);
        const data = await res.json();
        if (data.price) {
          const p = parseFloat(data.price);
          setCurrentPrice(prev => {
            if (prev > 0) setPriceChange(((p - prev) / prev) * 100);
            return p;
          });
        }
      } catch { }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 1500);
    return () => clearInterval(interval);
  }, [duel?.assetSymbol]);

  useEffect(() => {
    if (!duel?.assetSymbol) return;
    const fetchCandles = async () => {
      try {
        const res = await fetch(`/api/trading-duels/binance/klines?symbol=${duel.assetSymbol}&interval=1m&limit=60`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setCandles(data.map((k: any[]) => ({
            time: k[0],
            open: parseFloat(k[1]),
            high: parseFloat(k[2]),
            low: parseFloat(k[3]),
            close: parseFloat(k[4]),
            volume: parseFloat(k[5]),
          })));
        }
      } catch { }
    };
    fetchCandles();
    const interval = setInterval(fetchCandles, 5000);
    return () => clearInterval(interval);
  }, [duel?.assetSymbol]);

  const settleMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/trading-duels/${duelId}/settle`, {}),
    onSuccess: (data: any) => {
      refetchDuel();
      toast({ title: "Duel Settled!" });
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

    return (
      <div className="relative max-w-2xl mx-auto p-4 space-y-4">
        <ArenaBackground />
        <Card className="overflow-visible relative">
          {isWinner && <ConfettiExplosion />}
          <CardContent className="p-8 text-center space-y-5 relative z-10">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 flex items-center justify-center arena-trophy">
              {duel.winnerId ? (
                isWinner ? <Trophy className="w-12 h-12 text-amber-400" /> : <Skull className="w-12 h-12 text-muted-foreground" />
              ) : (
                <Swords className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <div className="arena-animate-up">
              <h2 className="text-3xl font-bold tracking-tight">
                {duel.winnerId ? (isWinner ? "VICTORY" : "DEFEAT") : "DRAW"}
              </h2>
              {duel.winnerId && (
                <p className="text-muted-foreground mt-1">
                  Winner takes <span className="text-amber-400 font-bold">{winnerPayout.toFixed(4)} BNB</span>
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 arena-animate-up-d1">
              <div className={`relative p-5 rounded-md border transition-all ${duel.winnerId === duel.creatorId ? "bg-green-500/10 border-green-500/30" : "bg-muted/30 border-border"}`}>
                {duel.winnerId === duel.creatorId && <Crown className="w-5 h-5 text-amber-400 absolute -top-2 left-1/2 -translate-x-1/2" />}
                <div className="flex items-center justify-center gap-1.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {agent?.id === duel.creatorId ? "You" : botInfo?.creatorIsBot ? "AI Bot" : "Player 1"}
                  </p>
                  {botInfo?.creatorIsBot && <Bot className="w-3 h-3 text-purple-400" />}
                </div>
                <p className="text-2xl font-bold font-mono mt-1">{formatMoney(creatorFinal)}</p>
                <p className={`text-sm font-mono ${creatorFinal >= 1000000 ? "text-green-400" : "text-red-400"}`}>
                  {creatorFinal >= 1000000 ? "+" : ""}{formatMoney(creatorFinal - 1000000)}
                </p>
              </div>
              <div className={`relative p-5 rounded-md border transition-all ${duel.winnerId === duel.joinerId ? "bg-green-500/10 border-green-500/30" : "bg-muted/30 border-border"}`}>
                {duel.winnerId === duel.joinerId && <Crown className="w-5 h-5 text-amber-400 absolute -top-2 left-1/2 -translate-x-1/2" />}
                <div className="flex items-center justify-center gap-1.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {agent?.id === duel.joinerId ? "You" : botInfo?.joinerIsBot ? "AI Bot" : "Player 2"}
                  </p>
                  {botInfo?.joinerIsBot && <Bot className="w-3 h-3 text-purple-400" />}
                </div>
                <p className="text-2xl font-bold font-mono mt-1">{formatMoney(joinerFinal)}</p>
                <p className={`text-sm font-mono ${joinerFinal >= 1000000 ? "text-green-400" : "text-red-400"}`}>
                  {joinerFinal >= 1000000 ? "+" : ""}{formatMoney(joinerFinal - 1000000)}
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/arena")} className="arena-animate-up-d2 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600" data-testid="button-back-lobby">
              <Swords className="w-4 h-4 mr-2" /> Back to Arena
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (duel.status === "ready" && isParticipant) {
    return (
      <div className="relative max-w-md mx-auto p-4 space-y-4">
        <ArenaBackground />
        <Card className="overflow-visible relative">
          <CardContent className="p-10 text-center space-y-6">
            <div className="flex items-center justify-center gap-6">
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
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600 arena-animate-up-d3"
              onClick={async () => {
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
      <div className="relative max-w-md mx-auto p-4 space-y-4">
        <ArenaBackground />
        <Card className="arena-glow-card overflow-visible">
          <CardContent className="p-10 text-center space-y-5">
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

  return (
    <div className="relative p-2 md:p-4 space-y-3">
      <ArenaBackground />
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3 flex-wrap arena-animate-up">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Badge variant="outline" className="text-green-400 border-green-400/30 gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: "0 0 6px rgba(34,197,94,0.6)", animation: "arena-glow-pulse 2s ease-in-out infinite" }} />
                LIVE
              </Badge>
            </div>
            <span className="font-bold text-lg">{assetInfo.short}/USDT</span>
            <span className={`font-mono text-xl font-bold arena-ticker ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`} key={currentPrice}>
              ${formatPrice(currentPrice)}
            </span>
            {priceChange !== 0 && (
              <span className={`text-sm ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                {priceChange >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
                {Math.abs(priceChange).toFixed(3)}%
              </span>
            )}
            {opponentIsBot && (
              <Badge variant="outline" className="text-purple-400 border-purple-400/30 gap-1">
                <Bot className="w-3 h-3" /> vs AI
              </Badge>
            )}
          </div>
          {duel.endsAt && (
            <CountdownTimer endsAt={duel.endsAt.toString()} onExpired={handleExpired} />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
          <div className="lg:col-span-2 arena-animate-left" ref={chartContainerRef}>
            <Card className="overflow-visible" style={{ boxShadow: "0 0 16px rgba(245,158,11,0.05)" }}>
              <CardContent className="p-2">
                <MiniChart candles={candles} width={chartWidth} height={350} />
              </CardContent>
            </Card>
          </div>
          <div>
            {isParticipant && agent && (
              <TradingPanel
                duelId={duelId}
                agentId={agent.id}
                currentPrice={currentPrice}
                duel={duel}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TradingArenaLobby() {
  const { agent } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("open");

  const { data: duels = [], isLoading } = useQuery<TradingDuel[]>({
    queryKey: ["/api/trading-duels", `?status=${tab === "open" ? "waiting" : tab === "live" ? "active" : tab}&limit=20`],
    refetchInterval: 5000,
  });

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

  return (
    <>
      <div className="flex items-center justify-center gap-3 flex-wrap arena-animate-up-d1 mb-6">
        <StatBadge icon={DollarSign} label="Start" value="$1M Fake" color="green" />
        <StatBadge icon={Target} label="Leverage" value="Up to 50x" color="amber" />
        <StatBadge icon={Trophy} label="Winner" value="Takes 90%" color="blue" />
        <StatBadge icon={Activity} label="Charts" value="Real-Time" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      joinMutation.mutate(id);
                    }}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
        <div>
          <CreateDuelPanel onCreated={() => setTab("open")} />
        </div>
      </div>
    </>
  );
}

export default function TradingArena() {
  const [match, params] = useRoute("/arena/:id");
  const [gameMode, setGameMode] = useState("trading");

  if (match && params?.id) {
    return <ActiveDuelView duelId={params.id} />;
  }

  return (
    <div className="relative max-w-5xl mx-auto p-4 space-y-6">
      <ArenaBackground />

      <div className="relative z-10 text-center space-y-4 py-4 arena-animate-up">
        <div className="flex items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-md bg-gradient-to-br from-amber-500/30 to-orange-500/10 flex items-center justify-center arena-float" style={{ boxShadow: "0 0 20px rgba(245,158,11,0.15)" }}>
            <Swords className="w-9 h-9 text-amber-400" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Games Arena</h1>
            <p className="text-muted-foreground text-sm">Compete, predict, and win on real crypto markets</p>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Button
            variant={gameMode === "trading" ? "default" : "outline"}
            onClick={() => setGameMode("trading")}
            data-testid="button-game-trading"
          >
            <Swords className="w-4 h-4 mr-1.5" /> Trading Arena
          </Button>
          <Button
            variant={gameMode === "predict" ? "default" : "outline"}
            onClick={() => setGameMode("predict")}
            data-testid="button-game-predict"
          >
            <Target className="w-4 h-4 mr-1.5" /> Predict Duel
          </Button>
        </div>

        {gameMode === "trading" ? (
          <TradingArenaLobby />
        ) : (
          <PredictContent />
        )}
      </div>
    </div>
  );
}
