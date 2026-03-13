import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Trophy } from "lucide-react";

export function RunnerSubTab() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);
  const [stats, setStats] = useState({ best: 0, coins: 0, runs: 0 });

  useEffect(() => {
    let game: { destroy: (removeCanvas: boolean) => void } | null = null;
    let mounted = true;

    const initGame = async () => {
      if (!containerRef.current || !mounted) return;
      try {
        const { getBestScore, getTotalCoins, getTotalRuns } = await import("@/game/storage");
        setStats({ best: getBestScore(), coins: getTotalCoins(), runs: getTotalRuns() });

        const { createHoneyRunnerGame } = await import("@/game/HoneyRunnerGame");
        if (!mounted || !containerRef.current) return;
        game = createHoneyRunnerGame(containerRef.current);
        gameRef.current = game;
      } catch (e) {
        console.error("Failed to init game:", e);
      }
    };

    initGame();

    const statsInterval = setInterval(async () => {
      try {
        const { getBestScore, getTotalCoins, getTotalRuns } = await import("@/game/storage");
        setStats({ best: getBestScore(), coins: getTotalCoins(), runs: getTotalRuns() });
      } catch { /* storage error */ }
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(statsInterval);
      if (game) {
        game.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">HoneyRunner</span>
          <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-amber-500/30 text-amber-400">
            Endless Runner
          </Badge>
        </div>
        {stats.best > 0 && (
          <Badge variant="outline" className="text-[9px] py-0 px-1.5 gap-1">
            <Trophy className="w-2.5 h-2.5 text-amber-400" /> {stats.best.toLocaleString()}
          </Badge>
        )}
      </div>

      <Card className="overflow-hidden border-gray-700/30">
        <CardContent className="p-0 flex items-center justify-center bg-[#0a0a1a]">
          <div
            ref={containerRef}
            className="w-full"
            style={{ maxWidth: 480, aspectRatio: "480/854" }}
            data-testid="tg-game-container"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-[#242444] border-gray-700/50">
          <CardContent className="p-2 text-center">
            <p className="text-[9px] uppercase text-gray-500">Runs</p>
            <p className="text-sm font-bold font-mono" data-testid="text-tg-runs">{stats.runs}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#242444] border-gray-700/50">
          <CardContent className="p-2 text-center">
            <p className="text-[9px] uppercase text-gray-500">Coins</p>
            <p className="text-sm font-bold font-mono text-amber-400" data-testid="text-tg-coins">{stats.coins.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#242444] border-gray-700/50">
          <CardContent className="p-2 text-center">
            <p className="text-[9px] uppercase text-gray-500">Best</p>
            <p className="text-sm font-bold font-mono text-amber-400" data-testid="text-tg-best">{stats.best.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#242444] border-gray-700/50">
        <CardContent className="p-3">
          <p className="text-[9px] uppercase text-gray-500 mb-1.5">Controls</p>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[8px] py-0 px-1 font-mono">←/→</Badge>
              <span className="text-gray-400">Lane</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[8px] py-0 px-1 font-mono">↑</Badge>
              <span className="text-gray-400">Jump</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[8px] py-0 px-1 font-mono">↓</Badge>
              <span className="text-gray-400">Slide</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[8px] py-0 px-1 font-mono">Swipe</Badge>
              <span className="text-gray-400">Mobile</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
