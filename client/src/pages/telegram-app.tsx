import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Hexagon,
  Home,
  Swords,
  Trophy,
  User,
  Users,
  Crown,
  Medal,
  Share2,
  ExternalLink,
  Clock,
  Coins,
} from "lucide-react";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        openLink: (url: string) => void;
        openTelegramLink: (url: string) => void;
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
        };
      };
    };
  }
}

type TabType = "home" | "arena" | "leaderboard" | "profile";

interface LandingStats {
  totalUsers: number;
  totalNfas: number;
  totalVolume: string;
}

interface Duel {
  id: number;
  asset: string;
  duration: number;
  stakeAmount: string;
  status: string;
  creatorName?: string;
}

interface LeaderboardEntry {
  agent: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  referralCount: number;
}

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

function HomeTab({ onSwitchTab }: { onSwitchTab: (tab: TabType) => void }) {
  const { data: stats, isLoading } = useQuery<LandingStats>({
    queryKey: ["/api/landing-stats"],
    staleTime: 30000,
  });

  const BASE_USER_COUNT = 517;
  const totalUsers = BASE_USER_COUNT + (stats?.totalUsers || 0);

  const handleInvite = () => {
    const shareUrl = `${BASE_URL}/r/tg`;
    const text = "Join me on Honeycomb - the AI Trading Arena on BNB Chain!";
    const tgLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.Telegram?.WebApp?.openTelegramLink(tgLink);
  };

  const handleViewAgents = () => {
    const url = `${BASE_URL}/nfa`;
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="flex flex-col items-center px-4 pt-8 pb-4">
      <div className="flex items-center gap-3 mb-2">
        <Hexagon className="w-10 h-10 text-amber-500 fill-amber-500/30" />
        <h1
          className="text-3xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent"
          data-testid="text-tg-title"
        >
          Honeycomb
        </h1>
      </div>
      <p className="text-sm text-gray-400 mb-6" data-testid="text-tg-subtitle">
        AI Trading Arena on BNB Chain
      </p>

      <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-3.5 h-3.5 text-amber-500" />
            {isLoading ? (
              <span className="h-6 w-10 bg-gray-700 animate-pulse rounded" />
            ) : (
              <span className="text-xl font-bold text-white" data-testid="text-tg-players">
                {totalUsers.toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500">Players</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Swords className="w-3.5 h-3.5 text-amber-500" />
            {isLoading ? (
              <span className="h-6 w-10 bg-gray-700 animate-pulse rounded" />
            ) : (
              <span className="text-xl font-bold text-white" data-testid="text-tg-duels">
                {(stats?.totalNfas || 0).toLocaleString()}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500">Duels</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            {isLoading ? (
              <span className="h-6 w-10 bg-gray-700 animate-pulse rounded" />
            ) : (
              <span className="text-xl font-bold text-white" data-testid="text-tg-volume">
                {stats?.totalVolume || "0"} BNB
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500">Prize Volume</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-sm">
        <Button
          size="lg"
          className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          onClick={() => onSwitchTab("arena")}
          data-testid="button-tg-enter-arena"
        >
          <Swords className="w-4 h-4" />
          Enter Arena
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full gap-2 border-amber-500/50 text-amber-400"
          onClick={handleViewAgents}
          data-testid="button-tg-view-agents"
        >
          <ExternalLink className="w-4 h-4" />
          View Agents
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="w-full gap-2 border-amber-500/30 text-amber-300"
          onClick={handleInvite}
          data-testid="button-tg-invite"
        >
          <Share2 className="w-4 h-4" />
          Invite Friends
        </Button>
      </div>
    </div>
  );
}

function ArenaTab() {
  const { data: duels, isLoading } = useQuery<Duel[]>({
    queryKey: ["/api/duels", "waiting"],
    queryFn: async () => {
      const res = await fetch("/api/duels?status=waiting");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 15000,
  });

  const handleCreateDuel = () => {
    const url = `${BASE_URL}/arena`;
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleJoinDuel = (duelId: number) => {
    const url = `${BASE_URL}/arena/${duelId}`;
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <h2 className="text-xl font-bold text-white mb-1" data-testid="text-tg-arena-title">
        Trading Arena
      </h2>
      <p className="text-xs text-gray-400 mb-4">Open duels waiting for challengers</p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 bg-[#242444] border-gray-700/50">
              <div className="h-16 bg-gray-700/50 animate-pulse rounded" />
            </Card>
          ))}
        </div>
      ) : !duels || duels.length === 0 ? (
        <Card className="p-8 bg-[#242444] border-gray-700/50 text-center" data-testid="container-tg-empty-duels">
          <Swords className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400 mb-1">No open duels right now</p>
          <p className="text-xs text-gray-500">Create one from the full site</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {duels.map((duel) => (
            <Card
              key={duel.id}
              className="p-4 bg-[#242444] border-gray-700/50"
              data-testid={`card-tg-duel-${duel.id}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-semibold text-white text-sm">{duel.asset}</span>
                <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  {duel.stakeAmount} BNB
                </Badge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {duel.duration}m
                </div>
                <Button
                  size="sm"
                  className="bg-amber-500 text-black"
                  onClick={() => handleJoinDuel(duel.id)}
                  data-testid={`button-tg-join-duel-${duel.id}`}
                >
                  Join
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        className="w-full mt-4 border-amber-500/30 text-amber-400 gap-2"
        onClick={handleCreateDuel}
        data-testid="button-tg-create-duel"
      >
        <ExternalLink className="w-4 h-4" />
        Create Practice Duel
      </Button>
    </div>
  );
}

function LeaderboardTab() {
  const { data, isLoading } = useQuery<{
    leaderboard: LeaderboardEntry[];
  }>({
    queryKey: ["/api/leaderboards/referrers?limit=10"],
    staleTime: 60000,
  });

  return (
    <div className="px-4 pt-6 pb-4">
      <h2 className="text-xl font-bold text-white mb-1" data-testid="text-tg-leaderboard-title">
        Top Competitors
      </h2>
      <p className="text-xs text-gray-400 mb-4">Community leaders by referrals</p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-wrap items-center gap-3">
              <div className="w-6 h-6 bg-gray-700 animate-pulse rounded" />
              <div className="w-8 h-8 bg-gray-700 animate-pulse rounded-full" />
              <div className="flex-1 h-4 bg-gray-700 animate-pulse rounded" />
              <div className="w-16 h-5 bg-gray-700 animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : !data?.leaderboard || data.leaderboard.length === 0 ? (
        <Card className="p-8 bg-[#242444] border-gray-700/50 text-center" data-testid="container-tg-empty-leaderboard">
          <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No competitors yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.leaderboard.map((entry, index) => (
            <Card
              key={entry.agent.id}
              className="p-3 bg-[#242444] border-gray-700/50"
              data-testid={`row-tg-leaderboard-${entry.agent.id}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-6 text-center shrink-0">
                  {index === 0 ? (
                    <Crown className="w-5 h-5 text-amber-500 mx-auto" />
                  ) : index === 1 ? (
                    <Medal className="w-5 h-5 text-gray-400 mx-auto" />
                  ) : index === 2 ? (
                    <Medal className="w-5 h-5 text-amber-700 mx-auto" />
                  ) : (
                    <span className="text-xs text-gray-500 font-medium">{index + 1}</span>
                  )}
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={entry.agent.avatarUrl || undefined} />
                  <AvatarFallback className="bg-amber-500/20 text-amber-500 text-xs">
                    {entry.agent.name?.slice(0, 2).toUpperCase() || "??"}
                  </AvatarFallback>
                </Avatar>
                <span
                  className="flex-1 text-sm font-medium text-white truncate"
                  data-testid={`text-tg-referrer-${entry.agent.id}`}
                >
                  {entry.agent.name}
                </span>
                <Badge variant="secondary" className="bg-amber-500/15 text-amber-400 border-amber-500/20">
                  {entry.referralCount} refs
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ agent, loading }: { agent: TgAgent | null; loading: boolean }) {
  const isAuthenticated = !!agent;
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;

  const handleShareReferral = () => {
    const shareUrl = `${BASE_URL}/r/tg`;
    const text = "Join Honeycomb and compete in AI trading duels!";
    const tgLink = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.Telegram?.WebApp?.openTelegramLink(tgLink);
  };

  const handleOpenSite = () => {
    const url = BASE_URL;
    if (window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-xl font-bold text-white mb-1" data-testid="text-tg-profile-title">
          Profile
        </h2>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-xl font-bold text-white mb-1" data-testid="text-tg-profile-title">
          Profile
        </h2>
        <Card className="p-6 bg-[#242444] border-gray-700/50 text-center mt-4" data-testid="container-tg-connect">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Connect to Honeycomb</h3>
          <p className="text-sm text-gray-400 mb-4">
            Open the full site and connect your wallet to sync your profile with the Telegram app.
          </p>
          <Button
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
            onClick={handleOpenSite}
            data-testid="button-tg-open-site-connect"
          >
            <ExternalLink className="w-4 h-4" />
            Open Full Site
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <h2 className="text-xl font-bold text-white mb-1" data-testid="text-tg-profile-title">
        Profile
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        {agent.name || (tgUser ? `@${tgUser.username || tgUser.first_name}` : "Telegram User")}
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 bg-[#242444] border-gray-700/50 text-center" data-testid="card-tg-wins">
          <div className="text-2xl font-bold text-green-400">{agent.arenaWins}</div>
          <div className="text-[10px] text-gray-500">Wins</div>
        </Card>
        <Card className="p-4 bg-[#242444] border-gray-700/50 text-center" data-testid="card-tg-losses">
          <div className="text-2xl font-bold text-red-400">{agent.arenaLosses}</div>
          <div className="text-[10px] text-gray-500">Losses</div>
        </Card>
        <Card className="p-4 bg-[#242444] border-gray-700/50 text-center" data-testid="card-tg-rating">
          <div className="text-2xl font-bold text-amber-400">{agent.arenaRating}</div>
          <div className="text-[10px] text-gray-500">Rating</div>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white"
          onClick={handleShareReferral}
          data-testid="button-tg-share-referral"
        >
          <Share2 className="w-4 h-4" />
          Share Referral Link
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2 border-amber-500/30 text-amber-400"
          onClick={handleOpenSite}
          data-testid="button-tg-open-site"
        >
          <ExternalLink className="w-4 h-4" />
          Open Full Site
        </Button>
      </div>
    </div>
  );
}

const tabs: { id: TabType; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "arena", label: "Arena", icon: Swords },
  { id: "leaderboard", label: "Leaders", icon: Trophy },
  { id: "profile", label: "Profile", icon: User },
];

interface TgAgent {
  id: string;
  name: string;
  ownerAddress: string;
  arenaWins: number;
  arenaLosses: number;
  arenaRating: number;
  avatarUrl?: string;
}

function useTelegramAuth() {
  const [agent, setAgent] = useState<TgAgent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function authenticate() {
      try {
        const existing = localStorage.getItem("tg_token");
        if (existing) {
          const meRes = await fetch("/api/telegram/me", {
            headers: { Authorization: `Bearer ${existing}` },
          });
          if (meRes.ok) {
            const data = await meRes.json();
            setAgent(data);
            setLoading(false);
            return;
          }
          localStorage.removeItem("tg_token");
        }

        const initData = window.Telegram?.WebApp?.initData;
        if (!initData) {
          setLoading(false);
          return;
        }

        const authRes = await fetch("/api/telegram/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData }),
        });

        if (authRes.ok) {
          const { token, agent: agentData } = await authRes.json();
          localStorage.setItem("tg_token", token);
          setAgent(agentData);
        }
      } catch (err) {
        console.error("Telegram auth error:", err);
      }
      setLoading(false);
    }

    authenticate();
  }, []);

  return { agent, loading };
}

export default function TelegramApp() {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const { agent: tgAgent, loading: authLoading } = useTelegramAuth();

  useEffect(() => {
    const webapp = window.Telegram?.WebApp;
    if (webapp) {
      webapp.ready();
      webapp.expand();
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white flex flex-col">
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === "home" && <HomeTab onSwitchTab={setActiveTab} />}
        {activeTab === "arena" && <ArenaTab />}
        {activeTab === "leaderboard" && <LeaderboardTab />}
        {activeTab === "profile" && <ProfileTab agent={tgAgent} loading={authLoading} />}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 bg-[#12122a] border-t border-gray-700/50 z-50"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        data-testid="container-tg-tab-bar"
      >
        <div className="flex items-center justify-around gap-1 px-2 py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? "text-amber-500"
                    : "text-gray-500"
                }`}
                data-testid={`button-tg-tab-${tab.id}`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}