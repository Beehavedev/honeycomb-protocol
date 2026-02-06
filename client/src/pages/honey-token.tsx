import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import {
  Flame,
  Lock,
  TrendingUp,
  Users,
  Coins,
  Shield,
  Crown,
  Star,
  Zap,
  BarChart3,
  ArrowUpRight,
  Gift,
  Vote,
  Layers,
  Target,
  Hexagon,
} from "lucide-react";

const TIER_ICONS: Record<string, any> = {
  drone: Hexagon,
  worker: Zap,
  guardian: Shield,
  queen: Crown,
};

const TIER_COLORS: Record<string, string> = {
  none: "text-muted-foreground",
  drone: "text-amber-400",
  worker: "text-amber-500",
  guardian: "text-amber-600",
  queen: "text-amber-700",
};

function formatNumber(num: string | number): string {
  const n = typeof num === "string" ? parseFloat(num) : num;
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatWeiToHoney(wei: string): string {
  const honey = parseFloat(wei) / 1e18;
  return formatNumber(honey);
}

interface TierInfo {
  tier: string;
  displayName: string;
  minStake: string;
  feeDiscount: number;
  pointsMultiplier: number;
  benefits: string[];
  badgeColor: string;
}

interface TokenStats {
  stats: {
    totalStaked: string;
    totalBurned: string;
    totalStakers: number;
    circulatingSupply: string;
    rewardPoolBalance: string;
    priceUsd: string;
    priceBnb: string;
    marketCap: string;
    holders: number;
  };
  tiers: TierInfo[];
}

export default function HoneyToken() {
  const { address } = useAccount();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: tokenStats, isLoading: statsLoading } = useQuery<TokenStats>({
    queryKey: ["/api/honey/stats"],
  });

  const { data: tokenInfo } = useQuery<{
    feeSplit: Record<string, { percentage: number; label: string; description: string }>;
    feeSchedule: { feature: string; bnbFee: string; honeyFee: string; description: string }[];
    useCases: string[];
  }>({
    queryKey: ["/api/honey/info"],
  });

  const { data: userTier } = useQuery({
    queryKey: ["/api/honey/tier", address],
    queryFn: async () => {
      const res = await fetch(`/api/honey/tier/${address}`);
      if (!res.ok) throw new Error("Failed to fetch tier");
      return res.json();
    },
    enabled: !!address,
  });

  const { data: pointsBalance } = useQuery({
    queryKey: ["/api/honey/points/balance"],
    enabled: !!isAuthenticated,
  });

  const { data: burns } = useQuery({
    queryKey: ["/api/honey/burns"],
  });

  const stats = tokenStats?.stats;
  const tiers = tokenStats?.tiers || [];
  const feeSplit = tokenInfo?.feeSplit;
  const feeSchedule = tokenInfo?.feeSchedule || [];

  const distribution = [
    { label: "Community Rewards", pct: 35, color: "bg-amber-400" },
    { label: "Points Conversion", pct: 10, color: "bg-amber-500" },
    { label: "Team & Advisors", pct: 15, color: "bg-amber-600" },
    { label: "Liquidity", pct: 15, color: "bg-amber-700" },
    { label: "Treasury (DAO)", pct: 10, color: "bg-orange-400" },
    { label: "Ecosystem Grants", pct: 10, color: "bg-orange-500" },
    { label: "Strategic Sale", pct: 5, color: "bg-orange-600" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <Coins className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-honey-title">$HONEY Token</h1>
            <p className="text-sm text-muted-foreground">The utility token powering the Honeycomb ecosystem</p>
          </div>
        </div>

        {address && userTier && (userTier as any).tier !== "none" && (() => {
          const tierName = String((userTier as any).tier || "");
          const TierIcon = TIER_ICONS[tierName] || Star;
          const badgeColor = tiers.find(t => t.tier === tierName)?.badgeColor || "#F59E0B";
          return (
            <Badge
              className="self-start md:self-auto gap-1.5"
              style={{ backgroundColor: badgeColor }}
              data-testid="badge-user-tier"
            >
              <TierIcon className="h-3.5 w-3.5" />
              {tierName.charAt(0).toUpperCase() + tierName.slice(1)} Tier
            </Badge>
          );
        })()}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">Circulating Supply</p>
            </div>
            <p className="text-lg font-bold" data-testid="text-circulating-supply">
              {statsLoading ? "..." : formatWeiToHoney(stats?.circulatingSupply || "0")}
            </p>
            <p className="text-xs text-muted-foreground">of 1B max</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">Total Staked</p>
            </div>
            <p className="text-lg font-bold" data-testid="text-total-staked">
              {statsLoading ? "..." : formatWeiToHoney(stats?.totalStaked || "0")}
            </p>
            <p className="text-xs text-muted-foreground">{stats?.totalStakers || 0} stakers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-red-500" />
              <p className="text-xs text-muted-foreground">Total Burned</p>
            </div>
            <p className="text-lg font-bold" data-testid="text-total-burned">
              {statsLoading ? "..." : formatWeiToHoney(stats?.totalBurned || "0")}
            </p>
            <p className="text-xs text-muted-foreground">Deflationary</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-muted-foreground">Holders</p>
            </div>
            <p className="text-lg font-bold" data-testid="text-holders">
              {statsLoading ? "..." : formatNumber(stats?.holders || 0)}
            </p>
            <p className="text-xs text-muted-foreground">Unique wallets</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="staking" data-testid="tab-staking">Staking</TabsTrigger>
          <TabsTrigger value="tokenomics" data-testid="tab-tokenomics">Tokenomics</TabsTrigger>
          <TabsTrigger value="utility" data-testid="tab-utility">Utility</TabsTrigger>
          <TabsTrigger value="burns" data-testid="tab-burns">Burns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                What is $HONEY?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                $HONEY is the native utility token that powers every feature of the Honeycomb ecosystem on BNB Smart Chain.
                It connects prediction duels, token launches, bounties, AI agents, NFA trading, staking, and governance
                into a unified deflationary economy.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Reduced Fees</p>
                    <p className="text-xs text-muted-foreground">5% duel fees (vs 10% BNB), discounted launch fees, waived NFA fees</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Lock className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Staking Tiers</p>
                    <p className="text-xs text-muted-foreground">4 tiers with increasing benefits: fee discounts, points boosts, governance</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Flame className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Deflationary</p>
                    <p className="text-xs text-muted-foreground">25% of all platform fees buy back and burn $HONEY, reducing supply over time</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Vote className="h-4 w-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Governance</p>
                    <p className="text-xs text-muted-foreground">Guardian and Queen tiers can vote on platform parameters and fee rates</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                Token Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">Honey Token</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Symbol</p>
                  <p className="font-medium">$HONEY</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Chain</p>
                  <p className="font-medium">BNB Smart Chain</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Standard</p>
                  <p className="font-medium">BEP-20</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Supply</p>
                  <p className="font-medium">1,000,000,000</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Decimals</p>
                  <p className="font-medium">18</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Initial Supply</p>
                  <p className="font-medium">150,000,000 (15%)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium">Deflationary Utility</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAuthenticated && pointsBalance && (() => {
            const pb = pointsBalance as { totalPoints?: number; estimatedHoney?: string; conversionRate?: number };
            return (
              <Card className="border-amber-500/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-amber-500" />
                    Your Points Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                      <p className="text-3xl font-bold" data-testid="text-user-points">{pb.totalPoints || 0} pts</p>
                      <p className="text-sm text-muted-foreground">
                        {"Estimated: ~"}{pb.estimatedHoney || "0"}{" HONEY"}
                        <span className="ml-1 text-xs">{"(Rate: "}{pb.conversionRate || 100}{" pts = 1 HONEY)"}</span>
                      </p>
                    </div>
                    <Button
                      variant="default"
                      className="bg-amber-500 text-white"
                      disabled={(pb.totalPoints || 0) < 100}
                      data-testid="button-convert-points"
                    >
                      Convert to $HONEY
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        <TabsContent value="staking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-500" />
                Staking Tiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Stake $HONEY to unlock tier benefits. Higher tiers earn bigger fee discounts, more points, and governance rights.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tiers.map((tier) => {
                  const TierIcon = TIER_ICONS[tier.tier] || Star;
                  const isCurrentTier = address && (userTier as any)?.tier === tier.tier;

                  return (
                    <Card
                      key={tier.tier}
                      className={`relative overflow-visible ${isCurrentTier ? "ring-2 ring-amber-500" : ""}`}
                      data-testid={`card-tier-${tier.tier}`}
                    >
                      {isCurrentTier && (
                        <Badge className="absolute -top-2.5 left-3 bg-amber-500 text-white text-xs">
                          Your Tier
                        </Badge>
                      )}
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: tier.badgeColor + "20" }}
                            >
                              <TierIcon className="h-5 w-5" style={{ color: tier.badgeColor }} />
                            </div>
                            <div>
                              <p className="font-bold">{tier.displayName}</p>
                              <p className="text-xs text-muted-foreground">{tier.minStake}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {tier.feeDiscount / 100}% off
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            {tier.pointsMultiplier / 100}x points
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            {tier.feeDiscount / 100}% fee discount
                          </span>
                        </div>

                        <div className="space-y-1">
                          {tier.benefits.map((benefit: string, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <ArrowUpRight className="h-3 w-3 text-green-500 shrink-0" />
                              <span>{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-500" />
                Lock Period Bonuses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { period: "Flexible", bonus: "1x", days: "No lock" },
                  { period: "7 Days", bonus: "1.1x", days: "7 days" },
                  { period: "30 Days", bonus: "1.25x", days: "30 days" },
                  { period: "90 Days", bonus: "1.5x", days: "90 days" },
                  { period: "180 Days", bonus: "2x", days: "180 days" },
                ].map((lock) => (
                  <Card key={lock.period}>
                    <CardContent className="p-3 text-center">
                      <p className="font-bold text-amber-500">{lock.bonus}</p>
                      <p className="text-sm font-medium">{lock.period}</p>
                      <p className="text-xs text-muted-foreground">{lock.days}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                Staking Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold" data-testid="text-staking-tvl">
                    {formatWeiToHoney(stats?.totalStaked || "0")}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Value Locked</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalStakers || 0}</p>
                  <p className="text-xs text-muted-foreground">Active Stakers</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatWeiToHoney(stats?.rewardPoolBalance || "0")}
                  </p>
                  <p className="text-xs text-muted-foreground">Reward Pool</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-500">
                    {stats?.totalStaked && stats?.circulatingSupply
                      ? ((parseFloat(stats.totalStaked) / parseFloat(stats.circulatingSupply)) * 100).toFixed(1)
                      : "0"}%
                  </p>
                  <p className="text-xs text-muted-foreground">Staked Ratio</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tokenomics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                Token Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex h-6 rounded-md overflow-hidden">
                {distribution.map((d) => (
                  <div
                    key={d.label}
                    className={`${d.color} transition-all`}
                    style={{ width: `${d.pct}%` }}
                    title={`${d.label}: ${d.pct}%`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {distribution.map((d) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-sm ${d.color}`} />
                    <div>
                      <p className="text-sm font-medium">{d.label}</p>
                      <p className="text-xs text-muted-foreground">{d.pct}% ({formatNumber(d.pct * 10_000_000)})</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" />
                Platform Fee Split
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Every platform fee is split three ways to sustain growth, reward holders, and create deflationary pressure.
              </p>

              {(() => {
                const revPct = feeSplit?.platformRevenue?.percentage ?? 60;
                const burnPct = feeSplit?.buybackBurn?.percentage ?? 25;
                const stakePct = feeSplit?.stakingRewards?.percentage ?? 15;
                const revLabel = feeSplit?.platformRevenue?.label ?? "Platform Revenue";
                const burnLabel = feeSplit?.buybackBurn?.label ?? "Buyback & Burn";
                const stakeLabel = feeSplit?.stakingRewards?.label ?? "Staking Rewards";
                const revDesc = feeSplit?.platformRevenue?.description ?? "Direct revenue to the Honeycomb treasury for operations, growth, and team";
                const burnDesc = feeSplit?.buybackBurn?.description ?? "Used to buy HONEY on the open market and permanently burn it, reducing supply";
                const stakeDesc = feeSplit?.stakingRewards?.description ?? "Distributed proportionally to HONEY stakers based on their tier and lock duration";

                return (
                  <>
                    <div className="flex h-8 rounded-md overflow-hidden">
                      <div className="bg-amber-500 flex items-center justify-center text-xs font-medium text-white" style={{ width: `${revPct}%` }}>{revPct}%</div>
                      <div className="bg-red-500 flex items-center justify-center text-xs font-medium text-white" style={{ width: `${burnPct}%` }}>{burnPct}%</div>
                      <div className="bg-green-500 flex items-center justify-center text-xs font-medium text-white" style={{ width: `${stakePct}%` }}>{stakePct}%</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/20 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm bg-amber-500" />
                          <p className="font-medium text-sm">{revLabel}</p>
                        </div>
                        <p className="text-2xl font-bold text-amber-500">{revPct}%</p>
                        <p className="text-xs text-muted-foreground">{revDesc}</p>
                      </div>
                      <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm bg-red-500" />
                          <p className="font-medium text-sm">{burnLabel}</p>
                        </div>
                        <p className="text-2xl font-bold text-red-500">{burnPct}%</p>
                        <p className="text-xs text-muted-foreground">{burnDesc}</p>
                      </div>
                      <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm bg-green-500" />
                          <p className="font-medium text-sm">{stakeLabel}</p>
                        </div>
                        <p className="text-2xl font-bold text-green-500">{stakePct}%</p>
                        <p className="text-xs text-muted-foreground">{stakeDesc}</p>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Fee Schedule by Feature</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-fee-schedule">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-2 pr-4 font-medium">Feature</th>
                        <th className="text-center py-2 px-2 font-medium">BNB Fee</th>
                        <th className="text-center py-2 px-2 font-medium">HONEY Fee</th>
                        <th className="text-left py-2 pl-4 font-medium hidden sm:table-cell">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeSchedule.map((row) => (
                        <tr key={row.feature} className="border-b border-muted/50">
                          <td className="py-2 pr-4 font-medium">{row.feature}</td>
                          <td className="py-2 px-2 text-center text-muted-foreground">{row.bnbFee}</td>
                          <td className="py-2 px-2 text-center text-amber-500 font-medium">{row.honeyFee}</td>
                          <td className="py-2 pl-4 text-muted-foreground hidden sm:table-cell">{row.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vesting Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { allocation: "Community Rewards (35%)", vesting: "Released over 4 years via staking/earning", progress: 5 },
                  { allocation: "Points Conversion (10%)", vesting: "25% at TGE, 6-month linear vest", progress: 0 },
                  { allocation: "Team & Advisors (15%)", vesting: "12-month cliff, 24-month linear", progress: 0 },
                  { allocation: "Liquidity (15%)", vesting: "Locked for 2 years", progress: 0 },
                  { allocation: "Treasury (10%)", vesting: "Governed by HONEY holders", progress: 0 },
                  { allocation: "Ecosystem Grants (10%)", vesting: "Developer applications", progress: 0 },
                  { allocation: "Strategic Sale (5%)", vesting: "6-month cliff, 12-month linear", progress: 0 },
                ].map((item) => (
                  <div key={item.allocation} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.allocation}</span>
                      <span className="text-muted-foreground">{item.vesting}</span>
                    </div>
                    <Progress value={item.progress} className="h-1.5" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="utility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Use Cases Across the Platform
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: "Prediction Duels",
                    description: "Stake $HONEY with reduced 5% fee (vs 10% BNB). Top winners earn bonus HONEY from seasonal rewards pool.",
                    icon: Target,
                    discount: "50% fee reduction",
                  },
                  {
                    title: "Token Launchpad",
                    description: "Pay launch fees in $HONEY at a discount. Holders get 60-second priority access to new bonding curves.",
                    icon: TrendingUp,
                    discount: "Discounted fees + priority",
                  },
                  {
                    title: "Bounty System",
                    description: "Post and claim bounties in $HONEY. Bounty creators using $HONEY get fee waivers and co-rewards.",
                    icon: Gift,
                    discount: "Fee waiver",
                  },
                  {
                    title: "AI Agent Marketplace",
                    description: "Price agents in $HONEY. Marketplace fee is halved. Stakers get Verified Creator badge.",
                    icon: Zap,
                    discount: "50% marketplace fee",
                  },
                  {
                    title: "NFA Trading",
                    description: "Trade BAP-578 agents with $HONEY. 1% platform fee waived for HONEY transactions.",
                    icon: Hexagon,
                    discount: "Fee waiver",
                  },
                  {
                    title: "Post Bonds",
                    description: "Use $HONEY for anti-spam bonds at 50% cheaper than BNB. Bonds returned on upvoted content.",
                    icon: Shield,
                    discount: "50% cheaper bonds",
                  },
                  {
                    title: "Governance",
                    description: "Guardian and Queen tier stakers vote on platform fees, burn rates, and new features.",
                    icon: Vote,
                    discount: "Voting power",
                  },
                  {
                    title: "Points Conversion",
                    description: "Convert accumulated platform points to $HONEY at TGE. Continue earning post-launch.",
                    icon: Star,
                    discount: "100 pts = 1 HONEY",
                  },
                ].map((useCase) => (
                  <div key={useCase.title} className="flex items-start gap-3 p-3 rounded-md bg-muted/30">
                    <div className="w-10 h-10 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                      <useCase.icon className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-medium text-sm">{useCase.title}</p>
                        <Badge variant="outline" className="text-xs shrink-0 no-default-active-elevate">{useCase.discount}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{useCase.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="burns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" />
                Burn Tracker
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-red-500" data-testid="text-burn-total">
                  {formatWeiToHoney(stats?.totalBurned || "0")}
                </p>
                <p className="text-sm text-muted-foreground">Total $HONEY Burned</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Burn Mechanics</h4>
                {[
                  { mechanic: "Buy-back & Burn (25% of fees)", description: "25% of all platform fees auto-buy HONEY on the open market and burn" },
                  { mechanic: "Stake-to-Earn", description: "Locked HONEY reduces circulating supply while earning rewards" },
                  { mechanic: "Bond Burns", description: "Unclaimed post bonds burned after 90 days" },
                  { mechanic: "Achievement Sinks", description: "Premium features require HONEY spending" },
                ].map((item) => (
                  <div key={item.mechanic} className="flex items-center gap-3 p-2 rounded-md bg-muted/30">
                    <Flame className="h-4 w-4 text-red-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{item.mechanic}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {(burns as any)?.burns?.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-3">Recent Burns</h4>
                  <div className="space-y-2">
                    {(burns as any).burns.slice(0, 10).map((burn: any) => (
                      <div key={burn.id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Flame className="h-3 w-3 text-red-400" />
                          <span>{burn.amountDisplay}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs no-default-active-elevate">{burn.source}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(burn.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
