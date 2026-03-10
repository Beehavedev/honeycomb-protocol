import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

type TabType = "home" | "arena" | "bees" | "profile";

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
        <Hexagon className="w-10 h-10 text-amber-500 fill-amber-500/30" />
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/20 mb-3">
            <Hexagon className="w-8 h-8 text-amber-500 fill-amber-500/30" />
          </div>
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
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

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

      <Card className="p-3 bg-[#242444] border-gray-700/50 mb-4" data-testid="card-tg-wallet">
        <div className="flex items-center justify-between">
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
      </Card>

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

const tabs: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "arena", label: "Arena", icon: Swords },
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
        {activeTab === "arena" && <ArenaTab agentId={tgAgent?.id} />}
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