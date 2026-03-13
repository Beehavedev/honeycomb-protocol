import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Swords, Trophy, TrendingUp, TrendingDown, Zap, Timer, ArrowLeft,
  Target, Sparkles, Bot, Loader2, Users, Copy,
} from "lucide-react";
import type { TgAgentInfo, ActiveDuel, Position, DuelResult } from "./tg-arena-types";

const ASSETS = [
  { symbol: "BTCUSDT", label: "BTC", icon: "₿" },
  { symbol: "ETHUSDT", label: "ETH", icon: "Ξ" },
  { symbol: "BNBUSDT", label: "BNB", icon: "◆" },
];

const DURATIONS = [
  { seconds: 120, label: "2 min" },
  { seconds: 300, label: "5 min" },
];

type TradingView = "lobby" | "playing" | "results";
type TradingMode = "bot" | "pvp";

export function TradingSubTab({ agentId, agent }: { agentId?: string; agent?: TgAgentInfo }) {
  const [view, setView] = useState<TradingView>("lobby");
  const [activeDuel, setActiveDuel] = useState<ActiveDuel | null>(null);
  const [duelResult, setDuelResult] = useState<DuelResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [mode, setMode] = useState<TradingMode>("bot");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdDuelId, setCreatedDuelId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [pvpError, setPvpError] = useState("");

  useQuery<ActiveDuel>({
    queryKey: ["/api/trading-duels", createdDuelId, "poll"],
    queryFn: async () => {
      const res = await fetch(`/api/trading-duels/${createdDuelId}`);
      return res.json();
    },
    enabled: !!createdDuelId && view === "lobby",
    refetchInterval: 3000,
    select: (data: ActiveDuel) => {
      if (data?.joinerId && data?.endsAt) {
        setActiveDuel(data);
        setView("playing");
        setCreatedDuelId(null);
        setCreatedCode(null);
      }
      return data;
    },
  });

  const handleStartBot = async (asset: string, duration: number) => {
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

  const handleCreatePvp = async (asset: string, duration: number) => {
    if (!agentId || starting) return;
    setStarting(true);
    setPvpError("");
    try {
      const res = await fetch("/api/trading-duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: agentId,
          assetSymbol: asset,
          durationSeconds: duration,
          matchType: "practice",
        }),
      });
      if (res.ok) {
        const duel = await res.json();
        setCreatedCode(duel.joinCode || duel.id);
        setCreatedDuelId(duel.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create lobby";
      setPvpError(msg);
    }
    setStarting(false);
  };

  const handleJoinByCode = async () => {
    if (!agentId || !joinCode.trim()) return;
    setPvpError("");
    try {
      const res = await fetch("/api/trading-duels/join-by-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          joinCode: joinCode.toUpperCase(),
          joinerId: agentId,
        }),
      });
      if (res.ok) {
        const duel = await res.json();
        setActiveDuel(duel);
        setView("playing");
      } else {
        const err = await res.json();
        setPvpError(err.message || "Failed to join");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to join";
      setPvpError(msg);
    }
  };

  const handleDuelEnd = (result: DuelResult) => {
    setDuelResult(result);
    setView("results");
  };

  const handlePlayAgain = () => {
    setActiveDuel(null);
    setDuelResult(null);
    setCreatedCode(null);
    setCreatedDuelId(null);
    setJoinCode("");
    setPvpError("");
    setView("lobby");
  };

  if (view === "playing" && activeDuel && agentId) {
    return <TradingGameView duel={activeDuel} agentId={agentId} onEnd={handleDuelEnd} onBack={handlePlayAgain} />;
  }

  if (view === "results" && duelResult && activeDuel && agentId) {
    return <TradingResultsView result={duelResult} duel={activeDuel} agentId={agentId} onPlayAgain={handlePlayAgain} />;
  }

  if (!agentId) {
    return (
      <Card className="p-6 bg-[#242444] border-gray-700/50 text-center" data-testid="container-tg-arena-login">
        <Swords className="w-10 h-10 text-amber-500/50 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Open via @honeycombot to play</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 mb-2">
        <button
          onClick={() => { setMode("bot"); setCreatedCode(null); setCreatedDuelId(null); setPvpError(""); }}
          className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            mode === "bot" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "text-gray-400 border border-gray-700/50"
          }`}
          data-testid="button-tg-trading-mode-bot"
        >
          <Bot className="w-3 h-3 inline mr-1" /> vs Bot
        </button>
        <button
          onClick={() => { setMode("pvp"); setPvpError(""); }}
          className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            mode === "pvp" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "text-gray-400 border border-gray-700/50"
          }`}
          data-testid="button-tg-trading-mode-pvp"
        >
          <Users className="w-3 h-3 inline mr-1" /> PvP
        </button>
      </div>

      {mode === "bot" ? (
        <>
          <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-600/10 border-amber-500/20" data-testid="card-tg-quick-match">
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
                  onClick={() => handleStartBot(a.symbol, 120)}
                  data-testid={`button-tg-quick-${a.label.toLowerCase()}`}
                >
                  <span className="mr-1">{a.icon}</span> {a.label}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 text-center">2-min practice duel · $10,000 virtual balance</p>
          </Card>

          <h3 className="text-sm font-semibold text-gray-300 mb-2 px-1">Choose Duration</h3>
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
                        onClick={() => handleStartBot(asset.symbol, d.seconds)}
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
      ) : (
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-600/10 border-amber-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-white">PvP Trading Duel</span>
          </div>
          <p className="text-[10px] text-gray-400 mb-3">Create a lobby or join with a code</p>

          {!createdCode ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {ASSETS.map((a) => (
                  <Button
                    key={a.symbol}
                    size="sm"
                    disabled={starting}
                    className="bg-[#1a1a2e] border border-gray-700/50 text-white hover:border-amber-500/50"
                    onClick={() => handleCreatePvp(a.symbol, 300)}
                    data-testid={`button-tg-pvp-create-${a.label.toLowerCase()}`}
                  >
                    {starting ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="mr-1">{a.icon}</span>}
                    {a.label}
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 text-center">5-min practice duel</p>
            </div>
          ) : (
            <Card className="p-3 bg-[#1a1a2e] border-amber-500/30 mb-3">
              <p className="text-[10px] text-gray-400 mb-1">Share this code with your opponent:</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-amber-400 tracking-wider flex-1" data-testid="text-tg-trading-join-code">{createdCode}</span>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => navigator.clipboard.writeText(createdCode)} data-testid="button-tg-trading-copy-code">
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              <p className="text-[9px] text-gray-500 mt-1">
                <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                Waiting for opponent to join...
              </p>
            </Card>
          )}

          <div className="flex gap-2 mt-3">
            <input
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setPvpError(""); }}
              placeholder="Enter join code..."
              maxLength={8}
              className="flex-1 bg-[#1a1a2e] border border-gray-700/50 rounded-lg px-3 py-1.5 text-xs text-white font-mono uppercase placeholder-gray-500"
              data-testid="input-tg-trading-join-code"
            />
            <Button size="sm" onClick={handleJoinByCode} disabled={!joinCode.trim()} data-testid="button-tg-trading-join">
              Join
            </Button>
          </div>
          {pvpError && <p className="text-[10px] text-red-400 mt-1">{pvpError}</p>}
        </Card>
      )}
    </div>
  );
}

function TradingGameView({ duel, agentId, onEnd, onBack }: {
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
  const mountedRef = useRef(true);
  const latestPrice = useRef(0);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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
    } catch { /* network error */ }
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
  }, []);

  useEffect(() => {
    fetchPrice();
    const iv = setInterval(fetchPrice, 1000);
    return () => clearInterval(iv);
  }, [fetchPrice]);

  useEffect(() => {
    let active = true;
    const draw = () => { if (!active) return; drawChart(); requestAnimationFrame(draw); };
    requestAnimationFrame(draw);
    return () => { active = false; };
  }, [drawChart]);

  useEffect(() => {
    const iv = setInterval(() => {
      const end = new Date(duel.endsAt).getTime();
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
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
    return () => clearInterval(iv);
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
          const data: Position[] = await posRes.json();
          setPositions(data);
          const initial = parseFloat(duel.initialBalance);
          const curPrice = latestPrice.current;
          let used = 0, realized = 0, unrealized = 0;
          data.forEach((p) => {
            if (p.isOpen) {
              used += parseFloat(p.sizeUsdt);
              if (curPrice > 0) {
                const entry = parseFloat(p.entryPrice);
                const size = parseFloat(p.sizeUsdt);
                unrealized += p.side === "long"
                  ? ((curPrice - entry) / entry) * size * p.leverage
                  : ((entry - curPrice) / entry) * size * p.leverage;
              }
            } else if (p.pnl) realized += parseFloat(p.pnl);
          });
          setPnl(realized + unrealized);
          setBalance(initial + realized - used);
        }
        if (statusRes.ok && mountedRef.current) {
          const s = await statusRes.json();
          setStatus(s.relativeStatus || "");
        }
      } catch { /* network error */ }
    };
    fetchStatus();
    const iv = setInterval(fetchStatus, 2000);
    return () => clearInterval(iv);
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
        body: JSON.stringify({ agentId, side, leverage: 5, sizeUsdt, clientPrice: price.toString() }),
      });
    } catch { /* network error */ }
    setTrading(false);
  };

  const closePosition = async (positionId: string) => {
    if (trading) return;
    setTrading(true);
    try {
      await fetch(`/api/trading-duels/${duel.id}/close-position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId, agentId, clientPrice: price.toString() }),
      });
    } catch { /* network error */ }
    setTrading(false);
  };

  const fmtPrice = (p: number) => {
    if (p >= 1000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const openPos = positions.filter(p => p.isOpen);
  const pnlColor = pnl >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className="flex flex-col h-full" data-testid="container-tg-game">
      <div className="flex items-center justify-between mb-2 px-1">
        <button onClick={onBack} className="text-gray-400 hover:text-white" data-testid="button-tg-game-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Badge className={`${timeLeft < 30 ? "bg-red-500/20 text-red-400" : "bg-gray-700/50 text-gray-300"} font-mono`}>
          <Timer className="w-3 h-3 mr-1" />
          {mins}:{secs.toString().padStart(2, "0")}
        </Badge>
        <span className="text-xs text-gray-500">vs {duel.botName || "Opponent"}</span>
      </div>
      <div className="flex items-center justify-between px-1 mb-1">
        <div>
          <span className="text-[10px] text-gray-500">{duel.assetSymbol.replace("USDT", "/USDT")}</span>
          <div className="text-lg font-bold text-white font-mono" data-testid="text-tg-live-price">${fmtPrice(price)}</div>
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
        <div className="space-y-1 mb-2">
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
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${uPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {uPnl >= 0 ? "+" : ""}{uPnl.toFixed(2)}
                  </span>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] border-gray-600 text-gray-300"
                    onClick={() => closePosition(pos.id)} disabled={trading} data-testid={`button-tg-close-${pos.id}`}>
                    Close
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button className="h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base gap-1"
          onClick={() => openPosition("long")} disabled={trading || balance <= 0 || timeLeft <= 0} data-testid="button-tg-long">
          <TrendingUp className="w-4 h-4" /> LONG
        </Button>
        <Button className="h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-base gap-1"
          onClick={() => openPosition("short")} disabled={trading || balance <= 0 || timeLeft <= 0} data-testid="button-tg-short">
          <TrendingDown className="w-4 h-4" /> SHORT
        </Button>
      </div>
      <div className="flex items-center justify-between px-1 mt-2">
        <span className="text-[10px] text-gray-500">Balance: ${balance.toFixed(0)} · 5x leverage · 25% size</span>
      </div>
    </div>
  );
}

function TradingResultsView({ result, duel, agentId, onPlayAgain }: {
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
    <div className="flex flex-col items-center justify-center px-4 pt-8 pb-4" data-testid="container-tg-results">
      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
        isDraw ? "bg-gray-700/50" : isWinner ? "bg-green-500/20" : "bg-red-500/20"
      }`}>
        {isDraw ? <Target className="w-10 h-10 text-gray-400" /> :
         isWinner ? <Trophy className="w-10 h-10 text-amber-500" /> :
         <Swords className="w-10 h-10 text-red-400" />}
      </div>
      <h2 className={`text-2xl font-bold mb-1 ${isDraw ? "text-gray-300" : isWinner ? "text-green-400" : "text-red-400"}`} data-testid="text-tg-result-title">
        {isDraw ? "Draw!" : isWinner ? "Victory!" : "Defeat"}
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        {isDraw ? "Both players tied" : isWinner ? `You beat ${duel.botName || "your opponent"}!` : `${duel.botName || "Opponent"} wins`}
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
      <Button size="lg" className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold"
        onClick={onPlayAgain} data-testid="button-tg-play-again">
        <Sparkles className="w-4 h-4" /> Play Again
      </Button>
    </div>
  );
}
