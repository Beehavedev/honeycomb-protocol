import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, Timer, ArrowLeft, Target, Trophy,
  Sparkles, Swords,
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

interface PredictionData {
  id: string;
  assetSymbol: string;
  durationSeconds: number;
  endsAt: string;
  direction: "up" | "down";
  asset: string;
  startPrice: number | null;
}

export function PredictSubTab({ agent }: { agent?: TgAgentInfo }) {
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [selectedDuration, setSelectedDuration] = useState(300);
  const [activePrediction, setActivePrediction] = useState<PredictionData | null>(null);

  const { data: priceData } = useQuery<{ price: string }>({
    queryKey: ["/api/trading-duels/binance/ticker", selectedAsset],
    queryFn: async () => {
      const res = await fetch(`/api/trading-duels/binance/ticker?symbol=${selectedAsset}USDT`);
      return res.json();
    },
    refetchInterval: 5000,
    enabled: !activePrediction,
  });

  const createPrediction = async (direction: "up" | "down") => {
    if (!agent) return;
    try {
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
      if (res.ok) {
        const duel = await res.json();
        setActivePrediction({
          ...duel,
          direction,
          asset: selectedAsset,
          startPrice: priceData?.price ? parseFloat(priceData.price) : null,
        });
      }
    } catch (e) {
      console.error("Predict duel error:", e);
    }
  };

  if (activePrediction && agent) {
    return (
      <PredictActiveView
        prediction={activePrediction}
        agentId={agent.id}
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

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-600/10 border-purple-500/20">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">Predict Price Direction</span>
        </div>
        <p className="text-[10px] text-gray-400 mb-3">Pick an asset, predict UP or DOWN, and compete vs AI</p>

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

        <div className="flex gap-2 mb-4">
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

        {currentPrice && (
          <div className="text-center mb-3">
            <span className="text-[10px] text-gray-500">{selectedAsset}/USDT</span>
            <div className="text-xl font-bold text-white font-mono" data-testid="text-tg-predict-price">
              ${parseFloat(currentPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-base gap-1"
            onClick={() => createPrediction("up")}
            data-testid="button-tg-predict-up"
          >
            <TrendingUp className="w-4 h-4" /> UP
          </Button>
          <Button
            className="h-12 bg-red-600 hover:bg-red-700 text-white font-bold text-base gap-1"
            onClick={() => createPrediction("down")}
            data-testid="button-tg-predict-down"
          >
            <TrendingDown className="w-4 h-4" /> DOWN
          </Button>
        </div>
      </Card>
    </div>
  );
}

function PredictActiveView({ prediction, agentId, onBack }: {
  prediction: PredictionData;
  agentId: string;
  onBack: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(prediction.durationSeconds);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [result, setResult] = useState<{ duel?: { winnerId: string | null } } | null>(null);
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
        fetch(`/api/trading-duels/${prediction.id}/settle`, { method: "POST" })
          .then(() => new Promise(r => setTimeout(r, 1500)))
          .then(() => fetch(`/api/trading-duels/${prediction.id}/results`))
          .then(r => r.json())
          .then(data => {
            if (data?.duel) setResult(data);
          })
          .catch(() => setResult({ duel: { winnerId: null } }));
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [prediction]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  if (result) {
    const won = result.duel?.winnerId === agentId;
    const draw = !result.duel?.winnerId;
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
          {draw ? "Draw!" : won ? "Correct Prediction!" : "Wrong Prediction"}
        </h3>
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
        <Badge variant="outline" className={`${prediction.direction === "up" ? "text-green-400 border-green-500/40" : "text-red-400 border-red-500/40"}`}>
          {prediction.direction === "up" ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {prediction.direction.toUpperCase()}
        </Badge>
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
        </p>
      </div>
    </div>
  );
}
