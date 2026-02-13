import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Maximize2, Minimize2, Trophy, Gamepad2 } from "lucide-react";
import { getBestScore, getTotalCoins, getTotalRuns } from "@/game/storage";

export default function HoneyRunner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stats, setStats] = useState({ best: 0, coins: 0, runs: 0 });

  useEffect(() => {
    setStats({ best: getBestScore(), coins: getTotalCoins(), runs: getTotalRuns() });
  }, []);

  useEffect(() => {
    let game: any = null;
    let mounted = true;

    const initGame = async () => {
      if (!containerRef.current || !mounted) return;
      const { createHoneyRunnerGame } = await import("@/game/HoneyRunnerGame");
      if (!mounted || !containerRef.current) return;
      game = createHoneyRunnerGame(containerRef.current);
      gameRef.current = game;
    };

    initGame();

    const interval = setInterval(() => {
      setStats({ best: getBestScore(), coins: getTotalCoins(), runs: getTotalRuns() });
    }, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (game) {
        game.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  const toggleFullscreen = () => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-3 py-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold">HoneyRunner</h2>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/30 text-amber-400">
            Endless Runner
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {stats.best > 0 && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 gap-1">
              <Trophy className="w-3 h-3 text-amber-400" /> Best: {stats.best.toLocaleString()}
            </Badge>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleFullscreen}
            data-testid="button-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0 flex items-center justify-center bg-[#0a0a1a]">
          <div
            ref={containerRef}
            className="w-full"
            style={{ maxWidth: 480, aspectRatio: "480/854" }}
            data-testid="game-container"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Runs</p>
            <p className="text-lg font-bold font-mono" data-testid="text-total-runs">{stats.runs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Coins</p>
            <p className="text-lg font-bold font-mono text-amber-400" data-testid="text-total-coins">{stats.coins.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Best Score</p>
            <p className="text-lg font-bold font-mono text-amber-400" data-testid="text-best-score">{stats.best.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Controls</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">Left/Right</Badge>
              <span className="text-muted-foreground">Change lane</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">Up</Badge>
              <span className="text-muted-foreground">Jump</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">Down</Badge>
              <span className="text-muted-foreground">Slide</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">Swipe</Badge>
              <span className="text-muted-foreground">Mobile controls</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
