import { useState, useEffect, useRef } from "react";
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
import { useI18n } from "@/lib/i18n";
import { 
  useCreateDuel, 
  useJoinDuel, 
  useSettleDuel,
  useCancelDuel,
  usePredictDuelAddress,
  useGetAgentByOwner,
  useRegisterAgent,
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
  Wallet,
  Loader2,
  XCircle
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
  const { t } = useI18n();

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

  if (timeLeft <= 0) return <span className="text-destructive font-bold">{t('duel.ended')}</span>;

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
          setError(data.message || "error.priceData");
        }
        setLoading(false);
      } catch (e) {
        console.error("Price history fetch error:", e);
        setError("error.priceFeed");
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

// TradingView Chart Component - Real Binance Charts
function TradingViewChart({ symbol, theme }: { symbol: string; theme: "light" | "dark" }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous widget
    if (containerRef.current.innerHTML) {
      containerRef.current.innerHTML = '';
    }

    // Map asset symbols to Binance trading pairs
    const binanceSymbol = `BINANCE:${symbol}USDT`;

    // Create TradingView widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).TradingView && containerRef.current) {
        widgetRef.current = new (window as any).TradingView.widget({
          autosize: true,
          symbol: binanceSymbol,
          interval: "1",
          timezone: "Etc/UTC",
          theme: theme,
          style: "1",
          locale: "en",
          toolbar_bg: "#f1f3f6",
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerRef.current.id,
          hide_side_toolbar: true,
          allow_symbol_change: false,
          details: false,
          hotlist: false,
          calendar: false,
          studies: [],
          show_popup_button: false,
          popup_width: "1000",
          popup_height: "650",
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol, theme]);

  const containerId = `tradingview_${symbol}_${Date.now()}`;

  return (
    <div 
      ref={containerRef}
      id={containerId}
      className="w-full h-[300px] rounded-lg overflow-hidden"
    />
  );
}

function LivePriceChart({ duel }: { duel: Duel }) {
  const { price, loading, error } = useBinancePrice(duel.assetId, duel.status === "live");
  const { t } = useI18n();
  const startPrice = duel.startPrice ? parseFloat(duel.startPrice) / 1e8 : null;
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  // Detect dark mode
  const isDarkMode = document.documentElement.classList.contains('dark');

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
      <div className="h-[350px] bg-muted/30 rounded-lg flex items-center justify-center">
        <span className="text-muted-foreground text-sm">{t('duel.loadingPrice')}</span>
      </div>
    );
  }
  
  if (error && !price) {
    return (
      <div className="h-[350px] bg-muted/30 rounded-lg flex items-center justify-center">
        <span className="text-red-500 text-sm">{error.startsWith('error.') ? t(error) : error}</span>
      </div>
    );
  }

  const currentPrice = price || 0;
  
  // If no start price, show waiting state with chart
  if (!startPrice) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">${currentPrice.toLocaleString(undefined, { maximumFractionDigits: currentPrice < 1 ? 6 : 2 })}</span>
            <Badge variant="outline">{t('duel.waitingOpponent')}</Badge>
          </div>
        </div>
        <TradingViewChart symbol={duel.assetId} theme={isDarkMode ? "dark" : "light"} />
        <div className="text-center text-muted-foreground text-sm">
          {t('duel.startPriceLocked')}
        </div>
      </div>
    );
  }

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold">${currentPrice.toLocaleString(undefined, { maximumFractionDigits: currentPrice < 1 ? 6 : 2 })}</span>
          <Badge className={isUp ? "bg-green-500" : "bg-red-500"}>
            {isUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {priceChangeFromStart >= 0 ? "+" : ""}{priceChangeFromStart.toFixed(3)}%
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-sm font-bold ${creatorWinning ? "text-green-500" : "text-red-500"}`}>
            {creatorWinning ? t('predict.creatorWinning') : t('predict.opponentWinning')}
          </div>
          <div className="flex items-center gap-1 bg-background/50 px-3 py-1 rounded-full">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-mono font-bold text-lg text-primary">{timerDisplay}</span>
          </div>
        </div>
      </div>

      {/* TradingView Chart - Real Binance Chart */}
      <TradingViewChart symbol={duel.assetId} theme={isDarkMode ? "dark" : "light"} />
      
      {/* Footer with start price */}
      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('predict.startPrice')}:</span>
          <span className="font-mono font-semibold">${startPrice.toLocaleString(undefined, { maximumFractionDigits: startPrice < 1 ? 6 : 2 })}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="font-semibold text-amber-500">TradingView</span>
          <span>• Binance</span>
        </div>
      </div>
    </div>
  );
}

function DuelCard({ duel, onJoin, onSettle, onCancel, onReclaim, isJoining, isSettling, isCancelling, isReclaiming }: { duel: Duel; onJoin?: () => void; onSettle?: () => void; onCancel?: () => void; onReclaim?: () => void; isJoining?: boolean; isSettling?: boolean; isCancelling?: boolean; isReclaiming?: boolean }) {
  const { address } = useAccount();
  const { t } = useI18n();
  const isCreator = address?.toLowerCase() === duel.creatorAddress.toLowerCase();
  const isJoiner = duel.joinerAddress && address?.toLowerCase() === duel.joinerAddress.toLowerCase();
  const canJoin = duel.status === "open" && !isCreator && address;
  
  // Check if duel has expired (can be settled)
  const [canSettle, setCanSettle] = useState(false);
  useEffect(() => {
    if (duel.status !== "live" || !duel.endTs) {
      setCanSettle(false);
      return;
    }
    const checkExpired = () => {
      const now = Date.now();
      const endTime = new Date(duel.endTs!).getTime();
      setCanSettle(now >= endTime);
    };
    checkExpired();
    const interval = setInterval(checkExpired, 1000);
    return () => clearInterval(interval);
  }, [duel.status, duel.endTs]);

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
              variant={duel.status === "open" ? "default" : duel.status === "live" ? "secondary" : duel.status === "cancelled" ? "destructive" : "outline"}
              className="uppercase"
            >
              {duel.status === "open" ? t('duel.waitingOpponent') : duel.status === "live" ? t('duel.liveNow') : duel.status === "cancelled" ? t('duel.cancelled') : t('duel.settled')}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-primary">{totalPot.toFixed(4)} BNB</div>
            <div className="text-xs text-muted-foreground">{t('duel.pot')} • {t('predict.winner')} {winnerTakes.toFixed(4)} BNB</div>
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
              {isCreator ? t('common.you') : t('duel.creator')}
            </div>
            <div className="font-mono text-xs mb-2">{creatorShort}</div>
            <div className={`flex items-center justify-center gap-1 font-bold text-lg ${
              duel.creatorDirection === "up" ? "text-green-500" : "text-red-500"
            }`}>
              {duel.creatorDirection === "up" ? (
                <>
                  <TrendingUp className="h-5 w-5" />
                  {t('predict.up')}
                </>
              ) : (
                <>
                  <TrendingDown className="h-5 w-5" />
                  {t('predict.down')}
                </>
              )}
            </div>
            <div className="text-xs mt-1 text-muted-foreground">
              {duel.assetId} {duel.creatorDirection === "up" ? t('predict.up') : t('predict.down')}
            </div>
          </div>

          {/* VS */}
          <div className="flex items-center justify-center">
            <div className="text-2xl font-black text-muted-foreground">{t('duel.vs')}</div>
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
                  {isJoiner ? t('common.you') : t('duel.opponent')}
                </div>
                <div className="font-mono text-xs mb-2">{joinerShort}</div>
                <div className={`flex items-center justify-center gap-1 font-bold text-lg ${
                  duel.joinerDirection === "up" ? "text-green-500" : "text-red-500"
                }`}>
                  {duel.joinerDirection === "up" ? (
                    <>
                      <TrendingUp className="h-5 w-5" />
                      {t('predict.up')}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-5 w-5" />
                      {t('predict.down')}
                    </>
                  )}
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  {duel.assetId} {duel.joinerDirection === "up" ? t('predict.up') : t('predict.down')}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-muted-foreground mb-1">{t('duel.opponent')}</div>
                <div className="font-mono text-xs mb-2 text-muted-foreground">{t('predict.waiting')}</div>
                <div className={`flex items-center justify-center gap-1 font-bold text-lg ${
                  duel.joinerDirection === "up" ? "text-green-500" : "text-red-500"
                }`}>
                  {duel.joinerDirection === "up" ? (
                    <>
                      <TrendingUp className="h-5 w-5" />
                      {t('predict.up')}
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-5 w-5" />
                      {t('predict.down')}
                    </>
                  )}
                </div>
                <div className="text-xs mt-1 text-muted-foreground">
                  {duel.assetId} {duel.joinerDirection === "up" ? t('predict.up') : t('predict.down')}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Timer & Duration */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {t('predict.duration')}: {formatDuration(duel.durationSec)}
          </div>
          {duel.status === "live" && duel.endTs && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('duel.timeRemaining')}:</span>
              <CountdownTimer endTs={new Date(duel.endTs)} />
            </div>
          )}
          {duel.status === "open" && (
            <div className="flex items-center gap-1 text-amber-500">
              <Clock className="h-4 w-4 animate-pulse" />
              <span className="text-xs">{t('predict.timerStartsOnJoin')}</span>
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
                <span className="text-muted-foreground">{t('predict.startPrice')}:</span>
                <span className="font-mono ml-2">{duel.startPrice ? formatPrice(duel.startPrice) : "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('predict.endPrice')}:</span>
                <span className="font-mono ml-2">{duel.endPrice ? formatPrice(duel.endPrice) : "-"}</span>
              </div>
            </div>
            {duel.winnerAddress && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-primary/10 rounded">
                <Trophy className="h-5 w-5 text-primary" />
                <span className="font-bold text-primary">
                  {t('predict.winner')}: {duel.winnerAddress.slice(0, 6)}...{duel.winnerAddress.slice(-4)}
                </span>
                <span className="text-sm text-muted-foreground ml-auto">
                  {t('predict.youWon')} {winnerTakes.toFixed(4)} BNB
                </span>
              </div>
            )}
            {!duel.winnerAddress && (
              <div className="text-sm text-muted-foreground mt-3 text-center">
                {t('predict.draw')}
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
              {isJoining ? t('predict.confirmInWallet') : (
                <>
                  {t('predict.join')} {duel.joinerDirection === "up" ? t('predict.up') : t('predict.down')} ({duel.stakeDisplay})
                </>
              )}
            </Button>
          )}
          {isCreator && duel.status === "open" && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="py-2 px-4">
                <Clock className="h-3 w-3 mr-1" />
                {t('predict.waitingForOpponent')}
              </Badge>
              {onCancel && isCreator && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={onCancel}
                  disabled={isCancelling}
                  data-testid={`cancel-duel-${duel.id}`}
                >
                  {isCancelling ? t('predict.cancelling') : t('predict.cancelBet')}
                </Button>
              )}
            </div>
          )}
          {/* Settle button for expired live duels */}
          {duel.status === "live" && canSettle && onSettle && (
            <Button 
              onClick={onSettle} 
              disabled={isSettling}
              className="gap-2"
              data-testid={`button-settle-${duel.id}`}
            >
              {isSettling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('predict.settling') || 'Settling...'}
                </>
              ) : (
                <>
                  <Trophy className="h-4 w-4" />
                  {t('predict.settle') || 'Settle & Claim'}
                </>
              )}
            </Button>
          )}
          {(isCreator || isJoiner) && duel.status === "settled" && duel.winnerAddress?.toLowerCase() === address?.toLowerCase() && (
            <Badge className="bg-primary text-primary-foreground py-2 px-4">
              <Trophy className="h-4 w-4 mr-1" />
              {t('predict.youWon')} {winnerTakes.toFixed(4)} BNB!
            </Badge>
          )}
          {(isCreator || isJoiner) && duel.status === "settled" && duel.winnerAddress && duel.winnerAddress?.toLowerCase() !== address?.toLowerCase() && (
            <Badge variant="outline" className="py-2 px-4">
              {t('predict.youLost')}
            </Badge>
          )}
          {/* Reclaim stake button for cancelled duels - hide for old duels with invalid onChainDuelId */}
          {isCreator && duel.status === "cancelled" && !duel.settlementTxHash && onReclaim && duel.onChainDuelId && duel.onChainDuelId !== "1" && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="py-2 px-4">
                {t('duel.stakeReclaimable')}
              </Badge>
              <Button 
                variant="default" 
                size="sm"
                onClick={onReclaim}
                disabled={isReclaiming}
                data-testid={`reclaim-stake-${duel.id}`}
              >
                {isReclaiming ? t('duel.reclaimingStake') : t('duel.reclaimStake')}
              </Button>
            </div>
          )}
          {/* Old cancelled duels with invalid ID - written off */}
          {isCreator && duel.status === "cancelled" && !duel.settlementTxHash && (!duel.onChainDuelId || duel.onChainDuelId === "1") && (
            <Badge variant="outline" className="py-2 px-4 text-muted-foreground">
              {t('duel.cancelled')}
            </Badge>
          )}
          {/* Already reclaimed */}
          {isCreator && duel.status === "cancelled" && duel.settlementTxHash && (
            <Badge variant="outline" className="py-2 px-4 text-muted-foreground">
              {t('duel.stakeReclaimed')}
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
  const { t } = useI18n();
  const predictDuelAddress = usePredictDuelAddress();

  const [assetId, setAssetId] = useState("BNB");
  const [duration, setDuration] = useState("60");
  const [stake, setStake] = useState("0.01");
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [authError, setAuthError] = useState<string | null>(null);

  const { data: assets } = useQuery<DuelAsset[]>({
    queryKey: ["/api/duels/assets"],
  });

  // Check if user has on-chain agent (for auto-registration)
  const { data: onChainAgentId, refetch: refetchAgentId } = useGetAgentByOwner(address as `0x${string}`);
  const hasAgent = onChainAgentId && onChainAgentId > BigInt(0);
  
  // Auto-registration hook
  const {
    registerAgent,
    isPending: isRegistering,
    isSuccess: registerSuccess,
    error: registerError,
    hash: registerHash
  } = useRegisterAgent();

  // On-chain contract hook
  const { 
    createDuel: createDuelOnChain, 
    isPending: isCreatingOnChain, 
    isSuccess: createSuccess, 
    error: createError, 
    hash: createHash,
    receipt: createReceipt
  } = useCreateDuel();

  // Track if we're waiting to create duel after registration
  const [pendingDuelAfterRegister, setPendingDuelAfterRegister] = useState(false);

  // Check if contract is deployed on current chain and we're on BSC mainnet
  const isContractDeployed = predictDuelAddress && predictDuelAddress !== "0x0000000000000000000000000000000000000000";
  const isBscMainnet = chainId === 56;
  const canUseOnChain = isContractDeployed && isBscMainnet && address;

  // Mutation to sync on-chain creation with database
  const syncCreateMutation = useMutation({
    mutationFn: async (params: { 
      onChainDuelId: string; 
      txHash: string;
      assetId: string;
      assetName: string;
      durationSec: string;
      stakeWei: string;
      stakeDisplay: string;
      creatorOnChainAgentId: string;
      direction: string;
    }) => {
      return apiRequest("POST", "/api/duels/sync-create", params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/duels"] });
    },
  });

  // Effect to handle on-chain success - sync with database
  useEffect(() => {
    if (createSuccess && createHash && createReceipt) {
      // Parse the DuelCreated event from transaction logs to get the actual duel ID
      // DuelCreated event signature: DuelCreated(uint256 indexed duelId, uint256 indexed creatorAgentId, address indexed creator, ...)
      // The first topic (topic[0]) is the event signature hash
      // The second topic (topic[1]) is the indexed duelId
      let onChainDuelId = "1"; // fallback
      
      try {
        // Find the DuelCreated event in the logs
        // Event signature hash for DuelCreated(uint256,uint256,address,string,uint8,uint256,uint256,uint256)
        const duelCreatedEventSignature = "0x"; // We'll match by checking logs from contract
        
        for (const log of createReceipt.logs) {
          // The log should have at least 4 topics for indexed params
          if (log.topics && log.topics.length >= 2) {
            // The duelId is the second topic (first indexed param)
            // Topics[0] = event signature, Topics[1] = duelId (indexed), Topics[2] = creatorAgentId (indexed), Topics[3] = creator (indexed)
            const duelIdHex = log.topics[1];
            if (duelIdHex) {
              // Parse the hex value to get the duel ID
              const parsedId = BigInt(duelIdHex).toString();
              if (parsedId !== "0") {
                onChainDuelId = parsedId;
                break;
              }
            }
          }
        }
      } catch (e) {
        console.error("Error parsing DuelCreated event:", e);
      }
      
      toast({ 
        title: "Duel created on-chain!", 
        description: `BNB sent to escrow. Transaction: ${createHash.slice(0, 10)}...` 
      });
      
      const asset = assets?.find(a => a.assetId === assetId);
      syncCreateMutation.mutate({
        onChainDuelId,
        txHash: createHash,
        assetId,
        assetName: asset?.name || assetId,
        durationSec: duration,
        stakeWei: (parseFloat(stake) * 1e18).toString(),
        stakeDisplay: `${stake} BNB`,
        creatorOnChainAgentId: onChainAgentId?.toString() || "0",
        direction,
      });
      
      onSuccess();
    }
  }, [createSuccess, createHash, createReceipt]);

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

  // Effect to handle registration success - then create duel
  useEffect(() => {
    if (registerSuccess && pendingDuelAfterRegister) {
      toast({ title: "Registered!", description: "Now creating your duel..." });
      // Refetch agent ID then create duel
      refetchAgentId().then((result) => {
        if (result.data && result.data > BigInt(0)) {
          const stakeWei = parseEther(stake);
          const directionNum = direction === "up" ? 0 : 1;
          createDuelOnChain(
            result.data,
            assetId,
            directionNum as 0 | 1,
            BigInt(parseInt(duration)),
            stakeWei
          );
        }
        setPendingDuelAfterRegister(false);
      });
    }
  }, [registerSuccess, pendingDuelAfterRegister]);

  // Effect to handle registration error
  useEffect(() => {
    if (registerError) {
      const errorMsg = registerError.message?.includes("user rejected") 
        ? "Registration cancelled"
        : registerError.message?.slice(0, 100) || "Failed to register";
      toast({ 
        title: "Registration failed", 
        description: errorMsg, 
        variant: "destructive" 
      });
      setPendingDuelAfterRegister(false);
    }
  }, [registerError]);

  const handleCreateDuel = () => {
    if (!canUseOnChain) return;
    
    const stakeNum = parseFloat(stake);
    if (isNaN(stakeNum) || stakeNum < 0.01 || stakeNum > 100000) {
      toast({ title: t('common.error'), description: t('predict.stakeRangeError'), variant: "destructive" });
      return;
    }
    
    try {
      // If user doesn't have an agent, auto-register first
      if (!hasAgent) {
        toast({ title: "Registering...", description: "First time betting - registering your wallet..." });
        setPendingDuelAfterRegister(true);
        // Register with minimal valid CID (empty JSON object stored on IPFS)
        // Using well-known CID for empty object: bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku
        registerAgent("bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku");
        return;
      }
      
      // User has agent, create duel directly
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
  };
  
  const isPending = isCreatingOnChain || isRegistering;

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
            step="0.01"
            min="0.01"
            max="100000"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            placeholder="0.01"
            data-testid="input-stake"
          />
          <p className="text-xs text-muted-foreground">
            {t('predict.stakeRange')} | {t('predict.winnerTakes90')}
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

        {canUseOnChain ? (
          <>
            <Button
              onClick={handleCreateDuel}
              disabled={isPending || !stake || parseFloat(stake) <= 0}
              className="w-full"
              data-testid="btn-create-duel"
            >
              <Wallet className="h-4 w-4 mr-2" />
              {isPending ? t('predict.confirmInWallet') : `${t('predict.createDuel')} (${stake} BNB)`}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {t('predict.onChainTransaction')}
            </p>
          </>
        ) : !isBscMainnet ? (
          <div className="space-y-2">
            <Button disabled className="w-full opacity-50">
              <Wallet className="h-4 w-4 mr-2" />
              {t('predict.createDuel')} ({stake} BNB)
            </Button>
            <p className="text-sm text-center text-amber-500 font-medium">
              {t('predict.switchToBsc')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Button disabled className="w-full opacity-50">
              <Wallet className="h-4 w-4 mr-2" />
              {t('predict.createDuel')} ({stake} BNB)
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              {t('common.connectWallet')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Predict() {
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("open");
  const { address } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast();
  const { t } = useI18n();
  const predictDuelAddress = usePredictDuelAddress();
  
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

  // On-chain settle hook
  const { 
    settleDuel: settleDuelOnChain, 
    isPending: isSettlingOnChain, 
    isSuccess: settleSuccess, 
    error: settleError, 
    hash: settleHash 
  } = useSettleDuel();

  // On-chain cancel hook
  const { 
    cancelDuel: cancelDuelOnChain, 
    isPending: isCancellingOnChain, 
    isSuccess: cancelSuccess, 
    error: cancelError, 
    hash: cancelHash 
  } = useCancelDuel();

  // Track which duel we're settling
  const [settlingDuelId, setSettlingDuelId] = useState<string | null>(null);

  // Track which duel we're cancelling
  const [cancellingDuelId, setCancellingDuelId] = useState<string | null>(null);

  // Track which duel we're reclaiming stake from (cancelled duels)
  const [reclaimingDuelId, setReclaimingDuelId] = useState<string | null>(null);

  // Track which duel we're joining for sync
  const [joiningDuelId, setJoiningDuelId] = useState<string | null>(null);

  // Mutation to sync on-chain join with database
  const syncJoinMutation = useMutation({
    mutationFn: async (params: { duelId: string; txHash: string; joinerOnChainAgentId: string }) => {
      return apiRequest("POST", `/api/duels/${params.duelId}/sync-join`, {
        txHash: params.txHash,
        joinerOnChainAgentId: params.joinerOnChainAgentId,
      });
    },
    onSuccess: () => {
      toast({ title: "Joined duel!", description: "BNB sent to escrow. The duel is now live!" });
      queryClient.invalidateQueries({ queryKey: ["/api/duels"] });
      setJoiningDuelId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to sync join", description: error.message, variant: "destructive" });
      setJoiningDuelId(null);
    },
  });

  // Effect to handle on-chain join success
  useEffect(() => {
    if (joinSuccess && joinHash && joiningDuelId) {
      // Sync with database after successful on-chain join
      syncJoinMutation.mutate({
        duelId: joiningDuelId,
        txHash: joinHash,
        joinerOnChainAgentId: userOnChainAgentId?.toString() || "0",
      });
    }
  }, [joinSuccess, joinHash, joiningDuelId]);

  // Effect to handle on-chain join error
  useEffect(() => {
    if (joinError) {
      let errorMsg = "Failed to join duel";
      const msg = joinError.message || "";
      
      if (msg.includes("user rejected") || msg.includes("User denied")) {
        errorMsg = "Transaction rejected by user";
      } else if (msg.includes("CannotjoinOwnDuel") || msg.includes("CannotJoinOwnDuel")) {
        errorMsg = "You cannot join your own bet";
      } else if (msg.includes("DuelNotOpen") || msg.includes("NotOpen")) {
        errorMsg = "This bet is no longer available (already joined or cancelled)";
      } else if (msg.includes("insufficient funds") || msg.includes("InsufficientFunds")) {
        errorMsg = "Insufficient BNB balance for stake + gas fees";
      } else if (msg.includes("InvalidAgent") || msg.includes("AgentNotRegistered")) {
        errorMsg = "You need to register first - please try again";
      } else if (msg.includes("InvalidDuelId")) {
        errorMsg = "This bet does not exist on-chain";
      } else if (msg.includes("execution reverted")) {
        errorMsg = "Transaction failed - bet may no longer be available";
      } else {
        errorMsg = msg.slice(0, 100) || "Unknown error occurred";
      }
      
      toast({ 
        title: "Transaction failed", 
        description: errorMsg, 
        variant: "destructive" 
      });
      setJoiningDuelId(null);
    }
  }, [joinError]);

  // Mutation to sync settlement with database
  const syncSettleMutation = useMutation({
    mutationFn: async (params: { duelId: string; txHash: string }) => {
      return apiRequest("POST", `/api/duels/${params.duelId}/sync-settle`, {
        txHash: params.txHash,
      });
    },
    onSuccess: () => {
      toast({ title: t('predict.settled') || "Bet Settled!", description: t('predict.payoutSent') || "Payout sent to winner (90%), fee sent to treasury (10%)" });
      queryClient.invalidateQueries({ queryKey: ["/api/duels"] });
      setSettlingDuelId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to sync settlement", description: error.message, variant: "destructive" });
      setSettlingDuelId(null);
    },
  });

  // Effect to handle settlement success
  useEffect(() => {
    if (settleSuccess && settleHash && settlingDuelId) {
      syncSettleMutation.mutate({
        duelId: settlingDuelId,
        txHash: settleHash,
      });
    }
  }, [settleSuccess, settleHash, settlingDuelId]);

  // Effect to handle settlement error
  useEffect(() => {
    if (settleError) {
      const msg = settleError.message || "";
      let errorMsg = "Failed to settle bet";
      
      if (msg.includes("user rejected")) {
        errorMsg = "Transaction rejected by user";
      } else if (msg.includes("DuelNotLive") || msg.includes("NotLive")) {
        errorMsg = "Bet is not live or already settled";
      } else if (msg.includes("TooEarly") || msg.includes("DurationNotExpired")) {
        errorMsg = "Bet duration has not expired yet";
      } else {
        errorMsg = msg.slice(0, 100) || "Unknown error";
      }
      
      toast({ title: "Settlement failed", description: errorMsg, variant: "destructive" });
      setSettlingDuelId(null);
    }
  }, [settleError]);

  // Mutation to sync cancel with database
  const syncCancelMutation = useMutation({
    mutationFn: async (params: { duelId: string; txHash: string }) => {
      return apiRequest("POST", `/api/duels/${params.duelId}/sync-cancel`, {
        txHash: params.txHash,
      });
    },
    onSuccess: () => {
      toast({ title: t('predict.cancelled'), description: t('predict.cancelledDesc') });
      queryClient.invalidateQueries({ queryKey: ["/api/duels"] });
      setCancellingDuelId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to sync cancellation", description: error.message, variant: "destructive" });
      setCancellingDuelId(null);
    },
  });

  // Mutation to sync stake reclaim with database
  const syncReclaimMutation = useMutation({
    mutationFn: async (params: { duelId: string; txHash: string }) => {
      return apiRequest("POST", `/api/duels/${params.duelId}/sync-reclaim`, {
        txHash: params.txHash,
      });
    },
    onSuccess: () => {
      toast({ title: t('duel.reclaimStake'), description: t('duel.stakeReclaimed') });
      queryClient.invalidateQueries({ queryKey: ["/api/duels"] });
      setReclaimingDuelId(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to sync reclaim", description: error.message, variant: "destructive" });
      setReclaimingDuelId(null);
    },
  });

  // Effect to handle cancel/reclaim success
  // Priority: reclaim takes precedence since we clear state on initiation
  useEffect(() => {
    if (cancelSuccess && cancelHash) {
      // Check if this is a reclaim (already cancelled) or a normal cancel (was open)
      // Only one of these should be set at a time due to mutual exclusion
      if (reclaimingDuelId) {
        syncReclaimMutation.mutate({
          duelId: reclaimingDuelId,
          txHash: cancelHash,
        });
        // Mutation onSuccess will clear reclaimingDuelId
      } else if (cancellingDuelId) {
        syncCancelMutation.mutate({
          duelId: cancellingDuelId,
          txHash: cancelHash,
        });
        // Mutation onSuccess will clear cancellingDuelId
      }
    }
  }, [cancelSuccess, cancelHash, cancellingDuelId, reclaimingDuelId]);

  // Effect to handle cancel error
  useEffect(() => {
    if (cancelError) {
      const msg = cancelError.message || "";
      let errorMsg = "Failed to cancel bet";
      
      if (msg.includes("user rejected")) {
        errorMsg = "Transaction rejected by user";
      } else if (msg.includes("NotOpen") || msg.includes("DuelNotOpen")) {
        errorMsg = "Bet can only be cancelled when open (before opponent joins)";
      } else if (msg.includes("NotCreator")) {
        errorMsg = "Only the creator can cancel this bet";
      } else {
        errorMsg = msg.slice(0, 100) || "Unknown error";
      }
      
      toast({ title: "Cancel failed", description: errorMsg, variant: "destructive" });
      setCancellingDuelId(null);
      setReclaimingDuelId(null);
    }
  }, [cancelError]);

  // Database fallback mutation (for duels without on-chain ID)
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

  // Check if user has on-chain agent for joining
  const { data: userOnChainAgentId, refetch: refetchJoinerAgentId } = useGetAgentByOwner(address as `0x${string}`);
  const joinerHasAgent = userOnChainAgentId && userOnChainAgentId > BigInt(0);
  
  // Auto-registration hook for joining
  const {
    registerAgent: registerJoinerAgent,
    isPending: isRegisteringJoiner,
    isSuccess: joinerRegisterSuccess,
    error: joinerRegisterError
  } = useRegisterAgent();

  // Track pending join after registration
  const [pendingJoinDuel, setPendingJoinDuel] = useState<Duel | null>(null);

  // Simplified: only require wallet + BSC + contract for joining
  const joinPredictDuelAddress = usePredictDuelAddress();
  const isJoinContractDeployed = joinPredictDuelAddress && joinPredictDuelAddress !== "0x0000000000000000000000000000000000000000";
  const canUseOnChainJoin = isJoinContractDeployed && chainId === 56 && address;

  // Effect to handle joiner registration success
  useEffect(() => {
    if (joinerRegisterSuccess && pendingJoinDuel) {
      toast({ title: "Registered!", description: "Now joining the duel..." });
      refetchJoinerAgentId().then(async (result) => {
        if (result.data && result.data > BigInt(0) && pendingJoinDuel.onChainDuelId) {
          const priceRes = await fetch(`/api/duels/binance/ticker/${pendingJoinDuel.assetId}`);
          const priceData = await priceRes.json();
          const price = priceData?.price;
          if (!price || isNaN(price)) {
            toast({ title: "Price fetch failed", description: "Could not get current price", variant: "destructive" });
            setPendingJoinDuel(null);
            setJoiningDuelId(null);
            return;
          }
          const startPriceWei = BigInt(Math.floor(price * 1e8));
          const stakeMatch = pendingJoinDuel.stakeDisplay?.match(/^([\d.]+)/);
          const stakeWei = stakeMatch ? parseEther(stakeMatch[1]) : parseEther("0.01");
          
          joinDuelOnChain(
            BigInt(pendingJoinDuel.onChainDuelId.toString()),
            result.data,
            startPriceWei,
            stakeWei
          );
        }
        setPendingJoinDuel(null);
      });
    }
  }, [joinerRegisterSuccess, pendingJoinDuel]);

  // Effect to handle joiner registration error
  useEffect(() => {
    if (joinerRegisterError) {
      toast({ 
        title: "Registration failed", 
        description: joinerRegisterError.message?.slice(0, 100) || "Failed to register",
        variant: "destructive" 
      });
      setPendingJoinDuel(null);
      setJoiningDuelId(null);
    }
  }, [joinerRegisterError]);

  // Handle settling a duel
  const handleSettle = async (duel: Duel) => {
    if (!canUseOnChainJoin) {
      toast({ 
        title: t('common.connectWallet'), 
        description: t('predict.switchToBsc'),
        variant: "destructive" 
      });
      return;
    }
    
    if (!duel.onChainDuelId) {
      toast({ title: "Error", description: "This bet cannot be settled on-chain", variant: "destructive" });
      return;
    }
    
    try {
      setSettlingDuelId(duel.id);
      
      // Fetch current price for end price with retry
      let price: number | null = null;
      let retryCount = 3;
      
      while (retryCount > 0 && price === null) {
        try {
          const priceRes = await fetch(`/api/duels/binance/ticker/${duel.assetId}`);
          if (priceRes.ok) {
            const priceData = await priceRes.json();
            if (priceData?.price && !isNaN(priceData.price)) {
              price = priceData.price;
            }
          }
        } catch (e) {
          console.error("Price fetch attempt failed:", e);
        }
        if (price === null) {
          retryCount--;
          if (retryCount > 0) {
            await new Promise(r => setTimeout(r, 1500)); // Wait 1.5s between retries
          }
        }
      }
      
      if (!price) {
        toast({ title: "Price fetch failed", description: "Could not get current price. Please try again in a few seconds.", variant: "destructive" });
        setSettlingDuelId(null);
        return;
      }
      
      const endPriceWei = BigInt(Math.floor(price * 1e8));
      
      settleDuelOnChain(
        BigInt(duel.onChainDuelId.toString()),
        endPriceWei
      );
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setSettlingDuelId(null);
    }
  };

  // Handle cancelling a duel (only for open duels by creator)
  const handleCancelDuel = async (duel: Duel) => {
    if (!canUseOnChainJoin) {
      toast({ 
        title: t('common.connectWallet'), 
        description: t('predict.switchToBsc'),
        variant: "destructive" 
      });
      return;
    }
    
    if (!duel.onChainDuelId) {
      toast({ title: "Error", description: "This bet cannot be cancelled on-chain", variant: "destructive" });
      return;
    }
    
    if (duel.status !== "open") {
      toast({ title: "Error", description: "Only open bets can be cancelled", variant: "destructive" });
      return;
    }
    
    try {
      setCancellingDuelId(duel.id);
      setReclaimingDuelId(null); // Clear reclaim state to ensure mutual exclusion
      cancelDuelOnChain(BigInt(duel.onChainDuelId.toString()));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setCancellingDuelId(null);
    }
  };

  // Handle reclaiming stake from cancelled duels
  const handleReclaimStake = async (duel: Duel) => {
    if (!canUseOnChainJoin) {
      toast({ 
        title: t('common.connectWallet'), 
        description: t('predict.switchToBsc'),
        variant: "destructive" 
      });
      return;
    }
    
    if (!duel.onChainDuelId) {
      toast({ title: "Error", description: "This bet cannot be reclaimed on-chain", variant: "destructive" });
      return;
    }
    
    if (duel.status !== "cancelled") {
      toast({ title: "Error", description: "Only cancelled bets can be reclaimed", variant: "destructive" });
      return;
    }
    
    try {
      setReclaimingDuelId(duel.id);
      setCancellingDuelId(null); // Clear cancel state to ensure mutual exclusion
      // Use the cancel function on-chain to reclaim the stake
      cancelDuelOnChain(BigInt(duel.onChainDuelId.toString()));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setReclaimingDuelId(null);
    }
  };

  const handleJoinDuel = async (duel: Duel) => {
    // Require wallet + BSC mainnet
    if (!canUseOnChainJoin) {
      toast({ 
        title: t('common.connectWallet'), 
        description: t('predict.switchToBsc'),
        variant: "destructive" 
      });
      return;
    }
    
    // Prevent joining own duel
    if (address && duel.creatorAddress?.toLowerCase() === address.toLowerCase()) {
      toast({ 
        title: t('predict.cannotJoinOwn') || "Cannot join your own bet", 
        description: t('predict.cannotJoinOwnDesc') || "You created this bet. Wait for another user to join.",
        variant: "destructive" 
      });
      return;
    }
    
    // Use on-chain if duel has on-chain ID
    if (duel.onChainDuelId) {
      try {
        setJoiningDuelId(duel.id);
        
        // If user doesn't have an agent, auto-register first
        if (!joinerHasAgent) {
          toast({ title: "Registering...", description: "First time betting - registering your wallet..." });
          setPendingJoinDuel(duel);
          // Register with minimal valid CID (empty JSON object stored on IPFS)
          registerJoinerAgent("bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku");
          return;
        }
        
        // Fetch current price for start price
        const priceRes = await fetch(`/api/duels/binance/ticker/${duel.assetId}`);
        const priceData = await priceRes.json();
        const price = priceData?.price;
        if (!price || isNaN(price)) {
          toast({ title: "Price fetch failed", description: "Could not get current price. Please try again.", variant: "destructive" });
          setJoiningDuelId(null);
          return;
        }
        const startPriceWei = BigInt(Math.floor(price * 1e8));
        
        // Parse stake from display (e.g., "0.01 BNB" -> wei)
        const stakeMatch = duel.stakeDisplay?.match(/^([\d.]+)/);
        const stakeWei = stakeMatch ? parseEther(stakeMatch[1]) : parseEther("0.01");
        
        joinDuelOnChain(
          BigInt(duel.onChainDuelId.toString()),
          userOnChainAgentId!,
          startPriceWei,
          stakeWei
        );
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        setJoiningDuelId(null);
      }
    } else {
      // Duel doesn't have on-chain ID - shouldn't happen for real duels
      toast({ 
        title: t('common.error'), 
        description: "This duel is not available for on-chain betting",
        variant: "destructive" 
      });
    }
  };

  return (
    <div className="container max-w-4xl py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            {t('predict.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('predict.description')}
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} data-testid="btn-toggle-create">
          {showCreate ? t('predict.hideDuel') : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              {t('predict.newDuel')}
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
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="open" data-testid="tab-open">
            <Users className="h-4 w-4 mr-2" />
            {t('predict.openDuels')}
          </TabsTrigger>
          <TabsTrigger value="live" data-testid="tab-live">
            <Zap className="h-4 w-4 mr-2" />
            {t('predict.liveDuels')}
          </TabsTrigger>
          <TabsTrigger value="settled" data-testid="tab-settled">
            <Trophy className="h-4 w-4 mr-2" />
            {t('predict.settledDuels')}
          </TabsTrigger>
          <TabsTrigger value="cancelled" data-testid="tab-cancelled">
            <XCircle className="h-4 w-4 mr-2" />
            {t('duel.cancelled')}
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
                  onSettle={activeTab === "live" ? () => handleSettle(duel) : undefined}
                  onCancel={activeTab === "open" ? () => handleCancelDuel(duel) : undefined}
                  onReclaim={activeTab === "cancelled" ? () => handleReclaimStake(duel) : undefined}
                  isJoining={joinMutation.isPending || isJoiningOnChain}
                  isSettling={isSettlingOnChain || syncSettleMutation.isPending}
                  isCancelling={isCancellingOnChain || syncCancelMutation.isPending}
                  isReclaiming={reclaimingDuelId === duel.id && (isCancellingOnChain || syncReclaimMutation.isPending)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
