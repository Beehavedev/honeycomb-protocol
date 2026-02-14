import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Maximize2, Minimize2, Trophy, Gamepad2, Shield, Zap, Target, Crown, Medal } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAccount } from "wagmi";
import { Link } from "wouter";

interface NfaAgent {
  id: string;
  tokenId: number;
  name: string;
  description: string;
  agentType: string;
  status: string;
  category: string;
  traits: {
    agility: number;
    focus: number;
    luck: number;
    shielded: boolean;
  };
}

interface LeaderboardEntry {
  id: string;
  playerAddress: string;
  nfaName: string;
  nfaTokenId: number;
  score: number;
  distance: number;
  durationMs: number;
  maxCombo: number;
  verified: boolean;
  createdAt: string;
}

type GameMode = "ranked" | "practice";
type ViewState = "select" | "game" | "leaderboard";

export default function NfaTunnelDash() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<any>(null);
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  const [viewState, setViewState] = useState<ViewState>("select");
  const [selectedNfa, setSelectedNfa] = useState<NfaAgent | null>(null);
  const [mode, setMode] = useState<GameMode>("practice");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lbPeriod, setLbPeriod] = useState<"daily" | "weekly" | "alltime">("alltime");

  const { data: nfaData, isLoading: nfaLoading } = useQuery<{ nfas: NfaAgent[] }>({
    queryKey: ["/api/nfa-tunnel/my-nfas", address],
    queryFn: async () => {
      const res = await fetch(`/api/nfa-tunnel/my-nfas?address=${address}`);
      return res.json();
    },
    enabled: !!address,
  });

  const { data: lbData } = useQuery<{ leaderboard: LeaderboardEntry[] }>({
    queryKey: ["/api/nfa-tunnel/leaderboard", lbPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/nfa-tunnel/leaderboard?mode=${lbPeriod}&limit=50`);
      return res.json();
    },
  });

  const { data: myRuns } = useQuery<{ runs: LeaderboardEntry[] }>({
    queryKey: ["/api/nfa-tunnel/my-runs", address],
    queryFn: async () => {
      const res = await fetch(`/api/nfa-tunnel/my-runs?address=${address}`);
      return res.json();
    },
    enabled: !!address,
  });

  const submitMutation = useMutation({
    mutationFn: async (runData: any) => {
      const res = await apiRequest("POST", "/api/nfa-tunnel/submit", runData);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa-tunnel/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfa-tunnel/my-runs"] });
      if (data.success) {
        toast({ title: "Run Submitted", description: `Score: ${data.run?.score}` });
      }
    },
    onError: (err: any) => {
      toast({ title: "Submit Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleGameOver = useCallback(async (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (!selectedNfa || !address || mode !== "ranked") return;

    const checksumRes = await fetch(
      `/api/nfa-tunnel/checksum?address=${address}&tokenId=${selectedNfa.tokenId}&score=${detail.score}&distance=${detail.distance}&duration=${detail.durationMs}`
    );
    const { checksum } = await checksumRes.json();

    submitMutation.mutate({
      playerAddress: address,
      nfaId: selectedNfa.id,
      nfaTokenId: selectedNfa.tokenId,
      nfaName: selectedNfa.name,
      mode: "ranked",
      score: detail.score,
      distance: detail.distance,
      durationMs: detail.durationMs,
      maxSpeed: detail.maxSpeed,
      coinsCollected: detail.coinsCollected,
      boostsUsed: detail.boostsUsed,
      shieldsUsed: detail.shieldsUsed,
      magnetsUsed: detail.magnetsUsed,
      hits: detail.hits,
      maxCombo: detail.maxCombo,
      nearMisses: detail.nearMisses,
      checksum,
    });
  }, [selectedNfa, address, mode, submitMutation]);

  const handleShowLeaderboard = useCallback(() => {
    setViewState("leaderboard");
  }, []);

  useEffect(() => {
    window.addEventListener("nfa-tunnel:gameover", handleGameOver);
    window.addEventListener("nfa-tunnel:show-leaderboard", handleShowLeaderboard);
    return () => {
      window.removeEventListener("nfa-tunnel:gameover", handleGameOver);
      window.removeEventListener("nfa-tunnel:show-leaderboard", handleShowLeaderboard);
    };
  }, [handleGameOver, handleShowLeaderboard]);

  const [pendingStart, setPendingStart] = useState(false);

  const startGame = () => {
    setViewState("game");
    setPendingStart(true);
  };

  useEffect(() => {
    if (!pendingStart || viewState !== "game") return;
    setPendingStart(false);

    const initGame = async () => {
      await new Promise((r) => requestAnimationFrame(r));
      if (!containerRef.current) return;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }

      const { setTunnelDashConfig, createNfaTunnelDash } = await import("@/game/NfaTunnelDash");
      setTunnelDashConfig({
        nfaId: selectedNfa?.id ?? "",
        nfaTokenId: selectedNfa?.tokenId ?? 0,
        nfaName: selectedNfa?.name ?? "Practice Agent",
        traits: selectedNfa?.traits ?? { agility: 5, focus: 5, luck: 5, shielded: false },
        mode,
        playerAddress: address ?? "",
      });

      const game = createNfaTunnelDash(containerRef.current);
      gameRef.current = game;
    };

    initGame();
  }, [pendingStart, viewState, selectedNfa, mode, address]);

  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
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

  const nfas = nfaData?.nfas ?? [];
  const leaderboard = lbData?.leaderboard ?? [];
  const personalRuns = myRuns?.runs ?? [];
  const bestScore = personalRuns.length > 0 ? personalRuns[0].score : 0;

  const truncAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="max-w-3xl mx-auto px-3 py-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/arena">
            <Button size="icon" variant="ghost" data-testid="button-back-arena">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <Gamepad2 className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold" data-testid="text-page-title">NFA Tunnel Dash</h2>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-amber-500/30 text-amber-400">
            NFA-Gated
          </Badge>
        </div>
        {viewState === "game" && (
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={toggleFullscreen} data-testid="button-fullscreen">
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (gameRef.current) {
                  gameRef.current.destroy(true);
                  gameRef.current = null;
                }
                setViewState("select");
              }}
              data-testid="button-exit-game"
            >
              Exit
            </Button>
          </div>
        )}
        {viewState === "leaderboard" && (
          <Button size="sm" variant="ghost" onClick={() => setViewState("select")} data-testid="button-back-select">
            Back
          </Button>
        )}
      </div>

      {viewState === "select" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold" data-testid="text-select-title">Select Your NFA</h3>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={mode === "practice" ? "default" : "ghost"}
                    onClick={() => setMode("practice")}
                    data-testid="button-mode-practice"
                  >
                    Practice
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === "ranked" ? "default" : "ghost"}
                    onClick={() => setMode("ranked")}
                    disabled={!isConnected}
                    data-testid="button-mode-ranked"
                  >
                    Ranked
                  </Button>
                </div>
              </div>

              {mode === "ranked" && !isConnected && (
                <p className="text-xs text-muted-foreground" data-testid="text-connect-wallet">
                  Connect your wallet to play ranked mode and submit scores to the leaderboard.
                </p>
              )}

              {mode === "practice" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Practice mode uses default stats. No wallet or NFA needed.
                  </p>
                  <Button onClick={() => { setSelectedNfa(null); startGame(); }} data-testid="button-start-practice">
                    Start Practice
                  </Button>
                </div>
              )}

              {mode === "ranked" && isConnected && (
                <>
                  {nfaLoading && <p className="text-xs text-muted-foreground">Loading your NFAs...</p>}
                  {!nfaLoading && nfas.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground" data-testid="text-no-nfas">
                        You don't own any NFAs yet. Mint one to play ranked mode.
                      </p>
                      <Link href="/nfa">
                        <Button variant="outline" size="sm" data-testid="button-mint-nfa">Mint NFA</Button>
                      </Link>
                    </div>
                  )}
                  {nfas.length > 0 && (
                    <div className="grid gap-2">
                      {nfas.map((nfa) => (
                        <Card
                          key={nfa.id}
                          className={`cursor-pointer transition-colors ${selectedNfa?.id === nfa.id ? "ring-2 ring-amber-500" : ""}`}
                          onClick={() => setSelectedNfa(nfa)}
                          data-testid={`card-nfa-${nfa.tokenId}`}
                        >
                          <CardContent className="p-3 flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-medium text-sm" data-testid={`text-nfa-name-${nfa.tokenId}`}>{nfa.name}</p>
                              <p className="text-xs text-muted-foreground">#{nfa.tokenId} - {nfa.agentType}</p>
                            </div>
                            <div className="flex gap-2 text-xs">
                              <span className="flex items-center gap-0.5 text-green-400">
                                <Zap className="w-3 h-3" /> {nfa.traits.agility}
                              </span>
                              <span className="flex items-center gap-0.5 text-blue-400">
                                <Target className="w-3 h-3" /> {nfa.traits.focus}
                              </span>
                              <span className="flex items-center gap-0.5 text-yellow-400">
                                <Crown className="w-3 h-3" /> {nfa.traits.luck}
                              </span>
                              {nfa.traits.shielded && (
                                <span className="flex items-center gap-0.5 text-cyan-400">
                                  <Shield className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {selectedNfa && (
                        <Button onClick={startGame} className="mt-2" data-testid="button-start-ranked">
                          Start Ranked with {selectedNfa.name}
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setViewState("leaderboard")} data-testid="button-view-leaderboard">
              <Trophy className="w-3.5 h-3.5 mr-1" /> Leaderboard
            </Button>
            {bestScore > 0 && (
              <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                Best: {bestScore.toLocaleString()}
              </Badge>
            )}
          </div>

          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Race through a neon tunnel with your NFA agent. Dodge barriers, collect coins, and use power-ups.
                NFA traits modify your gameplay: Agility affects speed, Focus boosts coin value, Luck improves power-up spawns.
                Swipe or use arrow keys to move. Tap/Space to dash through obstacles.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {viewState === "game" && (
        <div className="flex justify-center">
          <div
            ref={containerRef}
            className="rounded-lg overflow-hidden border border-border"
            style={{ width: 480, maxWidth: "100%", aspectRatio: "480/854" }}
            data-testid="game-container"
          />
        </div>
      )}

      {viewState === "leaderboard" && (
        <div className="space-y-3">
          <div className="flex gap-1 flex-wrap">
            {(["daily", "weekly", "alltime"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={lbPeriod === p ? "default" : "ghost"}
                onClick={() => setLbPeriod(p)}
                data-testid={`button-lb-${p}`}
              >
                {p === "alltime" ? "All Time" : p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              {leaderboard.length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground" data-testid="text-lb-empty">
                  No runs yet. Be the first to play!
                </p>
              )}
              {leaderboard.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0 flex-wrap"
                  data-testid={`row-lb-${idx}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold w-6 text-center ${idx < 3 ? "text-amber-400" : "text-muted-foreground"}`}>
                      {idx === 0 ? <Medal className="w-4 h-4 text-amber-400 mx-auto" /> :
                       idx === 1 ? <Medal className="w-4 h-4 text-gray-400 mx-auto" /> :
                       idx === 2 ? <Medal className="w-4 h-4 text-orange-400 mx-auto" /> :
                       `#${idx + 1}`}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{entry.nfaName}</p>
                      <p className="text-[10px] text-muted-foreground">{truncAddr(entry.playerAddress)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-400" data-testid={`text-lb-score-${idx}`}>
                      {entry.score.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{Math.floor(entry.distance)}m</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
