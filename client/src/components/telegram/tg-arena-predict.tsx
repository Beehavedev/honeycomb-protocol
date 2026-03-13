import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Timer, ArrowLeft, Target, Trophy,
  Sparkles, Swords, Coins, AlertTriangle, Loader2,
} from "lucide-react";
import type { TgAgentInfo } from "./tg-arena-types";

const PREDICT_ASSETS = [
  { id: "BTC", label: "Bitcoin", short: "BTC" },
  { id: "ETH", label: "Ethereum", short: "ETH" },
  { id: "BNB", label: "BNB", short: "BNB" },
  { id: "SOL", label: "Solana", short: "SOL" },
];

const PREDICT_DURATIONS = [
  { seconds: 60, label: "1m" },
  { seconds: 300, label: "5m" },
  { seconds: 600, label: "10m" },
];

const STAKE_OPTIONS = [
  { value: "0", label: "Free", description: "Practice mode" },
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
      if (isStaked) {
        const haptic = (window as any).Telegram?.WebApp?.HapticFeedback;
        haptic?.impactOccurred?.("medium");

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
      <Card className="p-6 bg-[#242444] border-gray-700/50 text-center">
        <TrendingUp className="w-10 h-10 text-purple-500/50 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Open via @honeycombot to predict</p>
      </Card>
    );
  }

  const currentPrice = priceData?.price;
  const userBalance = walletData?.balance ? parseFloat(walletData.balance) : 0;
  const selectedStakeNum = parseFloat(selectedStake);
  const insufficientBalance = selectedStakeNum > 0 && userBalance < selectedStakeNum;

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-600/10 border-purple-500/20">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">Predict Price Direction</span>
        </div>
        <p className="text-[10px] text-gray-400 mb-3">Pick an asset, predict UP or DOWN, and win real BNB</p>

        <div className="flex gap-2 mb-3 overflow-x-auto">
          {PREDICT_ASSETS.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAsset(a.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all ${
                selectedAsset === a.id
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                  : "text-gray-400 border border-gray-700/50"
              }`}
              data-testid={`button-tg-predict-asset-${a.id.toLowerCase()}`}
            >
              {a.short}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          {PREDICT_DURATIONS.map((d) => (
            <button
              key={d.seconds}
              onClick={() => setSelectedDuration(d.seconds)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedDuration === d.seconds
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                  : "text-gray-400 border border-gray-700/50"
              }`}
              data-testid={`button-tg-predict-duration-${d.seconds}`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="mb-3">
          <div className="flex items-center gap-1 mb-2">
            <Coins className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] text-amber-400 font-medium">Stake BNB</span>
            {userBalance > 0 && (
              <span className="text-[10px] text-gray-500 ml-auto">
                Balance: {userBalance.toFixed(4)} BNB
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {STAKE_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSelectedStake(s.value)}
                className={`px-2 py-2 rounded-lg text-center transition-all ${
                  selectedStake === s.value
                    ? s.value === "0"
                      ? "bg-gray-600/30 text-white border border-gray-500/50"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    : "text-gray-400 border border-gray-700/40 hover:border-gray-600/60"
                }`}
                data-testid={`button-tg-predict-stake-${s.value}`}
              >
                <div className="text-xs font-bold">{s.value === "0" ? "Free" : `${s.label} BNB`}</div>
                <div className="text-[9px] opacity-60">{s.description}</div>
              </button>
            ))}
          </div>
        </div>

        {currentPrice && (
          <div className="text-center mb-3">
            <span className="text-[10px] text-gray-500">{selectedAsset}/USDT</span>
            <div className="text-xl font-bold text-white font-mono" data-testid="text-tg-predict-price">
              ${parseFloat(currentPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        )}

        {createError && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-3">
            <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
            <span className="text-[10px] text-red-400">{createError}</span>
          </div>
        )}

        {insufficientBalance && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[10px] text-amber-400">
              Insufficient balance. Deposit BNB to your wallet first.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base gap-1"
            onClick={() => createPrediction("up")}
            disabled={isCreating || insufficientBalance}
            data-testid="button-tg-predict-up"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {selectedStakeNum > 0 ? `UP ${selectedStake}` : "UP"}
          </Button>
          <Button
            className="h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-base gap-1"
            onClick={() => createPrediction("down")}
            disabled={isCreating || insufficientBalance}
            data-testid="button-tg-predict-down"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingDown className="w-4 h-4" />}
            {selectedStakeNum > 0 ? `DOWN ${selectedStake}` : "DOWN"}
          </Button>
        </div>

        {selectedStakeNum > 0 && (
          <p className="text-[9px] text-center text-gray-500 mt-2">
            Win = {(selectedStakeNum * 2 * 0.95).toFixed(4)} BNB (5% fee) · BNB sent to escrow on confirm
          </p>
        )}
      </Card>
    </div>
  );
}

function PredictActiveView({ prediction, agentId, tgToken, onBack }: {
  prediction: PredictionData;
  agentId: string;
  tgToken?: string;
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
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);
    const pts = priceHistory.current;
    if (pts.length < 2) return;
    const prices = pts.map(p => p.p);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const startP = prediction.startPrice ? Number(prediction.startPrice) : pts[0].p;
    const startY = h - ((startP - minP) / range) * (h - 8) - 4;
    ctx.strokeStyle = "rgba(168,85,247,0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, startY);
    ctx.lineTo(w, startY);
    ctx.stroke();
    ctx.setLineDash([]);
    const isUp = pts[pts.length - 1].p >= startP;
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
      } catch { /* network error */ }
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

  if (result) {
    const won = result.userWon ?? result.duel?.winnerId === agentId;
    const draw = !result.duel?.winnerId;
    const stakeAmt = prediction.stakeAmount ? parseFloat(prediction.stakeAmount) : 0;
    const isStaked = prediction.isStaked && stakeAmt > 0;

    return (
      <div className="text-center space-y-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
          draw ? "bg-gray-700/50" : won ? "bg-green-500/20" : "bg-red-500/20"
        }`}>
          {draw ? <Target className="w-8 h-8 text-gray-400" /> :
           won ? <Trophy className="w-8 h-8 text-amber-500" /> :
           <Swords className="w-8 h-8 text-red-400" />}
        </div>
        <h3 className={`text-xl font-bold ${draw ? "text-gray-300" : won ? "text-green-400" : "text-red-400"}`}>
          {draw ? "Draw!" : won ? "You Won!" : "You Lost"}
        </h3>

        {isStaked && (
          <div className="space-y-1">
            {won && result.payout && (
              <div className="text-lg font-bold text-amber-400">
                +{parseFloat(result.payout).toFixed(4)} BNB
              </div>
            )}
            {!won && !draw && (
              <div className="text-sm text-red-400">
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

        <Button onClick={onBack} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white" data-testid="button-tg-predict-again">
          <Sparkles className="w-4 h-4 mr-1" /> Predict Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Badge className={`font-mono ${timeLeft < 30 ? "bg-red-500/20 text-red-400" : "bg-purple-500/20 text-purple-400"}`}>
          <Timer className="w-3 h-3 mr-1" />
          {mins}:{secs.toString().padStart(2, "0")}
        </Badge>
        <div className="flex items-center gap-1">
          {prediction.isStaked && prediction.stakeAmount && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px]">
              <Coins className="w-2.5 h-2.5 mr-0.5" />
              {prediction.stakeAmount} BNB
            </Badge>
          )}
          <Badge variant="outline" className={`${prediction.direction === "up" ? "text-green-400 border-green-500/40" : "text-red-400 border-red-500/40"}`}>
            {prediction.direction === "up" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {prediction.direction.toUpperCase()}
          </Badge>
        </div>
      </div>

      <Card className="p-3 bg-[#242444] border-gray-700/50">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-500">{prediction.asset || prediction.assetSymbol?.replace("USDT", "")}/USD</span>
          {prediction.startPrice && currentPrice && (
            <span className={`text-xs font-bold ${currentPrice >= prediction.startPrice ? "text-green-400" : "text-red-400"}`}>
              {currentPrice >= prediction.startPrice ? "+" : ""}
              {(((currentPrice - Number(prediction.startPrice)) / Number(prediction.startPrice)) * 100).toFixed(3)}%
            </span>
          )}
        </div>
        <div className="text-xl font-bold text-white font-mono" data-testid="text-tg-predict-live-price">
          {currentPrice ? `$${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "Loading..."}
        </div>
      </Card>

      <div className="rounded-lg overflow-hidden border border-gray-700/30">
        <canvas ref={canvasRef} className="w-full" style={{ height: 160 }} data-testid="canvas-tg-predict-chart" />
      </div>

      <div className="text-center">
        <p className="text-xs text-gray-400">
          Your prediction: price goes <span className={prediction.direction === "up" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{prediction.direction.toUpperCase()}</span>
          {prediction.isStaked && prediction.stakeAmount && (
            <span className="text-amber-400 ml-1">· {prediction.stakeAmount} BNB staked</span>
          )}
        </p>
      </div>
    </div>
  );
}
