import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  ArrowLeft, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown,
  Users,
  Loader2,
  AlertCircle,
  Rocket,
  Copy,
  Check
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { 
  useBondingCurveMarketAddress,
  useGetMarketState,
  useQuoteBuy,
  useQuoteSell,
  useBuyTokens,
  useSellTokens,
  useTokenBalance,
  useApproveToken,
  useTokenAllowance,
} from "@/contracts/hooks";
import type { LaunchToken, LaunchTrade } from "@shared/schema";

interface TokenDetailResponse {
  token: LaunchToken;
  trades: LaunchTrade[];
}

export default function LaunchDetail() {
  const [, params] = useRoute("/launch/:address");
  const tokenAddress = params?.address as `0x${string}` | undefined;
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { address: userAddress } = useAccount();
  const marketAddress = useBondingCurveMarketAddress();
  
  const [tradeTab, setTradeTab] = useState<"buy" | "sell">("buy");
  const [buyAmount, setBuyAmount] = useState("");
  const [sellAmount, setSellAmount] = useState("");
  const [copied, setCopied] = useState(false);
  const [lastTradeInfo, setLastTradeInfo] = useState<{ isBuy: boolean; nativeAmount: string; tokenAmount: string } | null>(null);

  const { data, isLoading, error, refetch } = useQuery<TokenDetailResponse>({
    queryKey: ["/api/launch/tokens", tokenAddress],
    queryFn: async () => {
      const res = await fetch(`/api/launch/tokens/${tokenAddress}`);
      if (!res.ok) throw new Error("Failed to fetch token");
      return res.json();
    },
    enabled: !!tokenAddress,
  });

  const { data: marketState, refetch: refetchMarket } = useGetMarketState(tokenAddress);
  const { data: tokenBalance, refetch: refetchBalance } = useTokenBalance(tokenAddress, userAddress);
  const { data: allowance } = useTokenAllowance(tokenAddress, userAddress, marketAddress);
  
  const buyAmountWei = buyAmount ? parseEther(buyAmount) : BigInt(0);
  const sellAmountWei = sellAmount ? parseEther(sellAmount) : BigInt(0);
  
  const { data: buyQuote } = useQuoteBuy(tokenAddress, buyAmountWei > BigInt(0) ? buyAmountWei : undefined);
  const { data: sellQuote } = useQuoteSell(tokenAddress, sellAmountWei > BigInt(0) ? sellAmountWei : undefined);

  const { buy, isPending: isBuying, isSuccess: buySuccess, error: buyError, hash: buyHash } = useBuyTokens();
  const { sell, isPending: isSelling, isSuccess: sellSuccess, error: sellError, hash: sellHash } = useSellTokens();
  const { approve, isPending: isApproving, isSuccess: approveSuccess } = useApproveToken();

  const needsApproval = tradeTab === "sell" && sellAmountWei > BigInt(0) && allowance !== undefined && sellAmountWei > allowance;

  useEffect(() => {
    const recordAndRefresh = async () => {
      if ((buySuccess || sellSuccess) && tokenAddress && userAddress && lastTradeInfo) {
        try {
          await apiRequest("POST", "/api/launch/trades", {
            tokenAddress,
            trader: userAddress,
            isBuy: lastTradeInfo.isBuy,
            nativeAmount: lastTradeInfo.nativeAmount,
            tokenAmount: lastTradeInfo.tokenAmount,
            feeNative: "0",
            priceAfter: "0",
            txHash: buyHash || sellHash || null,
          });
        } catch (error) {
          console.error("Failed to record trade:", error);
        }
        
        toast({
          title: "Trade successful!",
          description: buySuccess ? "Tokens purchased successfully." : "Tokens sold successfully.",
        });
        setBuyAmount("");
        setSellAmount("");
        setLastTradeInfo(null);
        refetch();
        refetchMarket();
        refetchBalance();
        queryClient.invalidateQueries({ queryKey: ["/api/launch/tokens", tokenAddress] });
      }
    };
    
    recordAndRefresh();
  }, [buySuccess, sellSuccess, buyHash, sellHash, tokenAddress, userAddress, lastTradeInfo, toast, refetch, refetchMarket, refetchBalance]);

  useEffect(() => {
    if (buyError || sellError) {
      toast({
        title: "Trade failed",
        description: (buyError || sellError)?.message || "Transaction failed.",
        variant: "destructive",
      });
    }
  }, [buyError, sellError, toast]);

  useEffect(() => {
    if (approveSuccess) {
      toast({
        title: "Approval successful",
        description: "You can now sell tokens.",
      });
    }
  }, [approveSuccess, toast]);

  const handleBuy = () => {
    if (!tokenAddress || buyAmountWei <= BigInt(0)) return;
    
    const quoteValue = buyQuote as readonly [bigint, bigint] | undefined;
    const minOut = quoteValue ? (quoteValue[0] * BigInt(95)) / BigInt(100) : BigInt(0);
    const estimatedTokens = quoteValue ? quoteValue[0].toString() : "0";
    
    setLastTradeInfo({
      isBuy: true,
      nativeAmount: buyAmountWei.toString(),
      tokenAmount: estimatedTokens,
    });
    
    buy(tokenAddress, minOut, buyAmountWei);
  };

  const handleSell = () => {
    if (!tokenAddress || sellAmountWei <= BigInt(0) || !marketAddress) return;
    
    if (needsApproval) {
      approve(tokenAddress, marketAddress, sellAmountWei);
      return;
    }
    
    const quoteValue = sellQuote as readonly [bigint, bigint] | undefined;
    const minOut = quoteValue ? (quoteValue[0] * BigInt(95)) / BigInt(100) : BigInt(0);
    const estimatedNative = quoteValue ? quoteValue[0].toString() : "0";
    
    setLastTradeInfo({
      isBuy: false,
      nativeAmount: estimatedNative,
      tokenAmount: sellAmountWei.toString(),
    });
    
    sell(tokenAddress, sellAmountWei, minOut);
  };

  const copyAddress = () => {
    if (tokenAddress) {
      navigator.clipboard.writeText(tokenAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-12 rounded-full mb-4" />
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-1/2 mb-4" />
              <Skeleton className="h-10 w-full mb-2" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/launch">
          <Button variant="ghost" className="gap-2 mb-6" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Launchpad
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-6 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Token not found or failed to load.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { token, trades } = data;
  const graduationThreshold = BigInt("10000000000000000000");
  const totalRaised = BigInt(token.totalRaisedNative || "0");
  const progress = graduationThreshold > BigInt(0) 
    ? Number((totalRaised * BigInt(100)) / graduationThreshold)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/launch">
        <Button variant="ghost" className="gap-2 mb-6" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back to Launchpad
        </Button>
      </Link>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                {token.imageUrl ? (
                  <img 
                    src={token.imageUrl} 
                    alt={token.name} 
                    className="w-16 h-16 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-xl">
                      {token.symbol.slice(0, 2)}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className="text-2xl font-bold">{token.name}</h1>
                    {token.graduated && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        Graduated
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground font-mono">${token.symbol}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono flex-1 truncate">
                  {tokenAddress}
                </code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={copyAddress}
                  data-testid="button-copy-address"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              {token.description && (
                <p className="text-muted-foreground mb-4">{token.description}</p>
              )}

              {!token.graduated && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Progress to graduation</span>
                    <span>{formatEther(totalRaised)} / 10 BNB</span>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-3" />
                </div>
              )}

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{token.tradeCount} trades</span>
                </div>
                <div>
                  Created {formatDistanceToNow(new Date(token.createdAt), { addSuffix: true })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No trades yet</p>
              ) : (
                <div className="space-y-2">
                  {trades.map((trade) => (
                    <div 
                      key={trade.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        {trade.isBuy ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">
                            {trade.isBuy ? "Buy" : "Sell"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm">
                          {formatEther(BigInt(trade.tokenAmount))} {token.symbol}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {formatEther(BigInt(trade.nativeAmount))} BNB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Trade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isAuthenticated || !userAddress ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">Connect wallet to trade</p>
                </div>
              ) : token.graduated ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">
                    This token has graduated to DEX trading.
                  </p>
                </div>
              ) : (
                <>
                  <Tabs value={tradeTab} onValueChange={(v) => setTradeTab(v as "buy" | "sell")}>
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="buy" className="flex-1" data-testid="tab-buy">
                        Buy
                      </TabsTrigger>
                      <TabsTrigger value="sell" className="flex-1" data-testid="tab-sell">
                        Sell
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="buy" className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">BNB Amount</label>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={buyAmount}
                          onChange={(e) => setBuyAmount(e.target.value)}
                          step="0.01"
                          min="0"
                          data-testid="input-buy-amount"
                        />
                      </div>
                      
                      {buyQuote && buyAmountWei > BigInt(0) && (
                        <div className="bg-muted/50 p-3 rounded-md">
                          <p className="text-sm text-muted-foreground">You will receive:</p>
                          <p className="font-mono font-medium">
                            ~{formatEther((buyQuote as readonly [bigint, bigint])[0])} {token.symbol}
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={handleBuy}
                        disabled={isBuying || !buyAmount || parseFloat(buyAmount) <= 0}
                        className="w-full gap-2"
                        data-testid="button-buy"
                      >
                        {isBuying ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Buying...
                          </>
                        ) : (
                          "Buy Tokens"
                        )}
                      </Button>
                    </TabsContent>

                    <TabsContent value="sell" className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium">Token Amount</label>
                          {tokenBalance !== undefined && (
                            <button
                              className="text-xs text-primary hover:underline"
                              onClick={() => setSellAmount(formatEther(tokenBalance as bigint))}
                            >
                              Max: {Number(formatEther(tokenBalance as bigint)).toFixed(2)}
                            </button>
                          )}
                        </div>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={sellAmount}
                          onChange={(e) => setSellAmount(e.target.value)}
                          step="1"
                          min="0"
                          data-testid="input-sell-amount"
                        />
                      </div>
                      
                      {sellQuote && sellAmountWei > BigInt(0) && (
                        <div className="bg-muted/50 p-3 rounded-md">
                          <p className="text-sm text-muted-foreground">You will receive:</p>
                          <p className="font-mono font-medium">
                            ~{formatEther((sellQuote as readonly [bigint, bigint])[0])} BNB
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={handleSell}
                        disabled={isSelling || isApproving || !sellAmount || parseFloat(sellAmount) <= 0}
                        className="w-full gap-2"
                        data-testid="button-sell"
                      >
                        {isSelling || isApproving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {isApproving ? "Approving..." : "Selling..."}
                          </>
                        ) : needsApproval ? (
                          "Approve & Sell"
                        ) : (
                          "Sell Tokens"
                        )}
                      </Button>
                    </TabsContent>
                  </Tabs>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    1% fee on all trades. 5% slippage tolerance.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {tokenBalance !== undefined && (
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
                <p className="font-mono font-bold text-lg">
                  {Number(formatEther(tokenBalance as bigint)).toLocaleString()} {token.symbol}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
