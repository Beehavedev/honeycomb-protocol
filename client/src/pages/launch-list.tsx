import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Rocket, Plus, TrendingUp, Users, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { formatEther } from "viem";
import type { LaunchToken } from "@shared/schema";

interface TokensResponse {
  tokens: LaunchToken[];
}

export default function LaunchList() {
  const [filter, setFilter] = useState<"all" | "active" | "graduated">("all");
  const { isAuthenticated, agent } = useAuth();

  const { data, isLoading, error } = useQuery<TokensResponse>({
    queryKey: ["/api/launch/tokens", filter],
    queryFn: async () => {
      let url = "/api/launch/tokens?limit=50";
      if (filter === "active") url += "&graduated=false";
      if (filter === "graduated") url += "&graduated=true";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return res.json();
    },
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Rocket className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Launchpad</h1>
        </div>
        {isAuthenticated && agent && (
          <Link href="/launch/new">
            <Button className="gap-2" data-testid="button-create-token">
              <Plus className="h-4 w-4" />
              Launch Token
            </Button>
          </Link>
        )}
      </div>

      <p className="text-muted-foreground mb-6">
        Token factory with bonding curve trading. Launch your token and let the market decide its value.
      </p>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">Active</TabsTrigger>
          <TabsTrigger value="graduated" data-testid="tab-graduated">Graduated</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-2 w-full mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-6 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load tokens. Please try again.</span>
          </CardContent>
        </Card>
      )}

      {data && data.tokens.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <Rocket className="h-16 w-16 text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-semibold">No tokens yet</h3>
              <p className="text-muted-foreground">
                Be the first to launch a token on the Honeycomb launchpad!
              </p>
            </div>
            {isAuthenticated && agent && (
              <Link href="/launch/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Launch Token
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {data && data.tokens.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.tokens.map((token) => (
            <TokenCard key={token.tokenAddress} token={token} />
          ))}
        </div>
      )}
    </div>
  );
}

function TokenCard({ token }: { token: LaunchToken }) {
  const graduationThreshold = BigInt("10000000000000000000");
  const totalRaised = BigInt(token.totalRaisedNative || "0");
  const progress = graduationThreshold > BigInt(0) 
    ? Number((totalRaised * BigInt(100)) / graduationThreshold)
    : 0;

  return (
    <Link href={`/launch/${token.tokenAddress}`}>
      <Card 
        className="hover-elevate transition-all duration-200 cursor-pointer h-full" 
        data-testid={`card-token-${token.tokenAddress}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            {token.imageUrl ? (
              <img 
                src={token.imageUrl} 
                alt={token.name} 
                className="w-12 h-12 rounded-full object-cover border"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">
                  {token.symbol.slice(0, 2)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{token.name}</h3>
                {token.graduated && (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0">
                    Graduated
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground font-mono">${token.symbol}</p>
            </div>
          </div>

          {token.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {token.description}
            </p>
          )}

          {!token.graduated && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress to graduation</span>
                <span>{formatEther(totalRaised)} / 10 BNB</span>
              </div>
              <Progress value={Math.min(progress, 100)} className="h-2" />
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>{token.tradeCount} trades</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>
                {formatDistanceToNow(new Date(token.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
