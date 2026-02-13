import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Coins, Trophy, TrendingUp, Clock, Gamepad2, Zap,
  Target, Brain, Swords, ArrowRight, Star, Crown,
  History, Medal, Flame, ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserPoints {
  totalPoints: number;
  lifetimePoints: number;
  dailyEarned: number;
  dailyCapResetAt: string | null;
  lastEarnedAt: string | null;
}

interface PointsHistoryEntry {
  action: string;
  points: number;
  multiplier: number;
  finalPoints: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface LeaderboardEntry {
  rank: number;
  agentId: string;
  name: string;
  avatarUrl: string | null;
  totalPoints: number;
  lifetimePoints: number;
}

interface GameReward {
  base: number;
  winBonus: number;
  skillMax?: number;
  clutchBonus?: number;
  perfectBonus?: number;
  flawlessBonus?: number;
}

interface GameRewardsData {
  rewards: Record<string, GameReward>;
  caps: {
    dailyCap: number;
    weeklyCap: number;
    [key: string]: number;
  };
  tokenomics: {
    totalSupply: number;
    allocations: Record<string, number>;
    preLaunchPool: number;
    postTgePool: number;
    totalPointsPool: number;
    feeSplit: Record<string, number>;
  };
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

function getActionIcon(action: string) {
  if (action.includes("honey_runner") || action.includes("runner")) return Gamepad2;
  if (action.includes("trading_arena") || action.includes("trading")) return TrendingUp;
  if (action.includes("trivia_battle") || action.includes("trivia")) return Brain;
  if (action.includes("crypto_fighters") || action.includes("fighter")) return Swords;
  if (action.includes("referral")) return Star;
  if (action.includes("daily")) return Flame;
  return Coins;
}

function getActionLabel(action: string): string {
  if (action.includes("honey_runner") || action.includes("runner")) return "Honey Runner";
  if (action.includes("trading_arena") || action.includes("trading")) return "Trading Arena";
  if (action.includes("trivia_battle") || action.includes("trivia")) return "Trivia Battle";
  if (action.includes("crypto_fighters") || action.includes("fighter")) return "Crypto Fighters";
  if (action.includes("referral")) return "Referral Bonus";
  if (action.includes("daily")) return "Daily Bonus";
  if (action.includes("bot") || action.includes("practice")) return "Practice (0 points)";
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const GAME_INFO = [
  {
    key: "honey_runner",
    name: "Honey Runner",
    icon: Gamepad2,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    base: 20,
    desc: "+score/1000 skill bonus",
    maxLabel: "Max 40 pts",
  },
  {
    key: "trading_arena",
    name: "Trading Arena",
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    base: 60,
    desc: "+40 win, +10 clutch",
    maxLabel: "Up to 110 pts",
  },
  {
    key: "trivia_battle",
    name: "Trivia Battle",
    icon: Brain,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    base: 30,
    desc: "+20 win, +15 perfect",
    maxLabel: "Up to 65 pts",
  },
  {
    key: "crypto_fighters",
    name: "Crypto Fighters",
    icon: Swords,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    base: 30,
    desc: "+20 win, +15 flawless",
    maxLabel: "Up to 65 pts",
  },
];

const TOKENOMICS_BREAKDOWN = [
  { label: "Pre-Launch Conversion (TGE)", value: "1%", amount: "10M", highlight: true },
  { label: "Post-TGE Play-to-Earn", value: "25%", amount: "250M", highlight: true },
  { label: "Liquidity & DEX", value: "20%", amount: "200M" },
  { label: "Team & Advisors", value: "15%", amount: "150M" },
  { label: "Staking Rewards", value: "10%", amount: "100M" },
  { label: "Ecosystem & Grants", value: "10%", amount: "100M" },
  { label: "Treasury & Ops", value: "10%", amount: "100M" },
  { label: "Marketing & Growth", value: "5%", amount: "50M" },
  { label: "Strategic Partners", value: "4%", amount: "40M" },
];

export default function PointsDashboard() {
  const { toast } = useToast();

  const { data: pointsData, isLoading: pointsLoading } = useQuery<{ points: UserPoints }>({
    queryKey: ["/api/points/my"],
  });

  const { data: historyData, isLoading: historyLoading } = useQuery<{ history: PointsHistoryEntry[] }>({
    queryKey: ["/api/points/history", "?limit=50"],
  });

  const { data: leaderboardData, isLoading: lbLoading } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ["/api/points/leaderboard", "?limit=20"],
  });

  const { data: rewardsData, isLoading: rewardsLoading } = useQuery<GameRewardsData>({
    queryKey: ["/api/points/game-rewards"],
  });

  const points = pointsData?.points;
  const dailyCap = rewardsData?.caps?.dailyCap || 500;
  const weeklyCap = rewardsData?.caps?.weeklyCap || 3000;
  const dailyProgress = points ? Math.min(100, (points.dailyEarned / dailyCap) * 100) : 0;
  const weeklyEstimate = points ? Math.min(100, (points.dailyEarned / weeklyCap) * 100) : 0;

  const isLoading = pointsLoading;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {isLoading ? (
          <Card>
            <CardContent className="p-8">
              <Skeleton className="h-10 w-48 mb-4" />
              <Skeleton className="h-16 w-32 mb-6" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        ) : (
          <Card data-testid="card-hero-section">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-full bg-amber-500/10">
                      <Coins className="h-6 w-6 text-amber-500" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-page-title">Nectar Points</h1>
                  </div>
                  <p className="text-muted-foreground text-sm">Earn points by playing games, win rewards, and convert to $HONEY tokens</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-sm text-muted-foreground">Your Balance</p>
                  <p className="text-4xl md:text-5xl font-bold text-amber-500" data-testid="text-total-points-hero">
                    {formatNumber(points?.totalPoints || 0)}
                  </p>
                  <Badge className="mt-1 bg-amber-500/10 text-amber-600 no-default-hover-elevate no-default-active-elevate">
                    <Coins className="h-3 w-3 mr-1" />
                    Nectar Points
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-muted-foreground">Daily Progress</p>
                    <p className="text-sm font-medium" data-testid="text-daily-progress">
                      {formatNumber(points?.dailyEarned || 0)} / {formatNumber(dailyCap)}
                    </p>
                  </div>
                  <Progress value={dailyProgress} className="h-3" data-testid="progress-daily" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-muted-foreground">Weekly Cap</p>
                    <p className="text-sm font-medium" data-testid="text-weekly-progress">
                      {formatNumber(weeklyCap)} weekly limit
                    </p>
                  </div>
                  <Progress value={weeklyEstimate} className="h-3" data-testid="progress-weekly" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card data-testid="card-stat-total">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Points</p>
                    <p className="text-2xl font-bold text-amber-500" data-testid="text-stat-total">
                      {formatNumber(points?.totalPoints || 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-amber-500/10">
                    <Coins className="h-5 w-5 text-amber-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-lifetime">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground">Lifetime Earned</p>
                    <p className="text-2xl font-bold" data-testid="text-stat-lifetime">
                      {formatNumber(points?.lifetimePoints || 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-daily">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground">Daily Earned</p>
                    <p className="text-2xl font-bold" data-testid="text-stat-daily">
                      {formatNumber(points?.dailyEarned || 0)}
                      <span className="text-sm font-normal text-muted-foreground"> / {dailyCap}</span>
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Flame className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-games">
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <div>
                    <p className="text-sm text-muted-foreground">Games Played Today</p>
                    <p className="text-2xl font-bold" data-testid="text-stat-games">
                      {historyData?.history?.filter((h) => {
                        const today = new Date();
                        const entryDate = new Date(h.createdAt);
                        return entryDate.toDateString() === today.toDateString();
                      }).length || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500/10">
                    <Gamepad2 className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold" data-testid="text-how-to-earn-title">How to Earn</h2>
          </div>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {GAME_INFO.map((game) => {
              const Icon = game.icon;
              return (
                <Card key={game.key} data-testid={`card-game-${game.key}`} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-full ${game.bgColor}`}>
                        <Icon className={`h-5 w-5 ${game.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{game.name}</p>
                        <Badge variant="outline" className="text-xs mt-0.5">
                          {game.maxLabel}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Base</span>
                        <span className="text-sm font-medium">{game.base} pts</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{game.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Card data-testid="card-honey-conversion">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              $HONEY Token Conversion
            </CardTitle>
            <CardDescription>
              Two-phase conversion: 1% at TGE (7 days), 25% unlocked post-launch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/50 text-amber-400">PHASE 1</Badge>
                    <p className="text-sm font-medium">Pre-Launch Pool (at TGE)</p>
                  </div>
                  <p className="text-3xl font-bold text-amber-500" data-testid="text-conversion-pool-tge">
                    10,000,000
                  </p>
                  <p className="text-sm text-muted-foreground">1% of total supply converts at launch</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">PHASE 2</Badge>
                    <p className="text-sm font-medium">Post-TGE Play-to-Earn</p>
                  </div>
                  <p className="text-2xl font-bold" data-testid="text-conversion-pool-post">
                    250,000,000
                  </p>
                  <p className="text-sm text-muted-foreground">25% unlocked for ongoing game rewards after TGE</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-2">Pre-Launch Conversion Formula</p>
                  <p className="text-sm text-muted-foreground">
                    Your $HONEY = (Your Points / Total Pre-Launch Points) x 10,000,000
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Earn as many points as you can in the next 7 days to maximize your share of the TGE pool
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm font-medium mb-1">Total Supply</p>
                  <p className="text-lg font-bold" data-testid="text-total-supply">1,000,000,000 $HONEY</p>
                  <p className="text-xs text-muted-foreground mt-1">Total points allocation: 26% (260M $HONEY)</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Token Allocation Breakdown</p>
                <div className="space-y-2">
                  {TOKENOMICS_BREAKDOWN.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        (item as any).highlight ? "bg-amber-500/5 border border-amber-500/20" : "bg-muted/50"
                      }`}
                      data-testid={`text-allocation-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${(item as any).highlight ? "bg-amber-500" : "bg-muted-foreground/50"}`} />
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{item.amount}</Badge>
                        <span className="text-sm font-medium w-10 text-right">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card data-testid="card-points-history">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Points History
              </CardTitle>
              <CardDescription>Your recent point earnings</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : historyData?.history && historyData.history.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {historyData.history.map((entry, index) => {
                    const Icon = getActionIcon(entry.action);
                    const isBotMatch = entry.finalPoints === 0 || entry.action.includes("bot") || entry.action.includes("practice");
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        data-testid={`row-history-${index}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {isBotMatch ? "Practice (0 points)" : getActionLabel(entry.action)}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">
                                {timeAgo(entry.createdAt)}
                              </p>
                              {entry.multiplier > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  {entry.multiplier}x
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className={`font-bold text-sm ${isBotMatch ? "text-muted-foreground" : "text-amber-500"}`}>
                          {isBotMatch ? "0" : `+${formatNumber(entry.finalPoints)}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Coins className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No points earned yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Play games to start earning Nectar Points</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-leaderboard">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Points Leaderboard
              </CardTitle>
              <CardDescription>Top earners in the community</CardDescription>
            </CardHeader>
            <CardContent>
              {lbLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 ? (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {leaderboardData.leaderboard.map((entry) => (
                    <div
                      key={entry.agentId}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      data-testid={`row-leaderboard-${entry.rank}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                            entry.rank === 1
                              ? "bg-yellow-500 text-black"
                              : entry.rank === 2
                              ? "bg-slate-400 text-black"
                              : entry.rank === 3
                              ? "bg-amber-700 text-white"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {entry.rank <= 3 ? (
                            <Crown className="h-3.5 w-3.5" />
                          ) : (
                            entry.rank
                          )}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.avatarUrl || undefined} />
                          <AvatarFallback>{entry.name?.[0] || "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{entry.name || "Unknown Bee"}</p>
                          <p className="text-xs text-muted-foreground">
                            Lifetime: {formatNumber(entry.lifetimePoints)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-500">{formatNumber(entry.totalPoints)}</p>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No leaderboard data yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to earn points</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
