import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Brain,
  Bot,
  Trophy,
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  Zap,
  Users,
  Crown,
  Timer,
  BarChart3,
  ChevronRight,
  Star,
  Target,
  Medal,
  Copy,
  Hash,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { TriviaDuel } from "@shared/schema";

function decodeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.documentElement.textContent || html;
}

function TriviaLobby({ onStartDuel }: { onStartDuel: (duelId: string) => void }) {
  const { agent } = useAuth();
  const { toast } = useToast();
  const [category, setCategory] = useState("general");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState("10");
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState("");

  const { data: categories } = useQuery<{ key: string; id: number; label: string }[]>({
    queryKey: ["/api/trivia/categories"],
  });

  const { data: duels, isLoading: duelsLoading } = useQuery<TriviaDuel[]>({
    queryKey: ["/api/trivia/duels"],
    refetchInterval: 5000,
  });

  const { data: leaderboard } = useQuery<any[]>({
    queryKey: ["/api/trivia/leaderboard"],
  });

  const playBotMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<TriviaDuel>("POST", "/api/trivia/play-vs-bot", {
        creatorName: agent?.name || "Player",
        creatorAddress: agent?.ownerAddress,
        category,
        difficulty,
        questionCount: parseInt(questionCount),
        timePerQuestion: 15,
      });
    },
    onSuccess: (duel: TriviaDuel) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/duels"] });
      onStartDuel(duel.id);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (duelId: string) => {
      return await apiRequest<TriviaDuel>("POST", `/api/trivia/duels/${duelId}/join`, {
        joinerName: agent?.name || "Player",
        joinerAddress: agent?.ownerAddress,
      });
    },
    onSuccess: (duel: TriviaDuel) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/duels"] });
      onStartDuel(duel.id);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const joinByCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return await apiRequest<TriviaDuel>("POST", "/api/trivia/duels/join-by-code", {
        joinCode: code,
        joinerName: agent?.name || "Player",
        joinerAddress: agent?.ownerAddress,
      });
    },
    onSuccess: (duel: TriviaDuel) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/duels"] });
      setJoinCodeInput("");
      setShowJoinCode(false);
      onStartDuel(duel.id);
    },
    onError: (e: any) => {
      toast({ title: "Invalid code", description: e.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (duelId: string) => {
      return await apiRequest("POST", `/api/trivia/duels/${duelId}/cancel`, {
        creatorName: agent?.name || "Player",
      });
    },
    onSuccess: () => {
      toast({ title: "Challenge cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/duels"] });
    },
    onError: (e: any) => {
      toast({ title: "Cancel failed", description: e.message, variant: "destructive" });
    },
  });

  const openDuels = duels?.filter((d) => d.status === "waiting") || [];
  const recentDuels = duels?.filter((d) => d.status === "settled").slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Zap className="w-5 h-5 text-amber-400" />
            Quick Match vs Bot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-trivia-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(categories || []).map((c) => (
                    <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger data-testid="select-trivia-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Questions</label>
              <Select value={questionCount} onValueChange={setQuestionCount}>
                <SelectTrigger data-testid="select-trivia-questions">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                  <SelectItem value="15">15 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={() => playBotMutation.mutate()}
            disabled={playBotMutation.isPending}
            className="w-full"
            data-testid="button-play-trivia-bot"
          >
            {playBotMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Bot className="w-4 h-4 mr-2" />
            )}
            Play vs Bot
          </Button>
        </CardContent>
      </Card>

      {showJoinCode ? (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4 text-amber-400 shrink-0" />
              <Input
                placeholder="Enter 6-digit join code"
                value={joinCodeInput}
                onChange={e => setJoinCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                className="font-mono text-center tracking-widest uppercase"
                maxLength={6}
                data-testid="input-trivia-join-code"
              />
              <Button
                size="sm"
                onClick={() => joinByCodeMutation.mutate(joinCodeInput)}
                disabled={joinCodeInput.length !== 6 || joinByCodeMutation.isPending || !agent}
                data-testid="button-submit-trivia-join-code"
              >
                {joinByCodeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => { setShowJoinCode(false); setJoinCodeInput(""); }}
                data-testid="button-close-trivia-join-code"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-end mb-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowJoinCode(true)}
            data-testid="button-open-trivia-join-code"
          >
            <Hash className="w-3.5 h-3.5 mr-1.5" /> Join by Code
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 flex-wrap text-base">
              <Users className="w-4 h-4 text-amber-400" />
              Open Challenges ({openDuels.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {duelsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : openDuels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No open challenges</p>
            ) : (
              <div className="space-y-2">
                {openDuels.map((d) => {
                  const isMyDuel = (agent?.name || "") === d.creatorName;
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-md border"
                      data-testid={`trivia-open-duel-${d.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.creatorName}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary">{d.category}</Badge>
                          <Badge variant="outline">{d.difficulty}</Badge>
                          <span className="text-xs text-muted-foreground">{d.questionCount}Q</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isMyDuel && (d as any).joinCode && (
                          <Badge
                            variant="outline"
                            className="gap-1 text-[9px] py-0 px-1.5 cursor-pointer border-amber-500/30 text-amber-300"
                            onClick={() => {
                              navigator.clipboard.writeText((d as any).joinCode);
                              toast({ title: "Code copied!", description: (d as any).joinCode });
                            }}
                            data-testid={`badge-trivia-code-${d.id}`}
                          >
                            <Copy className="w-2.5 h-2.5" /> {(d as any).joinCode}
                          </Badge>
                        )}
                        {isMyDuel ? (
                          <>
                            <Badge variant="outline" className="gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> Waiting
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 border-red-500/30 text-red-400"
                              onClick={() => cancelMutation.mutate(d.id)}
                              disabled={cancelMutation.isPending}
                              data-testid={`button-cancel-trivia-${d.id}`}
                            >
                              {cancelMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => joinMutation.mutate(d.id)}
                            disabled={joinMutation.isPending}
                            data-testid={`button-join-trivia-${d.id}`}
                          >
                            Join
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 flex-wrap text-base">
              <Trophy className="w-4 h-4 text-amber-400" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!leaderboard || leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No matches yet</p>
            ) : (
              <div className="space-y-1.5">
                {leaderboard.slice(0, 8).map((entry: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md"
                    data-testid={`trivia-leaderboard-${i}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">
                        {i === 0 ? <Crown className="w-3.5 h-3.5 text-amber-400 inline" /> : `#${i + 1}`}
                      </span>
                      <span className="text-sm truncate">{entry.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-green-500 font-medium">{entry.wins}W</span>
                      <span className="text-xs text-muted-foreground">{entry.total_games}G</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {recentDuels.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 flex-wrap text-base">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              Recent Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentDuels.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-md border"
                  data-testid={`trivia-recent-${d.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium truncate">{d.creatorName}</span>
                    <span className="text-xs text-muted-foreground">vs</span>
                    <span className="text-sm truncate">{d.joinerName || "..."}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold">{d.creatorScore} - {d.joinerScore}</span>
                    {d.winnerId && d.winnerId !== "draw" && (
                      <Badge variant="secondary">
                        <Trophy className="w-3 h-3 mr-1" />
                        {d.winnerId}
                      </Badge>
                    )}
                    {d.winnerId === "draw" && <Badge variant="outline">Draw</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActiveTriviaDuel({ duelId, onBack }: { duelId: string; onBack: () => void }) {
  const { agent } = useAuth();
  const { toast } = useToast();
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; correctAnswer: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [myAnswers, setMyAnswers] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: duel, refetch } = useQuery<TriviaDuel>({
    queryKey: ["/api/trivia/duels", duelId],
    refetchInterval: (query) => {
      const d = query.state.data as TriviaDuel | undefined;
      return d?.status === "settled" ? false : 2000;
    },
  });

  const answerMutation = useMutation({
    mutationFn: async (answer: string) => {
      return await apiRequest<any>("POST", `/api/trivia/duels/${duelId}/answer`, {
        playerName: agent?.name || "Player",
        questionIndex: currentQ,
        answer,
      });
    },
    onSuccess: (data: any) => {
      setAnswerResult({
        correct: data.lastAnswerCorrect,
        correctAnswer: data.correctAnswer,
      });
      setMyAnswers((prev) => new Set(prev).add(currentQ));
      if (timerRef.current) clearInterval(timerRef.current);
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/duels", duelId] });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const questions = duel ? JSON.parse(duel.questions) : [];
  const totalQuestions = duel?.questionCount || 10;
  const isCreator = (agent?.name || "Player") === duel?.creatorName;
  const myScore = isCreator ? (duel?.creatorScore || 0) : (duel?.joinerScore || 0);
  const opponentScore = isCreator ? (duel?.joinerScore || 0) : (duel?.creatorScore || 0);
  const opponentName = isCreator ? duel?.joinerName : duel?.creatorName;

  useEffect(() => {
    if (!duel || duel.status !== "active" || myAnswers.has(currentQ)) return;
    setTimeLeft(duel.timePerQuestion);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!myAnswers.has(currentQ) && !answerMutation.isPending) {
            answerMutation.mutate("__timeout__");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentQ, duel?.status, duel?.id]);

  const handleAnswer = (answer: string) => {
    if (selectedAnswer || answerResult || myAnswers.has(currentQ)) return;
    setSelectedAnswer(answer);
    answerMutation.mutate(answer);
  };

  const nextQuestion = () => {
    if (currentQ < totalQuestions - 1) {
      setCurrentQ((q) => q + 1);
      setSelectedAnswer(null);
      setAnswerResult(null);
    }
  };

  if (!duel) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
        <p className="text-sm text-muted-foreground">Loading duel...</p>
      </div>
    );
  }

  if (duel.status === "settled") {
    const isWinner = duel.winnerId === (agent?.name || "Player");
    const isDraw = duel.winnerId === "draw";
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/10">
              {isDraw ? (
                <Target className="w-8 h-8 text-amber-400" />
              ) : isWinner ? (
                <Trophy className="w-8 h-8 text-amber-400" />
              ) : (
                <XCircle className="w-8 h-8 text-red-400" />
              )}
            </div>
            <h2 className="text-2xl font-bold">
              {isDraw ? "It's a Draw!" : isWinner ? "You Win!" : "You Lose!"}
            </h2>
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{duel.creatorName}</p>
                <p className="text-3xl font-black">{duel.creatorScore}</p>
              </div>
              <span className="text-muted-foreground font-medium">vs</span>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">{duel.joinerName}</p>
                <p className="text-3xl font-black">{duel.joinerScore}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <Badge variant="secondary">{duel.category}</Badge>
              <Badge variant="outline">{duel.difficulty}</Badge>
              <Badge variant="outline">{duel.questionCount} questions</Badge>
            </div>
            <Button onClick={onBack} className="mt-4" data-testid="button-back-trivia-lobby">
              Back to Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = questions[currentQ];
  if (!question) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading question...</p>
      </div>
    );
  }

  const answersForQ = question.shuffled_answers || [];
  const showResult = answerResult !== null;
  const timerPct = (timeLeft / (duel.timePerQuestion || 15)) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" data-testid="text-trivia-score-me">
            <Star className="w-3 h-3 mr-1" /> You: {myScore}
          </Badge>
          <Badge variant="outline" data-testid="text-trivia-score-opponent">
            {duel.isBotMatch && <Bot className="w-3 h-3 mr-1" />}
            {opponentName}: {opponentScore}
          </Badge>
        </div>
        <Badge variant="outline" data-testid="text-trivia-question-counter">
          Q{currentQ + 1}/{totalQuestions}
        </Badge>
      </div>

      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${timerPct}%`,
            backgroundColor: timeLeft <= 5 ? "hsl(var(--destructive))" : "hsl(var(--primary))",
          }}
        />
      </div>
      <div className="flex items-center justify-center gap-1.5">
        <Timer className="w-3.5 h-3.5 text-muted-foreground" />
        <span className={`text-sm font-mono font-bold ${timeLeft <= 5 ? "text-red-500" : "text-muted-foreground"}`}>
          {timeLeft}s
        </span>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-1 mb-4">
            <Badge variant="outline" className="text-xs">{decodeHtml(question.category || duel.category)}</Badge>
          </div>
          <h3 className="text-lg font-semibold mb-6" data-testid="text-trivia-question">
            {decodeHtml(question.question)}
          </h3>
          <div className="grid grid-cols-1 gap-2.5">
            {answersForQ.map((ans: string, i: number) => {
              const decoded = decodeHtml(ans);
              const isSelected = selectedAnswer === ans;
              const isCorrectAnswer = showResult && decoded === answerResult?.correctAnswer;
              const isWrongSelected = showResult && isSelected && !answerResult?.correct;

              let variant: "default" | "outline" | "destructive" | "secondary" = "outline";
              let extraClass = "hover-elevate";
              if (showResult) {
                extraClass = "";
                if (isCorrectAnswer) variant = "default";
                else if (isWrongSelected) variant = "destructive";
                else variant = "secondary";
              }

              return (
                <Button
                  key={i}
                  variant={variant}
                  className={`justify-start text-left h-auto py-3 px-4 ${extraClass}`}
                  onClick={() => handleAnswer(ans)}
                  disabled={showResult || answerMutation.isPending}
                  data-testid={`button-trivia-answer-${i}`}
                >
                  <span className="text-sm font-medium mr-2 shrink-0">{String.fromCharCode(65 + i)}.</span>
                  <span className="text-sm">{decoded}</span>
                  {showResult && isCorrectAnswer && <CheckCircle2 className="w-4 h-4 ml-auto text-green-500 shrink-0" />}
                  {showResult && isWrongSelected && <XCircle className="w-4 h-4 ml-auto shrink-0" />}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {showResult && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {answerResult.correct ? (
              <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" /> Correct!</Badge>
            ) : (
              <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Wrong</Badge>
            )}
          </div>
          {currentQ < totalQuestions - 1 ? (
            <Button onClick={nextQuestion} data-testid="button-trivia-next">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => refetch()} data-testid="button-trivia-finish">
              <Trophy className="w-4 h-4 mr-1" /> See Results
            </Button>
          )}
        </div>
      )}

      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-amber-500/50 rounded-full transition-all duration-300"
          style={{ width: `${((currentQ + (showResult ? 1 : 0)) / totalQuestions) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function TriviaBattle() {
  const [activeDuelId, setActiveDuelId] = useState<string | null>(null);

  if (activeDuelId) {
    return (
      <ActiveTriviaDuel
        duelId={activeDuelId}
        onBack={() => setActiveDuelId(null)}
      />
    );
  }

  return <TriviaLobby onStartDuel={setActiveDuelId} />;
}
