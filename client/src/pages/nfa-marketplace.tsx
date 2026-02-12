import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bot, Brain, ShoppingCart, Star, Zap, Trophy, Search, Plus, TrendingUp,
  Shield, Pause, XCircle, Wallet, Loader2, Grid3X3,
  LayoutList, Activity, ArrowUpRight, RefreshCw, User
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useHoneyTier } from "@/hooks/use-honey-tier";
import { FeeDiscountBadge } from "@/components/tier-badge";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BAP578MarketplaceABI } from "@/contracts/abis";
import { getNFAMarketplaceAddresses, NFA_FEE_WALLET } from "@/contracts/addresses";
import { useI18n } from "@/lib/i18n";

interface NfaAgent {
  id: string;
  tokenId: number;
  ownerAddress: string;
  name: string;
  description: string | null;
  modelType: string;
  agentType: string;
  status: string;
  category: string | null;
  interactionCount: number;
  createdAt: string;
  learningEnabled: boolean;
  learningVersion: number;
  balance: string;
}

interface NfaListing {
  listing: {
    id: string;
    nfaId: string;
    priceWei: string;
    priceDisplay: string;
    active: boolean;
    listedAt: string;
  };
  agent: NfaAgent;
}

interface LeaderboardEntry {
  agent: NfaAgent;
  stats: {
    totalInteractions: number;
    totalRevenue: string;
    rating: number;
    ratingCount: number;
  } | null;
}

function NfaCard({ listing, agent, onBuy, isBuying, isOwner, platformFee }: {
  listing: NfaListing["listing"];
  agent: NfaAgent;
  onBuy: () => void;
  isBuying: boolean;
  isOwner: boolean;
  platformFee: number;
}) {
  return (
    <Card className="hover-elevate" data-testid={`card-nfa-${agent.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarFallback className="bg-primary/10 text-foreground text-sm font-bold">
              {agent.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <Link href={`/nfa/${agent.id}`}>
              <h3 className="font-semibold truncate hover:text-primary transition-colors cursor-pointer" data-testid={`text-nfa-name-${agent.id}`}>
                {agent.name}
              </h3>
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className="text-xs">#{agent.tokenId}</Badge>
              <span className="text-xs text-muted-foreground">{agent.modelType}</span>
            </div>
          </div>
          {agent.agentType === "LEARNING" && (
            <Badge variant="secondary" className="gap-1 text-xs flex-shrink-0">
              <Brain className="h-3 w-3" />
              Learn
            </Badge>
          )}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {agent.description || "No description provided."}
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {agent.interactionCount}
          </span>
          <span className="flex items-center gap-1">
            <Wallet className="h-3 w-3" />
            {(parseFloat(agent.balance) / 1e18).toFixed(3)} BNB
          </span>
          {agent.status !== "ACTIVE" && (
            <Badge variant={agent.status === "PAUSED" ? "secondary" : "destructive"} className="text-xs gap-1">
              {agent.status === "PAUSED" ? <Pause className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {agent.status}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <span className="text-lg font-bold">{listing.priceDisplay}</span>
            <span className="text-xs text-muted-foreground ml-1">+ {platformFee}% fee</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/nfa/${agent.id}`}>
              <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-view-${agent.id}`}>
                View <ArrowUpRight className="h-3 w-3" />
              </Button>
            </Link>
            {!isOwner && (
              <Button
                size="sm"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(); }}
                disabled={isBuying}
                data-testid={`button-buy-${agent.id}`}
              >
                {isBuying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-1" />}
                Buy
              </Button>
            )}
            {isOwner && (
              <Badge variant="outline">Owned</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NfaMarketplace() {
  const { isAuthenticated, authenticate } = useAuth();
  const { feeDiscount, hasTier } = useHoneyTier();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { toast } = useToast();
  const { t } = useI18n();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [pendingTxHash, setPendingTxHash] = useState<`0x${string}` | null>(null);

  const marketplaceAddresses = getNFAMarketplaceAddresses(chainId);
  const isMarketplaceDeployed = marketplaceAddresses?.marketplace !== "0x0000000000000000000000000000000000000000";

  const { writeContractAsync } = useWriteContract();

  const { isLoading: isWaitingTx } = useWaitForTransactionReceipt({
    hash: pendingTxHash ?? undefined,
  });

  const ensureAuthenticated = async () => {
    if (!isAuthenticated) {
      try {
        await authenticate();
        return true;
      } catch {
        toast({
          title: t('nfa.authRequired'),
          description: t('nfa.authRequiredDesc'),
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const { data: listingsData, isLoading: listingsLoading, refetch } = useQuery<{ listings: NfaListing[] }>({
    queryKey: ["/api/nfa/marketplace/listings"],
  });

  const { data: leaderboardData } = useQuery<{ agents: LeaderboardEntry[] }>({
    queryKey: ["/api/nfa/leaderboard/interactions"],
  });

  const { data: feeData } = useQuery<{ platformFeePercent: number; feeWallet: string }>({
    queryKey: ["/api/nfa/marketplace/fees"],
  });

  const { data: myAgentsData, isLoading: myAgentsLoading } = useQuery<{ agents: NfaAgent[] }>({
    queryKey: ["/api/nfa/agents?owner=" + address],
    enabled: isConnected && !!address,
  });

  const buyMutation = useMutation({
    mutationFn: async ({ nfaId, tokenId, priceWei }: { nfaId: string; tokenId: number; priceWei: string }) => {
      if (!await ensureAuthenticated()) throw new Error(t('nfa.notAuthenticated'));
      setBuyingId(nfaId);

      if (isMarketplaceDeployed && marketplaceAddresses) {
        const txHash = await writeContractAsync({
          address: marketplaceAddresses.marketplace,
          abi: BAP578MarketplaceABI,
          functionName: "buy",
          args: [BigInt(tokenId)],
          value: BigInt(priceWei),
        });

        setPendingTxHash(txHash);

        const result = await apiRequest("POST", "/api/nfa/marketplace/buy", {
          nfaId,
          txHash,
          onChain: true
        });

        setPendingTxHash(null);
        return result;
      } else {
        return apiRequest("POST", "/api/nfa/marketplace/buy", { nfaId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/marketplace/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents"] });
      toast({
        title: t('nfa.purchaseSuccess'),
        description: t('nfa.purchaseSuccessDesc'),
      });
      setBuyingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: t('nfa.purchaseFailed'),
        description: error.message,
        variant: "destructive",
      });
      setBuyingId(null);
      setPendingTxHash(null);
    },
  });

  const listings = listingsData?.listings || [];
  const leaderboard = leaderboardData?.agents || [];
  const myAgents = myAgentsData?.agents || [];
  const platformFeePercent = feeData?.platformFeePercent || 1;

  const filteredListings = listings.filter(item => {
    const matchesSearch = !searchQuery ||
      item.agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const sortedListings = [...filteredListings].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return parseFloat(a.listing.priceWei) - parseFloat(b.listing.priceWei);
      case "price-high":
        return parseFloat(b.listing.priceWei) - parseFloat(a.listing.priceWei);
      case "interactions":
        return b.agent.interactionCount - a.agent.interactionCount;
      case "recent":
      default:
        return new Date(b.listing.listedAt).getTime() - new Date(a.listing.listedAt).getTime();
    }
  });

  const totalVolume = listings.reduce((sum, l) => sum + parseFloat(l.listing.priceWei), 0);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Bot className="h-6 w-6 text-primary" />
            NFA Marketplace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trade Non-Fungible Agents (BAP-578) on BNB Chain
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <Link href="/nfa/mint">
              <Button className="gap-2" data-testid="button-mint-nfa">
                <Plus className="h-4 w-4" />
                Mint Agent
              </Button>
            </Link>
          )}
          <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card data-testid="stat-listed">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-500/10">
              <Bot className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{listings.length}</p>
              <p className="text-xs text-muted-foreground">Listed</p>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-volume">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-green-500/10">
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{(totalVolume / 1e18).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Volume (BNB)</p>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-learning">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-500/10">
              <Brain className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {listings.filter(l => l.agent.agentType === "LEARNING").length}
              </p>
              <p className="text-xs text-muted-foreground">Learning</p>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-fee">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-purple-500/10">
              <Shield className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{platformFeePercent}%</p>
              <p className="text-xs text-muted-foreground">Platform Fee</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="explore" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="explore" className="gap-1.5" data-testid="tab-marketplace">
            <ShoppingCart className="h-4 w-4" />
            Marketplace
          </TabsTrigger>
          {isConnected && (
            <TabsTrigger value="my-nfas" className="gap-1.5" data-testid="tab-my-nfas">
              <User className="h-4 w-4" />
              My Agents
            </TabsTrigger>
          )}
          <TabsTrigger value="leaderboard" className="gap-1.5" data-testid="tab-leaderboard">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explore">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]" data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Listed</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="interactions">Most Popular</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="rounded-r-none"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="rounded-l-none"
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground" data-testid="text-result-count">
              {sortedListings.length} result{sortedListings.length !== 1 ? "s" : ""}
            </p>
            {hasTier && <FeeDiscountBadge feeDiscount={feeDiscount} originalFee={`${platformFeePercent}%`} />}
          </div>

          {listingsLoading ? (
            <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-8 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sortedListings.length === 0 ? (
            <Card className="py-16">
              <CardContent className="flex flex-col items-center gap-4 text-center">
                <div className="p-4 rounded-full bg-muted">
                  <Bot className="h-10 w-10 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold">No Agents Found</h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    {searchQuery
                      ? "Try adjusting your search query."
                      : "Be the first to list your NFA on the marketplace."
                    }
                  </p>
                </div>
                <Link href="/nfa/mint">
                  <Button className="gap-2 mt-2" data-testid="button-mint-first">
                    <Plus className="h-4 w-4" />
                    Mint an Agent
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
              {sortedListings.map(({ listing, agent }) => (
                <NfaCard
                  key={agent.id}
                  listing={listing}
                  agent={agent}
                  onBuy={() => buyMutation.mutate({
                    nfaId: agent.id,
                    tokenId: agent.tokenId,
                    priceWei: listing.priceWei
                  })}
                  isBuying={buyingId === agent.id || isWaitingTx}
                  isOwner={agent.ownerAddress.toLowerCase() === address?.toLowerCase()}
                  platformFee={platformFeePercent}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {isConnected && (
          <TabsContent value="my-nfas">
            {myAgentsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading your agents...</div>
            ) : myAgents.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center gap-4 text-center">
                  <Bot className="h-10 w-10 text-muted-foreground" />
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold">No Agents Yet</h3>
                    <p className="text-muted-foreground text-sm">Mint your first Non-Fungible Agent to get started.</p>
                  </div>
                  <Link href="/nfa/mint">
                    <Button data-testid="button-mint-first-nfa">
                      <Plus className="h-4 w-4 mr-2" />
                      Mint Your First NFA
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myAgents.map(agent => (
                  <Link key={agent.id} href={`/nfa/${agent.id}`}>
                    <Card className="hover-elevate cursor-pointer h-full">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border">
                              <AvatarFallback className="bg-primary/10 text-foreground text-xs font-bold">
                                {agent.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <h4 className="font-semibold truncate">{agent.name}</h4>
                              <p className="text-xs text-muted-foreground">{agent.modelType}</p>
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <Badge variant={agent.status === "ACTIVE" ? "default" : agent.status === "PAUSED" ? "secondary" : "destructive"} className="text-xs">
                              {agent.status}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {agent.description || "No description"}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {agent.interactionCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <Wallet className="h-3 w-3" />
                            {(parseFloat(agent.balance) / 1e18).toFixed(3)} BNB
                          </span>
                          {agent.agentType === "LEARNING" && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Brain className="h-3 w-3" /> v{agent.learningVersion}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Top Performing Agents
              </CardTitle>
              <CardDescription>Ranked by total interactions</CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No agents ranked yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <Link key={entry.agent.id} href={`/nfa/${entry.agent.id}`}>
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg hover-elevate cursor-pointer"
                        data-testid={`leaderboard-entry-${index}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? "bg-amber-500 text-white" :
                          index === 1 ? "bg-gray-400 text-white" :
                          index === 2 ? "bg-amber-700 text-white" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                        <Avatar className="h-8 w-8 border">
                          <AvatarFallback className="bg-primary/10 text-foreground text-xs font-bold">
                            {entry.agent.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{entry.agent.name}</p>
                          <p className="text-xs text-muted-foreground">{entry.agent.modelType}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold">{entry.stats?.totalInteractions || 0}</p>
                          <p className="text-xs text-muted-foreground">actions</p>
                        </div>
                        {entry.stats?.rating && entry.stats.rating > 0 && (
                          <div className="flex items-center gap-1 text-amber-500 flex-shrink-0">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="font-medium text-sm">{entry.stats.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
