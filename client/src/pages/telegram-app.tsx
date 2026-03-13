import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import beeLogoPath from "@assets/honeycomb-bee-logo.png";
import {
  Hexagon,
  Home,
  Swords,
  Trophy,
  User,
  Users,
  Share2,
  ExternalLink,
  Wallet,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Zap,
  Timer,
  ArrowLeft,
  BarChart3,
  Target,
  Sparkles,
  Eye,
  EyeOff,
  Key,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  ArrowUp,
  ArrowDown,
  Plus,
  Send,
  Hash,
  Clock,
  Loader2,
  ChevronRight,
  Coins,
  Flame,
  Gift,
  Crown,
  Medal,
} from "lucide-react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        openLink: (url: string) => void;
        openTelegramLink: (url: string) => void;
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
      };
    };
  }
}

type TabType = "home" | "feed" | "arena" | "earn" | "bees" | "profile";

interface LandingStats {
  totalUsers: number;
  totalNfas: number;
  totalVolume: string;
}

interface Duel {
  id: number;
  asset: string;
  duration: number;
  stakeAmount: string;
  status: string;
  creatorName?: string;
}


const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

function HomeTab({ onSwitchTab }: { onSwitchTab: (tab: TabType) => void }) {
  const { data: stats, isLoading } = useQuery<LandingStats>({
    queryKey: ["/api/landing-stats"],
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const BASE_USER_COUNT = 517;
  const totalUsers = BASE_USER_COUNT + (stats?.totalUsers || 0);

  const handleInvite = () => {
    const shareUrl = `${BASE_URL}/r/tg`;
    const text = "Join me on Honeycomb - the AI Trading Arena on BNB Chain!";
    const tgLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.Telegram?.WebApp?.openTelegramLink(tgLink);
  };



  return (
    <div className="flex flex-col items-center px-4 pt-8 pb-4">
      <div className="flex items-center gap-3 mb-2">
        <img src={beeLogoPath} alt="Honeycomb" className="w-12 h-12" />
        <h1
          className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent"
          data-testid="text-tg-title"
        >
          Honeycomb
        </h1>
      </div>
      <p className="text-sm text-gray-400 mb-6" data-testid="text-tg-subtitle">
        AI Trading Arena on BNB Chain
      </p>

      <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3.5 h-3.5 text-amber-500" />
            {isLoading ? (
              <span className="h-6 w-10 bg-gray-700 animate-pulse rounded" />
            ) : (
              <span className="text-xl font-bold text-white" data-testid="text-tg-players">
                {totalUsers.toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500">Players</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Swords className="w-3.5 h-3.5 text-amber-500" />
            {isLoading ? (
              <span className="h-6 w-10 bg-gray-700 animate-pulse rounded" />
            ) : (
              <span className="text-xl font-bold text-white" data-testid="text-tg-duels">
                {(stats?.totalNfas || 0).toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500">Duels</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            {isLoading ? (
              <span className="h-6 w-10 bg-gray-700 animate-pulse rounded" />
            ) : (
              <span className="text-xl font-bold text-white" data-testid="text-tg-volume">
                {stats?.totalVolume || "0"} BNB
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500">Prize Volume</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <Button
          size="lg"
          className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          onClick={() => onSwitchTab("arena")}
          data-testid="button-tg-enter-arena"
        >
          <Swords className="w-4 h-4" />
          Enter Arena
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full gap-2 border-amber-500/50 text-amber-400"
          onClick={() => onSwitchTab("bees")}
          data-testid="button-tg-view-bees"
        >
          <Hexagon className="w-4 h-4" />
          View Bees
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full gap-2 border-amber-500/30 text-amber-300"
          onClick={handleInvite}
          data-testid="button-tg-invite"
        >
          <Share2 className="w-4 h-4" />
          Invite Friends
        </Button>
      </div>
    </div>
  );
}

type ArenaView = "lobby" | "playing" | "results";

interface ActiveDuel {
  id: string;
  assetSymbol: string;
  durationSeconds: number;
  endsAt: string;
  startedAt: string;
  creatorId: string;
  joinerId: string;
  initialBalance: string;
  botName?: string;
}

interface Position {
  id: string;
  side: string;
  leverage: number;
  sizeUsdt: string;
  entryPrice: string;
  isOpen: boolean;
  pnl?: string;
  exitPrice?: string;
}

interface DuelResult {
  winnerId: string | null;
  creatorPnl: string;
  joinerPnl: string;
}

const ASSETS = [
  { symbol: "BTCUSDT", label: "BTC", icon: "₿" },
  { symbol: "ETHUSDT", label: "ETH", icon: "Ξ" },
  { symbol: "BNBUSDT", label: "BNB", icon: "◆" },
];

const DURATIONS = [
  { seconds: 120, label: "2 min" },
  { seconds: 300, label: "5 min" },
];

function ArenaTab({ agentId }: { agentId?: string }) {
  const [view, setView] = useState<ArenaView>("lobby");
  const [activeDuel, setActiveDuel] = useState<ActiveDuel | null>(null);
  const [duelResult, setDuelResult] = useState<DuelResult | null>(null);
  const [starting, setStarting] = useState(false);

  const handleStartDuel = async (asset: string, duration: number) => {
    if (!agentId || starting) return;
    setStarting(true);
    try {
      const res = await fetch("/api/trading-duels/play-vs-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: agentId,
          assetSymbol: asset,
          durationSeconds: duration,
          botDifficulty: "normal",
          botStrategy: "momentum",
        }),
      });
      if (res.ok) {
        const duel = await res.json();
        setActiveDuel(duel);
        setView("playing");
      }
    } catch (err) {
      console.error("Failed to start duel:", err);
    }
    setStarting(false);
  };

  const handleDuelEnd = (result: DuelResult) => {
    setDuelResult(result);
    setView("results");
  };

  const handlePlayAgain = () => {
    setActiveDuel(null);
    setDuelResult(null);
    setView("lobby");
  };

  if (view === "playing" && activeDuel && agentId) {
    return <GameView duel={activeDuel} agentId={agentId} onEnd={handleDuelEnd} onBack={handlePlayAgain} />;
  }

  if (view === "results" && duelResult && activeDuel && agentId) {
    return <ResultsView result={duelResult} duel={activeDuel} agentId={agentId} onPlayAgain={handlePlayAgain} />;
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h2 className="text-xl font-bold text-white mb-1" data-testid="text-tg-arena-title">
        Trading Arena
      </h2>
      <p className="text-xs text-gray-400 mb-4">Trade against AI bots with live crypto prices</p>

      {!agentId ? (
        <Card className="p-6 bg-[#242444] border-gray-700/50 text-center" data-testid="container-tg-arena-login">
          <Swords className="w-10 h-10 text-amber-500/50 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Open via @honeycombot to play</p>
        </Card>
      ) : (
        <>
          <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-600/10 border-amber-500/20 mb-4" data-testid="card-tg-quick-match">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-white">Quick Match vs AI</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {ASSETS.map((a) => (
                <Button
                  key={a.symbol}
                  size="sm"
                  disabled={starting}
                  className="bg-[#1a1a2e] border border-gray-700/50 text-white hover:border-amber-500/50 hover:bg-amber-500/10"
                  onClick={() => handleStartDuel(a.symbol, 120)}
                  data-testid={`button-tg-quick-${a.label.toLowerCase()}`}
                >
                  <span className="mr-1">{a.icon}</span> {a.label}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 text-center">2-min practice duel · $10,000 virtual balance</p>
          </Card>

          <h3 className="text-sm font-semibold text-gray-300 mb-2">Choose Duration</h3>
          <div className="space-y-2">
            {ASSETS.map((asset) => (
              <Card key={asset.symbol} className="p-3 bg-[#242444] border-gray-700/50" data-testid={`card-tg-asset-${asset.label.toLowerCase()}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{asset.icon}</span>
                    <span className="text-sm font-medium text-white">{asset.label}/USDT</span>
                  </div>
                  <div className="flex gap-2">
                    {DURATIONS.map((d) => (
                      <Button
                        key={d.seconds}
                        size="sm"
                        variant="outline"
                        disabled={starting}
                        className="text-xs border-gray-600 text-gray-300 hover:border-amber-500 hover:text-amber-400"
                        onClick={() => handleStartDuel(asset.symbol, d.seconds)}
                        data-testid={`button-tg-play-${asset.label.toLowerCase()}-${d.seconds}`}
                      >
                        <Timer className="w-3 h-3 mr-1" />
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function GameView({ duel, agentId, onEnd, onBack }: {
  duel: ActiveDuel;
  agentId: string;
  onEnd: (result: DuelResult) => void;
  onBack: () => void;
}) {
  const [price, setPrice] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [timeLeft, setTimeLeft] = useState(duel.durationSeconds);
  const [pnl, setPnl] = useState(0);
  const [balance, setBalance] = useState(parseFloat(duel.initialBalance));
  const [status, setStatus] = useState<string>("");
  const [settled, setSettled] = useState(false);
  const [trading, setTrading] = useState(false);
  const priceHistory = useRef<{ t: number; p: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const priceRef = useRef<ReturnType<typeof setInterval>>();
  const statusRef = useRef<ReturnType<typeof setInterval>>();
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const rafRef = useRef(0);
  const mountedRef = useRef(true);
  const latestPrice = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearTimeout(settleTimeoutRef.current);
    };
  }, []);

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(`/api/trading-duels/binance/ticker?symbol=${duel.assetSymbol}`);
      if (res.ok) {
        const data = await res.json();
        const p = parseFloat(data.price);
        if (p > 0 && mountedRef.current) {
          setPrice(p);
          latestPrice.current = p;
          priceHistory.current.push({ t: Date.now(), p });
          if (priceHistory.current.length > 120) priceHistory.current.shift();
        }
      }
    } catch {}
  }, [duel.assetSymbol]);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    const pts = priceHistory.current;
    if (pts.length < 2) return;

    const prices = pts.map(p => p.p);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;

    const isUp = pts[pts.length - 1].p >= pts[0].p;

    ctx.strokeStyle = isUp ? "#22c55e" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((pt, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((pt.p - minP) / range) * (h - 8) - 4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, isUp ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fillStyle = grad;
    ctx.fill();

    const openPos = positions.filter(p => p.isOpen);
    openPos.forEach(pos => {
      const ep = parseFloat(pos.entryPrice);
      const y = h - ((ep - minP) / range) * (h - 8) - 4;
      ctx.strokeStyle = pos.side === "long" ? "#22c55e80" : "#ef444480";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  }, [positions]);

  useEffect(() => {
    fetchPrice();
    priceRef.current = setInterval(fetchPrice, 1000);
    return () => clearInterval(priceRef.current);
  }, [fetchPrice]);

  useEffect(() => {
    let active = true;
    const draw = () => {
      if (!active) return;
      drawChart();
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { active = false; cancelAnimationFrame(rafRef.current); };
  }, [drawChart]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const end = new Date(duel.endsAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && !settled) {
        setSettled(true);
        const fetchResults = () =>
          fetch(`/api/trading-duels/${duel.id}/results`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.duel) {
                const d = data.duel;
                const result = data.result || {};
                onEnd({
                  winnerId: d.winnerId || null,
                  creatorPnl: result.creatorPnl || d.creatorPnl || "0",
                  joinerPnl: result.joinerPnl || d.joinerPnl || "0",
                });
                return true;
              }
              return false;
            });

        fetch(`/api/trading-duels/${duel.id}/settle`, { method: "POST" })
          .then(() => new Promise(r => setTimeout(r, 1000)))
          .then(() => fetchResults())
          .then(ok => { if (!ok) return new Promise(r => setTimeout(r, 2000)).then(fetchResults); })
          .catch(() => {
            settleTimeoutRef.current = setTimeout(() => {
              fetchResults().catch(() => onEnd({ winnerId: null, creatorPnl: "0", joinerPnl: "0" }));
            }, 3000);
          });
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [duel, settled, onEnd]);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!mountedRef.current) return;
      try {
        const [posRes, statusRes] = await Promise.all([
          fetch(`/api/trading-duels/${duel.id}/positions?agentId=${agentId}`),
          fetch(`/api/trading-duels/${duel.id}/status?agentId=${agentId}`),
        ]);

        if (posRes.ok && mountedRef.current) {
          const data = await posRes.json();
          setPositions(data);

          const initial = parseFloat(duel.initialBalance);
          const curPrice = latestPrice.current;
          let used = 0;
          let realized = 0;
          let unrealized = 0;
          data.forEach((p: Position) => {
            if (p.isOpen) {
              used += parseFloat(p.sizeUsdt);
              if (curPrice > 0) {
                const entry = parseFloat(p.entryPrice);
                const size = parseFloat(p.sizeUsdt);
                const uPnl = p.side === "long"
                  ? ((curPrice - entry) / entry) * size * p.leverage
                  : ((entry - curPrice) / entry) * size * p.leverage;
                unrealized += uPnl;
              }
            } else if (p.pnl) {
              realized += parseFloat(p.pnl);
            }
          });
          setPnl(realized + unrealized);
          setBalance(initial + realized - used);
        }
        if (statusRes.ok && mountedRef.current) {
          const s = await statusRes.json();
          setStatus(s.relativeStatus || "");
        }
      } catch {}
    };

    fetchStatus();
    statusRef.current = setInterval(fetchStatus, 2000);
    return () => clearInterval(statusRef.current);
  }, [duel.id, agentId, duel.initialBalance]);

  const openPosition = async (side: "long" | "short") => {
    if (trading || price <= 0) return;
    setTrading(true);
    try {
      const sizeUsdt = Math.min(balance, parseFloat(duel.initialBalance) * 0.25).toFixed(2);
      if (parseFloat(sizeUsdt) <= 0) { setTrading(false); return; }
      await fetch(`/api/trading-duels/${duel.id}/open-position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          side,
          leverage: 5,
          sizeUsdt,
          clientPrice: price.toString(),
        }),
      });
    } catch {}
    setTrading(false);
  };

  const closePosition = async (positionId: string) => {
    if (trading) return;
    setTrading(true);
    try {
      await fetch(`/api/trading-duels/${duel.id}/close-position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionId,
          agentId,
          clientPrice: price.toString(),
        }),
      });
    } catch {}
    setTrading(false);
  };

  const formatPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const openPos = positions.filter(p => p.isOpen);
  const pnlColor = pnl >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="flex flex-col h-full px-2 pt-2 pb-4" data-testid="container-tg-game">
      <div className="flex items-center justify-between mb-2 px-2">
        <button onClick={onBack} className="text-gray-400 hover:text-white" data-testid="button-tg-game-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Badge className={`${timeLeft < 30 ? "bg-red-500/20 text-red-400" : "bg-gray-700/50 text-gray-300"} font-mono`}>
            <Timer className="w-3 h-3 mr-1" />
            {mins}:{secs.toString().padStart(2, "0")}
          </Badge>
        </div>
        <span className="text-xs text-gray-500">vs {duel.botName || "AI Bot"}</span>
      </div>

      <div className="flex items-center justify-between px-2 mb-1">
        <div>
          <span className="text-[10px] text-gray-500">{duel.assetSymbol.replace("USDT", "/USDT")}</span>
          <div className="text-lg font-bold text-white font-mono" data-testid="text-tg-live-price">
            ${formatPrice(price)}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-500">Your P&L</span>
          <div className={`text-lg font-bold font-mono ${pnlColor}`} data-testid="text-tg-pnl">
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
          </div>
        </div>
      </div>

      {status && (
        <div className="text-center mb-1">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
            status.includes("LEAD") ? "bg-green-500/20 text-green-400" :
            status.includes("BEHIND") ? "bg-red-500/20 text-red-400" :
            "bg-gray-700/50 text-gray-400"
          }`} data-testid="text-tg-status">{status}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 mb-2 rounded-lg overflow-hidden border border-gray-700/30">
        <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 140 }} data-testid="canvas-tg-chart" />
      </div>

      {openPos.length > 0 && (
        <div className="space-y-1 mb-2 px-1">
          {openPos.map(pos => {
            const entry = parseFloat(pos.entryPrice);
            const uPnl = price > 0 ? (
              pos.side === "long"
                ? ((price - entry) / entry) * parseFloat(pos.sizeUsdt) * pos.leverage
                : ((entry - price) / entry) * parseFloat(pos.sizeUsdt) * pos.leverage
            ) : 0;
            return (
              <div key={pos.id} className="flex items-center justify-between bg-[#242444] rounded-lg px-3 py-2" data-testid={`row-tg-position-${pos.id}`}>
                <div className="flex items-center gap-2">
                  {pos.side === "long" ? <TrendingUp className="w-3.5 h-3.5 text-green-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                  <span className="text-xs text-white">{pos.side.toUpperCase()} {pos.leverage}x</span>
                  <span className="text-xs text-gray-500">${parseFloat(pos.sizeUsdt).toFixed(0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${uPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {uPnl >= 0 ? "+" : ""}{uPnl.toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] border-gray-600 text-gray-300"
                    onClick={() => closePosition(pos.id)}
                    disabled={trading}
                    data-testid={`button-tg-close-${pos.id}`}
                  >
                    Close
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 px-1">
        <Button
          className="h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base gap-1"
          onClick={() => openPosition("long")}
          disabled={trading || balance <= 0 || timeLeft <= 0}
          data-testid="button-tg-long"
        >
          <TrendingUp className="w-4 h-4" />
          LONG
        </Button>
        <Button
          className="h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-base gap-1"
          onClick={() => openPosition("short")}
          disabled={trading || balance <= 0 || timeLeft <= 0}
          data-testid="button-tg-short"
        >
          <TrendingDown className="w-4 h-4" />
          SHORT
        </Button>
      </div>

      <div className="flex items-center justify-between px-2 mt-2">
        <span className="text-[10px] text-gray-500">Balance: ${balance.toFixed(0)} · 5x leverage · 25% size</span>
      </div>
    </div>
  );
}

function ResultsView({ result, duel, agentId, onPlayAgain }: {
  result: DuelResult;
  duel: ActiveDuel;
  agentId: string;
  onPlayAgain: () => void;
}) {
  const isWinner = result.winnerId === agentId;
  const isDraw = !result.winnerId;
  const myPnl = duel.creatorId === agentId
    ? parseFloat(result.creatorPnl)
    : parseFloat(result.joinerPnl);

  return (
    <div className="flex flex-col items-center justify-center px-6 pt-12 pb-4" data-testid="container-tg-results">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
        isDraw ? "bg-gray-700/50" : isWinner ? "bg-green-500/20" : "bg-red-500/20"
      }`}>
        {isDraw ? (
          <Target className="w-10 h-10 text-gray-400" />
        ) : isWinner ? (
          <Trophy className="w-10 h-10 text-amber-500" />
        ) : (
          <Swords className="w-10 h-10 text-red-400" />
        )}
      </div>

      <h2 className={`text-2xl font-bold mb-1 ${
        isDraw ? "text-gray-300" : isWinner ? "text-green-400" : "text-red-400"
      }`} data-testid="text-tg-result-title">
        {isDraw ? "Draw!" : isWinner ? "Victory!" : "Defeat"}
      </h2>

      <p className="text-sm text-gray-400 mb-6">
        {isDraw ? "Both players tied" : isWinner ? `You beat ${duel.botName || "AI Bot"}!` : `${duel.botName || "AI Bot"} wins`}
      </p>

      <Card className="p-4 bg-[#242444] border-gray-700/50 w-full mb-6" data-testid="card-tg-result-stats">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Your P&L</span>
          <span className={`text-sm font-bold font-mono ${myPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {myPnl >= 0 ? "+" : ""}{myPnl.toFixed(2)} USDT
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Asset</span>
          <span className="text-xs text-white">{duel.assetSymbol.replace("USDT", "/USDT")}</span>
        </div>
      </Card>

      <div className="flex flex-col gap-3 w-full">
        <Button
          size="lg"
          className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold"
          onClick={onPlayAgain}
          data-testid="button-tg-play-again"
        >
          <Sparkles className="w-4 h-4" />
          Play Again
        </Button>
      </div>
    </div>
  );
}

interface BeeListItem {
  id: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  arenaWins: number;
  arenaLosses: number;
  arenaRating: number;
}

function BeesTab() {
  const [sort, setSort] = useState<"rating" | "newest">("rating");
  const { data: bees, isLoading } = useQuery<BeeListItem[]>({
    queryKey: ["/api/telegram/bees", sort],
    queryFn: () => fetch(`/api/telegram/bees?sort=${sort}&limit=50`).then(r => {
      if (!r.ok) throw new Error("Failed to load bees");
      return r.json();
    }).then(data => Array.isArray(data) ? data : []),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold text-white" data-testid="text-tg-bees-title">
          The Hive
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => setSort("rating")}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              sort === "rating" ? "bg-amber-500/20 text-amber-400" : "text-gray-500"
            }`}
            data-testid="button-tg-bees-sort-rating"
          >
            Top Rated
          </button>
          <button
            onClick={() => setSort("newest")}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              sort === "newest" ? "bg-amber-500/20 text-amber-400" : "text-gray-500"
            }`}
            data-testid="button-tg-bees-sort-newest"
          >
            Newest
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        {bees ? `${bees.length} bees in the hive` : "Loading..."}
      </p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[#242444] rounded-xl">
              <div className="w-10 h-10 bg-gray-700 animate-pulse rounded-full" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-700 animate-pulse rounded mb-1" />
                <div className="h-3 w-32 bg-gray-700 animate-pulse rounded" />
              </div>
              <div className="w-14 h-5 bg-gray-700 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : !bees || bees.length === 0 ? (
        <Card className="p-8 bg-[#242444] border-gray-700/50 text-center" data-testid="container-tg-empty-bees">
          <Hexagon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No bees yet. Be the first!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {bees.map((bee, index) => (
            <Card
              key={bee.id}
              className="p-3 bg-[#242444] border-gray-700/50"
              data-testid={`card-tg-bee-${bee.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-lg">
                    {BEE_AVATARS.find((a) => a.id === bee.avatarUrl)?.emoji || "🐝"}
                  </div>
                  {index < 3 && sort === "rating" && (
                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                      index === 0 ? "bg-amber-500 text-black" : index === 1 ? "bg-gray-400 text-black" : "bg-amber-700 text-white"
                    }`}>
                      {index + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white truncate" data-testid={`text-tg-bee-name-${bee.id}`}>
                      {bee.name}
                    </span>
                    {bee.avatarUrl && BEE_AVATARS.find((a) => a.id === bee.avatarUrl) && (
                      <span className="text-[9px] text-gray-500">
                        {BEE_AVATARS.find((a) => a.id === bee.avatarUrl)?.label}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {bee.bio || `${bee.arenaWins}W / ${bee.arenaLosses}L`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-amber-400" data-testid={`text-tg-bee-rating-${bee.id}`}>
                    {bee.arenaRating}
                  </div>
                  <div className="text-[9px] text-gray-500">ELO</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface TgPost {
  id: string;
  title: string;
  body: string;
  agentId: string;
  channelId?: string | null;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  tags: string[];
  createdAt: string;
  agent?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    isBot?: boolean;
  };
}

interface TgComment {
  id: string;
  postId: string;
  agentId: string;
  body: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  agent?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    isBot?: boolean;
  };
}

interface TgChannel {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  memberCount: number;
  postCount: number;
}

type FeedView = "list" | "post-detail" | "create" | "channels" | "channel-posts";

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function TgPostCard({
  post,
  userVote,
  onVote,
  onTap,
  isVoting,
}: {
  post: TgPost;
  userVote?: "up" | "down" | null;
  onVote: (direction: "up" | "down") => void;
  onTap: () => void;
  isVoting?: boolean;
}) {
  const score = post.upvotes - post.downvotes;
  const bodyText = post.body.replace(/!\[[^\]]*\]\([^)]+\)\n*/g, "").trim();

  return (
    <Card
      className="p-3 bg-[#242444] border-gray-700/50 mb-2"
      data-testid={`card-tg-post-${post.id}`}
    >
      <div className="flex gap-2">
        <div className="flex flex-col items-center gap-0.5 min-w-[32px]">
          <button
            onClick={(e) => { e.stopPropagation(); onVote("up"); }}
            disabled={isVoting}
            className={`p-1 rounded transition-colors ${
              userVote === "up" ? "text-amber-400 bg-amber-500/20" : "text-gray-500"
            }`}
            data-testid={`button-tg-upvote-${post.id}`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <span
            className={`text-xs font-bold ${
              score > 0 ? "text-amber-400" : score < 0 ? "text-red-400" : "text-gray-500"
            }`}
            data-testid={`text-tg-score-${post.id}`}
          >
            {score}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onVote("down"); }}
            disabled={isVoting}
            className={`p-1 rounded transition-colors ${
              userVote === "down" ? "text-red-400 bg-red-500/20" : "text-gray-500"
            }`}
            data-testid={`button-tg-downvote-${post.id}`}
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onTap}>
          <h3 className="text-sm font-semibold text-white line-clamp-2 mb-1" data-testid={`text-tg-post-title-${post.id}`}>
            {post.title}
          </h3>
          <p className="text-xs text-gray-400 line-clamp-2 mb-2">
            {bodyText.slice(0, 150)}
            {bodyText.length > 150 && "..."}
          </p>
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            {post.agent && (
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[8px]">
                  {post.agent.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="truncate max-w-[80px]">{post.agent.name}</span>
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <MessageSquare className="w-3 h-3" />
              {post.commentCount}
            </span>
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(post.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TgPostDetailView({
  postId,
  agentId,
  onBack,
}: {
  postId: string;
  agentId?: string;
  onBack: () => void;
}) {
  const [commentBody, setCommentBody] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [voting, setVoting] = useState(false);
  const [postData, setPostData] = useState<{
    post: TgPost;
    comments: TgComment[];
    userVote: { direction: string } | null;
    userCommentVotes?: { commentId: string; direction: string }[];
  } | null>(null);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPost = useCallback(async () => {
    try {
      const token = localStorage.getItem("tg_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/posts/${postId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPostData(data);
      }
    } catch {}
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleVote = async (direction: "up" | "down") => {
    const token = localStorage.getItem("tg_token");
    if (!agentId || !token || voting) return;
    setVoting(true);
    try {
      await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId, direction }),
      });
      await fetchPost();
    } catch {}
    setVoting(false);
  };

  const handleSubmitComment = async () => {
    const token = localStorage.getItem("tg_token");
    if (!agentId || !token || !commentBody.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId, body: commentBody.trim() }),
      });
      if (res.ok) {
        setCommentBody("");
        await fetchPost();
      }
    } catch {}
    setSubmittingComment(false);
  };

  const handleCommentVote = async (commentId: string, direction: "up" | "down") => {
    const token = localStorage.getItem("tg_token");
    if (!agentId || !token || votingCommentId) return;
    setVotingCommentId(commentId);
    try {
      const res = await fetch(`/api/comments/${commentId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId, direction }),
      });
      if (res.ok) {
        await fetchPost();
      }
    } catch {}
    setVotingCommentId(null);
  };

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-400 mb-4" data-testid="button-tg-post-back">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs">Back</span>
        </button>
        <div className="space-y-3">
          <div className="h-6 w-3/4 bg-gray-700 animate-pulse rounded" />
          <div className="h-4 w-full bg-gray-700 animate-pulse rounded" />
          <div className="h-4 w-1/2 bg-gray-700 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!postData) {
    return (
      <div className="px-4 pt-4 pb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-400 mb-4" data-testid="button-tg-post-back">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs">Back</span>
        </button>
        <Card className="p-6 bg-[#242444] border-gray-700/50 text-center">
          <p className="text-sm text-gray-400">Post not found</p>
        </Card>
      </div>
    );
  }

  const { post, comments, userVote } = postData;
  const score = post.upvotes - post.downvotes;
  const bodyText = post.body.replace(/!\[[^\]]*\]\([^)]+\)\n*/g, "").trim();
  const imgMatch = post.body.match(/!\[([^\]]*)\]\(([^)]+)\)/);
  const imgSrc = imgMatch ? imgMatch[2] : null;

  return (
    <div className="px-4 pt-4 pb-4">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 mb-3" data-testid="button-tg-post-back">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-xs">Back</span>
      </button>

      <Card className="p-3 bg-[#242444] border-gray-700/50 mb-3" data-testid="card-tg-post-detail">
        <div className="flex items-center gap-2 mb-2">
          {post.agent && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs">
                {post.agent.name.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-white">{post.agent.name}</span>
            </div>
          )}
          <span className="text-[10px] text-gray-500">{formatTimeAgo(post.createdAt)}</span>
        </div>

        <h2 className="text-base font-bold text-white mb-2" data-testid="text-tg-post-detail-title">
          {post.title}
        </h2>

        {imgSrc && (
          <div className="mb-2 rounded-lg overflow-hidden">
            <img src={imgSrc} alt="" className="w-full max-h-[200px] object-cover" />
          </div>
        )}

        <p className="text-sm text-gray-300 whitespace-pre-wrap mb-3" data-testid="text-tg-post-detail-body">
          {bodyText}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-gray-700/30">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVote("up")}
              disabled={voting}
              className={`p-1.5 rounded transition-colors ${
                userVote?.direction === "up" ? "text-amber-400 bg-amber-500/20" : "text-gray-500"
              }`}
              data-testid="button-tg-detail-upvote"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <span className={`text-sm font-bold ${
              score > 0 ? "text-amber-400" : score < 0 ? "text-red-400" : "text-gray-500"
            }`}>
              {score}
            </span>
            <button
              onClick={() => handleVote("down")}
              disabled={voting}
              className={`p-1.5 rounded transition-colors ${
                userVote?.direction === "down" ? "text-red-400 bg-red-500/20" : "text-gray-500"
              }`}
              data-testid="button-tg-detail-downvote"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <MessageSquare className="w-3.5 h-3.5" />
            {comments.length} comments
          </span>
        </div>
      </Card>

      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white mb-2" data-testid="text-tg-comments-header">
          Comments ({comments.length})
        </h3>

        {agentId ? (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a2e] border border-gray-700/50 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmitComment(); }}
              data-testid="input-tg-comment"
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentBody.trim() || submittingComment}
              className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-400 disabled:opacity-40 transition-colors"
              data-testid="button-tg-submit-comment"
            >
              {submittingComment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500 mb-3">Open via @honeycombot to comment</p>
        )}

        {comments.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-4">No comments yet</p>
        ) : (
          <div className="space-y-2">
            {comments.map((comment) => {
              const commentScore = (comment.upvotes || 0) - (comment.downvotes || 0);
              const myCommentVote = postData?.userCommentVotes?.find(v => v.commentId === comment.id);
              return (
                <div key={comment.id} className="p-2 bg-[#1a1a2e] rounded-lg" data-testid={`comment-tg-${comment.id}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {comment.agent && (
                      <>
                        <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center text-[8px]">
                          {comment.agent.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="text-[11px] font-medium text-white">{comment.agent.name}</span>
                      </>
                    )}
                    <span className="text-[10px] text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-300 whitespace-pre-wrap mb-1.5">{comment.body}</p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCommentVote(comment.id, "up")}
                      disabled={!agentId || votingCommentId === comment.id}
                      className={`p-0.5 rounded transition-colors ${
                        myCommentVote?.direction === "up" ? "text-amber-400" : "text-gray-600"
                      }`}
                      data-testid={`button-tg-comment-upvote-${comment.id}`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className={`text-[10px] font-bold ${
                      commentScore > 0 ? "text-amber-400" : commentScore < 0 ? "text-red-400" : "text-gray-600"
                    }`} data-testid={`text-tg-comment-score-${comment.id}`}>
                      {commentScore}
                    </span>
                    <button
                      onClick={() => handleCommentVote(comment.id, "down")}
                      disabled={!agentId || votingCommentId === comment.id}
                      className={`p-0.5 rounded transition-colors ${
                        myCommentVote?.direction === "down" ? "text-red-400" : "text-gray-600"
                      }`}
                      data-testid={`button-tg-comment-downvote-${comment.id}`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TgCreatePostView({
  agentId,
  onBack,
  onCreated,
}: {
  agentId: string;
  onBack: () => void;
  onCreated: (postId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Title and content are required");
      return;
    }
    const token = localStorage.getItem("tg_token");
    if (!token) {
      setError("Not authenticated");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agentId,
          title: title.trim(),
          body: body.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated(data.post.id);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Failed to create post");
      }
    } catch {
      setError("Network error, try again");
    }
    setSubmitting(false);
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 mb-3" data-testid="button-tg-create-back">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-xs">Back</span>
      </button>

      <h2 className="text-lg font-bold text-white mb-4" data-testid="text-tg-create-title">New Post</h2>

      <div className="space-y-3">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setError(""); }}
            placeholder="Post title..."
            maxLength={200}
            className="w-full px-3 py-2.5 rounded-lg bg-[#242444] border border-gray-700/50 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
            data-testid="input-tg-post-title"
          />
          <div className="text-[10px] text-gray-500 text-right mt-1">{title.length}/200</div>
        </div>

        <div>
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setError(""); }}
            placeholder="What's on your mind?"
            rows={6}
            maxLength={10000}
            className="w-full px-3 py-2.5 rounded-lg bg-[#242444] border border-gray-700/50 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none"
            data-testid="input-tg-post-body"
          />
          <div className="text-[10px] text-gray-500 text-right mt-1">{body.length}/10000</div>
        </div>

        {error && (
          <p className="text-xs text-red-400" data-testid="text-tg-create-error">{error}</p>
        )}

        <Button
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          disabled={!title.trim() || !body.trim() || submitting}
          onClick={handleSubmit}
          data-testid="button-tg-submit-post"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Publish Post
        </Button>
      </div>
    </div>
  );
}

function TgChannelListView({
  onSelectChannel,
  onBack,
}: {
  onSelectChannel: (slug: string) => void;
  onBack: () => void;
}) {
  const [channels, setChannels] = useState<TgChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setChannels(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 pt-4 pb-4">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 mb-3" data-testid="button-tg-channels-back">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-xs">Back</span>
      </button>

      <h2 className="text-lg font-bold text-white mb-1" data-testid="text-tg-channels-title">Channels</h2>
      <p className="text-xs text-gray-400 mb-4">Browse topic-based channels</p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-700/30 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <Card className="p-6 bg-[#242444] border-gray-700/50 text-center">
          <Hash className="w-8 h-8 text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No channels yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => onSelectChannel(channel.slug)}
              className="w-full p-3 bg-[#242444] border border-gray-700/50 rounded-xl flex items-center gap-3 text-left transition-colors hover:border-amber-500/30"
              data-testid={`button-tg-channel-${channel.slug}`}
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <Hash className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{channel.name}</div>
                <div className="text-[10px] text-gray-500 truncate">
                  {channel.description || `${channel.memberCount} members · ${channel.postCount} posts`}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TgChannelPostsView({
  channelSlug,
  agentId,
  onBack,
  onViewPost,
}: {
  channelSlug: string;
  agentId?: string;
  onBack: () => void;
  onViewPost: (postId: string) => void;
}) {
  const [channel, setChannel] = useState<TgChannel | null>(null);
  const [posts, setPosts] = useState<TgPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchChannel = useCallback(async () => {
    try {
      const res = await fetch(`/api/channels/${channelSlug}`);
      if (res.ok) setChannel(await res.json());
    } catch {}
  }, [channelSlug]);

  const fetchPosts = useCallback(async (offset = 0, append = false) => {
    try {
      const res = await fetch(`/api/channels/${channelSlug}/posts?sort=new&limit=20&offset=${offset}`);
      if (res.ok) {
        const data = await res.json();
        const postsList = data.posts || data;
        if (append) {
          setPosts(prev => [...prev, ...postsList]);
        } else {
          setPosts(postsList);
        }
        setHasMore(data.hasMore ?? false);
      }
    } catch {}
    setLoading(false);
    setLoadingMore(false);
  }, [channelSlug]);

  useEffect(() => {
    fetchChannel();
    fetchPosts(0, false);
  }, [fetchChannel, fetchPosts]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchPosts(posts.length, true);
  }, [loadingMore, hasMore, posts.length, fetchPosts]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loadingMore) {
      handleLoadMore();
    }
  }, [hasMore, loadingMore, handleLoadMore]);

  const handleVote = async (postId: string, direction: "up" | "down") => {
    const token = localStorage.getItem("tg_token");
    if (!agentId || !token || voting) return;
    setVoting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId, direction }),
      });
      if (res.ok) {
        await fetchPosts(0, false);
      }
    } catch {}
    setVoting(false);
  };

  return (
    <div className="px-4 pt-4 pb-4 h-full overflow-y-auto" onScroll={handleScroll}>
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 mb-3" data-testid="button-tg-channel-back">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-xs">Back to Channels</span>
      </button>

      {channel && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Hash className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-white" data-testid="text-tg-channel-name">{channel.name}</h2>
          </div>
          {channel.description && (
            <p className="text-xs text-gray-400 mb-1">{channel.description}</p>
          )}
          <div className="flex gap-3 text-[10px] text-gray-500">
            <span>{channel.memberCount} members</span>
            <span>{channel.postCount} posts</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-700/30 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-6 bg-[#242444] border-gray-700/50 text-center">
          <p className="text-sm text-gray-400">No posts in this channel yet</p>
        </Card>
      ) : (
        <>
          {posts.map((post) => (
            <TgPostCard
              key={post.id}
              post={post}
              onVote={(dir) => handleVote(post.id, dir)}
              onTap={() => onViewPost(post.id)}
              isVoting={voting}
            />
          ))}
          {loadingMore && (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            </div>
          )}
          {!hasMore && posts.length > 0 && (
            <p className="text-[10px] text-gray-600 text-center py-3">End of posts</p>
          )}
        </>
      )}
    </div>
  );
}

function FeedTab({ agentId }: { agentId?: string }) {
  const [view, setView] = useState<FeedView>("list");
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedChannelSlug, setSelectedChannelSlug] = useState<string | null>(null);
  const [sort, setSort] = useState<"new" | "top">("new");
  const [posts, setPosts] = useState<TgPost[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, "up" | "down">>({});
  const [loading, setLoading] = useState(true);
  const [votingPostId, setVotingPostId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchFeed = useCallback(async (offset = 0, append = false) => {
    try {
      const token = localStorage.getItem("tg_token");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/feed?sort=${sort}&limit=20&offset=${offset}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setPosts(prev => [...prev, ...(data.posts || [])]);
        } else {
          setPosts(data.posts || []);
        }
        setHasMore(data.hasMore ?? false);
        if (data.userVotes) {
          const voteMap: Record<string, "up" | "down"> = {};
          data.userVotes.forEach((v: { postId: string; direction: string }) => {
            voteMap[v.postId] = v.direction as "up" | "down";
          });
          setUserVotes(prev => append ? { ...prev, ...voteMap } : voteMap);
        }
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }, [sort]);

  useEffect(() => {
    setLoading(true);
    setPosts([]);
    setHasMore(true);
    fetchFeed(0, false);
  }, [fetchFeed]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setHasMore(true);
    fetchFeed(0, false);
  }, [fetchFeed]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchFeed(posts.length, true);
  }, [loadingMore, hasMore, posts.length, fetchFeed]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.currentTarget;
    if (target.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current > 0 && e.currentTarget.scrollTop <= 0) {
      const diff = e.touches[0].clientY - touchStartY.current;
      if (diff > 0) {
        setPullDistance(Math.min(diff * 0.5, 60));
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 40) {
      handleRefresh();
    }
    setPullDistance(0);
    touchStartY.current = 0;
  }, [pullDistance, handleRefresh]);

  const handleVote = async (postId: string, direction: "up" | "down") => {
    const token = localStorage.getItem("tg_token");
    if (!agentId || !token || votingPostId) return;
    setVotingPostId(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agentId, direction }),
      });

      if (res.ok) {
        const prevVote = userVotes[postId];
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            let { upvotes, downvotes } = p;
            if (prevVote === direction) return p;
            if (prevVote === "up") upvotes--;
            if (prevVote === "down") downvotes--;
            if (direction === "up") upvotes++;
            if (direction === "down") downvotes++;
            return { ...p, upvotes, downvotes };
          })
        );
        setUserVotes((prev) => ({ ...prev, [postId]: direction }));
      }
    } catch {}
    setVotingPostId(null);
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && hasMore && !loadingMore) {
      handleLoadMore();
    }
  }, [hasMore, loadingMore, handleLoadMore]);

  if (view === "post-detail" && selectedPostId) {
    return (
      <TgPostDetailView
        postId={selectedPostId}
        agentId={agentId}
        onBack={() => { setView("list"); setSelectedPostId(null); }}
      />
    );
  }

  if (view === "create" && agentId) {
    return (
      <TgCreatePostView
        agentId={agentId}
        onBack={() => setView("list")}
        onCreated={(postId) => {
          setView("post-detail");
          setSelectedPostId(postId);
          handleRefresh();
        }}
      />
    );
  }

  if (view === "channels") {
    return (
      <TgChannelListView
        onSelectChannel={(slug) => {
          setSelectedChannelSlug(slug);
          setView("channel-posts");
        }}
        onBack={() => setView("list")}
      />
    );
  }

  if (view === "channel-posts" && selectedChannelSlug) {
    return (
      <TgChannelPostsView
        channelSlug={selectedChannelSlug}
        agentId={agentId}
        onBack={() => { setView("channels"); setSelectedChannelSlug(null); }}
        onViewPost={(postId) => {
          setSelectedPostId(postId);
          setView("post-detail");
        }}
      />
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex flex-col h-full overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onScroll={handleScroll}
    >
      {pullDistance > 0 && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: pullDistance }}
        >
          <RefreshCw className={`w-5 h-5 text-amber-500 ${pullDistance > 40 ? "animate-spin" : ""}`} />
        </div>
      )}

      {refreshing && pullDistance === 0 && (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
        </div>
      )}

      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-white" data-testid="text-tg-feed-title">Feed</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView("channels")}
              className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 transition-colors"
              data-testid="button-tg-channels"
            >
              <Hash className="w-3 h-3 inline mr-0.5" />
              Channels
            </button>
            {agentId && (
              <button
                onClick={() => setView("create")}
                className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center"
                data-testid="button-tg-new-post"
              >
                <Plus className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setSort("new")}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              sort === "new" ? "bg-amber-500/20 text-amber-400" : "text-gray-500"
            }`}
            data-testid="button-tg-feed-sort-new"
          >
            <Clock className="w-3 h-3 inline mr-0.5" />
            New
          </button>
          <button
            onClick={() => setSort("top")}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              sort === "top" ? "bg-amber-500/20 text-amber-400" : "text-gray-500"
            }`}
            data-testid="button-tg-feed-sort-top"
          >
            <TrendingUp className="w-3 h-3 inline mr-0.5" />
            Trending
          </button>
        </div>
      </div>

      <div className="px-4 flex-1">
        {loading && posts.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-700/30 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <Card className="p-8 bg-[#242444] border-gray-700/50 text-center" data-testid="container-tg-empty-feed">
            <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-400 mb-2">No posts yet</p>
            {agentId && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                onClick={() => setView("create")}
                data-testid="button-tg-first-post"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Create the first post
              </Button>
            )}
          </Card>
        ) : (
          <>
            {posts.map((post) => (
              <TgPostCard
                key={post.id}
                post={post}
                userVote={userVotes[post.id]}
                onVote={(dir) => handleVote(post.id, dir)}
                onTap={() => {
                  setSelectedPostId(post.id);
                  setView("post-detail");
                }}
                isVoting={votingPostId === post.id}
              />
            ))}
            {loadingMore && (
              <div className="flex items-center justify-center py-3" data-testid="container-tg-feed-loading-more">
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-[10px] text-gray-600 text-center py-3">End of feed</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const BEE_AVATARS = [
  { id: "queen", emoji: "👑", label: "Queen Bee" },
  { id: "worker", emoji: "🐝", label: "Worker Bee" },
  { id: "scout", emoji: "🔍", label: "Scout Bee" },
  { id: "guard", emoji: "🛡️", label: "Guard Bee" },
  { id: "builder", emoji: "🏗️", label: "Builder Bee" },
  { id: "trader", emoji: "📈", label: "Trader Bee" },
  { id: "warrior", emoji: "⚔️", label: "Warrior Bee" },
  { id: "sage", emoji: "🧠", label: "Sage Bee" },
];

function CreateBeeView({ agent, onComplete }: { agent: TgAgent; onComplete: (updated: TgAgent) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(agent.name || "");
  const [bio, setBio] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("tg_token");
      const res = await fetch("/api/telegram/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || null,
          avatarUrl: selectedAvatar || null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onComplete(updated);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to save");
      }
    } catch {
      setError("Network error, try again");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col">
      <div className="flex-1 px-4 pt-8 pb-8 flex flex-col">
        <div className="text-center mb-6">
          <img src={beeLogoPath} alt="Honeycomb Bee" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white" data-testid="text-create-bee-title">
            Create Your Bee
          </h1>
          <p className="text-sm text-gray-400 mt-1">Set up your on-chain identity</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? "w-8 bg-amber-500" : s < step ? "w-8 bg-amber-500/50" : "w-8 bg-gray-700"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="flex-1 flex flex-col" data-testid="container-bee-step-name">
            <h2 className="text-lg font-semibold text-white mb-1">Name your Bee</h2>
            <p className="text-xs text-gray-400 mb-4">This is how others will see you in the hive</p>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(""); }}
              placeholder="Enter your Bee name..."
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl bg-[#242444] border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 mb-2"
              data-testid="input-bee-name"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mb-4">
              <span>{error && <span className="text-red-400">{error}</span>}</span>
              <span>{name.length}/30</span>
            </div>
            <div className="mt-auto">
              <Button
                size="lg"
                disabled={name.trim().length < 2}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                onClick={() => setStep(1)}
                data-testid="button-bee-next-name"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex-1 flex flex-col" data-testid="container-bee-step-avatar">
            <h2 className="text-lg font-semibold text-white mb-1">Choose your type</h2>
            <p className="text-xs text-gray-400 mb-4">Pick a role that represents you</p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {BEE_AVATARS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAvatar(a.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                    selectedAvatar === a.id
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-gray-700/50 bg-[#242444]"
                  }`}
                  data-testid={`button-bee-avatar-${a.id}`}
                >
                  <span className="text-2xl">{a.emoji}</span>
                  <span className="text-[9px] text-gray-400">{a.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-auto flex gap-3">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300"
                onClick={() => setStep(0)}
                data-testid="button-bee-back-avatar"
              >
                Back
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                onClick={() => setStep(2)}
                data-testid="button-bee-next-avatar"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex-1 flex flex-col" data-testid="container-bee-step-bio">
            <h2 className="text-lg font-semibold text-white mb-1">Add a bio</h2>
            <p className="text-xs text-gray-400 mb-4">Tell the hive about yourself (optional)</p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Crypto trader, DeFi degen, BNB maxi..."
              maxLength={160}
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#242444] border border-gray-700/50 text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50 resize-none mb-2"
              data-testid="input-bee-bio"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mb-4">
              <span>{error && <span className="text-red-400">{error}</span>}</span>
              <span>{bio.length}/160</span>
            </div>

            <Card className="p-4 bg-[#242444] border-gray-700/50 mb-6" data-testid="card-bee-preview">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-2xl">
                  {BEE_AVATARS.find((a) => a.id === selectedAvatar)?.emoji || "🐝"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{name || "Your Bee"}</div>
                  <div className="text-xs text-gray-400 truncate">{bio || "No bio yet"}</div>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px]">
                  {BEE_AVATARS.find((a) => a.id === selectedAvatar)?.label || "Bee"}
                </Badge>
              </div>
            </Card>

            <div className="mt-auto flex gap-3">
              <Button
                size="lg"
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300"
                onClick={() => setStep(1)}
                data-testid="button-bee-back-bio"
              >
                Back
              </Button>
              <Button
                size="lg"
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                onClick={handleSave}
                data-testid="button-bee-create"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Create Bee
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileTab({ agent, loading, onEditBee }: { agent: TgAgent | null; loading: boolean; onEditBee?: () => void }) {
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [confirmExport, setConfirmExport] = useState(false);

  const handleShareReferral = () => {
    const shareUrl = `${BASE_URL}/r/tg`;
    const text = "Join Honeycomb and compete in AI trading duels!";
    const tgLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.Telegram?.WebApp?.openTelegramLink(tgLink);
  };

  const handleOpenSite = () => {
    const url = BASE_URL;
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleCopyAddress = () => {
    if (agent?.ownerAddress) {
      navigator.clipboard.writeText(agent.ownerAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchBalance = async () => {
    setBalanceLoading(true);
    try {
      const token = localStorage.getItem("tg_token");
      const res = await fetch("/api/telegram/wallet/balance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch {}
    setBalanceLoading(false);
  };

  useEffect(() => {
    if (agent) fetchBalance();
  }, [agent?.id]);

  const handleExportKey = async () => {
    if (!confirmExport) {
      setConfirmExport(true);
      return;
    }
    setKeyLoading(true);
    try {
      const token = localStorage.getItem("tg_token");
      const res = await fetch("/api/telegram/wallet/export-key", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPrivateKey(data.privateKey);
        setShowPrivateKey(true);
        setConfirmExport(false);
      }
    } catch {}
    setKeyLoading(false);
  };

  const handleCopyKey = () => {
    if (privateKey) {
      navigator.clipboard.writeText(privateKey);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    }
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-xl font-bold text-white mb-1" data-testid="text-tg-profile-title">
          Profile
        </h2>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-xl font-bold text-white mb-1" data-testid="text-tg-profile-title">
          Profile
        </h2>
        <Card className="p-6 bg-[#242444] border-gray-700/50 text-center mt-4" data-testid="container-tg-connect">
          <Wallet className="w-12 h-12 text-amber-500/60 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Open in Telegram</h3>
          <p className="text-sm text-gray-400 mb-4">
            Open this app through @honeycombot on Telegram to automatically create your wallet and start trading.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h2 className="text-xl font-bold text-white mb-1" data-testid="text-tg-profile-title">
        Profile
      </h2>
      <Card className="p-3 bg-[#242444] border-gray-700/50 mb-4" data-testid="card-tg-bee-identity">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-xl">
            {BEE_AVATARS.find((a) => a.id === agent.avatarUrl)?.emoji || "🐝"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">{agent.name}</div>
            <div className="text-xs text-gray-400 truncate">{agent.bio || "No bio set"}</div>
          </div>
          {onEditBee && (
            <button
              onClick={onEditBee}
              className="text-xs text-amber-400 hover:text-amber-300 px-2 py-1"
              data-testid="button-tg-edit-bee"
            >
              Edit
            </button>
          )}
        </div>
      </Card>

      <Card className="p-3 bg-[#242444] border-gray-700/50 mb-3" data-testid="card-tg-wallet">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-400">BNB Wallet</span>
          </div>
          <button
            onClick={handleCopyAddress}
            className="flex items-center gap-1.5 text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors"
            data-testid="button-tg-copy-address"
          >
            {truncateAddress(agent.ownerAddress)}
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-700/30">
          <span className="text-xs text-gray-400">Balance</span>
          <div className="flex items-center gap-2">
            {balanceLoading ? (
              <div className="w-4 h-4 border border-amber-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-sm font-bold text-white" data-testid="text-tg-balance">
                {balance !== null ? `${parseFloat(balance).toFixed(6)} BNB` : "—"}
              </span>
            )}
            <button onClick={fetchBalance} className="text-gray-500 hover:text-amber-400 transition-colors" data-testid="button-tg-refresh-balance">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </Card>

      {!showPrivateKey ? (
        <Card className={`p-3 border-gray-700/50 mb-4 ${confirmExport ? "bg-red-500/10 border-red-500/30" : "bg-[#242444]"}`} data-testid="card-tg-export-key">
          {confirmExport ? (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xs font-semibold text-red-400">Security Warning</span>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">
                Your private key gives full access to this wallet. Never share it with anyone. Make sure no one is watching your screen.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 text-xs"
                  onClick={() => setConfirmExport(false)}
                  data-testid="button-tg-cancel-export"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={keyLoading}
                  className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 text-xs"
                  onClick={handleExportKey}
                  data-testid="button-tg-confirm-export"
                >
                  {keyLoading ? (
                    <div className="w-4 h-4 border border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Show Private Key"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleExportKey}
              className="flex items-center justify-between w-full"
              data-testid="button-tg-export-key"
            >
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-400">Export Private Key</span>
              </div>
              <EyeOff className="w-3.5 h-3.5 text-gray-600" />
            </button>
          )}
        </Card>
      ) : (
        <Card className="p-3 bg-red-500/5 border-red-500/20 mb-4" data-testid="card-tg-private-key">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-red-400" />
              <span className="text-xs font-semibold text-red-400">Private Key</span>
            </div>
            <button
              onClick={() => { setShowPrivateKey(false); setPrivateKey(null); }}
              className="text-xs text-gray-500 hover:text-gray-300"
              data-testid="button-tg-hide-key"
            >
              Hide
            </button>
          </div>
          <div
            className="bg-black/30 rounded-lg p-2.5 font-mono text-[10px] text-red-300 break-all select-all mb-2"
            data-testid="text-tg-private-key"
          >
            {privateKey}
          </div>
          <button
            onClick={handleCopyKey}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-amber-400 transition-colors"
            data-testid="button-tg-copy-key"
          >
            {keyCopied ? (
              <><Check className="w-3 h-3 text-green-400" /> Copied</>
            ) : (
              <><Copy className="w-3 h-3" /> Copy to clipboard</>
            )}
          </button>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 bg-[#242444] border-gray-700/50 text-center" data-testid="card-tg-wins">
          <div className="text-2xl font-bold text-green-400">{agent.arenaWins}</div>
          <div className="text-[10px] text-gray-500">Wins</div>
        </Card>
        <Card className="p-4 bg-[#242444] border-gray-700/50 text-center" data-testid="card-tg-losses">
          <div className="text-2xl font-bold text-red-400">{agent.arenaLosses}</div>
          <div className="text-[10px] text-gray-500">Losses</div>
        </Card>
        <Card className="p-4 bg-[#242444] border-gray-700/50 text-center" data-testid="card-tg-rating">
          <div className="text-2xl font-bold text-amber-400">{agent.arenaRating}</div>
          <div className="text-[10px] text-gray-500">Rating</div>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          onClick={handleShareReferral}
          data-testid="button-tg-share-referral"
        >
          <Share2 className="w-4 h-4" />
          Share Referral Link
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2 border-amber-500/30 text-amber-400"
          onClick={handleOpenSite}
          data-testid="button-tg-open-site"
        >
          <ExternalLink className="w-4 h-4" />
          Open Full Site
        </Button>
      </div>
    </div>
  );
}

type EarnView = "main" | "bounties" | "referrals" | "leaderboards";

interface UserPointsData {
  totalPoints: number;
  lifetimePoints: number;
  dailyEarned: number;
  dailyCapResetAt: string | null;
  lastEarnedAt: string | null;
}

interface PointsHistoryItem {
  action: string;
  points: number;
  multiplier: number;
  finalPoints: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface BountyItem {
  id: string;
  title: string;
  body: string;
  status: string;
  rewardDisplay: string;
  deadline: string;
  solutionCount: number;
  tags: string[];
  isExpired?: boolean;
  agent?: { id: string; name: string; avatarUrl: string | null };
}

interface ReferralData {
  referrerAgentId: string;
  referralCode: string;
  referralCount: number;
  tier: string;
  totalRewardsEarned: string;
}

interface PointsLeaderEntry {
  rank: number;
  agentId: string;
  name: string;
  avatarUrl: string | null;
  totalPoints: number;
  lifetimePoints: number;
}

interface ReferrerLeaderEntry {
  id: string;
  referrerAgentId: string;
  referralCode: string;
  referralCount: number;
  tier: string;
  agent: { id: string; name: string; avatarUrl: string | null } | null;
}

function tgFetch(url: string, options?: RequestInit) {
  const token = localStorage.getItem("tg_token");
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

function getEarnActionLabel(action: string): string {
  if (action.includes("honey_runner") || action.includes("runner")) return "Honey Runner";
  if (action.includes("trading_arena") || action.includes("trading")) return "Trading Arena";
  if (action.includes("trivia_battle") || action.includes("trivia")) return "Trivia Battle";
  if (action.includes("crypto_fighters") || action.includes("fighter")) return "Crypto Fighters";
  if (action.includes("referral")) return "Referral Bonus";
  if (action.includes("daily")) return "Daily Bonus";
  if (action.includes("bot") || action.includes("practice")) return "Practice";
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const TOKENOMICS_DATA = [
  { label: "FourMeme Public Launch", pct: "35%", amount: "350M", highlight: true },
  { label: "Community & Staking", pct: "25%", amount: "250M", highlight: true },
  { label: "Liquidity Pool", pct: "20%", amount: "200M", highlight: false },
  { label: "Ecosystem & Dev", pct: "15%", amount: "150M", highlight: false },
  { label: "Private Sale", pct: "5%", amount: "50M", highlight: false },
];

const TIER_STYLES: Record<string, string> = {
  newcomer: "text-gray-400",
  bronze: "text-amber-600",
  silver: "text-slate-400",
  gold: "text-yellow-500",
  queen: "text-purple-400",
};

function EarnTab({ agentId }: { agentId?: string }) {
  const [earnView, setEarnView] = useState<EarnView>("main");

  if (earnView === "bounties") return <BountyBrowser agentId={agentId} onBack={() => setEarnView("main")} />;
  if (earnView === "referrals") return <ReferralView agentId={agentId} onBack={() => setEarnView("main")} />;
  if (earnView === "leaderboards") return <LeaderboardView onBack={() => setEarnView("main")} />;

  return <EarnMain agentId={agentId} onNavigate={setEarnView} />;
}

function EarnMain({ agentId, onNavigate }: { agentId?: string; onNavigate: (view: EarnView) => void }) {
  const { data: pointsData, isLoading: pointsLoading } = useQuery<{ points: UserPointsData }>({
    queryKey: ["/api/points/my"],
    queryFn: () => tgFetch("/api/points/my").then(r => r.ok ? r.json() : { points: null }),
    enabled: !!agentId,
    staleTime: 30000,
  });

  const { data: historyData } = useQuery<{ history: PointsHistoryItem[] }>({
    queryKey: ["/api/points/history", "?limit=60"],
    queryFn: () => tgFetch("/api/points/history?limit=60").then(r => r.ok ? r.json() : { history: [] }),
    enabled: !!agentId,
    staleTime: 30000,
  });

  const { data: rewardsData } = useQuery<{
    caps?: { dailyCap?: number; preTge?: boolean };
    tokenomics?: {
      totalSupply: number;
      allocations: Record<string, { amount: number; pct: number; description: string }>;
      totalPointsPool: number;
    };
  }>({
    queryKey: ["/api/points/game-rewards"],
    staleTime: 60000,
  });

  const points = pointsData?.points;
  const dailyCap = rewardsData?.caps?.dailyCap || 500;
  const isUnlimited = !rewardsData?.caps?.dailyCap || dailyCap >= 999999999;

  const streakDays = (() => {
    const history = historyData?.history;
    if (!history || history.length === 0) return 0;
    const toDayNum = (d: Date) => Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000);
    const uniqueDayNums = [...new Set(history.map(h => toDayNum(new Date(h.createdAt))))].sort((a, b) => b - a);
    if (uniqueDayNums.length === 0) return 0;
    const todayNum = toDayNum(new Date());
    if (uniqueDayNums[0] !== todayNum && uniqueDayNums[0] !== todayNum - 1) return 0;
    let streak = 0;
    let expected = uniqueDayNums[0];
    for (const dayNum of uniqueDayNums) {
      if (dayNum === expected) {
        streak++;
        expected--;
      } else if (dayNum < expected) {
        break;
      }
    }
    return streak;
  })();

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-2 mb-1">
        <Coins className="w-5 h-5 text-amber-500" />
        <h2 className="text-xl font-bold text-white" data-testid="text-tg-earn-title">Earn</h2>
      </div>
      <p className="text-xs text-gray-400 mb-4">Earn points, track rewards, and grow your hive</p>

      {!agentId ? (
        <Card className="p-6 bg-[#242444] border-gray-700/50 text-center" data-testid="container-tg-earn-login">
          <Coins className="w-10 h-10 text-amber-500/50 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Open via @honeycombot to earn points</p>
        </Card>
      ) : (
        <>
          <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-600/10 border-amber-500/20 mb-4" data-testid="card-tg-points-balance">
            {pointsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Your Points</p>
                    <p className="text-3xl font-bold text-amber-500" data-testid="text-tg-points-total">
                      {(points?.totalPoints || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-amber-500/10">
                    <Coins className="w-6 h-6 text-amber-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/20 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-500">Lifetime Earned</p>
                    <p className="text-sm font-semibold text-white" data-testid="text-tg-points-lifetime">
                      {(points?.lifetimePoints || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-500">Daily Earned</p>
                    <p className="text-sm font-semibold text-white" data-testid="text-tg-points-daily">
                      {(points?.dailyEarned || 0).toLocaleString()}
                      {!isUnlimited && <span className="text-gray-500 text-[10px] ml-1">/ {dailyCap}</span>}
                    </p>
                  </div>
                </div>
              </>
            )}
          </Card>

          <Card className="p-4 bg-[#242444] border-gray-700/50 mb-4" data-testid="card-tg-daily-rewards">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-4 h-4 text-orange-500" />
              <p className="text-sm font-semibold text-white">Daily Rewards</p>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Recent Activity Streak</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-orange-500" data-testid="text-tg-streak-count">{streakDays}</span>
                  <span className="text-xs text-gray-400">day{streakDays !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const isActive = day <= streakDays;
                  return (
                    <div
                      key={day}
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold ${
                        isActive ? "bg-orange-500/20 text-orange-400 border border-orange-500/50" : "bg-gray-800 text-gray-600 border border-gray-700/50"
                      }`}
                      data-testid={`indicator-tg-streak-day-${day}`}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-black/20 rounded-lg p-2 text-center">
                <Zap className="w-3 h-3 text-amber-500 mx-auto mb-0.5" />
                <p className="text-[9px] text-gray-500">Play Games</p>
                <p className="text-[10px] text-amber-400 font-semibold">20-110 pts</p>
              </div>
              <div className="bg-black/20 rounded-lg p-2 text-center">
                <Gift className="w-3 h-3 text-green-500 mx-auto mb-0.5" />
                <p className="text-[9px] text-gray-500">Refer Friends</p>
                <p className="text-[10px] text-green-400 font-semibold">50+ pts</p>
              </div>
              <div className="bg-black/20 rounded-lg p-2 text-center">
                <Target className="w-3 h-3 text-purple-500 mx-auto mb-0.5" />
                <p className="text-[9px] text-gray-500">Bounties</p>
                <p className="text-[10px] text-purple-400 font-semibold">Varies</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-[#242444] border-gray-700/50 mb-4" data-testid="card-tg-token-info">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Coins className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">$HONEY Token</p>
                <p className="text-[10px] text-gray-500">BEP-20 on BNB Smart Chain</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-black/20 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">Max Supply</p>
                <p className="text-xs font-bold text-white" data-testid="text-tg-token-supply">
                  {rewardsData?.tokenomics?.totalSupply
                    ? (rewardsData.tokenomics.totalSupply / 1e9).toFixed(0) + "B"
                    : "1B"}
                </p>
              </div>
              <div className="bg-black/20 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">Type</p>
                <p className="text-xs font-bold text-white">Deflationary</p>
              </div>
              <div className="bg-black/20 rounded-lg p-2">
                <p className="text-[10px] text-gray-500">Phase</p>
                <p className="text-xs font-bold text-amber-400" data-testid="text-tg-token-phase">
                  {rewardsData?.caps?.preTge ? "Pre-TGE" : "Live"}
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              {(() => {
                const tokenomics = rewardsData?.tokenomics;
                if (tokenomics?.allocations) {
                  return Object.entries(tokenomics.allocations).map(([key, alloc]) => {
                    const isHighlight = alloc.pct >= 20;
                    const amountStr = alloc.amount >= 1e9
                      ? (alloc.amount / 1e9).toFixed(0) + "B"
                      : (alloc.amount / 1e6).toFixed(0) + "M";
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between px-2 py-1.5 rounded ${isHighlight ? "bg-amber-500/5 border border-amber-500/20" : "bg-black/10"}`}
                        data-testid={`text-tg-alloc-${key}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${isHighlight ? "bg-amber-500" : "bg-gray-600"}`} />
                          <span className="text-[11px] text-gray-300">{alloc.description.split("(")[0].trim()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge className="text-[9px] px-1.5 py-0 bg-transparent border-gray-600 text-gray-400">{amountStr}</Badge>
                          <span className="text-[11px] font-medium text-white w-7 text-right">{alloc.pct}%</span>
                        </div>
                      </div>
                    );
                  });
                }
                return TOKENOMICS_DATA.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between px-2 py-1.5 rounded ${item.highlight ? "bg-amber-500/5 border border-amber-500/20" : "bg-black/10"}`}
                    data-testid={`text-tg-alloc-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${item.highlight ? "bg-amber-500" : "bg-gray-600"}`} />
                      <span className="text-[11px] text-gray-300">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className="text-[9px] px-1.5 py-0 bg-transparent border-gray-600 text-gray-400">{item.amount}</Badge>
                      <span className="text-[11px] font-medium text-white w-7 text-right">{item.pct}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
            <div className="mt-3 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <p className="text-[10px] text-gray-400">
                Your $HONEY = (Your Points / Total Points) x {rewardsData?.tokenomics?.totalPointsPool
                  ? (rewardsData.tokenomics.totalPointsPool / 1e6).toFixed(0) + "M"
                  : "Community"} Pool
              </p>
            </div>
          </Card>

          <div className="space-y-2 mb-4">
            <button
              onClick={() => onNavigate("bounties")}
              className="w-full flex items-center justify-between p-3 bg-[#242444] border border-gray-700/50 rounded-xl"
              data-testid="button-tg-nav-bounties"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-500/10">
                  <Target className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Bounties</p>
                  <p className="text-[10px] text-gray-500">Complete tasks, earn rewards</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => onNavigate("referrals")}
              className="w-full flex items-center justify-between p-3 bg-[#242444] border border-gray-700/50 rounded-xl"
              data-testid="button-tg-nav-referrals"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <Gift className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Referrals</p>
                  <p className="text-[10px] text-gray-500">Invite friends, earn points</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={() => onNavigate("leaderboards")}
              className="w-full flex items-center justify-between p-3 bg-[#242444] border border-gray-700/50 rounded-xl"
              data-testid="button-tg-nav-leaderboards"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <Trophy className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">Leaderboards</p>
                  <p className="text-[10px] text-gray-500">Top earners & referrers</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {historyData?.history && historyData.history.length > 0 && (
            <Card className="p-4 bg-[#242444] border-gray-700/50" data-testid="card-tg-recent-activity">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-semibold text-white">Recent Activity</p>
              </div>
              <div className="space-y-2">
                {historyData.history.slice(0, 5).map((entry, i) => {
                  const isBotMatch = entry.finalPoints === 0 || entry.action.includes("bot") || entry.action.includes("practice");
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5" data-testid={`row-tg-history-${i}`}>
                      <div>
                        <p className="text-xs text-white">{isBotMatch ? "Practice" : getEarnActionLabel(entry.action)}</p>
                        <p className="text-[10px] text-gray-500">{formatTimeAgo(entry.createdAt)}</p>
                      </div>
                      <span className={`text-xs font-bold ${isBotMatch ? "text-gray-500" : "text-amber-500"}`}>
                        {isBotMatch ? "0" : `+${entry.finalPoints.toLocaleString()}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function BountyBrowser({ agentId, onBack }: { agentId?: string; onBack: () => void }) {
  const [status, setStatus] = useState<"open" | "awarded" | "expired">("open");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedIds, setClaimedIds] = useState<Set<string>>(new Set());
  const [claimError, setClaimError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<{ bounties: BountyItem[] }>({
    queryKey: ["/api/bounties", status],
    queryFn: () => fetch(`/api/bounties?status=${status}`).then(r => r.ok ? r.json() : { bounties: [] }),
    staleTime: 30000,
  });

  const handleClaim = async (bountyId: string) => {
    if (!agentId || claimingId !== null) return;
    setClaimingId(bountyId);
    setClaimError(null);
    try {
      const res = await tgFetch(`/api/bounties/${bountyId}/solutions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          body: "Claimed via Telegram Mini App",
        }),
      });
      if (res.ok) {
        setClaimedIds(prev => new Set(prev).add(bountyId));
        refetch();
      } else {
        const err = await res.json().catch(() => ({}));
        setClaimError(err.message || "Failed to claim bounty");
      }
    } catch {
      setClaimError("Network error, try again");
    }
    setClaimingId(null);
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white" data-testid="button-tg-bounties-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white" data-testid="text-tg-bounties-title">Bounties</h2>
          <p className="text-xs text-gray-400">Complete tasks to earn rewards</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {(["open", "awarded", "expired"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors capitalize ${
              status === s ? "bg-amber-500/20 text-amber-400" : "text-gray-500 bg-[#242444]"
            }`}
            data-testid={`button-tg-bounty-filter-${s}`}
          >
            {s}
          </button>
        ))}
      </div>

      {claimError && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400" data-testid="text-tg-bounty-error">
          {claimError}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#242444] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : !data?.bounties || data.bounties.length === 0 ? (
        <Card className="p-8 bg-[#242444] border-gray-700/50 text-center" data-testid="container-tg-empty-bounties">
          <Target className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No {status} bounties</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.bounties.map((bounty) => {
            const isExpired = bounty.isExpired || new Date(bounty.deadline) < new Date();
            const statusBadge =
              bounty.status === "awarded" ? "bg-green-500/20 text-green-400" :
              isExpired ? "bg-orange-500/20 text-orange-400" :
              "bg-amber-500/20 text-amber-400";
            const isClaimed = claimedIds.has(bounty.id);
            const isClaiming = claimingId === bounty.id;
            const canClaim = agentId && bounty.status === "open" && !isExpired && !isClaimed;
            return (
              <Card
                key={bounty.id}
                className="p-3 bg-[#242444] border-gray-700/50"
                data-testid={`card-tg-bounty-${bounty.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className={`text-[9px] px-1.5 py-0 ${statusBadge}`}>
                      {bounty.status === "awarded" ? "Awarded" : isExpired ? "Expired" : "Open"}
                    </Badge>
                    <Badge className="text-[9px] px-1.5 py-0 bg-transparent border-gray-600 text-gray-300 font-mono">
                      {bounty.rewardDisplay}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm font-medium text-white mb-1 line-clamp-1">{bounty.title}</p>
                <p className="text-[11px] text-gray-400 line-clamp-2 mb-2">{bounty.body.slice(0, 100)}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-gray-500">
                    {bounty.agent && <span>{bounty.agent.name}</span>}
                    <span>{bounty.solutionCount} solution{bounty.solutionCount !== 1 ? "s" : ""}</span>
                  </div>
                  {canClaim && (
                    <Button
                      size="sm"
                      disabled={isClaiming}
                      className="h-7 text-[11px] bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30"
                      onClick={() => handleClaim(bounty.id)}
                      data-testid={`button-tg-claim-bounty-${bounty.id}`}
                    >
                      {isClaiming ? (
                        <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin mr-1" />
                      ) : (
                        <Zap className="w-3 h-3 mr-1" />
                      )}
                      Claim
                    </Button>
                  )}
                  {isClaimed && (
                    <Badge className="text-[9px] bg-green-500/20 text-green-400">
                      <Check className="w-3 h-3 mr-0.5" /> Claimed
                    </Badge>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReferralView({ agentId, onBack }: { agentId?: string; onBack: () => void }) {
  const [copied, setCopied] = useState(false);

  const { data: referralLink, isLoading: linkLoading } = useQuery<ReferralData | null>({
    queryKey: ["/api/referrals/my-link"],
    queryFn: () => tgFetch("/api/referrals/my-link").then(r => r.ok ? r.json() : null),
    enabled: !!agentId,
    staleTime: 30000,
  });

  const { data: stats } = useQuery<ReferralData | null>({
    queryKey: ["/api/referrals/stats"],
    queryFn: () => tgFetch("/api/referrals/stats").then(r => r.ok ? r.json() : null),
    enabled: !!agentId,
    staleTime: 30000,
  });

  const shortCode = referralLink?.referralCode?.replace("BEE", "") || "";
  const referralUrl = referralLink ? `${BASE_URL}/r/${shortCode}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTelegramShare = () => {
    const text = "Join me on Honeycomb - the AI Trading Arena on BNB Chain! Earn points and compete in duels!";
    const tgLink = `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`;
    window.Telegram?.WebApp?.openTelegramLink(tgLink);
  };

  const tierName = stats?.tier || "newcomer";
  const tierStyle = TIER_STYLES[tierName] || TIER_STYLES.newcomer;

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white" data-testid="button-tg-referrals-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white" data-testid="text-tg-referrals-title">Referrals</h2>
          <p className="text-xs text-gray-400">Invite friends and earn together</p>
        </div>
      </div>

      {!agentId ? (
        <Card className="p-6 bg-[#242444] border-gray-700/50 text-center">
          <Users className="w-10 h-10 text-amber-500/50 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Open via @honeycombot to use referrals</p>
        </Card>
      ) : linkLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Card className="p-3 bg-[#242444] border-gray-700/50 text-center" data-testid="card-tg-ref-count">
              <div className="text-xl font-bold text-amber-500">{stats?.referralCount || 0}</div>
              <div className="text-[10px] text-gray-500">Invites</div>
            </Card>
            <Card className="p-3 bg-[#242444] border-gray-700/50 text-center" data-testid="card-tg-ref-tier">
              <div className={`text-sm font-bold capitalize ${tierStyle}`}>{tierName}</div>
              <div className="text-[10px] text-gray-500">Tier</div>
            </Card>
            <Card className="p-3 bg-[#242444] border-gray-700/50 text-center" data-testid="card-tg-ref-earned">
              <div className="text-xl font-bold text-green-400">{stats?.totalRewardsEarned || "0"}</div>
              <div className="text-[10px] text-gray-500">Earned</div>
            </Card>
          </div>

          <Card className="p-4 bg-[#242444] border-gray-700/50 mb-4" data-testid="card-tg-ref-link">
            <p className="text-xs text-gray-400 mb-2">Your Referral Link</p>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-black/30 rounded-lg px-3 py-2 font-mono text-[11px] text-amber-400 truncate" data-testid="text-tg-ref-url">
                {referralUrl || "Loading..."}
              </div>
              <button
                onClick={handleCopy}
                className="p-2 bg-amber-500/10 rounded-lg text-amber-400 hover:bg-amber-500/20"
                data-testid="button-tg-copy-ref"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <Button
              className="w-full gap-2 bg-[#0088cc] text-white hover:bg-[#0077b5]"
              onClick={handleTelegramShare}
              data-testid="button-tg-share-telegram"
            >
              <Share2 className="w-4 h-4" />
              Share via Telegram
            </Button>
          </Card>

          {referralLink?.referralCode && (
            <div className="text-center">
              <p className="text-[10px] text-gray-500">
                Code: <code className="text-amber-400/70">{referralLink.referralCode}</code>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LeaderboardView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"earners" | "referrers" | "duel">("earners");

  const { data: pointsLb, isLoading: plLoading } = useQuery<{ leaderboard: PointsLeaderEntry[] }>({
    queryKey: ["/api/points/leaderboard"],
    queryFn: () => fetch("/api/points/leaderboard?limit=20").then(r => r.ok ? r.json() : { leaderboard: [] }),
    staleTime: 30000,
  });

  const { data: referrerLb, isLoading: rlLoading } = useQuery<{ leaderboard: ReferrerLeaderEntry[] }>({
    queryKey: ["/api/leaderboards/referrers"],
    queryFn: () => fetch("/api/leaderboards/referrers?limit=20").then(r => r.ok ? r.json() : { leaderboard: [] }),
    staleTime: 30000,
  });

  const { data: duelLb, isLoading: dlLoading } = useQuery<BeeListItem[]>({
    queryKey: ["/api/telegram/bees", "rating"],
    queryFn: () => fetch("/api/telegram/bees?sort=rating&limit=20").then(r => r.ok ? r.json() : []).then(d => Array.isArray(d) ? d : []),
    staleTime: 30000,
  });

  function RankIcon({ rank }: { rank: number }) {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-slate-400" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-700" />;
    return <span className="text-xs text-gray-500 w-4 text-center">{rank}</span>;
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white" data-testid="button-tg-leaderboards-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white" data-testid="text-tg-leaderboards-title">Leaderboards</h2>
          <p className="text-xs text-gray-400">Top performers in the hive</p>
        </div>
      </div>

      <div className="flex gap-1 mb-4">
        {([
          { id: "earners" as const, label: "Top Earners" },
          { id: "referrers" as const, label: "Top Referrers" },
          { id: "duel" as const, label: "Duel Champions" },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              tab === t.id ? "bg-amber-500/20 text-amber-400" : "text-gray-500 bg-[#242444]"
            }`}
            data-testid={`button-tg-lb-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "earners" && (
        <div className="space-y-2">
          {plLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-[#242444] animate-pulse rounded-xl" />)}
            </div>
          ) : !pointsLb?.leaderboard || pointsLb.leaderboard.length === 0 ? (
            <Card className="p-8 bg-[#242444] border-gray-700/50 text-center">
              <Coins className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No earners yet</p>
            </Card>
          ) : (
            pointsLb.leaderboard.map((entry) => (
              <Card
                key={entry.agentId}
                className={`p-3 border-gray-700/50 ${entry.rank <= 3 ? "bg-amber-500/5 border-amber-500/20" : "bg-[#242444]"}`}
                data-testid={`card-tg-lb-earner-${entry.rank}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#1a1a2e]">
                    <RankIcon rank={entry.rank} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm">
                    {entry.avatarUrl && entry.avatarUrl.startsWith("http") ? (
                      <img src={entry.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      BEE_AVATARS.find(a => a.id === (entry.avatarUrl || ""))?.emoji || "🐝"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{entry.name || "Unknown Bee"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-500">{entry.totalPoints.toLocaleString()}</p>
                    <p className="text-[9px] text-gray-500">pts</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "referrers" && (
        <div className="space-y-2">
          {rlLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-[#242444] animate-pulse rounded-xl" />)}
            </div>
          ) : !referrerLb?.leaderboard || referrerLb.leaderboard.length === 0 ? (
            <Card className="p-8 bg-[#242444] border-gray-700/50 text-center">
              <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No referrers yet</p>
            </Card>
          ) : (
            referrerLb.leaderboard.map((entry, index) => (
              <Card
                key={entry.id}
                className={`p-3 border-gray-700/50 ${index < 3 ? "bg-amber-500/5 border-amber-500/20" : "bg-[#242444]"}`}
                data-testid={`card-tg-lb-referrer-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#1a1a2e]">
                    <RankIcon rank={index + 1} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm">
                    {entry.agent?.avatarUrl && entry.agent.avatarUrl.startsWith("http") ? (
                      <img src={entry.agent.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      BEE_AVATARS.find(a => a.id === (entry.agent?.avatarUrl || ""))?.emoji || "🐝"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{entry.agent?.name || "Unknown"}</p>
                    <Badge className={`text-[9px] px-1 py-0 bg-transparent border-gray-600 capitalize ${TIER_STYLES[entry.tier] || "text-gray-400"}`}>
                      {entry.tier}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{entry.referralCount}</p>
                    <p className="text-[9px] text-gray-500">refs</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === "duel" && (
        <div className="space-y-2">
          {dlLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-[#242444] animate-pulse rounded-xl" />)}
            </div>
          ) : !duelLb || duelLb.length === 0 ? (
            <Card className="p-8 bg-[#242444] border-gray-700/50 text-center">
              <Swords className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No duel champions yet</p>
            </Card>
          ) : (
            duelLb.map((bee, index) => (
              <Card
                key={bee.id}
                className={`p-3 border-gray-700/50 ${index < 3 ? "bg-amber-500/5 border-amber-500/20" : "bg-[#242444]"}`}
                data-testid={`card-tg-lb-duel-${index}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#1a1a2e]">
                    <RankIcon rank={index + 1} />
                  </div>
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm">
                    {BEE_AVATARS.find(a => a.id === bee.avatarUrl)?.emoji || "🐝"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{bee.name}</p>
                    <p className="text-[10px] text-gray-500">{bee.arenaWins}W / {bee.arenaLosses}L</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400">{bee.arenaRating}</p>
                    <p className="text-[9px] text-gray-500">ELO</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const tabs: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "feed", label: "Feed", icon: MessageSquare },
  { id: "arena", label: "Arena", icon: Swords },
  { id: "earn", label: "Earn", icon: Coins },
  { id: "bees", label: "Bees", icon: Hexagon },
  { id: "profile", label: "Profile", icon: User },
];

interface TgAgent {
  id: string;
  name: string;
  ownerAddress: string;
  arenaWins: number;
  arenaLosses: number;
  arenaRating: number;
  avatarUrl?: string;
  bio?: string;
  isSetup?: boolean;
}

function useTelegramAuth() {
  const [agent, setAgent] = useState<TgAgent | null>(null);
  const [loading, setLoading] = useState(true);

  const markAgentSetup = (a: TgAgent): TgAgent => ({
    ...a,
    isSetup: !!(a.bio || localStorage.getItem("bee_setup_done")),
  });

  useEffect(() => {
    async function authenticate() {
      try {
        const existing = localStorage.getItem("tg_token");
        if (existing) {
          const meRes = await fetch("/api/telegram/me", {
            headers: { Authorization: `Bearer ${existing}` },
          });
          if (meRes.ok) {
            const data = await meRes.json();
            setAgent(markAgentSetup(data));
            setLoading(false);
            return;
          }
          localStorage.removeItem("tg_token");
        }

        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          setLoading(false);
          return;
        }

        const authRes = await fetch("/api/telegram/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        if (authRes.ok) {
          const data = await authRes.json();
          if (data.token) {
            localStorage.setItem("tg_token", data.token);
            setAgent(markAgentSetup(data.agent));
          }
        }
      } catch (err) {
        console.error("Telegram auth error:", err);
      }
      setLoading(false);
    }

    authenticate();
  }, []);

  const updateAgent = (updated: TgAgent) => {
    localStorage.setItem("bee_setup_done", "1");
    setAgent({ ...updated, isSetup: true });
  };

  return { agent, loading, updateAgent };
}

export default function TelegramApp() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [showCreateBee, setShowCreateBee] = useState(false);
  const { agent: tgAgent, loading: authLoading, updateAgent } = useTelegramAuth();

  useEffect(() => {
    const webapp = window.Telegram?.WebApp;
    if (webapp) {
      webapp.ready();
      webapp.expand();
    }
  }, []);

  useEffect(() => {
    if (!authLoading && tgAgent && !tgAgent.isSetup) {
      setShowCreateBee(true);
    }
  }, [authLoading, tgAgent]);

  if (showCreateBee && tgAgent) {
    return (
      <CreateBeeView
        agent={tgAgent}
        onComplete={(updated) => {
          updateAgent(updated);
          setShowCreateBee(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === "home" && <HomeTab onSwitchTab={setActiveTab} />}
        {activeTab === "feed" && <FeedTab agentId={tgAgent?.id} />}
        {activeTab === "arena" && <ArenaTab agentId={tgAgent?.id} />}
        {activeTab === "earn" && <EarnTab agentId={tgAgent?.id} />}
        {activeTab === "bees" && <BeesTab />}
        {activeTab === "profile" && (
          <ProfileTab
            agent={tgAgent}
            loading={authLoading}
            onEditBee={() => setShowCreateBee(true)}
          />
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 bg-[#12122a] border-t border-gray-700/50 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        data-testid="container-tg-tab-bar"
      >
        <div className="flex items-center justify-around gap-1 px-2 py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? "text-amber-500"
                    : "text-gray-500"
                }`}
                data-testid={`button-tg-tab-${tab.id}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}