import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Timer, ArrowLeft, Target, Trophy,
  Sparkles, Swords, Coins, AlertTriangle, Loader2,
} from "lucide-react";
import type { TgAgentInfo } from "./tg-arena-types";

const PREDICT_ASSETS = [
  { id: "BTC", label: "Bitcoin", short: "BTC", icon: "₿", color: "from-orange-500 to-amber-500" },
  { id: "ETH", label: "Ethereum", short: "ETH", icon: "Ξ", color: "from-blue-500 to-indigo-500" },
  { id: "BNB", label: "BNB", short: "BNB", icon: "◆", color: "from-yellow-500 to-amber-500" },
  { id: "SOL", label: "Solana", short: "SOL", icon: "◎", color: "from-purple-500 to-violet-500" },
];

const PREDICT_DURATIONS = [
  { seconds: 60, label: "1m", tag: "Speed" },
  { seconds: 300, label: "5m", tag: "Standard" },
  { seconds: 600, label: "10m", tag: "Long" },
];

const STAKE_OPTIONS = [
  { value: "0", label: "Free", description: "Practice" },
  { value: "0.001", label: "0.001", description: "~$0.60" },
  { value: "0.005", label: "0.005", description: "~$3" },
  { value: "0.01", label: "0.01", description: "~$6" },
  { value: "0.05", label: "0.05", description: "~$30" },
  { value: "0.1", label: "0.1", description: "~$60" },
];

interface PredictionData {
  id: string;
  assetSymbol: string;
  durationSeconds: number;
  endsAt: string;
  direction: "up" | "down";
  asset: string;
  startPrice: number | null;
  stakeAmount?: string;
  isStaked?: boolean;
  escrowTxHash?: string;
}

export function PredictSubTab({ agent }: { agent?: TgAgentInfo }) {
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [selectedDuration, setSelectedDuration] = useState(300);
  const [selectedStake, setSelectedStake] = useState("0");
  const [activePrediction, setActivePrediction] = useState<PredictionData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const tgToken = localStorage.getItem("tg_token");

  const { data: priceData } = useQuery<{ price: string }>({
    queryKey: ["/api/trading-duels/binance/ticker", selectedAsset],
    queryFn: async () => {
      const res = await fetch(`/api/trading-duels/binance/ticker?symbol=${selectedAsset}USDT`);
      return res.json();
    },
    refetchInterval: 5000,
    enabled: !activePrediction,
  });

  const { data: walletData } = useQuery<{ balance: string }>({
    queryKey: ["/api/telegram/wallet/balance"],
    queryFn: async () => {
      if (!tgToken) return { balance: "0" };
      const res = await fetch("/api/telegram/wallet/balance", {
        headers: { Authorization: `Bearer ${tgToken}` },
      });
      return res.json();
    },
    refetchInterval: 15000,
    enabled: !!tgToken,
  });

  const createPrediction = async (direction: "up" | "down") => {
    if (!agent || isCreating) return;
    setIsCreating(true);
    setCreateError(null);

    const isStaked = selectedStake !== "0" && parseFloat(selectedStake) > 0;

    try {
      const haptic = (window as any).Telegram?.WebApp?.HapticFeedback;
      haptic?.impactOccurred?.("medium");

      if (isStaked) {
        const res = await fetch("/api/telegram/duels/create-staked", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tgToken}`,
          },
          body: JSON.stringify({
            assetSymbol: `${selectedAsset}USDT`,
            durationSeconds: selectedDuration,
            direction,
            stakeAmount: selectedStake,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to create staked duel");
        }

        const duel = await res.json();
        haptic?.notificationOccurred?.("success");

        setActivePrediction({
          id: duel.id,
          assetSymbol: `${selectedAsset}USDT`,
          durationSeconds: selectedDuration,
          endsAt: duel.endsAt,
          direction,
          asset: selectedAsset,
          startPrice: priceData?.price ? parseFloat(priceData.price) : null,
          stakeAmount: selectedStake,
          isStaked: true,
          escrowTxHash: duel.escrowTxHash,
        });
      } else {
        const res = await fetch("/api/trading-duels/play-vs-bot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorId: agent.id,
            assetSymbol: `${selectedAsset}USDT`,
            durationSeconds: selectedDuration,
            botDifficulty: "normal",
            botStrategy: direction === "up" ? "bearish" : "bullish",
          }),
        });
        if (!res.ok) throw new Error("Failed to create prediction");
        const duel = await res.json();
        setActivePrediction({
          ...duel,
          direction,
          asset: selectedAsset,
          startPrice: priceData?.price ? parseFloat(priceData.price) : null,
          isStaked: false,
        });
      }
    } catch (e: any) {
      setCreateError(e.message || "Failed to create prediction");
      const haptic = (window as any).Telegram?.WebApp?.HapticFeedback;
      haptic?.notificationOccurred?.("error");
    } finally {
      setIsCreating(false);
    }
  };

  if (activePrediction && agent) {
    return (
      <PredictActiveView
        prediction={activePrediction}
        agentId={agent.id}
        tgToken={tgToken}
        onBack={() => setActivePrediction(null)}
      />
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-purple-500/60" />
        </div>
        <p className="text-sm font-semibold text-white mb-1">Price Predictions</p>
        <p className="text-xs text-gray-500">Open via @honeycombot to predict</p>
      </div>
    );
  }

  const currentPrice = priceData?.price;
  const userBalance = walletData?.balance ? parseFloat(walletData.balance) : 0;
  const selectedStakeNum = parseFloat(selectedStake);
  const insufficientBalance = selectedStakeNum > 0 && userBalance < selectedStakeNum;
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-0.5">Select Asset</p>
        <div className="grid grid-cols-4 gap-1.5">
          {PREDICT_ASSETS.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAsset(a.id)}
              className={`rounded-xl p-2.5 text-center transition-all active:scale-95 ${
                selectedAsset === a.id
                  ? "bg-gradient-to-br from-purple-500/20 to-blue-500/10 border border-purple-500/30"
                  : "bg-white/[0.03] border border-white/[0.04]"
              }`}
              data-testid={`button-tg-predict-asset-${a.id.toLowerCase()}`}
            >
              <span className={`text-lg block ${selectedAsset === a.id ? "" : "opacity-50"}`}>{a.icon}</span>
              <span className={`text-[10px] font-bold ${selectedAsset === a.id ? "text-purple-400" : "text-gray-500"}`}>{a.short}</span>
            </button>
          ))}
        </div>
      </div>

      {currentPrice && (
        <div className="text-center py-2">
          <span className="text-[10px] text-gray-500">{selectedAsset}/USDT</span>
          <div className="text-3xl font-black text-white font-mono tracking-tight" data-testid="text-tg-predict-price">
            ${parseFloat(currentPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      )}

      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-0.5">Duration</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PREDICT_DURATIONS.map((d) => (
            <button
              key={d.seconds}
              onClick={() => setSelectedDuration(d.seconds)}
              className={`rounded-xl p-2.5 text-center transition-all active:scale-95 ${
                selectedDuration === d.seconds
                  ? "bg-gradient-to-br from-purple-500/20 to-blue-500/10 border border-purple-500/30"
                  : "bg-white/[0.03] border border-white/[0.04]"
              }`}
              data-testid={`button-tg-predict-duration-${d.seconds}`}
            >
              <span className={`text-sm font-bold ${selectedDuration === d.seconds ? "text-white" : "text-gray-400"}`}>{d.label}</span>
              <span className={`text-[9px] block ${selectedDuration === d.seconds ? "text-purple-400" : "text-gray-600"}`}>{d.tag}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Stake BNB</span>
          </div>
          {userBalance > 0 && (
            <span className="text-[10px] text-gray-500 font-mono">
              {userBalance.toFixed(4)} BNB
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {STAKE_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSelectedStake(s.value)}
              className={`rounded-xl px-2 py-2.5 text-center transition-all active:scale-95 ${
                selectedStake === s.value
                  ? s.value === "0"
                    ? "bg-white/5 text-white border border-white/10"
                    : "bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30"
                  : "bg-white/[0.03] border border-white/[0.04]"
              }`}
              data-testid={`button-tg-predict-stake-${s.value}`}
            >
              <div className={`text-xs font-bold ${
                selectedStake === s.value ? (s.value === "0" ? "text-white" : "text-amber-400") : "text-gray-400"
              }`}>{s.value === "0" ? "Free" : `${s.label}`}</div>
              <div className="text-[9px] text-gray-600">{s.description}</div>
            </button>
          ))}
        </div>
      </div>

      {createError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/15">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-400">{createError}</span>
        </div>
      )}

      {insufficientBalance && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/15">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-xs text-amber-400">Insufficient balance. Deposit BNB first.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => createPrediction("up")}
          disabled={isCreating || insufficientBalance}
          className="h-16 rounded-xl bg-gradient-to-r from-green-600 to-green-700 text-white font-bold text-lg flex flex-col items-center justify-center shadow-lg shadow-green-500/10 hover:from-green-700 hover:to-green-800 active:scale-[0.97] transition-all disabled:opacity-40"
          data-testid="button-tg-predict-up"
        >
          <div className="flex items-center gap-1.5">
            {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingUp className="w-5 h-5" />}
            UP
          </div>
          {selectedStakeNum > 0 && (
            <span className="text-[10px] font-normal opacity-70">{selectedStake} BNB</span>
          )}
        </button>
        <button
          onClick={() => createPrediction("down")}
          disabled={isCreating || insufficientBalance}
          className="h-16 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-lg flex flex-col items-center justify-center shadow-lg shadow-red-500/10 hover:from-red-700 hover:to-red-800 active:scale-[0.97] transition-all disabled:opacity-40"
          data-testid="button-tg-predict-down"
        >
          <div className="flex items-center gap-1.5">
            {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <TrendingDown className="w-5 h-5" />}
            DOWN
          </div>
          {selectedStakeNum > 0 && (
            <span className="text-[10px] font-normal opacity-70">{selectedStake} BNB</span>
          )}
        </button>
      </div>

      {selectedStakeNum > 0 && (
        <p className="text-[10px] text-center text-gray-600">
          Win = {(selectedStakeNum * 2 * 0.95).toFixed(4)} BNB (5% fee) · BNB sent to escrow
        </p>
      )}
    </div>
  );
}

function PredictActiveView({ prediction, agentId, tgToken, onBack }: {
  prediction: PredictionData;
  agentId: string;
  tgToken?: string | null;
  onBack: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(prediction.durationSeconds);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [result, setResult] = useState<{
    duel?: { winnerId: string | null };
    userWon?: boolean;
    payout?: string;
    payoutTxHash?: string;
    stakeAmount?: string;
  } | null>(null);
  const settledRef = useRef(false);
  const priceHistory = useRef<{ t: number; p: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawPredictChart = useCallback(() => {
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
      ctx.fillText("Watching price...", w / 2, h / 2);
      return;
    }
    const prices = pts.map(p => p.p);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const startP = prediction.startPrice ? Number(prediction.startPrice) : pts[0].p;

    const startY = h - ((startP - minP) / range) * (h - 16) - 8;
    ctx.strokeStyle = "rgba(168,85,247,0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, startY);
    ctx.lineTo(w, startY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(168,85,247,0.5)";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("ENTRY", 4, startY - 4);

    const isUp = pts[pts.length - 1].p >= startP;
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
  }, [prediction.startPrice]);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/trading-duels/binance/ticker?symbol=${prediction.assetSymbol}`);
        if (res.ok) {
          const data = await res.json();
          const p = parseFloat(data.price);
          if (p > 0) {
            setCurrentPrice(p);
            priceHistory.current.push({ t: Date.now(), p });
            if (priceHistory.current.length > 120) priceHistory.current.shift();
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(iv);
  }, [prediction.assetSymbol]);

  useEffect(() => {
    let active = true;
    const draw = () => { if (!active) return; drawPredictChart(); requestAnimationFrame(draw); };
    requestAnimationFrame(draw);
    return () => { active = false; };
  }, [drawPredictChart]);

  useEffect(() => {
    const iv = setInterval(() => {
      const end = new Date(prediction.endsAt).getTime();
      const remaining = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0 && !settledRef.current) {
        settledRef.current = true;

        const settleUrl = prediction.isStaked
          ? `/api/telegram/duels/${prediction.id}/settle-staked`
          : `/api/trading-duels/${prediction.id}/settle`;

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (prediction.isStaked && tgToken) {
          headers["Authorization"] = `Bearer ${tgToken}`;
        }

        fetch(settleUrl, { method: "POST", headers })
          .then(() => new Promise(r => setTimeout(r, 1500)))
          .then(() => {
            if (prediction.isStaked) {
              return fetch(settleUrl, { method: "POST", headers }).then(r => r.json());
            }
            return fetch(`/api/trading-duels/${prediction.id}/results`).then(r => r.json());
          })
          .then(data => {
            const haptic = (window as any).Telegram?.WebApp?.HapticFeedback;
            if (data?.userWon || data?.duel?.winnerId === agentId) {
              haptic?.notificationOccurred?.("success");
            } else {
              haptic?.notificationOccurred?.("warning");
            }

            if (prediction.isStaked) {
              setResult({
                duel: { winnerId: data?.winnerId || null },
                userWon: data?.userWon,
                payout: data?.payout,
                payoutTxHash: data?.payoutTxHash,
                stakeAmount: data?.stakeAmount,
              });
            } else {
              if (data?.duel) setResult(data);
              else setResult({ duel: { winnerId: null } });
            }
          })
          .catch(() => setResult({ duel: { winnerId: null } }));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [prediction, agentId, tgToken]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerUrgent = timeLeft < 30;

  if (result) {
    const won = result.userWon ?? result.duel?.winnerId === agentId;
    const draw = !result.duel?.winnerId;
    const stakeAmt = prediction.stakeAmount ? parseFloat(prediction.stakeAmount) : 0;
    const isStaked = prediction.isStaked && stakeAmt > 0;

    return (
      <div className="flex flex-col items-center justify-center py-6 text-center space-y-5">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
          draw ? "bg-gray-700/30" : won ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/20" : "bg-gradient-to-br from-red-500/20 to-red-700/20"
        }`}>
          {draw ? <Target className="w-10 h-10 text-gray-400" /> :
           won ? <Trophy className="w-10 h-10 text-amber-400" /> :
           <Swords className="w-10 h-10 text-red-400" />}
        </div>

        <div>
          <h3 className={`text-2xl font-black ${draw ? "text-gray-300" : won ? "text-amber-400" : "text-red-400"}`}>
            {draw ? "DRAW" : won ? "YOU WON!" : "YOU LOST"}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {prediction.asset}/USDT · {prediction.direction.toUpperCase()} prediction
          </p>
        </div>

        {isStaked && (
          <div className="space-y-2">
            {won && result.payout && (
              <div className="text-2xl font-black text-green-400">
                +{parseFloat(result.payout).toFixed(4)} BNB
              </div>
            )}
            {!won && !draw && (
              <div className="text-lg font-bold text-red-400">
                -{stakeAmt.toFixed(4)} BNB
              </div>
            )}
            {draw && (
              <div className="text-sm text-gray-400">
                Stake refunded: {stakeAmt.toFixed(4)} BNB
              </div>
            )}
            {result.payoutTxHash && (
              <a
                href={`https://bscscan.com/tx/${result.payoutTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 underline"
                data-testid="link-payout-tx"
              >
                View on BscScan
              </a>
            )}
          </div>
        )}

        <Button
          className="w-full h-14 text-base font-bold bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-transform"
          onClick={onBack}
          data-testid="button-tg-predict-again"
        >
          <Sparkles className="w-5 h-5 mr-2" /> PREDICT AGAIN
        </Button>
      </div>
    );
  }

  const pctChange = prediction.startPrice && currentPrice
    ? (((currentPrice - Number(prediction.startPrice)) / Number(prediction.startPrice)) * 100)
    : null;
  const isWinning = pctChange !== null && pctChange !== 0
    ? (prediction.direction === "up" ? pctChange > 0 : pctChange < 0)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white active:scale-90 transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-sm font-bold ${
          timerUrgent ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-white/5 text-gray-300"
        }`}>
          <Timer className="w-3.5 h-3.5" />
          {mins}:{secs.toString().padStart(2, "0")}
        </div>
        <div className="flex items-center gap-1.5">
          {prediction.isStaked && prediction.stakeAmount && (
            <Badge className="bg-amber-500/15 text-amber-400 border-0 text-[10px] font-bold">
              {prediction.stakeAmount} BNB
            </Badge>
          )}
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
            prediction.direction === "up"
              ? "bg-green-500/15 text-green-400"
              : "bg-red-500/15 text-red-400"
          }`}>
            {prediction.direction === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {prediction.direction.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500 font-medium">{prediction.asset || prediction.assetSymbol?.replace("USDT", "")}/USDT</span>
          {pctChange !== null && (
            <span className={`text-sm font-black ${pctChange >= 0 ? "text-green-400" : "text-red-400"}`}>
              {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(3)}%
            </span>
          )}
        </div>
        <div className="text-3xl font-black text-white font-mono tracking-tight" data-testid="text-tg-predict-live-price">
          {currentPrice ? `$${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "Loading..."}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-white/[0.06] shadow-inner">
        <canvas ref={canvasRef} className="w-full" style={{ height: 180 }} data-testid="canvas-tg-predict-chart" />
      </div>

      <div className={`text-center py-2 rounded-xl ${
        isWinning === null ? "bg-white/5 border border-white/[0.06]" :
        isWinning ? "bg-green-500/10 border border-green-500/15" : "bg-red-500/10 border border-red-500/15"
      }`}>
        <p className={`text-xs font-bold ${
          isWinning === null ? "text-gray-400" : isWinning ? "text-green-400" : "text-red-400"
        }`}>
          {isWinning === null ? "WAITING" : isWinning ? "WINNING" : "LOSING"} · {prediction.direction.toUpperCase()} prediction
        </p>
        {prediction.isStaked && prediction.stakeAmount && (
          <p className="text-[10px] text-gray-500 mt-0.5">{prediction.stakeAmount} BNB staked</p>
        )}
      </div>
    </div>
  );
}
