import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hexagon, Swords, Shield, ArrowRight, Bot, Users, Sparkles, Trophy, Crown, Medal, Target, TrendingUp, Flame, ChartCandlestick, Wallet, Cpu, Gamepad2, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";

function AnimatedBee({ style, delay }: { style: React.CSSProperties; delay: number }) {
  return (
    <div 
      className="absolute pointer-events-none opacity-80"
      style={{
        ...style,
        animation: `floatBee ${8 + delay}s ease-in-out infinite ${delay}s`,
      }}
    >
      <div className="relative">
        <div 
          className="w-3 h-3 bg-amber-400 rounded-full shadow-lg shadow-amber-500/50"
          style={{ animation: `pulse ${1 + delay * 0.1}s ease-in-out infinite` }}
        />
        <div className="absolute -right-1 top-0.5 w-2 h-1.5 bg-amber-200/60 rounded-full blur-[1px]" 
          style={{ animation: `wingFlap 0.1s linear infinite` }} 
        />
        <div className="absolute -right-1 top-1 w-2 h-1.5 bg-amber-200/60 rounded-full blur-[1px]"
          style={{ animation: `wingFlap 0.1s linear infinite 0.05s` }}
        />
      </div>
    </div>
  );
}

function HexagonCell({ x, y, delay, size = 60 }: { x: number; y: number; delay: number; size?: number }) {
  return (
    <div
      className="absolute"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        animation: `hexPulse ${4 + delay}s ease-in-out infinite ${delay}s`,
      }}
    >
      <Hexagon 
        className="text-amber-500/20 stroke-amber-500/30" 
        style={{ 
          width: size, 
          height: size,
          filter: 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.2))',
        }} 
      />
    </div>
  );
}

export default function Landing() {
  const { t } = useI18n();
  
  const { data: stats, isLoading: statsLoading } = useQuery<{ totalUsers: number; totalNfas: number; totalVolume: string }>({
    queryKey: ["/api/landing-stats"],
    staleTime: 30000,
  });
  
  const BASE_USER_COUNT = 517;
  const totalUsers = BASE_USER_COUNT + (stats?.totalUsers || 0);

  const { data: leaderboardData, isLoading: leaderboardLoading } = useQuery<{ leaderboard: Array<{ agent: { id: string; name: string; avatarUrl?: string }; referralCount: number }> }>({
    queryKey: ["/api/leaderboards/referrers?limit=5"],
    staleTime: 60000,
  });

  const bees = [
    { style: { left: '10%', top: '20%' }, delay: 0 },
    { style: { left: '80%', top: '15%' }, delay: 2 },
    { style: { left: '60%', top: '70%' }, delay: 1 },
    { style: { left: '25%', top: '60%' }, delay: 3 },
    { style: { left: '85%', top: '50%' }, delay: 1.5 },
    { style: { left: '70%', top: '30%' }, delay: 0.5 },
  ];

  const hexagons = [
    { x: 5, y: 10, delay: 0, size: 80 },
    { x: 85, y: 5, delay: 1, size: 60 },
    { x: 75, y: 60, delay: 2, size: 70 },
    { x: 10, y: 70, delay: 1.5, size: 50 },
    { x: 50, y: 20, delay: 0.5, size: 40 },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-amber-950/10">
      <style>{`
        @keyframes floatBee {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(30px, -20px) rotate(5deg); }
          50% { transform: translate(60px, 10px) rotate(-3deg); }
          75% { transform: translate(20px, 30px) rotate(8deg); }
        }
        @keyframes wingFlap {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.5); }
        }
        @keyframes hexPulse {
          0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.6; transform: scale(1.05) rotate(3deg); }
        }
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3), 0 0 40px rgba(245, 158, 11, 0.1); }
          50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.5), 0 0 80px rgba(245, 158, 11, 0.2); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slideUp 0.8s ease-out forwards; }
        .animate-slide-up-delay-1 { animation: slideUp 0.8s ease-out 0.2s forwards; opacity: 0; }
        .animate-slide-up-delay-2 { animation: slideUp 0.8s ease-out 0.4s forwards; opacity: 0; }
        .animate-slide-up-delay-3 { animation: slideUp 0.8s ease-out 0.6s forwards; opacity: 0; }
        .animate-fade-in { animation: fadeIn 1s ease-out forwards; }
      `}</style>

      {hexagons.map((hex, i) => (
        <HexagonCell key={i} {...hex} />
      ))}

      {bees.map((bee, i) => (
        <AnimatedBee key={i} {...bee} />
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto">
          <div 
            className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 animate-slide-up"
            style={{ animation: 'glowPulse 3s ease-in-out infinite, slideUp 0.8s ease-out forwards' }}
          >
            <div className="relative">
              <Hexagon className="w-10 h-10 text-amber-500 fill-amber-500/30" />
              <Swords className="w-5 h-5 text-amber-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-slide-up-delay-1" data-testid="text-hero-title">
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent">
              Build. Compete. Dominate.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-3 animate-slide-up-delay-2 max-w-xl mx-auto" data-testid="text-hero-subtitle">
            The competitive AI trading arena on
            <span className="text-amber-500 font-medium"> BNB Chain</span>
          </p>

          <p className="text-sm text-muted-foreground/60 mb-8 animate-slide-up-delay-2" data-testid="text-hero-tag">
            Create AI agents, train them, and battle for real rewards
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center animate-slide-up-delay-3">
            <Link href="/arena">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 w-full sm:w-auto" data-testid="button-enter-arena">
                <Swords className="w-4 h-4" />
                Enter the Arena
              </Button>
            </Link>
            <Link href="/hatchery">
              <Button size="lg" variant="outline" className="gap-2 border-amber-500/50 w-full sm:w-auto" data-testid="button-build-agent">
                <Bot className="w-4 h-4" />
                Build Your Agent
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 md:gap-10 mt-14 max-w-lg mx-auto px-4 animate-fade-in" style={{ animationDelay: '0.8s', opacity: 0, animationFillMode: 'forwards' }} data-testid="container-landing-stats">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Users className="w-4 h-4 text-amber-500" />
              {statsLoading ? (
                <span className="h-7 w-14 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold" data-testid="text-total-users">{totalUsers.toLocaleString()}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Players</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Swords className="w-4 h-4 text-amber-500" />
              {statsLoading ? (
                <span className="h-7 w-14 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold" data-testid="text-total-duels">{(stats?.totalNfas || 0).toLocaleString()}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Duels Fought</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              {statsLoading ? (
                <span className="h-7 w-14 bg-muted animate-pulse rounded" />
              ) : (
                <span className="text-2xl font-bold" data-testid="text-total-volume">{stats?.totalVolume || "0"} BNB</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">Prize Volume</div>
          </div>
        </div>

        <div className="mt-14 w-full max-w-4xl mx-auto px-4 animate-fade-in" style={{ animationDelay: '1s', opacity: 0, animationFillMode: 'forwards' }}>
          <h2 className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6" data-testid="text-game-modes">Three Ways to Compete</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/arena">
              <Card className="p-5 text-center hover-elevate cursor-pointer h-full" data-testid="link-mode-practice">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500 mx-auto mb-3">
                  <Shield className="w-5 h-5" />
                </div>
                <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 mb-2">Free</Badge>
                <h3 className="font-semibold text-sm mb-1">Practice Mode</h3>
                <p className="text-xs text-muted-foreground">Train against AI bots. No tokens needed. Sharpen your strategies risk-free.</p>
              </Card>
            </Link>
            <Link href="/arena">
              <Card className="p-5 text-center hover-elevate cursor-pointer h-full" data-testid="link-mode-pvp">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-3">
                  <Swords className="w-5 h-5" />
                </div>
                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 border-amber-500/20 mb-2">PvP</Badge>
                <h3 className="font-semibold text-sm mb-1">Human vs Human</h3>
                <p className="text-xs text-muted-foreground">Real stakes. Skill vs skill. Winner takes 90% of the BNB prize pot.</p>
              </Card>
            </Link>
            <Link href="/arena">
              <Card className="p-5 text-center hover-elevate cursor-pointer h-full" data-testid="link-mode-ava">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 mx-auto mb-3">
                  <Cpu className="w-5 h-5" />
                </div>
                <Badge variant="secondary" className="bg-purple-500/10 text-purple-500 border-purple-500/20 mb-2">AvA</Badge>
                <h3 className="font-semibold text-sm mb-1">Agent vs Agent</h3>
                <p className="text-xs text-muted-foreground">Deploy your AI agents to battle autonomously. The ultimate strategy test.</p>
              </Card>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-3xl mx-auto px-4 animate-fade-in" style={{ animationDelay: '1.1s', opacity: 0, animationFillMode: 'forwards' }}>
          <FeatureCard 
            icon={<ChartCandlestick className="w-5 h-5" />}
            title="Real Charts"
            description="Live price data from Binance"
            testId="card-feature-charts"
          />
          <FeatureCard 
            icon={<Shield className="w-5 h-5" />}
            title="On-Chain Escrow"
            description="BNB locked in smart contract"
            testId="card-feature-escrow"
          />
          <FeatureCard 
            icon={<Flame className="w-5 h-5" />}
            title="Up to 50x Leverage"
            description="Long or short any asset"
            testId="card-feature-leverage"
          />
          <FeatureCard 
            icon={<Bot className="w-5 h-5" />}
            title="Build AI Agents"
            description="Create, train, and deploy"
            testId="card-feature-bots"
          />
        </div>

        <div className="mt-14 w-full max-w-4xl mx-auto px-4 animate-fade-in" style={{ animationDelay: '1.2s', opacity: 0, animationFillMode: 'forwards' }} data-testid="container-arena-features">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-amber-500/5 border border-amber-500/20">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Bot className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold" data-testid="text-arena-features">The Agent Economy</h3>
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                Build to Earn
              </Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50" data-testid="card-create-agents">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Create Agents</div>
                  <div className="text-xs text-muted-foreground">Build and train AI trading agents with custom strategies</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50" data-testid="card-compete-agents">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Swords className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Compete & Earn</div>
                  <div className="text-xs text-muted-foreground">Deploy agents in AvA battles for BNB rewards</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-background/50" data-testid="card-agent-marketplace">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Target className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Agent Showroom</div>
                  <div className="text-xs text-muted-foreground">Browse, showcase, and monetize your top-performing agents</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-14 w-full max-w-4xl mx-auto px-4 animate-fade-in" style={{ animationDelay: '1.25s', opacity: 0, animationFillMode: 'forwards' }}>
          <h2 className="text-center text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Link href="/register">
              <Card className="p-4 text-center hover-elevate cursor-pointer h-full" data-testid="link-step-1">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-2">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="text-[10px] text-amber-500 font-semibold mb-0.5">Step 1</div>
                <h3 className="font-semibold text-xs mb-0.5">Connect Wallet</h3>
                <p className="text-[11px] text-muted-foreground">Link your BNB wallet to get started</p>
              </Card>
            </Link>
            <Link href="/arena">
              <Card className="p-4 text-center hover-elevate cursor-pointer h-full" data-testid="link-step-2">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-2">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-[10px] text-amber-500 font-semibold mb-0.5">Step 2</div>
                <h3 className="font-semibold text-xs mb-0.5">Practice Free</h3>
                <p className="text-[11px] text-muted-foreground">Train your skills against AI bots</p>
              </Card>
            </Link>
            <Link href="/hatchery">
              <Card className="p-4 text-center hover-elevate cursor-pointer h-full" data-testid="link-step-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-2">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="text-[10px] text-amber-500 font-semibold mb-0.5">Step 3</div>
                <h3 className="font-semibold text-xs mb-0.5">Build Agents</h3>
                <p className="text-[11px] text-muted-foreground">Create and deploy AI trading agents</p>
              </Card>
            </Link>
            <Link href="/arena">
              <Card className="p-4 text-center hover-elevate cursor-pointer h-full" data-testid="link-step-4">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-2">
                  <Trophy className="w-4 h-4" />
                </div>
                <div className="text-[10px] text-amber-500 font-semibold mb-0.5">Step 4</div>
                <h3 className="font-semibold text-xs mb-0.5">Compete & Earn</h3>
                <p className="text-[11px] text-muted-foreground">Battle for BNB in PvP and AvA arenas</p>
              </Card>
            </Link>
          </div>
        </div>

        {leaderboardLoading ? (
          <div className="mt-10 max-w-sm mx-auto px-4 animate-fade-in" style={{ animationDelay: '1.4s', opacity: 0, animationFillMode: 'forwards' }}>
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm">Top Competitors</h3>
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3">
                    <div className="w-5 h-5 bg-muted animate-pulse rounded" />
                    <div className="w-7 h-7 bg-muted animate-pulse rounded-full" />
                    <div className="flex-1 h-4 bg-muted animate-pulse rounded" />
                    <div className="w-14 h-5 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : leaderboardData?.leaderboard && leaderboardData.leaderboard.length > 0 && (
          <div className="mt-10 max-w-sm mx-auto px-4 animate-fade-in" style={{ animationDelay: '1.4s', opacity: 0, animationFillMode: 'forwards' }} data-testid="container-leaderboard">
            <Card className="p-5">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-sm">Top Competitors</h3>
              </div>
              <div className="space-y-2.5">
                {leaderboardData.leaderboard.slice(0, 5).map((entry, index) => (
                  <div key={entry.agent.id} className="flex flex-wrap items-center gap-2.5" data-testid={`row-leaderboard-${entry.agent.id}`}>
                    <div className="w-5 text-center">
                      {index === 0 ? (
                        <Crown className="w-4 h-4 text-amber-500 mx-auto" />
                      ) : index === 1 ? (
                        <Medal className="w-4 h-4 text-gray-400 mx-auto" />
                      ) : index === 2 ? (
                        <Medal className="w-4 h-4 text-amber-700 mx-auto" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{index + 1}</span>
                      )}
                    </div>
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={entry.agent.avatarUrl || undefined} />
                      <AvatarFallback className="bg-amber-500/20 text-amber-500 text-xs">
                        {entry.agent.name?.slice(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm font-medium truncate" data-testid={`text-referrer-name-${entry.agent.id}`}>{entry.agent.name}</span>
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-500" data-testid={`badge-referral-count-${entry.agent.id}`}>
                      {entry.referralCount} referrals
                    </Badge>
                  </div>
                ))}
              </div>
              <Link href="/rewards">
                <Button variant="ghost" size="sm" className="w-full mt-3 text-amber-500" data-testid="button-view-leaderboard">
                  View Full Leaderboard
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </Card>
          </div>
        )}

        <div className="mt-14 text-center animate-fade-in" style={{ animationDelay: '1.5s', opacity: 0, animationFillMode: 'forwards' }}>
          <p className="text-xs text-muted-foreground/50 tracking-widest uppercase mb-2" data-testid="text-footer-tagline">
            AI + Gaming + Trading + Ownership
          </p>
          <div className="flex items-center justify-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="w-1.5 h-1.5 rounded-full bg-amber-500/60"
                style={{ animation: `pulse 1.5s ease-in-out infinite ${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
    </div>
  );
}

function FeatureCard({ icon, title, description, testId }: { icon: React.ReactNode; title: string; description: string; testId: string }) {
  return (
    <Card className="p-4 hover-elevate" data-testid={testId}>
      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2.5">
        {icon}
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </Card>
  );
}
