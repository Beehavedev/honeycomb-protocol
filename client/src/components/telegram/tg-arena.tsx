import { useState } from "react";
import {
  Swords, TrendingUp, Brain, Flame, Gamepad2, Zap,
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

const SUB_TABS: { id: ArenaSubTab; label: string; icon: typeof Swords; color: string }[] = [
  { id: "trading", label: "Trade", icon: Swords, color: "text-amber-400" },
  { id: "predict", label: "Predict", icon: TrendingUp, color: "text-purple-400" },
  { id: "trivia", label: "Trivia", icon: Brain, color: "text-blue-400" },
  { id: "fighters", label: "Fight", icon: Flame, color: "text-red-400" },
  { id: "games", label: "Games", icon: Gamepad2, color: "text-green-400" },
  { id: "runner", label: "Runner", icon: Zap, color: "text-amber-400" },
];

export function TgArenaTab({ agent }: { agent?: TgAgentInfo }) {
  const [subTab, setSubTab] = useState<ArenaSubTab>("trading");

  return (
    <div className="px-2 pt-4 pb-4">
      <h2 className="text-xl font-bold text-white mb-2 px-2" data-testid="text-tg-arena-title">
        Trading Arena
      </h2>

      <div className="flex gap-1 overflow-x-auto pb-2 px-1 mb-3 scrollbar-hide" data-testid="container-tg-arena-tabs">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { arenaHaptic(); setSubTab(tab.id); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "text-gray-400 border border-gray-700/50 hover:border-gray-600"
              }`}
              data-testid={`button-tg-arena-tab-${tab.id}`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? tab.color : ""}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {subTab === "trading" && <TradingSubTab agentId={agent?.id} agent={agent} />}
      {subTab === "predict" && <PredictSubTab agent={agent} />}
      {subTab === "trivia" && <TriviaSubTab agent={agent} />}
      {subTab === "fighters" && <FightersSubTab agent={agent} />}
      {subTab === "games" && <GamesSubTab agent={agent} />}
      {subTab === "runner" && <RunnerSubTab />}
    </div>
  );
}
