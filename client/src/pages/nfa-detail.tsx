import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, Brain, Zap, ArrowLeft, Star, ShoppingCart, Clock, Activity, 
  Database, Fingerprint, TrendingUp, MessageSquare, Shield, History,
  Edit, DollarSign, Share2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface NfaAgent {
  id: string;
  tokenId: number;
  ownerAddress: string;
  name: string;
  description: string | null;
  modelType: string;
  agentType: string;
  status: string;
  proofOfPrompt: string;
  memoryRoot: string | null;
  trainingVersion: number;
  interactionCount: number;
  category: string | null;
  systemPrompt: string | null;
  createdAt: string;
  lastActiveAt: string;
}

interface NfaStats {
  totalInteractions: number;
  totalRevenue: string;
  rating: number;
  ratingCount: number;
}

interface NfaVerification {
  status: string;
  verifierAddress?: string;
  badge?: string;
  verifiedAt?: string;
}

interface NfaListing {
  id: string;
  priceWei: string;
  priceDisplay: string;
  active: boolean;
}

interface NfaMemory {
  id: string;
  memoryKey: string;
  memoryValue: string;
  version: number;
  updatedAt: string;
}

interface NfaInteraction {
  id: string;
  callerAddress: string;
  interactionType: string;
  createdAt: string;
}

export default function NfaDetail() {
  const [, params] = useRoute("/nfa/:id");
  const nfaId = params?.id;
  const { address, isConnected } = useAccount();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [listPrice, setListPrice] = useState("");
  const [newRating, setNewRating] = useState(5);

  const { data: agentData, isLoading } = useQuery<{
    agent: NfaAgent;
    stats: NfaStats;
    verification: NfaVerification;
    listing: NfaListing | null;
  }>({
    queryKey: ["/api/nfa/agents", nfaId],
    enabled: !!nfaId,
  });

  const { data: memoryData } = useQuery<{ memory: NfaMemory[] }>({
    queryKey: ["/api/nfa/agents", nfaId, "memory"],
    enabled: !!nfaId,
  });

  const { data: interactionsData } = useQuery<{ interactions: NfaInteraction[] }>({
    queryKey: ["/api/nfa/agents", nfaId, "interactions"],
    enabled: !!nfaId,
  });

  const listMutation = useMutation({
    mutationFn: async (price: string) => {
      const priceWei = (parseFloat(price) * 1e18).toString();
      return apiRequest("/api/nfa/marketplace/list", {
        method: "POST",
        body: JSON.stringify({
          nfaId,
          sellerAddress: address,
          priceWei,
          priceDisplay: `${price} BNB`,
        }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      toast({ title: "Agent Listed", description: "Your NFA is now for sale." });
      setListPrice("");
    },
    onError: (error: Error) => {
      toast({ title: "Listing Failed", description: error.message, variant: "destructive" });
    },
  });

  const delistMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/nfa/marketplace/delist/${nfaId}`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      toast({ title: "Listing Removed", description: "Your NFA is no longer for sale." });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      return apiRequest(`/api/nfa/agents/${nfaId}/rate`, {
        method: "POST",
        body: JSON.stringify({ raterAddress: address, rating }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      toast({ title: "Rating Submitted", description: "Thank you for your feedback!" });
    },
    onError: (error: Error) => {
      toast({ title: "Rating Failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="animate-pulse">
          <CardContent className="p-8">
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agentData?.agent) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="text-center p-8">
          <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Agent Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This Non-Fungible Agent doesn't exist or has been removed.
          </p>
          <Link href="/nfa">
            <Button>Back to Marketplace</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const { agent, stats, verification, listing } = agentData;
  const memory = memoryData?.memory || [];
  const interactions = interactionsData?.interactions || [];
  const isOwner = isConnected && address?.toLowerCase() === agent.ownerAddress.toLowerCase();

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <Link href="/nfa">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-primary/10">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl" data-testid="text-agent-name">
                      {agent.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">Token #{agent.tokenId}</Badge>
                      <Badge variant={agent.agentType === "LEARNING" ? "default" : "secondary"}>
                        {agent.agentType === "LEARNING" ? (
                          <><Brain className="h-3 w-3 mr-1" /> Learning</>
                        ) : (
                          <><Zap className="h-3 w-3 mr-1" /> Static</>
                        )}
                      </Badge>
                      {verification.status === "VERIFIED" && (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          <Shield className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
                {isOwner && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500">
                    Owner
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {agent.description || "No description provided."}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Bot className="h-4 w-4" />
                    Model
                  </div>
                  <p className="font-medium mt-1">{agent.modelType}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Activity className="h-4 w-4" />
                    Interactions
                  </div>
                  <p className="font-medium mt-1">{stats.totalInteractions}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Star className="h-4 w-4" />
                    Rating
                  </div>
                  <p className="font-medium mt-1">
                    {stats.ratingCount > 0 ? `${stats.rating.toFixed(1)} (${stats.ratingCount})` : "No ratings"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <History className="h-4 w-4" />
                    Version
                  </div>
                  <p className="font-medium mt-1">v{agent.trainingVersion}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="memory">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="memory" className="gap-2" data-testid="tab-memory">
                <Database className="h-4 w-4" />
                Memory Vault
              </TabsTrigger>
              <TabsTrigger value="proof" className="gap-2" data-testid="tab-proof">
                <Fingerprint className="h-4 w-4" />
                Proof-of-Prompt
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2" data-testid="tab-activity">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="memory" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Memory Vault</CardTitle>
                  <CardDescription>
                    On-chain memory storage for this agent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {memory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="h-8 w-8 mx-auto mb-2" />
                      <p>No memory entries yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memory.map(m => (
                        <div key={m.id} className="p-3 rounded-lg border">
                          <div className="flex justify-between items-start">
                            <code className="text-sm font-medium">{m.memoryKey}</code>
                            <Badge variant="outline" className="text-xs">v{m.version}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 break-all">
                            {m.memoryValue}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {agent.memoryRoot && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Memory Root (Merkle)</p>
                      <code className="text-xs font-mono break-all">{agent.memoryRoot}</code>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proof" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    Proof-of-Prompt
                  </CardTitle>
                  <CardDescription>
                    Cryptographic verification of training configuration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-1">PoP Hash</p>
                    <code className="text-sm font-mono break-all">{agent.proofOfPrompt}</code>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-green-500">Verified On-Chain</p>
                      <p className="text-muted-foreground">
                        This hash is immutably stored and can be used to verify the agent's training configuration.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>
                    Last {interactions.length} interactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {interactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p>No interactions recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {interactions.slice(0, 10).map(i => (
                        <div key={i.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="capitalize">{i.interactionType}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {i.callerAddress.slice(0, 6)}...{i.callerAddress.slice(-4)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(i.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          {listing?.active && (
            <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-600/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-500" />
                  For Sale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                  <span className="text-2xl font-bold">{listing.priceDisplay}</span>
                </div>
                {!isOwner && isConnected && (
                  <Button className="w-full" data-testid="button-buy">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Buy Now
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {isOwner && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Owner Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {listing?.active ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => delistMutation.mutate()}
                    disabled={delistMutation.isPending}
                    data-testid="button-delist"
                  >
                    Remove Listing
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="listPrice">List for Sale</Label>
                    <div className="flex gap-2">
                      <Input
                        id="listPrice"
                        type="number"
                        step="0.01"
                        placeholder="0.1"
                        value={listPrice}
                        onChange={(e) => setListPrice(e.target.value)}
                        data-testid="input-list-price"
                      />
                      <Button
                        onClick={() => listMutation.mutate(listPrice)}
                        disabled={!listPrice || listMutation.isPending}
                        data-testid="button-list"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Price in BNB</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isOwner && isConnected && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Rate Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="p-1"
                      data-testid={`button-star-${star}`}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= newRating
                            ? "text-amber-500 fill-amber-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={() => rateMutation.mutate(newRating)}
                  disabled={rateMutation.isPending}
                  data-testid="button-submit-rating"
                >
                  Submit Rating
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner</span>
                <code className="font-mono">
                  {agent.ownerAddress.slice(0, 6)}...{agent.ownerAddress.slice(-4)}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Active</span>
                <span>{new Date(agent.lastActiveAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="outline">{agent.category || "Uncategorized"}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={agent.status === "ACTIVE" ? "default" : "secondary"}>
                  {agent.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
