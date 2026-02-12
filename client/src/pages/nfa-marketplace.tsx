import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bot, Brain, Star, Zap, Trophy, Search, Plus, TrendingUp,
  Shield, Pause, XCircle, Wallet, Grid3X3,
  LayoutList, ArrowUpRight, RefreshCw, User, ExternalLink
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useAccount } from "wagmi";

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
  mintTxHash: string | null;
  onChainTokenId: number | null;
  contractAddress: string | null;
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

function AgentCard({ agent }: { agent: NfaAgent }) {
  return (
    <Link href={`/nfa/${agent.id}`}>
      <Card className="hover-elevate cursor-pointer h-full" data-testid={`card-nfa-${agent.id}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarFallback className="bg-primary/10 text-foreground text-sm font-bold">
                {agent.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate" data-testid={`text-nfa-name-${agent.id}`}>
                {agent.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-xs">#{agent.tokenId}</Badge>
                <span className="text-xs text-muted-foreground">{agent.modelType}</span>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {agent.agentType === "LEARNING" && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Brain className="h-3 w-3" />
                  Learn
                </Badge>
              )}
              {agent.mintTxHash && (
                <Badge variant="outline" className="text-xs">On-Chain</Badge>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {agent.description || "No description provided."}
          </p>

          <div className="flex items-center justify-between pt-2 border-t">
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
            <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-view-${agent.id}`}>
              View <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function NfaMarketplace() {
  const { isAuthenticated } = useAuth();
  const { address, isConnected } = useAccount();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: allAgentsData, isLoading: agentsLoading, refetch } = useQuery<{ agents: NfaAgent[] }>({
    queryKey: ["/api/nfa/agents"],
  });

  const { data: leaderboardData } = useQuery<{ agents: LeaderboardEntry[] }>({
    queryKey: ["/api/nfa/leaderboard/interactions"],
  });

  const { data: myAgentsData, isLoading: myAgentsLoading } = useQuery<{ agents: NfaAgent[] }>({
    queryKey: ["/api/nfa/agents?owner=" + address],
    enabled: isConnected && !!address,
  });

  const allAgents = allAgentsData?.agents || [];
  const leaderboard = leaderboardData?.agents || [];
  const myAgents = myAgentsData?.agents || [];

  const filteredAgents = allAgents.filter(agent => {
    const matchesSearch = !searchQuery ||
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    switch (sortBy) {
      case "interactions":
        return b.interactionCount - a.interactionCount;
      case "name":
        return a.name.localeCompare(b.name);
      case "recent":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const learningCount = allAgents.filter(a => a.agentType === "LEARNING").length;
  const onChainCount = allAgents.filter(a => a.mintTxHash).length;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Bot className="h-6 w-6 text-primary" />
            NFA Showroom
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse Non-Fungible Agents (BAP-578) on BNB Chain
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://nfamarket.io" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="gap-2" data-testid="button-trade-nfamarket">
              <ExternalLink className="h-4 w-4" />
              Trade on nfamarket.io
            </Button>
          </a>
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
        <Card data-testid="stat-total">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-500/10">
              <Bot className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{allAgents.length}</p>
              <p className="text-xs text-muted-foreground">Total Agents</p>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-onchain">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-green-500/10">
              <Shield className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{onChainCount}</p>
              <p className="text-xs text-muted-foreground">On-Chain</p>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-learning">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-500/10">
              <Brain className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{learningCount}</p>
              <p className="text-xs text-muted-foreground">Learning</p>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-trending">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-purple-500/10">
              <TrendingUp className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xl font-bold">
                {allAgents.reduce((sum, a) => sum + a.interactionCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Interactions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all-agents" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all-agents" className="gap-1.5" data-testid="tab-all-agents">
            <Bot className="h-4 w-4" />
            All Agents
          </TabsTrigger>
          {isConnected && (
            <TabsTrigger value="my-agents" className="gap-1.5" data-testid="tab-my-agents">
              <User className="h-4 w-4" />
              My Agents
            </TabsTrigger>
          )}
          <TabsTrigger value="leaderboard" className="gap-1.5" data-testid="tab-leaderboard">
            <Trophy className="h-4 w-4" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all-agents">
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
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="interactions">Most Popular</SelectItem>
                  <SelectItem value="name">Name A-Z</SelectItem>
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

          <p className="text-sm text-muted-foreground mb-3" data-testid="text-result-count">
            {sortedAgents.length} agent{sortedAgents.length !== 1 ? "s" : ""}
          </p>

          {agentsLoading ? (
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
          ) : sortedAgents.length === 0 ? (
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
                      : "Be the first to mint a Non-Fungible Agent."}
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
              {sortedAgents.map(agent => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          )}
        </TabsContent>

        {isConnected && (
          <TabsContent value="my-agents">
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
                  <AgentCard key={agent.id} agent={agent} />
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
