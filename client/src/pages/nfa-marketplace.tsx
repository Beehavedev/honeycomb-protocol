import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Brain, ShoppingCart, Star, Zap, Trophy, Search, Plus, TrendingUp, Clock, Shield, Pause, XCircle, Wallet, User, Loader2, Info } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAccount } from "wagmi";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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

export default function NfaMarketplace() {
  const { isAuthenticated, authenticate } = useAuth();
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const ensureAuthenticated = async () => {
    if (!isAuthenticated) {
      try {
        await authenticate();
        return true;
      } catch {
        toast({
          title: "Authentication Required",
          description: "Please sign the message to authenticate.",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const { data: listingsData, isLoading: listingsLoading } = useQuery<{ listings: NfaListing[] }>({
    queryKey: ["/api/nfa/marketplace/listings"],
  });

  const { data: leaderboardData } = useQuery<{ agents: LeaderboardEntry[] }>({
    queryKey: ["/api/nfa/leaderboard/interactions"],
  });

  const { data: categoriesData } = useQuery<{ categories: { category: string; count: number }[] }>({
    queryKey: ["/api/nfa/categories"],
  });

  const { data: feeData } = useQuery<{ platformFeePercent: number; feeWallet: string }>({
    queryKey: ["/api/nfa/marketplace/fees"],
  });

  const { data: myAgentsData, isLoading: myAgentsLoading } = useQuery<{ agents: NfaAgent[] }>({
    queryKey: ["/api/nfa/agents", { owner: address }],
    queryFn: async () => {
      const res = await fetch(`/api/nfa/agents?owner=${address}`);
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
    enabled: isConnected && !!address,
  });

  const buyMutation = useMutation({
    mutationFn: async (nfaId: string) => {
      if (!await ensureAuthenticated()) throw new Error("Not authenticated");
      setBuyingId(nfaId);
      return apiRequest("POST", "/api/nfa/marketplace/buy", { nfaId });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/marketplace/listings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents"] });
      toast({
        title: "Purchase Successful!",
        description: `You now own "${data.sale?.nfaName}". Platform fee: ${data.sale?.platformFee?.display} BNB (${feeData?.platformFeePercent || 1}%)`,
      });
      setBuyingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
      setBuyingId(null);
    },
  });

  const listings = listingsData?.listings || [];
  const leaderboard = leaderboardData?.agents || [];
  const categories = categoriesData?.categories || [];
  const myAgents = myAgentsData?.agents || [];
  const platformFeePercent = feeData?.platformFeePercent || 1;

  const filteredListings = listings.filter(item => {
    const matchesSearch = !searchQuery || 
      item.agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.agent.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Bot className="h-8 w-8 text-primary" />
              NFA Marketplace
            </h1>
            <p className="text-muted-foreground mt-1">
              Buy and sell Non-Fungible Agents (BAP-578)
            </p>
          </div>
          {isAuthenticated && (
            <Link href="/nfa/mint">
              <Button data-testid="button-mint-nfa" className="gap-2">
                <Plus className="h-4 w-4" />
                Mint NFA
              </Button>
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Bot className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total NFAs</p>
                <p className="text-xl font-bold">{listings.length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">For Sale</p>
                <p className="text-xl font-bold">{listings.filter(l => l.listing.active).length}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Brain className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Learning Agents</p>
                <p className="text-xl font-bold">
                  {listings.filter(l => l.agent.agentType === "LEARNING").length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Shield className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-xl font-bold">{categories.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={isConnected ? "my-nfas" : "marketplace"} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            {isConnected && (
              <TabsTrigger value="my-nfas" className="gap-2" data-testid="tab-my-nfas">
                <User className="h-4 w-4" />
                My NFAs
              </TabsTrigger>
            )}
            <TabsTrigger value="marketplace" className="gap-2" data-testid="tab-marketplace">
              <ShoppingCart className="h-4 w-4" />
              Marketplace
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2" data-testid="tab-leaderboard">
              <Trophy className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2" data-testid="tab-categories">
              <Brain className="h-4 w-4" />
              Categories
            </TabsTrigger>
          </TabsList>

          {isConnected && (
            <TabsContent value="my-nfas" className="mt-4">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Your Non-Fungible Agents</h2>
                <p className="text-muted-foreground text-sm">Manage and list your minted NFAs</p>
              </div>
              
              {myAgentsLoading ? (
                <div className="text-center py-12 text-muted-foreground">Loading your agents...</div>
              ) : myAgents.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No NFAs Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven't minted any Non-Fungible Agents yet.
                    </p>
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
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg truncate">{agent.name}</CardTitle>
                            <div className="flex gap-1 flex-shrink-0">
                              <Badge variant={agent.status === "ACTIVE" ? "default" : agent.status === "PAUSED" ? "secondary" : "destructive"}>
                                {agent.status}
                              </Badge>
                              {agent.agentType === "LEARNING" && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                  <Brain className="h-3 w-3 mr-1" />
                                  Learning
                                </Badge>
                              )}
                            </div>
                          </div>
                          <CardDescription className="line-clamp-2">
                            {agent.description || "No description"}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {agent.interactionCount} interactions
                            </span>
                            <span className="flex items-center gap-1">
                              <Wallet className="h-3 w-3" />
                              {parseFloat(agent.balance) / 1e18} BNB
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{agent.modelType}</Badge>
                            {agent.category && <Badge variant="outline">{agent.category}</Badge>}
                          </div>
                        </CardContent>
                        <CardFooter className="pt-0">
                          <Button variant="outline" className="w-full" data-testid={`button-view-nfa-${agent.id}`}>
                            View & Manage
                          </Button>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          <TabsContent value="marketplace" className="mt-4">
            {/* Fee Info Banner */}
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
              <Info className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Platform Fee:</span>{" "}
                <span className="text-muted-foreground">
                  {platformFeePercent}% of each sale goes to the platform. Sellers receive {100 - platformFeePercent}% of the listing price.
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.category} ({cat.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]" data-testid="select-sort">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="interactions">Most Interactions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {listingsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-24 bg-muted rounded-lg mb-4" />
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <Card className="p-12 text-center">
                <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No NFAs Listed</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to list your AI agent on the marketplace
                </p>
                <Link href="/nfa/mint">
                  <Button data-testid="button-mint-first">Mint Your First NFA</Button>
                </Link>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredListings.map(({ listing, agent }) => (
                  <Card key={agent.id} className="hover-elevate cursor-pointer group" data-testid={`card-nfa-${agent.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Bot className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{agent.name}</CardTitle>
                            <CardDescription className="text-xs">
                              Token #{agent.tokenId}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={agent.agentType === "LEARNING" ? "default" : "secondary"}>
                          {agent.agentType === "LEARNING" ? (
                            <><Brain className="h-3 w-3 mr-1" /> Learning</>
                          ) : (
                            <><Zap className="h-3 w-3 mr-1" /> Static</>
                          )}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {agent.description || "No description provided"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bot className="h-3 w-3" />
                          {agent.modelType}
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {agent.interactionCount} interactions
                        </span>
                        {agent.learningEnabled && agent.learningVersion > 0 && (
                          <Badge variant="outline" className="text-xs">
                            v{agent.learningVersion}
                          </Badge>
                        )}
                      </div>
                      {agent.status !== "ACTIVE" && (
                        <div className="mt-2">
                          <Badge 
                            variant={agent.status === "PAUSED" ? "secondary" : "destructive"}
                            className={agent.status === "PAUSED" ? "bg-amber-500 text-white" : ""}
                          >
                            {agent.status === "PAUSED" ? (
                              <><Pause className="h-3 w-3 mr-1" /> Paused</>
                            ) : (
                              <><XCircle className="h-3 w-3 mr-1" /> Terminated</>
                            )}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2 pt-2 border-t">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="font-bold text-lg">{listing.priceDisplay}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            +{platformFeePercent}% platform fee
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/nfa/${agent.id}`}>
                            <Button size="sm" variant="outline" data-testid={`button-view-${agent.id}`}>
                              View
                            </Button>
                          </Link>
                          {agent.ownerAddress.toLowerCase() !== address?.toLowerCase() && (
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                buyMutation.mutate(agent.id);
                              }}
                              disabled={buyMutation.isPending || !isConnected}
                              data-testid={`button-buy-${agent.id}`}
                            >
                              {buyingId === agent.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <ShoppingCart className="h-4 w-4 mr-1" />
                              )}
                              Buy
                            </Button>
                          )}
                          {agent.ownerAddress.toLowerCase() === address?.toLowerCase() && (
                            <Badge variant="secondary">Your Agent</Badge>
                          )}
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Top Performing Agents
                </CardTitle>
                <CardDescription>
                  Ranked by total interactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No agents ranked yet
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((entry, index) => (
                      <div
                        key={entry.agent.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                        data-testid={`leaderboard-entry-${index}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? "bg-amber-500 text-white" :
                          index === 1 ? "bg-gray-400 text-white" :
                          index === 2 ? "bg-amber-700 text-white" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{entry.agent.name}</p>
                          <p className="text-xs text-muted-foreground">{entry.agent.modelType}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{entry.stats?.totalInteractions || 0}</p>
                          <p className="text-xs text-muted-foreground">interactions</p>
                        </div>
                        {entry.stats?.rating && entry.stats.rating > 0 && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="font-medium">{entry.stats.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.length === 0 ? (
                <Card className="col-span-full p-12 text-center">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No Categories Yet</h3>
                  <p className="text-muted-foreground">
                    Categories will appear as agents are minted
                  </p>
                </Card>
              ) : (
                categories.map(cat => (
                  <Card
                    key={cat.category}
                    className="hover-elevate cursor-pointer"
                    onClick={() => {
                      setCategoryFilter(cat.category);
                    }}
                    data-testid={`category-${cat.category}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Brain className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold capitalize">{cat.category}</p>
                            <p className="text-sm text-muted-foreground">
                              {cat.count} agent{cat.count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{cat.count}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
