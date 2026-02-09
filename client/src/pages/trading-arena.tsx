import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
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
  XCircle
} from "lucide-react";
import type { TradingDuel, TradingPosition } from "@shared/schema";

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

  return (
    <div className={`flex items-center gap-2 font-mono text-2xl font-bold ${isUrgent ? "text-red-500 animate-pulse" : "text-amber-400"}`}>
      <Timer className="w-6 h-6" />
      <span>{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
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

function CreateDuelPanel({ onCreated }: { onCreated: () => void }) {
  const { agent } = useAuth();
  const { toast } = useToast();
  const [asset, setAsset] = useState("BTCUSDT");
  const [duration, setDuration] = useState("300");
  const [potAmount, setPotAmount] = useState("0.01");

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

  if (!agent) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Connect wallet and register as a Bee to create a duel</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-amber-400" />
          Create Trading Duel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Trading Pair</Label>
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
          <Label>Duration</Label>
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
          <Label>Pot Amount (BNB per player)</Label>
          <Input
            type="number"
            step="0.001"
            min="0.001"
            value={potAmount}
            onChange={e => setPotAmount(e.target.value)}
            data-testid="input-pot-amount"
          />
          <p className="text-xs text-muted-foreground">Winner takes 90% of total pot (both deposits). 10% platform fee.</p>
        </div>
        <Button
          className="w-full"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          data-testid="button-create-duel"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
          <span className="ml-2">Create Duel - {potAmount} BNB</span>
        </Button>
      </CardContent>
    </Card>
  );
}

function DuelLobbyCard({ duel, onJoin }: { duel: TradingDuel; onJoin: (id: string) => void }) {
  const { agent } = useAuth();
  const assetInfo = ASSETS.find(a => a.symbol === duel.assetSymbol) || ASSETS[0];
  const durationInfo = DURATIONS.find(d => d.value === duel.durationSeconds);
  const isCreator = agent?.id === duel.creatorId;

  return (
    <Card className="hover-elevate" data-testid={`card-duel-${duel.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold">{assetInfo.short}/USDT</p>
              <p className="text-xs text-muted-foreground">{durationInfo?.label || `${duel.durationSeconds}s`}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono font-bold text-amber-400">{duel.potAmount} BNB</p>
            <p className="text-xs text-muted-foreground">per player</p>
          </div>
          <div>
            {duel.status === "waiting" && !isCreator && agent && (
              <Button size="sm" onClick={() => onJoin(duel.id)} data-testid={`button-join-${duel.id}`}>
                <Zap className="w-4 h-4 mr-1" /> Join
              </Button>
            )}
            {duel.status === "waiting" && isCreator && (
              <Badge variant="outline">Waiting...</Badge>
            )}
            {duel.status === "active" && (
              <Badge className="bg-green-500/20 text-green-400">LIVE</Badge>
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
    <div className="space-y-3">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Portfolio Value</p>
              <p className="text-xl font-bold font-mono">{formatMoney(totalBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">P&L</p>
              <p className={`text-lg font-bold font-mono ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {totalPnl >= 0 ? "+" : ""}{formatMoney(totalPnl)} ({pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%)
              </p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-visible">
            <div
              className={`h-full rounded-full transition-all duration-300 ${totalPnl >= 0 ? "bg-green-500" : "bg-red-500"}`}
              style={{ width: `${Math.min(100, Math.max(0, (totalBalance / (initialBal * 2)) * 100))}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">Available: {formatMoney(availableBalance)}</span>
            <span className="text-xs text-muted-foreground">In trades: {formatMoney(usedBalance)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={side === "long" ? "default" : "outline"}
              className={`${side === "long" ? "bg-green-600 hover:bg-green-600 text-white" : ""}`}
              onClick={() => setSide("long")}
              data-testid="button-long"
            >
              <ArrowUp className="w-4 h-4 mr-1" /> Long
            </Button>
            <Button
              variant={side === "short" ? "default" : "outline"}
              className={`${side === "short" ? "bg-red-600 hover:bg-red-600 text-white" : ""}`}
              onClick={() => setSide("short")}
              data-testid="button-short"
            >
              <ArrowDown className="w-4 h-4 mr-1" /> Short
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Leverage</Label>
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
            <Label className="text-xs">Size ({sizePercent}% = {formatMoney(parseFloat(sizeUsdt))})</Label>
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
            className={`w-full ${side === "long" ? "bg-green-600 hover:bg-green-600 text-white" : "bg-red-600 hover:bg-red-600 text-white"}`}
            onClick={() => openMutation.mutate()}
            disabled={openMutation.isPending || parseFloat(sizeUsdt) <= 0}
            data-testid="button-open-position"
          >
            {openMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            {side === "long" ? "Open Long" : "Open Short"} {leverage}x - {formatMoney(parseFloat(sizeUsdt))}
          </Button>
        </CardContent>
      </Card>

      {openPositions.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-sm">Open Positions ({openPositions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-2 space-y-1">
            {openPositions.map(pos => {
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
                <div key={pos.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50 flex-wrap">
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

  if (!duel) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const assetInfo = ASSETS.find(a => a.symbol === duel.assetSymbol) || ASSETS[0];
  const isParticipant = agent?.id === duel.creatorId || agent?.id === duel.joinerId;

  if (duel.status === "settled") {
    const isWinner = duel.winnerId === agent?.id;
    const creatorFinal = parseFloat(duel.creatorFinalBalance || "0");
    const joinerFinal = parseFloat(duel.joinerFinalBalance || "0");
    const potTotal = parseFloat(duel.potAmount) * 2;
    const winnerPayout = potTotal * 0.9;

    return (
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <Card className="overflow-visible">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold">
              {duel.winnerId ? (isWinner ? "You Won!" : "You Lost!") : "It's a Draw!"}
            </h2>
            {duel.winnerId && (
              <p className="text-muted-foreground">
                Winner takes {winnerPayout.toFixed(4)} BNB (90% of {potTotal.toFixed(4)} BNB pot)
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-md ${duel.winnerId === duel.creatorId ? "bg-green-500/10 border border-green-500/30" : "bg-muted/50"}`}>
                <p className="text-sm text-muted-foreground">Player 1</p>
                <p className="text-lg font-bold font-mono">{formatMoney(creatorFinal)}</p>
                <p className={`text-sm ${creatorFinal >= 1000000 ? "text-green-400" : "text-red-400"}`}>
                  {creatorFinal >= 1000000 ? "+" : ""}{formatMoney(creatorFinal - 1000000)}
                </p>
                {duel.winnerId === duel.creatorId && <Crown className="w-5 h-5 text-amber-400 mx-auto mt-1" />}
              </div>
              <div className={`p-4 rounded-md ${duel.winnerId === duel.joinerId ? "bg-green-500/10 border border-green-500/30" : "bg-muted/50"}`}>
                <p className="text-sm text-muted-foreground">Player 2</p>
                <p className="text-lg font-bold font-mono">{formatMoney(joinerFinal)}</p>
                <p className={`text-sm ${joinerFinal >= 1000000 ? "text-green-400" : "text-red-400"}`}>
                  {joinerFinal >= 1000000 ? "+" : ""}{formatMoney(joinerFinal - 1000000)}
                </p>
                {duel.winnerId === duel.joinerId && <Crown className="w-5 h-5 text-amber-400 mx-auto mt-1" />}
              </div>
            </div>
            <Button onClick={() => navigate("/arena")} data-testid="button-back-lobby">
              Back to Arena
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (duel.status === "ready" && isParticipant) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center animate-pulse">
              <Swords className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold">Opponent Found!</h2>
            <p className="text-muted-foreground">Trading {assetInfo.short}/USDT for {DURATIONS.find(d => d.value === duel.durationSeconds)?.label}</p>
            <Button
              className="w-full"
              onClick={async () => {
                await apiRequest("POST", `/api/trading-duels/${duelId}/start`, {});
                refetchDuel();
              }}
              data-testid="button-start-duel"
            >
              <Flame className="w-4 h-4 mr-2" /> Start Trading!
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (duel.status === "waiting") {
    return (
      <div className="max-w-md mx-auto p-4 space-y-4">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Loader2 className="w-10 h-10 mx-auto text-amber-400 animate-spin" />
            <h2 className="text-xl font-bold">Waiting for Opponent</h2>
            <p className="text-muted-foreground">{assetInfo.short}/USDT - {DURATIONS.find(d => d.value === duel.durationSeconds)?.label} - {duel.potAmount} BNB</p>
            <Button variant="outline" onClick={() => navigate("/arena")} data-testid="button-cancel-wait">
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-green-400 border-green-400/30 gap-1">
            <Activity className="w-3 h-3" /> LIVE
          </Badge>
          <span className="font-bold text-lg">{assetInfo.short}/USDT</span>
          <span className={`font-mono text-xl font-bold ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
            ${formatPrice(currentPrice)}
          </span>
          {priceChange !== 0 && (
            <span className={`text-sm ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
              {priceChange >= 0 ? <TrendingUp className="w-4 h-4 inline" /> : <TrendingDown className="w-4 h-4 inline" />}
              {Math.abs(priceChange).toFixed(3)}%
            </span>
          )}
        </div>
        {duel.endsAt && (
          <CountdownTimer endsAt={duel.endsAt.toString()} onExpired={handleExpired} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2" ref={chartContainerRef}>
          <Card>
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
  );
}

export default function TradingArena() {
  const { agent } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/arena/:id");
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

  if (match && params?.id) {
    return <ActiveDuelView duelId={params.id} />;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-md bg-amber-500/20 flex items-center justify-center">
            <Swords className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold">Trading Arena</h1>
        </div>
        <p className="text-muted-foreground max-w-lg mx-auto">
          1v1 skill-based trading battles. Both players get $1M fake USDT. Trade real crypto charts. Best trader wins the pot!
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Badge variant="outline" className="gap-1"><DollarSign className="w-3 h-3" /> $1M Starting Balance</Badge>
          <Badge variant="outline" className="gap-1"><Target className="w-3 h-3" /> Up to 50x Leverage</Badge>
          <Badge variant="outline" className="gap-1"><Trophy className="w-3 h-3" /> Winner Takes 90%</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="open" className="flex-1" data-testid="tab-open">
                <Users className="w-4 h-4 mr-1" /> Open Duels
              </TabsTrigger>
              <TabsTrigger value="live" className="flex-1" data-testid="tab-live">
                <Activity className="w-4 h-4 mr-1" /> Live
              </TabsTrigger>
              <TabsTrigger value="settled" className="flex-1" data-testid="tab-settled">
                <Trophy className="w-4 h-4 mr-1" /> Completed
              </TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="space-y-2 mt-2">
              {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : duels.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No {tab} duels found. Create one to get started!
                  </CardContent>
                </Card>
              ) : (
                duels.map(d => (
                  <DuelLobbyCard
                    key={d.id}
                    duel={d}
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
    </div>
  );
}
