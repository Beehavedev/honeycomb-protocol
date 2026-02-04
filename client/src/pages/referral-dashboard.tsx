import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Users, Link, Copy, Share2, Trophy, Crown, Award, 
  TrendingUp, Star, ChevronRight, Check, Hexagon, Coins
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Referral {
  id: string;
  referrerAgentId: string;
  referralCode: string;
  referralCount: number;
  tier: string;
  totalRewardsEarned: string;
  createdAt: string;
}

interface ReferralConversion {
  id: string;
  referralId: string;
  referredAgentId: string;
  rewardAmount: string;
  createdAt: string;
}

interface ReferralStats extends Referral {
  conversions: ReferralConversion[];
}

interface EarlyAdopterStatus {
  isEarlyAdopter: boolean;
  badgeNumber?: number;
  rewardMultiplier?: string;
  totalEarlyAdopters: number;
  maxEarlyAdopters: number;
}

interface UserPoints {
  id: string;
  agentId: string;
  totalPoints: number;
  lifetimePoints: number;
  dailyEarned: number;
  lastEarnedAt: string | null;
}

interface LeaderboardEntry {
  id: string;
  referrerAgentId: string;
  referralCode: string;
  referralCount: number;
  tier: string;
  agent: { id: string; name: string; avatarUrl: string | null } | null;
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: typeof Crown; nextTier?: string; nextRequirement?: number }> = {
  newcomer: { label: "Newcomer", color: "bg-muted text-muted-foreground", icon: Users, nextTier: "Bronze", nextRequirement: 5 },
  bronze: { label: "Bronze Bee", color: "bg-amber-700/20 text-amber-600", icon: Award, nextTier: "Silver", nextRequirement: 25 },
  silver: { label: "Silver Bee", color: "bg-slate-400/20 text-slate-400", icon: Award, nextTier: "Gold", nextRequirement: 100 },
  gold: { label: "Gold Bee", color: "bg-yellow-500/20 text-yellow-500", icon: Trophy, nextTier: "Queen", nextRequirement: 500 },
  queen: { label: "Queen Bee", color: "bg-purple-500/20 text-purple-400", icon: Crown },
};

function getTierProgress(tier: string, count: number): number {
  const config = TIER_CONFIG[tier];
  if (!config?.nextRequirement) return 100;
  const prev = tier === "newcomer" ? 0 : tier === "bronze" ? 5 : tier === "silver" ? 25 : 100;
  return Math.min(100, ((count - prev) / (config.nextRequirement - prev)) * 100);
}

export default function ReferralDashboard() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: referralLink, isLoading: linkLoading } = useQuery<Referral>({
    queryKey: ["/api/referrals/my-link"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/referrals/stats"],
  });

  const { data: earlyAdopter, isLoading: eaLoading } = useQuery<EarlyAdopterStatus>({
    queryKey: ["/api/early-adopter"],
  });

  const { data: leaderboardData, isLoading: lbLoading } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ["/api/leaderboards/referrers"],
  });

  const { data: pointsData } = useQuery<{ points: UserPoints }>({
    queryKey: ["/api/points/my"],
  });

  const referralUrl = referralLink ? `${window.location.origin}/?ref=${referralLink.referralCode}` : "";
  const tierConfig = TIER_CONFIG[stats?.tier || "newcomer"];
  const TierIcon = tierConfig?.icon || Users;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    if (navigator.share) {
      navigator.share({
        title: "Join Honeycomb",
        text: "Join the Honeycomb hive and earn rewards!",
        url: referralUrl,
      });
    } else {
      copyToClipboard();
    }
  };

  const isLoading = linkLoading || statsLoading || eaLoading;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Hexagon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Referral Dashboard</h1>
            <p className="text-muted-foreground">Grow the hive and earn rewards</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card data-testid="card-total-points">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Points</p>
                      <p className="text-3xl font-bold text-amber-500">{pointsData?.points?.totalPoints?.toLocaleString() || 0}</p>
                    </div>
                    <div className="p-3 rounded-full bg-amber-500/10">
                      <Coins className="h-6 w-6 text-amber-500" />
                    </div>
                  </div>
                  {earlyAdopter?.isEarlyAdopter && (
                    <p className="text-xs text-muted-foreground mt-2">
                      1.5x multiplier active
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-total-referrals">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Referrals</p>
                      <p className="text-3xl font-bold">{stats?.referralCount || 0}</p>
                    </div>
                    <div className="p-3 rounded-full bg-primary/10">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Your Tier</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={tierConfig?.color}>
                          <TierIcon className="h-3 w-3 mr-1" />
                          {tierConfig?.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="p-3 rounded-full bg-primary/10">
                      <Trophy className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  {tierConfig?.nextRequirement && (
                    <div className="mt-3">
                      <Progress value={getTierProgress(stats?.tier || "newcomer", stats?.referralCount || 0)} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {stats?.referralCount || 0} / {tierConfig.nextRequirement} for {tierConfig.nextTier}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Early Adopter</p>
                      {earlyAdopter?.isEarlyAdopter ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                            <Star className="h-3 w-3 mr-1" />
                            #{earlyAdopter.badgeNumber}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {earlyAdopter.rewardMultiplier}x rewards
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          {earlyAdopter?.totalEarlyAdopters || 0} / {earlyAdopter?.maxEarlyAdopters || 10000} spots taken
                        </p>
                      )}
                    </div>
                    <div className="p-3 rounded-full bg-amber-500/10">
                      <Star className="h-6 w-6 text-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5 text-primary" />
                  Your Referral Link
                </CardTitle>
                <CardDescription>Share this link to invite friends and earn rewards</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input 
                    value={referralUrl} 
                    readOnly 
                    className="font-mono text-sm" 
                    data-testid="input-referral-link"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={copyToClipboard}
                    data-testid="button-copy-referral"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button onClick={shareReferral} data-testid="button-share-referral">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Code: <code className="bg-muted px-1 py-0.5 rounded">{referralLink?.referralCode}</code>
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Tier Benefits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(TIER_CONFIG).map(([key, config]) => {
                      const Icon = config.icon;
                      const isCurrentTier = key === (stats?.tier || "newcomer");
                      return (
                        <div 
                          key={key} 
                          className={`flex items-center justify-between p-3 rounded-lg ${isCurrentTier ? 'bg-primary/10 border border-primary/30' : 'bg-muted/50'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${config.color}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">{config.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {config.nextRequirement ? `${config.nextRequirement - (key === "newcomer" ? 0 : key === "bronze" ? 5 : key === "silver" ? 25 : 100)} more referrals` : "Top tier!"}
                              </p>
                            </div>
                          </div>
                          {isCurrentTier && (
                            <Badge variant="outline" className="border-primary text-primary">Current</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    Top Referrers
                  </CardTitle>
                  <CardDescription>Leaderboard of top hive builders</CardDescription>
                </CardHeader>
                <CardContent>
                  {lbLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {leaderboardData?.leaderboard?.slice(0, 5).map((entry, index) => {
                        const tierConf = TIER_CONFIG[entry.tier];
                        return (
                          <div key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-yellow-500 text-black' : index === 1 ? 'bg-slate-400 text-black' : index === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'}`}>
                                {index + 1}
                              </div>
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={entry.agent?.avatarUrl || undefined} />
                                <AvatarFallback>{entry.agent?.name?.[0] || "?"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{entry.agent?.name || "Unknown"}</p>
                                <Badge variant="outline" className={`text-xs ${tierConf?.color}`}>
                                  {tierConf?.label}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{entry.referralCount}</p>
                              <p className="text-xs text-muted-foreground">referrals</p>
                            </div>
                          </div>
                        );
                      })}
                      {(!leaderboardData?.leaderboard || leaderboardData.leaderboard.length === 0) && (
                        <p className="text-center text-muted-foreground py-4">No referrals yet. Be the first!</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {stats?.conversions && stats.conversions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Recent Referrals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.conversions.slice(0, 10).map((conv) => (
                      <div key={conv.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-green-500/10">
                            <Check className="h-4 w-4 text-green-500" />
                          </div>
                          <p className="text-sm">New bee joined via your link</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
