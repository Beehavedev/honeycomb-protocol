import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Swords, TrendingUp, Brain, Flame, Gamepad2, Zap,
  Trophy, Crown, ChevronRight, Sparkles, HelpCircle, ChevronDown,
} from "lucide-react";

function arenaHaptic() {
  try {
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged();
  } catch {}
}
import type { ArenaSubTab, TgAgentInfo } from "./tg-arena-types";
import { TradingSubTab } from "./tg-arena-trading";
import { PredictSubTab } from "./tg-arena-predict";
import { TriviaSubTab } from "./tg-arena-trivia";
import { FightersSubTab } from "./tg-arena-fighters";
import { GamesSubTab } from "./tg-arena-games";
import { RunnerSubTab } from "./tg-arena-runner";

export type { TgAgentInfo } from "./tg-arena-types";

const SUB_TABS: { id: ArenaSubTab; label: string; icon: typeof Swords; color: string; activeGrad: string }[] = [
  { id: "trading", label: "Trade", icon: Swords, color: "text-amber-400", activeGrad: "from-amber-500 to-orange-500" },
  { id: "predict", label: "Predict", icon: TrendingUp, color: "text-purple-400", activeGrad: "from-purple-500 to-blue-500" },
  { id: "trivia", label: "Trivia", icon: Brain, color: "text-blue-400", activeGrad: "from-blue-500 to-indigo-500" },
  { id: "fighters", label: "Fight", icon: Flame, color: "text-red-400", activeGrad: "from-red-500 to-orange-500" },
  { id: "games", label: "Games", icon: Gamepad2, color: "text-green-400", activeGrad: "from-green-500 to-emerald-500" },
  { id: "runner", label: "Runner", icon: Zap, color: "text-yellow-400", activeGrad: "from-yellow-500 to-amber-500" },
];

function PulsingDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

const GUIDE_SECTIONS = [
  {
    title: "Trading Duels",
    icon: Swords,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    items: [
      "Pick an asset (BTC, ETH, or BNB) and a duration (2 or 5 min)",
      "Choose AI Bot mode to play instantly, or PvP to duel a friend",
      "Both players go LONG or SHORT on the price",
      "When time's up, the player whose position gained more wins",
      "Winner takes the pot minus 10% platform fee (5% for $HONEY holders)",
      "PvP: Share your duel code with a friend to start",
    ],
  },
  {
    title: "Price Predictions",
    icon: TrendingUp,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    items: [
      "Pick an asset (BTC, ETH, BNB, or SOL)",
      "Choose duration: 1 min (Speed), 5 min (Standard), or 10 min (Long)",
      "Stake BNB — from free practice to 0.1 BNB",
      "Predict UP or DOWN on the price",
      "Live chart shows your entry price and current movement",
      "If your prediction is correct, you win 1.8x your stake",
      "Status banner shows WAITING → WINNING/LOSING in real time",
    ],
  },
  {
    title: "Scoring & Rewards",
    icon: Trophy,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    items: [
      "Every duel and prediction earns ELO rating points",
      "Climb the leaderboard: Bronze → Silver → Gold → Diamond → Apex",
      "All arena activity earns points toward the $HONEY airdrop",
      "Higher tiers unlock reduced fees and exclusive tournaments",
      "Winnings are sent directly to your custodial BNB wallet",
    ],
  },
  {
    title: "How Payouts Work",
    icon: Sparkles,
    color: "text-green-400",
    bg: "bg-green-500/10",
    items: [
      "Trading Duels: Winner gets loser's stake minus 10% fee",
      "Predictions: Correct call pays 1.8x your stake",
      "Free mode: No BNB risk, still earns points and ELO",
      "BNB is held in escrow during active duels — fully on-chain",
      "$HONEY holders pay half fees on everything",
    ],
  },
];

function HowItWorksGuide() {
  const [open, setOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="px-3 mb-4" data-testid="container-tg-arena-guide">
      <button
        onClick={() => { arenaHaptic(); setOpen(!open); }}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] active:scale-[0.98] transition-all"
        data-testid="button-tg-arena-guide-toggle"
      >
        <HelpCircle className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-bold text-white flex-1 text-left">How It Works</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-2" data-testid="container-tg-arena-guide-content">
          {GUIDE_SECTIONS.map((section, idx) => {
            const Icon = section.icon;
            const isExpanded = expandedIdx === idx;
            return (
              <div key={section.title} className="rounded-xl bg-white/[0.02] border border-white/[0.04] overflow-hidden">
                <button
                  onClick={() => { arenaHaptic(); setExpandedIdx(isExpanded ? null : idx); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.03] active:scale-[0.99] transition-all"
                  data-testid={`button-tg-arena-guide-section-${idx}`}
                >
                  <div className={`w-7 h-7 rounded-lg ${section.bg} flex items-center justify-center`}>
                    <Icon className={`w-3.5 h-3.5 ${section.color}`} />
                  </div>
                  <span className="text-xs font-semibold text-white flex-1 text-left">{section.title}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0.5 space-y-1.5">
                    {section.items.map((item, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="text-[10px] text-gray-600 mt-0.5 shrink-0">{i + 1}.</span>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TgArenaTab({ agent }: { agent?: TgAgentInfo }) {
  const [subTab, setSubTab] = useState<ArenaSubTab | null>(null);

  const { data: leaderboard } = useQuery<Array<{ name: string; rating: number; wins: number }>>({
    queryKey: ["/api/arena/leaderboard"],
    queryFn: async () => {
      const res = await fetch("/api/arena/leaderboard?limit=3");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30000,
  });

  if (subTab) {
    return (
      <div className="pb-4">
        <div className="flex items-center gap-2 px-3 pt-3 pb-2">
          <button
            onClick={() => { arenaHaptic(); setSubTab(null); }}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all active:scale-95"
            data-testid="button-tg-arena-back"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
          <span className="text-sm font-bold text-white">
            {SUB_TABS.find(t => t.id === subTab)?.label || "Arena"}
          </span>
        </div>
        <div className="px-3">
          {subTab === "trading" && <TradingSubTab agentId={agent?.id} agent={agent} />}
          {subTab === "predict" && <PredictSubTab agent={agent} />}
          {subTab === "trivia" && <TriviaSubTab agent={agent} />}
          {subTab === "fighters" && <FightersSubTab agent={agent} />}
          {subTab === "games" && <GamesSubTab agent={agent} />}
          {subTab === "runner" && <RunnerSubTab />}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="relative overflow-hidden rounded-2xl mx-3 mt-3 mb-4" data-testid="container-tg-arena-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/30 via-orange-600/20 to-red-700/30" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 left-4 w-20 h-20 border border-amber-400/30 rounded-full" />
          <div className="absolute bottom-2 right-6 w-16 h-16 border border-orange-400/20 rounded-full" />
          <div className="absolute top-8 right-12 w-6 h-6 border border-yellow-400/40 rounded-full" />
        </div>
        <div className="relative px-5 pt-5 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight" data-testid="text-tg-arena-title">
                ARENA
              </h2>
              <div className="flex items-center gap-1.5">
                <PulsingDot color="bg-green-400" />
                <span className="text-[10px] text-green-400 font-medium">LIVE</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-300/80 mt-2 leading-relaxed">
            Trade, predict, and compete for real BNB rewards
          </p>
        </div>
      </div>

      <div className="px-3 mb-4" data-testid="container-tg-arena-featured">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => { arenaHaptic(); setSubTab("predict"); }}
            className="relative overflow-hidden rounded-xl p-3 text-left active:scale-[0.97] transition-transform"
            style={{ background: "linear-gradient(135deg, rgba(147,51,234,0.25) 0%, rgba(79,70,229,0.15) 100%)" }}
            data-testid="button-tg-arena-featured-predict"
          >
            <div className="absolute top-1 right-1">
              <span className="text-[8px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded-full">HOT</span>
            </div>
            <TrendingUp className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-xs font-bold text-white">Price Predict</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Stake BNB on price</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-[9px] text-purple-400 font-semibold">Play now</span>
              <ChevronRight className="w-3 h-3 text-purple-400" />
            </div>
          </button>

          <button
            onClick={() => { arenaHaptic(); setSubTab("trading"); }}
            className="relative overflow-hidden rounded-xl p-3 text-left active:scale-[0.97] transition-transform"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(234,88,12,0.15) 100%)" }}
            data-testid="button-tg-arena-featured-trading"
          >
            <div className="absolute top-1 right-1">
              <PulsingDot color="bg-amber-400" />
            </div>
            <Swords className="w-6 h-6 text-amber-400 mb-2" />
            <p className="text-xs font-bold text-white">Trading Duel</p>
            <p className="text-[10px] text-gray-400 mt-0.5">1v1 live trading</p>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-[9px] text-amber-400 font-semibold">Play now</span>
              <ChevronRight className="w-3 h-3 text-amber-400" />
            </div>
          </button>
        </div>
      </div>

      <div className="px-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Gamepad2 className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">All Games</span>
        </div>
        <div className="space-y-1.5" data-testid="container-tg-arena-games-list">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { arenaHaptic(); setSubTab(tab.id); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] active:scale-[0.98] transition-all border border-white/[0.04]"
                data-testid={`button-tg-arena-tab-${tab.id}`}
              >
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${tab.activeGrad} flex items-center justify-center shadow-sm`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{tab.label}</p>
                  <p className="text-[10px] text-gray-500">
                    {tab.id === "trading" && "Trade vs AI or friends"}
                    {tab.id === "predict" && "Predict price direction"}
                    {tab.id === "trivia" && "Test your crypto knowledge"}
                    {tab.id === "fighters" && "Battle with crypto fighters"}
                    {tab.id === "games" && "Reaction, aim & PNL duels"}
                    {tab.id === "runner" && "Endless runner game"}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            );
          })}
        </div>
      </div>

      {leaderboard && leaderboard.length > 0 && (
        <div className="px-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Top Traders</span>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.04] overflow-hidden">
            {leaderboard.slice(0, 3).map((entry, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 ${i < leaderboard.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                data-testid={`tg-arena-leaderboard-${i}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  i === 0 ? "bg-amber-500/20 text-amber-400" :
                  i === 1 ? "bg-gray-400/20 text-gray-300" :
                  "bg-orange-600/20 text-orange-400"
                }`}>
                  {i === 0 ? <Crown className="w-3.5 h-3.5" /> : `${i + 1}`}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{entry.name}</p>
                  <p className="text-[10px] text-gray-500">{entry.wins}W · {entry.rating} ELO</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-amber-400">{entry.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <HowItWorksGuide />

      <div className="px-3">
        <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/10 p-3 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-white">Earn Points</p>
            <p className="text-[10px] text-gray-400">Every game earns you points toward $HONEY airdrop</p>
          </div>
        </div>
      </div>
    </div>
  );
}
