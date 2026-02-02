import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
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
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Zap, 
  Trophy,
  AlertTriangle,
  Plus,
  Target,
  Users
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

function DuelCard({ duel, onJoin, isJoining }: { duel: Duel; onJoin?: (id: string) => void; isJoining?: boolean }) {
  const { address } = useAccount();
  const isCreator = address?.toLowerCase() === duel.creatorAddress.toLowerCase();
  const isJoiner = duel.joinerAddress && address?.toLowerCase() === duel.joinerAddress.toLowerCase();
  const canJoin = duel.status === "open" && !isCreator && address;

  return (
    <Card className="hover-elevate" data-testid={`duel-card-${duel.id}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {duel.assetId}
            </Badge>
            <Badge 
              variant={duel.status === "open" ? "default" : duel.status === "live" ? "secondary" : "outline"}
            >
              {duel.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Clock className="h-3 w-3" />
            {formatDuration(duel.durationSec)}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${
              duel.creatorDirection === "up" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            }`}>
              {duel.creatorDirection === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span className="text-sm font-medium">Creator</span>
            </div>
            {duel.joinerAddress && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                duel.joinerDirection === "up" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
              }`}>
                {duel.joinerDirection === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span className="text-sm font-medium">Joiner</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary">{duel.stakeDisplay}</div>
            <div className="text-xs text-muted-foreground">per player</div>
          </div>
        </div>

        {duel.status === "live" && duel.endTs && (
          <div className="flex items-center justify-between mb-3 p-2 bg-muted/50 rounded">
            <span className="text-sm text-muted-foreground">Time remaining:</span>
            <CountdownTimer endTs={new Date(duel.endTs)} />
          </div>
        )}

        {duel.status === "settled" && (
          <div className="p-2 bg-muted/50 rounded mb-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Start:</span>
              <span className="font-mono">{duel.startPrice ? formatPrice(duel.startPrice) : "-"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">End:</span>
              <span className="font-mono">{duel.endPrice ? formatPrice(duel.endPrice) : "-"}</span>
            </div>
            {duel.winnerAddress && (
              <div className="flex items-center gap-1 mt-2 text-primary">
                <Trophy className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Winner: {duel.winnerAddress.slice(0, 6)}...{duel.winnerAddress.slice(-4)}
                </span>
              </div>
            )}
            {!duel.winnerAddress && (
              <div className="text-sm text-muted-foreground mt-2">Draw - Stakes refunded</div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {canJoin && onJoin && (
            <Button 
              onClick={() => onJoin(duel.id)} 
              disabled={isJoining}
              className="flex-1"
              data-testid={`join-duel-${duel.id}`}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isJoining ? "Joining..." : `Join (Bet ${duel.joinerDirection === "up" ? "UP" : "DOWN"})`}
            </Button>
          )}
          {isCreator && duel.status === "open" && (
            <Badge variant="outline">Your Duel</Badge>
          )}
          {(isCreator || isJoiner) && duel.status === "settled" && duel.winnerAddress?.toLowerCase() === address?.toLowerCase() && (
            <Badge className="bg-primary text-primary-foreground">
              <Trophy className="h-3 w-3 mr-1" />
              You Won!
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CreateDuelForm({ onSuccess }: { onSuccess: () => void }) {
  const { address } = useAccount();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const [assetId, setAssetId] = useState("BNB");
  const [duration, setDuration] = useState("60");
  const [stake, setStake] = useState("0.01");
  const [direction, setDirection] = useState<"up" | "down">("up");

  const { data: assets } = useQuery<DuelAsset[]>({
    queryKey: ["/api/duels/assets"],
  });

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
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Sign in as a Bee to create duels</p>
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
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending || !stake || parseFloat(stake) <= 0}
          className="w-full"
          data-testid="btn-create-duel"
        >
          {createMutation.isPending ? "Creating..." : "Create Duel"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Predict() {
  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState("open");
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: duels, isLoading } = useQuery<Duel[]>({
    queryKey: ["/api/duels", activeTab],
    queryFn: async () => {
      const res = await fetch(`/api/duels?status=${activeTab}&limit=50`);
      return res.json();
    },
    refetchInterval: 5000,
  });

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
                  onJoin={activeTab === "open" ? (id) => joinMutation.mutate(id) : undefined}
                  isJoining={joinMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
