import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount, useChainId } from "wagmi";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { 
  useCreateDuel, 
  useJoinDuel, 
  usePredictDuelAddress, 
  useGetAgentByOwner,
  parseEther 
} from "@/contracts/hooks";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  Trophy,
  Plus,
  Target,
  Users,
  Wallet
} from "lucide-react";
import type { Duel, DuelAsset } from "@shared/schema";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m`;
}

function formatBNB(wei: string): string {
  const bnb = parseFloat(wei) / 1e18;
  return `${bnb.toFixed(4)} BNB`;
}

function formatPrice(priceStr: string): string {
  const price = parseFloat(priceStr) / 1e8;
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  return `$${price.toFixed(4)}`;
}

function CountdownTimer({ endTs }: { endTs: Date }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(endTs).getTime();
      setTimeLeft(Math.max(0, Math.floor((end - now) / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTs]);

  if (timeLeft <= 0) return <span className="text-destructive font-bold">Ended</span>;

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  return (
    <span className="font-mono font-bold text-primary">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

// Map asset IDs to Binance trading pairs (USDT pairs)
const BINANCE_SYMBOLS: Record<string, string> = {
  "BNB": "BNBUSDT",
  "BTC": "BTCUSDT",
  "ETH": "ETHUSDT",
  "SOL": "SOLUSDT",
  "DOGE": "DOGEUSDT",
  "PEPE": "PEPEUSDT",
  "SHIB": "SHIBUSDT",
  "XRP": "XRPUSDT",
  "ADA": "ADAUSDT",
  "AVAX": "AVAXUSDT",
  "MATIC": "MATICUSDT",
  "LINK": "LINKUSDT",
};

function useBinancePrice(assetId: string, enabled: boolean = true) {
  const [price, setPrice] = useState<number | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    
    let intervalId: ReturnType<typeof setInterval>;

    // Fetch kline data via backend proxy (avoids CORS issues)
    const fetchKlines = async () => {
      try {
        const res = await fetch(`/api/duels/binance/klines/${assetId}?interval=1m&limit=30`);
        const data = await res.json();
        
        if (res.ok && data.klines && data.klines.length > 0) {
          const closePrices = data.klines.map((k: any) => k.close);
          setPriceHistory(closePrices);
          setPrice(closePrices[closePrices.length - 1]);
          setError(null);
        } else {
          setError(data.message || "Failed to load price data");
        }
        setLoading(false);
      } catch (e) {
        console.error("Price history fetch error:", e);
        setError("Failed to connect to price feed");
        setLoading(false);
      }
    };

    // Fetch current price via backend proxy
    const fetchCurrentPrice = async () => {
      try {
        const res = await fetch(`/api/duels/binance/ticker/${assetId}`);
        const data = await res.json();
        
        if (res.ok && data.price) {
          const newPrice = data.price;
          setPrice(newPrice);
          setPriceHistory(prev => {
            const updated = [...prev, newPrice];
            return updated.slice(-30);
          });
          setError(null);
        }
      } catch (e) {
        console.error("Price fetch error:", e);
      }
    };

    fetchKlines();
    intervalId = setInterval(fetchCurrentPrice, 3000); // Update every 3 seconds

    return () => clearInterval(intervalId);
  }, [assetId, enabled]);

  return { price, priceHistory, loading, error };
}

function LivePriceChart({ duel }: { duel: Duel }) {
  const { price, priceHistory, loading, error } = useBinancePrice(duel.assetId, duel.status === "live");
  const startPrice = duel.startPrice ? parseFloat(duel.startPrice) / 1e8 : null;
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Timer effect
  useEffect(() => {
    if (!duel.endTs) return;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(duel.endTs!).getTime();
      setTimeLeft(Math.max(0, Math.floor((end - now) / 1000)));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [duel.endTs]);
  
  if (loading && !price) {
    return (
      <div className="h-48 bg-muted/30 rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading Binance price feed...</span>
      </div>
    );
  }
  
  if (error && !price) {
    return (
      <div className="h-48 bg-muted/30 rounded-lg flex items-center justify-center">
        <span className="text-red-500 text-sm">{error}</span>
      </div>
    );
  }

  const currentPrice = price || (priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : 0);
  
  // If no start price, show waiting state with basic chart
  if (!startPrice) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">${currentPrice.toLocaleString(undefined, { maximumFractionDigits: currentPrice < 1 ? 6 : 2 })}</span>
            <Badge variant="outline">Waiting for opponent...</Badge>
          </div>
        </div>
        <div className="text-center text-muted-foreground text-sm">
          Start price will be locked when opponent joins
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-amber-500">Binance</span>
          <span>• Live Feed</span>
        </div>
      </div>
    );
  }

  // Chart dimensions
  const chartWidth = 400;
  const chartHeight = 120;
  const padding = { top: 10, right: 10, bottom: 10, left: 10 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Use price history or generate from start/current
  const chartData = priceHistory.length > 2 ? priceHistory : [startPrice, ...Array(10).fill(0).map((_, i) => {
    const progress = i / 9;
    return startPrice + (currentPrice - startPrice) * progress;
  }), currentPrice];

  // Calculate price range with some padding
  const allPrices = [...chartData, startPrice];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || startPrice * 0.001;
  const paddedMin = minPrice - priceRange * 0.1;
  const paddedMax = maxPrice + priceRange * 0.1;
  const paddedRange = paddedMax - paddedMin;

  // Calculate Y position for start price line
  const startPriceY = padding.top + innerHeight - ((startPrice - paddedMin) / paddedRange) * innerHeight;

  // Generate line path
  const linePath = chartData.map((p, i) => {
    const x = padding.left + (i / (chartData.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - ((p - paddedMin) / paddedRange) * innerHeight;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate area paths (green above start, red below)
  const generateAreaPath = (prices: number[], above: boolean) => {
    const points: string[] = [];
    let inArea = false;
    let areaStartX = 0;

    prices.forEach((p, i) => {
      const x = padding.left + (i / (prices.length - 1)) * innerWidth;
      const y = padding.top + innerHeight - ((p - paddedMin) / paddedRange) * innerHeight;
      const isAbove = p >= startPrice;

      if ((above && isAbove) || (!above && !isAbove)) {
        if (!inArea) {
          areaStartX = x;
          points.push(`M ${x} ${startPriceY}`);
          inArea = true;
        }
        points.push(`L ${x} ${y}`);
      } else if (inArea) {
        points.push(`L ${x} ${startPriceY}`);
        points.push('Z');
        inArea = false;
      }
    });

    if (inArea) {
      const lastX = padding.left + innerWidth;
      points.push(`L ${lastX} ${startPriceY}`);
      points.push('Z');
    }

    return points.join(' ');
  };

  const greenAreaPath = generateAreaPath(chartData, true);
  const redAreaPath = generateAreaPath(chartData, false);

  const priceChangeFromStart = ((currentPrice - startPrice) / startPrice) * 100;
  const isUp = currentPrice > startPrice;
  const creatorWinning = (duel.creatorDirection === "up" && isUp) || (duel.creatorDirection === "down" && !isUp);

  // Format timer
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerDisplay = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
      {/* Header with price, change, and timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">${currentPrice.toLocaleString(undefined, { maximumFractionDigits: currentPrice < 1 ? 6 : 2 })}</span>
          <Badge className={isUp ? "bg-green-500" : "bg-red-500"}>
            {isUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {priceChangeFromStart >= 0 ? "+" : ""}{priceChangeFromStart.toFixed(3)}%
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-sm font-bold ${creatorWinning ? "text-green-500" : "text-red-500"}`}>
            {creatorWinning ? "Creator Winning" : "Opponent Winning"}
          </div>
          <div className="flex items-center gap-1 bg-background/50 px-3 py-1 rounded-full">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-mono font-bold text-lg text-primary">{timerDisplay}</span>
          </div>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div className="relative">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-32">
          {/* Green area (above start price) */}
          <path d={greenAreaPath} fill="rgba(34, 197, 94, 0.3)" />
          
          {/* Red area (below start price) */}
          <path d={redAreaPath} fill="rgba(239, 68, 68, 0.3)" />
          
          {/* Start price horizontal line */}
          <line
            x1={padding.left}
            y1={startPriceY}
            x2={chartWidth - padding.right}
            y2={startPriceY}
            stroke="white"
            strokeWidth="1"
            strokeDasharray="4 2"
            opacity="0.6"
          />
          
          {/* Price line */}
          <path
            d={linePath}
            fill="none"
            stroke={isUp ? "#22c55e" : "#ef4444"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Current price dot */}
          <circle
            cx={padding.left + innerWidth}
            cy={padding.top + innerHeight - ((currentPrice - paddedMin) / paddedRange) * innerHeight}
            r="4"
            fill={isUp ? "#22c55e" : "#ef4444"}
            stroke="white"
            strokeWidth="2"
          />
        </svg>

        {/* UP/DOWN labels */}
        <div className="absolute left-2 top-2 text-xs font-bold text-green-500 opacity-70">
          UP ▲
        </div>
        <div className="absolute left-2 bottom-2 text-xs font-bold text-red-500 opacity-70">
          DOWN ▼
        </div>
      </div>
      
      {/* Footer with start price and Binance attribution */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Start:</span>
          <span className="font-mono font-semibold">${startPrice.toLocaleString(undefined, { maximumFractionDigits: startPrice < 1 ? 6 : 2 })}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="font-semibold text-amber-500">Binance</span>
          <span>• Live • 3s</span>
        </div>
      </div>
    </div>
  );
}

function DuelCard({ duel, onJoin, isJoining }: { duel: Duel; onJoin?: () => void; isJoining?: boolean }) {
  const { address } = useAccount();
  const isCreator = address?.toLowerCase() === duel.creatorAddress.toLowerCase();
  const isJoiner = duel.joinerAddress && address?.toLowerCase() === duel.joinerAddress.toLowerCase();
  const canJoin = duel.status === "open" && !isCreator && address;

  const creatorShort = `${duel.creatorAddress.slice(0, 6)}...${duel.creatorAddress.slice(-4)}`;
  const joinerShort = duel.joinerAddress ? `${duel.joinerAddress.slice(0, 6)}...${duel.joinerAddress.slice(-4)}` : null;
  
  // Calculate total pot
  const stakeValue = parseFloat(duel.stakeWei) / 1e18;
  const totalPot = duel.joinerAddress ? stakeValue * 2 : stakeValue;
  const winnerTakes = totalPot * 0.9;

  return (
    <Card className="hover-elevate overflow-visible" data-testid={`duel-card-${duel.id}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-lg px-3 py-1">
              {duel.assetId}
            </Badge>
            <Badge 
              variant={duel.status === "open" ? "default" : duel.status === "live" ? "secondary" : "outline"}
              className="uppercase"
            >
              {duel.status === "open" ? "Waiting for Opponent" : duel.status === "live" ? "LIVE" : "Settled"}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-primary">{totalPot.toFixed(4)} BNB</div>
            <div className="text-xs text-muted-foreground">Total Pot • Winner gets {winnerTakes.toFixed(4)} BNB</div>
          </div>
        </div>

        {/* VS Battle Display */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Creator Side */}
          <div className={`p-3 rounded-lg text-center ${
            duel.creatorDirection === "up" 
              ? "bg-green-500/10 border border-green-500/30" 
              : "bg-red-500/10 border border-red-500/30"
          }`}>
            <div className="text-xs text-muted-foreground mb-1">
              {isCreator ? "You" : "Creator"}
            </div>
            <div className="font-mono text-xs mb-2">{creatorShort}</div>
            <div className={`flex items-center justify-center gap-1 font-bold text-lg ${
              duel.creatorDirection === "up" ? "text-green-500" : "text-red-500"
            }`}>
              {duel.creatorDirection === "up" ? (
                <>
                  <TrendingUp className="h-5 w-5" />
                  UP
                </>
              ) : (
                <>
                  <TrendingDown className="h-5 w-5" />
                  DOWN
                </>
              )}
            </div>
            <div className="text-xs mt-1 text-muted-foreground">
              Betting {duel.assetId} goes {duel.creatorDirection}
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center">
            <div className="text-2xl font-black text-muted-foreground">VS</div>
          </div>

          {/* Opponent Side */}
          <div className={`p-3 rounded-lg text-center ${
            duel.joinerAddress
              ? duel.joinerDirection === "up" 
                ? "bg-green-500/10 border border-green-500/30" 
                : "bg-red-500/10 border border-red-500/30"
              : "bg-muted/50 border border-dashed border-muted-foreground/30"
          }`}>
            {duel.joinerAddress ? (
              <>
                <div className="text-xs text-muted-foreground mb-1">
                  {isJoiner ? "You" : "Opponent"}
                </div>
                <div className="font-mono text-xs mb-2">{joinerShort}</div>
                <div className={`flex items-center justify-center gap-1 font-bold text-lg ${
                  duel.joinerDirection === "up" ? "text-green-500" : "text-red-500"
                }`}>
                  {duel.joinerDirection === "up" ? (
                    <>
                      <TrendingUp className="h-5 w-5" />
                      UP
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-5 w-5" />
                      DOWN
                    </>
                  )}
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  Betting {duel.assetId} goes {duel.joinerDirection}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-muted-foreground mb-1">Opponent</div>
                <div className="font-mono text-xs mb-2 text-muted-foreground">Waiting...</div>
                <div className={`flex items-center justify-center gap-1 font-bold text-lg ${
                  duel.joinerDirection === "up" ? "text-green-500" : "text-red-500"
                }`}>
                  {duel.joinerDirection === "up" ? (
                    <>
                      <TrendingUp className="h-5 w-5" />
                      UP
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-5 w-5" />
                      DOWN
                    </>
                  )}
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  Must bet {duel.assetId} goes {duel.joinerDirection}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Timer & Duration */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            Duration: {formatDuration(duel.durationSec)}
          </div>
          {duel.status === "live" && duel.endTs && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Ends in:</span>
              <CountdownTimer endTs={new Date(duel.endTs)} />
            </div>
          )}
        </div>

        {/* Live Price Chart for active duels */}
        {duel.status === "live" && (
          <div className="mb-3">
            <LivePriceChart duel={duel} />
          </div>
        )}

        {/* Settled Results */}
        {duel.status === "settled" && (
          <div className="p-3 bg-muted/50 rounded-lg mb-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Start Price:</span>
                <span className="font-mono ml-2">{duel.startPrice ? formatPrice(duel.startPrice) : "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">End Price:</span>
                <span className="font-mono ml-2">{duel.endPrice ? formatPrice(duel.endPrice) : "-"}</span>
              </div>
            </div>
            {duel.winnerAddress && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-primary/10 rounded">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-bold text-primary">
                  Winner: {duel.winnerAddress.slice(0, 6)}...{duel.winnerAddress.slice(-4)}
                </span>
                <span className="text-sm text-muted-foreground ml-auto">
                  Won {winnerTakes.toFixed(4)} BNB
                </span>
              </div>
            )}
            {!duel.winnerAddress && (
              <div className="text-sm text-muted-foreground mt-3 text-center">
                Draw - Stakes refunded to both players
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canJoin && onJoin && (
            <Button 
              onClick={onJoin} 
              disabled={isJoining}
              className="flex-1"
              size="lg"
              data-testid={`join-duel-${duel.id}`}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isJoining ? "Confirm in Wallet..." : (
                <>
                  Join & Bet {duel.joinerDirection?.toUpperCase()} ({duel.stakeDisplay})
                </>
              )}
            </Button>
          )}
          {isCreator && duel.status === "open" && (
            <Badge variant="outline" className="py-2 px-4">
              <Clock className="h-3 w-3 mr-1" />
              Waiting for opponent...
            </Badge>
          )}
          {(isCreator || isJoiner) && duel.status === "settled" && duel.winnerAddress?.toLowerCase() === address?.toLowerCase() && (
            <Badge className="bg-primary text-primary-foreground py-2 px-4">
              <Trophy className="h-4 w-4 mr-1" />
              You Won {winnerTakes.toFixed(4)} BNB!
            </Badge>
          )}
          {(isCreator || isJoiner) && duel.status === "settled" && duel.winnerAddress && duel.winnerAddress?.toLowerCase() !== address?.toLowerCase() && (
            <Badge variant="outline" className="py-2 px-4">
              You Lost
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateDuelForm({ onSuccess }: { onSuccess: () => void }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { isAuthenticated, authenticate, isAuthenticating } = useAuth();
  const { toast } = useToast();
  const predictDuelAddress = usePredictDuelAddress();

  const [assetId, setAssetId] = useState("BNB");
  const [duration, setDuration] = useState("60");
  const [stake, setStake] = useState("0.01");
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [authError, setAuthError] = useState<string | null>(null);

  const { data: assets } = useQuery<DuelAsset[]>({
    queryKey: ["/api/duels/assets"],
  });

  // Check if user has on-chain agent
  const { data: onChainAgentId } = useGetAgentByOwner(address as `0x${string}`);
  
  // On-chain contract hook
  const { 
    createDuel: createDuelOnChain, 
    isPending: isCreatingOnChain, 
    isSuccess: createSuccess, 
    error: createError, 
    hash: createHash 
  } = useCreateDuel();

  // Check if contract is deployed on current chain and we're on BSC mainnet
  const isContractDeployed = predictDuelAddress && predictDuelAddress !== "0x0000000000000000000000000000000000000000";
  const isBscMainnet = chainId === 56;
  const canUseOnChain = isContractDeployed && isBscMainnet && onChainAgentId && onChainAgentId > BigInt(0);

  // Effect to handle on-chain success
  useEffect(() => {
    if (createSuccess && createHash) {
      toast({ 
        title: "Duel created on-chain!", 
        description: `Transaction: ${createHash.slice(0, 10)}...` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/duels"] });
      onSuccess();
    }
  }, [createSuccess, createHash]);

  // Effect to handle on-chain error
  useEffect(() => {
    if (createError) {
      const errorMsg = createError.message?.includes("user rejected") 
        ? "Transaction rejected by user"
        : createError.message?.slice(0, 100) || "Failed to create duel";
      toast({ 
        title: "Transaction failed", 
        description: errorMsg, 
        variant: "destructive" 
      });
    }
  }, [createError]);

  // Database fallback mutation (for when no on-chain agent)
  const createMutation = useMutation({
    mutationFn: async () => {
      const stakeWei = (parseFloat(stake) * 1e18).toString();
      const asset = assets?.find(a => a.assetId === assetId);
      
      return apiRequest("POST", "/api/duels", {
        assetId,
        assetName: asset?.name || assetId,
        durationSec: parseInt(duration),
        stakeWei,
        stakeDisplay: `${stake} BNB`,
        direction,
      });
    },
    onSuccess: () => {
      toast({ title: "Duel created!", description: "Waiting for opponent..." });
      queryClient.invalidateQueries({ queryKey: ["/api/duels"] });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create duel", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateDuel = () => {
    // Use on-chain if on BSC mainnet, contract deployed, and user has on-chain agent
    if (canUseOnChain) {
      try {
        const stakeWei = parseEther(stake);
        const directionNum = direction === "up" ? 0 : 1;
        createDuelOnChain(
          onChainAgentId!,
          assetId,
          directionNum as 0 | 1,
          BigInt(parseInt(duration)),
          stakeWei
        );
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } else {
      // Fallback to database API
      createMutation.mutate();
    }
  };
  
  const isPending = isCreatingOnChain || createMutation.isPending;

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      await authenticate();
    } catch (error: any) {
      if (error.message?.includes("not found") || error.message?.includes("register")) {
        setAuthError("register");
      } else {
        toast({ 
          title: "Sign in failed", 
          description: error.message || "Please try again", 
          variant: "destructive" 
        });
      }
    }
  };

  if (!address) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Connect wallet to create a duel</p>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-4">
          <p className="text-muted-foreground">Sign in as a Bee to create duels</p>
          <div className="space-y-3">
            <Button 
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="w-full"
              data-testid="button-sign-in-bee"
            >
              {isAuthenticating ? "Signing in..." : "Sign In with Wallet"}
            </Button>
            {authError === "register" && (
              <p className="text-sm text-amber-500">Not registered yet? Register below:</p>
            )}
            <Link href="/register-bee">
              <Button variant="outline" className="w-full" data-testid="button-register-bee">
                Register as a Bee
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Create Prediction Duel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Asset</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger data-testid="select-asset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assets?.map((asset) => (
                  <SelectItem key={asset.assetId} value={asset.assetId}>
                    {asset.symbol} - {asset.name}
                  </SelectItem>
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
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">1 minute</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Stake (BNB)</Label>
          <Input
            type="number"
            step="0.001"
            min="0.001"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            placeholder="0.01"
            data-testid="input-stake"
          />
          <p className="text-xs text-muted-foreground">
            Winner takes 90% of pot. 10% platform fee.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Your Prediction</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={direction === "up" ? "default" : "outline"}
              onClick={() => setDirection("up")}
              className={direction === "up" ? "bg-green-500 hover:bg-green-600" : ""}
              data-testid="btn-direction-up"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Price UP
            </Button>
            <Button
              type="button"
              variant={direction === "down" ? "default" : "outline"}
              onClick={() => setDirection("down")}
              className={direction === "down" ? "bg-red-500 hover:bg-red-600" : ""}
              data-testid="btn-direction-down"
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Price DOWN
            </Button>
          </div>
        </div>

        <Button
          onClick={handleCreateDuel}
          disabled={isPending || !stake || parseFloat(stake) <= 0}
          className="w-full"
          data-testid="btn-create-duel"
        >
          <Wallet className="h-4 w-4 mr-2" />
          {isPending ? "Creating..." : `Create Duel (${stake} BNB)`}
        </Button>
        
        {canUseOnChain ? (
          <p className="text-xs text-center text-green-600">
            <Wallet className="h-3 w-3 inline mr-1" />
            On-chain transaction (BSC Mainnet)
          </p>
        ) : !isBscMainnet ? (
          <p className="text-xs text-center text-amber-500">
            Switch to BSC Mainnet for wallet transactions
          </p>
        ) : !onChainAgentId ? (
          <p className="text-xs text-center text-muted-foreground">
            Register on-chain for wallet transactions
          </p>
        ) : (
          <p className="text-xs text-center text-muted-foreground">Database mode</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function Predict() {
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("open");
  const { address } = useAccount();
  const { toast } = useToast();
  const predictDuelAddress = usePredictDuelAddress();

  // Check if user has on-chain agent
  const { data: onChainAgentId } = useGetAgentByOwner(address as `0x${string}`);
  
  // Check if contract is deployed
  const isContractDeployed = predictDuelAddress && predictDuelAddress !== "0x0000000000000000000000000000000000000000";

  const { data: duels, isLoading } = useQuery<Duel[]>({
    queryKey: ["/api/duels", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/duels?status=${activeTab}&limit=50`);
      return res.json();
    },
    refetchInterval: 5000,
  });

  // On-chain join hook
  const { 
    joinDuel: joinDuelOnChain, 
    isPending: isJoiningOnChain, 
    isSuccess: joinSuccess, 
    error: joinError, 
    hash: joinHash 
  } = useJoinDuel();

  // Effect to handle on-chain join success
  useEffect(() => {
    if (joinSuccess && joinHash) {
      toast({ 
        title: "Joined duel on-chain!", 
        description: `Transaction: ${joinHash.slice(0, 10)}...` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/duels"] });
    }
  }, [joinSuccess, joinHash]);

  // Effect to handle on-chain join error
  useEffect(() => {
    if (joinError) {
      const errorMsg = joinError.message?.includes("user rejected") 
        ? "Transaction rejected by user"
        : joinError.message?.slice(0, 100) || "Failed to join duel";
      toast({ 
        title: "Transaction failed", 
        description: errorMsg, 
        variant: "destructive" 
      });
    }
  }, [joinError]);

  // Database fallback mutation
  const joinMutation = useMutation({
    mutationFn: async (duelId: string) => {
      return apiRequest("POST", `/api/duels/${duelId}/join`);
    },
    onSuccess: () => {
      toast({ title: "Joined duel!", description: "The duel is now live!" });
      queryClient.invalidateQueries({ queryKey: ["/api/duels"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to join", description: error.message, variant: "destructive" });
    },
  });

  const handleJoinDuel = async (duel: Duel) => {
    // For now use database API for joining (on-chain join requires matching on-chain duel ID)
    // TODO: Sync on-chain duel creation with database to enable on-chain joins
    joinMutation.mutate(duel.id);
  };

  return (
    <div className="container max-w-4xl py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Predict
          </h1>
          <p className="text-muted-foreground mt-1">
            1v1 price prediction duels. Winner takes 90% of the pot.
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} data-testid="btn-toggle-create">
          {showCreate ? "Hide Form" : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              New Duel
            </>
          )}
        </Button>
      </div>

      {showCreate && (
        <div className="mb-6">
          <CreateDuelForm onSuccess={() => setShowCreate(false)} />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="open" data-testid="tab-open">
            <Users className="h-4 w-4 mr-2" />
            Open
          </TabsTrigger>
          <TabsTrigger value="live" data-testid="tab-live">
            <Zap className="h-4 w-4 mr-2" />
            Live
          </TabsTrigger>
          <TabsTrigger value="settled" data-testid="tab-settled">
            <Trophy className="h-4 w-4 mr-2" />
            Settled
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-32" />
                </Card>
              ))}
            </div>
          ) : duels?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No {activeTab} duels yet</p>
                {activeTab === "open" && (
                  <Button onClick={() => setShowCreate(true)} className="mt-4" data-testid="btn-create-first">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Duel
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {duels?.map((duel) => (
                <DuelCard
                  key={duel.id}
                  duel={duel}
                  onJoin={activeTab === "open" ? () => handleJoinDuel(duel) : undefined}
                  isJoining={joinMutation.isPending || isJoiningOnChain}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
