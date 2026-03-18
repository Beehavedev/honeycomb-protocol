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
  { symbol: "BTCUSDT", label: "BTC", icon: "₿", color: "from-orange-500 to-amber-500", border: "border-orange-500/30" },
  { symbol: "ETHUSDT", label: "ETH", icon: "Ξ", color: "from-blue-500 to-indigo-500", border: "border-blue-500/30" },
  { symbol: "BNBUSDT", label: "BNB", icon: "◆", color: "from-yellow-500 to-amber-500", border: "border-yellow-500/30" },
];

const DURATIONS = [
  { seconds: 120, label: "2 min", tag: "Quick" },
  { seconds: 300, label: "5 min", tag: "Standard" },
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
  const [selectedAsset, setSelectedAsset] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(0);

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

  const handleStartBot = async () => {
    if (!agentId || starting) return;
    const asset = ASSETS[selectedAsset];
    const duration = DURATIONS[selectedDuration];
    setStarting(true);
    try {
      const res = await fetch("/api/trading-duels/play-vs-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: agentId,
          assetSymbol: asset.symbol,
          durationSeconds: duration.seconds,
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

  const handleCreatePvp = async () => {
    if (!agentId || starting) return;
    const asset = ASSETS[selectedAsset];
    const duration = DURATIONS[selectedDuration];
    setStarting(true);
    setPvpError("");
    try {
      const res = await fetch("/api/trading-duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: agentId,
          assetSymbol: asset.symbol,
          durationSeconds: duration.seconds,
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
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
          <Swords className="w-8 h-8 text-amber-500/60" />
        </div>
        <p className="text-sm font-semibold text-white mb-1">Trading Duels</p>
        <p className="text-xs text-gray-500">Open via @honeycombot to play</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-0.5 rounded-xl bg-white/[0.03]">
        <button
          onClick={() => { setMode("bot"); setCreatedCode(null); setCreatedDuelId(null); setPvpError(""); }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === "bot"
              ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 shadow-sm"
              : "text-gray-500 hover:text-gray-300"
          }`}
          data-testid="button-tg-trading-mode-bot"
        >
          <Bot className="w-3.5 h-3.5" /> vs AI Bot
        </button>
        <button
          onClick={() => { setMode("pvp"); setPvpError(""); }}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            mode === "pvp"
              ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 shadow-sm"
              : "text-gray-500 hover:text-gray-300"
          }`}
          data-testid="button-tg-trading-mode-pvp"
        >
          <Users className="w-3.5 h-3.5" /> PvP
        </button>
      </div>

      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-0.5">Select Asset</p>
        <div className="grid grid-cols-3 gap-2">
          {ASSETS.map((a, i) => (
            <button
              key={a.symbol}
              onClick={() => setSelectedAsset(i)}
              className={`relative rounded-xl p-3 text-center transition-all active:scale-95 ${
                selectedAsset === i
                  ? `bg-gradient-to-br ${a.color} bg-opacity-20 border ${a.border} shadow-lg`
                  : "bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06]"
              }`}
              style={selectedAsset === i ? { background: `linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.08))` } : {}}
              data-testid={`button-tg-quick-${a.label.toLowerCase()}`}
            >
              <span className={`text-2xl block mb-1 ${selectedAsset === i ? "scale-110" : "opacity-60"} transition-all`}>{a.icon}</span>
              <span className={`text-xs font-bold ${selectedAsset === i ? "text-white" : "text-gray-400"}`}>{a.label}/USDT</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-0.5">Duration</p>
        <div className="grid grid-cols-2 gap-2">
          {DURATIONS.map((d, i) => (
            <button
              key={d.seconds}
              onClick={() => setSelectedDuration(i)}
              className={`rounded-xl p-3 text-center transition-all active:scale-95 ${
                selectedDuration === i
                  ? "bg-gradient-to-br from-amber-500/15 to-orange-500/10 border border-amber-500/30"
                  : "bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06]"
              }`}
              data-testid={`button-tg-play-duration-${d.seconds}`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Timer className={`w-3.5 h-3.5 ${selectedDuration === i ? "text-amber-400" : "text-gray-500"}`} />
                <span className={`text-sm font-bold ${selectedDuration === i ? "text-white" : "text-gray-400"}`}>{d.label}</span>
              </div>
              <span className={`text-[10px] ${selectedDuration === i ? "text-amber-400/70" : "text-gray-600"}`}>{d.tag}</span>
            </button>
          ))}
        </div>
      </div>

      {mode === "bot" ? (
        <Button
          className="w-full h-14 text-base font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform"
          onClick={handleStartBot}
          disabled={starting}
          data-testid="button-tg-start-bot-duel"
        >
          {starting ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Zap className="w-5 h-5 mr-2" />
          )}
          {starting ? "Starting..." : `FIGHT ${ASSETS[selectedAsset].label} · ${DURATIONS[selectedDuration].label}`}
        </Button>
      ) : (
        <div className="space-y-3">
          {!createdCode ? (
            <Button
              className="w-full h-14 text-base font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform"
              onClick={handleCreatePvp}
              disabled={starting}
              data-testid="button-tg-create-pvp"
            >
              {starting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Users className="w-5 h-5 mr-2" />}
              {starting ? "Creating..." : "Create PvP Lobby"}
            </Button>
          ) : (
            <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 p-4">
              <p className="text-[10px] text-gray-400 mb-2 font-medium">Share this code:</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-mono text-amber-400 tracking-[0.2em] flex-1" data-testid="text-tg-trading-join-code">{createdCode}</span>
                <button
                  onClick={() => { try { const ta=document.createElement("textarea");ta.value=createdCode;ta.style.position="fixed";ta.style.left="-9999px";document.body.appendChild(ta);ta.focus();ta.select();document.execCommand("copy");document.body.removeChild(ta); } catch { try { navigator.clipboard.writeText(createdCode); } catch {} } }}
                  className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 hover:bg-amber-500/30 active:scale-90 transition-all"
                  data-testid="button-tg-trading-copy-code"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                <span className="text-[10px] text-gray-500">Waiting for opponent...</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setPvpError(""); }}
              placeholder="Enter join code..."
              maxLength={8}
              className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white font-mono uppercase placeholder-gray-600 focus:outline-none focus:border-amber-500/40"
              data-testid="input-tg-trading-join-code"
            />
            <Button
              className="px-5 rounded-xl"
              onClick={handleJoinByCode}
              disabled={!joinCode.trim()}
              data-testid="button-tg-trading-join"
            >
              Join
            </Button>
          </div>
          {pvpError && <p className="text-[10px] text-red-400 px-1">{pvpError}</p>}
        </div>
      )}

      <p className="text-[10px] text-gray-600 text-center">
        $10,000 virtual balance · Practice mode
      </p>
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

    ctx.fillStyle = "#0a0b14";
    ctx.fillRect(0, 0, w, h);

    const pts = priceHistory.current;
    if (pts.length < 2) {
      ctx.fillStyle = "#374151";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for price data...", w / 2, h / 2);
      return;
    }

    const prices = pts.map(p => p.p);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const isUp = pts[pts.length - 1].p >= pts[0].p;

    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 0.5;
    for (let i = 1; i < 4; i++) {
      const gy = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();
    }

    const lineColor = isUp ? "#22c55e" : "#ef4444";
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    pts.forEach((pt, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((pt.p - minP) / range) * (h - 16) - 8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, isUp ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fillStyle = grad;
    ctx.fill();

    const lastPt = pts[pts.length - 1];
    const lastY = h - ((lastPt.p - minP) / range) * (h - 16) - 8;
    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.arc(w - 2, lastY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lineColor + "40";
    ctx.beginPath();
    ctx.arc(w - 2, lastY, 8, 0, Math.PI * 2);
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
      } catch {}
    };
    fetchStatus();
    const iv = setInterval(fetchStatus, 2000);
    return () => clearInterval(iv);
  }, [duel.id, agentId, duel.initialBalance]);

  const openPosition = async (side: "long" | "short") => {
    if (trading || price <= 0) return;
    setTrading(true);
    try {
      const haptic = (window as any).Telegram?.WebApp?.HapticFeedback;
      haptic?.impactOccurred?.("medium");
      const sizeUsdt = Math.min(balance, parseFloat(duel.initialBalance) * 0.25).toFixed(2);
      if (parseFloat(sizeUsdt) <= 0) { setTrading(false); return; }
      await fetch(`/api/trading-duels/${duel.id}/open-position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, side, leverage: 5, sizeUsdt, clientPrice: price.toString() }),
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
        body: JSON.stringify({ positionId, agentId, clientPrice: price.toString() }),
      });
    } catch {}
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
  const timerUrgent = timeLeft < 30;

  return (
    <div className="flex flex-col" data-testid="container-tg-game">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all" data-testid="button-tg-game-back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-sm font-bold ${
          timerUrgent ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-white/5 text-gray-300"
        }`}>
          <Timer className="w-3.5 h-3.5" />
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
        <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded-full">vs {duel.botName || "Bot"}</span>
      </div>

      <div className="flex items-end justify-between mb-1 px-0.5">
        <div>
          <span className="text-[10px] text-gray-500 font-medium">{duel.assetSymbol.replace("USDT", "/USDT")}</span>
          <div className="text-2xl font-black text-white font-mono tracking-tight" data-testid="text-tg-live-price">${fmtPrice(price)}</div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-gray-500 font-medium">P&L</span>
          <div className={`text-2xl font-black font-mono tracking-tight ${pnlColor}`} data-testid="text-tg-pnl">
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}
          </div>
        </div>
      </div>

      {status && (
        <div className="text-center mb-2">
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
            status.includes("LEAD") ? "bg-green-500/15 text-green-400" :
            status.includes("BEHIND") ? "bg-red-500/15 text-red-400" :
            "bg-white/5 text-gray-400"
          }`} data-testid="text-tg-status">{status}</span>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-white/[0.06] mb-3 shadow-inner">
        <canvas ref={canvasRef} className="w-full" style={{ height: 160 }} data-testid="canvas-tg-chart" />
      </div>

      {openPos.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {openPos.map(pos => {
            const entry = parseFloat(pos.entryPrice);
            const uPnl = price > 0 ? (
              pos.side === "long"
                ? ((price - entry) / entry) * parseFloat(pos.sizeUsdt) * pos.leverage
                : ((entry - price) / entry) * parseFloat(pos.sizeUsdt) * pos.leverage
            ) : 0;
            const isProfit = uPnl >= 0;
            return (
              <div key={pos.id} className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${
                isProfit ? "bg-green-500/5 border-green-500/10" : "bg-red-500/5 border-red-500/10"
              }`} data-testid={`row-tg-position-${pos.id}`}>
                <div className="flex items-center gap-2">
                  {pos.side === "long" ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                  <div>
                    <span className="text-xs font-bold text-white">{pos.side.toUpperCase()} {pos.leverage}x</span>
                    <span className="text-[10px] text-gray-500 ml-2">${parseFloat(pos.sizeUsdt).toFixed(0)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-bold ${isProfit ? "text-green-400" : "text-red-400"}`}>
                    {isProfit ? "+" : ""}{uPnl.toFixed(2)}
                  </span>
                  <button
                    onClick={() => closePosition(pos.id)}
                    disabled={trading}
                    className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 active:scale-95 transition-all"
                    data-testid={`button-tg-close-${pos.id}`}
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => openPosition("long")}
          disabled={trading || price <= 0 || timeLeft <= 0}
          className="h-14 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-green-500/10 hover:from-green-700 hover:to-green-800 active:scale-[0.97] transition-all disabled:opacity-40"
          data-testid="button-tg-long"
        >
          <TrendingUp className="w-5 h-5" />
          LONG
        </button>
        <button
          onClick={() => openPosition("short")}
          disabled={trading || price <= 0 || timeLeft <= 0}
          className="h-14 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-red-500/10 hover:from-red-700 hover:to-red-800 active:scale-[0.97] transition-all disabled:opacity-40"
          data-testid="button-tg-short"
        >
          <TrendingDown className="w-5 h-5" />
          SHORT
        </button>
      </div>

      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-[10px] text-gray-500">5x Leverage · 25% per trade</span>
        <span className="text-[10px] text-gray-500 font-mono">Balance: ${balance.toFixed(0)}</span>
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
  const isCreator = duel.creatorId === agentId;
  const myPnl = parseFloat(isCreator ? result.creatorPnl : result.joinerPnl);
  const theirPnl = parseFloat(isCreator ? result.joinerPnl : result.creatorPnl);
  const won = result.winnerId === agentId;
  const draw = !result.winnerId;

  useEffect(() => {
    try {
      const haptic = (window as any).Telegram?.WebApp?.HapticFeedback;
      if (won) haptic?.notificationOccurred?.("success");
      else haptic?.notificationOccurred?.("warning");
    } catch {}
  }, [won]);

  return (
    <div className="flex flex-col items-center justify-center py-6 text-center space-y-5" data-testid="container-tg-results">
      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
        draw ? "bg-gray-700/30" : won ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20" : "bg-gradient-to-br from-red-500/20 to-red-700/20"
      }`}>
        {draw ? <Target className="w-10 h-10 text-gray-400" /> :
         won ? <Trophy className="w-10 h-10 text-amber-400" /> :
         <Swords className="w-10 h-10 text-red-400" />}
      </div>

      <div>
        <h3 className={`text-2xl font-black ${draw ? "text-gray-300" : won ? "text-amber-400" : "text-red-400"}`}>
          {draw ? "DRAW" : won ? "VICTORY!" : "DEFEAT"}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          {duel.assetSymbol.replace("USDT", "/USDT")} · {Math.floor(duel.durationSeconds / 60)}min duel
        </p>
      </div>

      <div className="flex gap-6">
        <div>
          <p className="text-[10px] text-gray-500 mb-1">YOUR P&L</p>
          <p className={`text-xl font-black font-mono ${myPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {myPnl >= 0 ? "+" : ""}{myPnl.toFixed(2)}
          </p>
        </div>
        <div className="w-px bg-white/10" />
        <div>
          <p className="text-[10px] text-gray-500 mb-1">OPPONENT</p>
          <p className={`text-xl font-black font-mono ${theirPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
            {theirPnl >= 0 ? "+" : ""}{theirPnl.toFixed(2)}
          </p>
        </div>
      </div>

      <Button
        className="w-full h-14 text-base font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-transform"
        onClick={onPlayAgain}
        data-testid="button-tg-play-again"
      >
        <Sparkles className="w-5 h-5 mr-2" /> PLAY AGAIN
      </Button>
    </div>
  );
}
