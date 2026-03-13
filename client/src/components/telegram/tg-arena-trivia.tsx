import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Brain, Bot, Loader2, Users, Copy, Trophy, Crown, Target, Star,
  Sparkles, ArrowLeft, Clock, ChevronRight,
} from "lucide-react";
import type { TgAgentInfo, TriviaDuel } from "./tg-arena-types";

interface LeaderboardEntry {
  name: string;
  wins: number;
}

interface TriviaCategory {
  key: string;
  label: string;
}

interface AnswerResponse {
  lastAnswerCorrect: boolean;
  correctAnswer: string;
}

export function TriviaSubTab({ agent }: { agent?: TgAgentInfo }) {
  const [activeDuelId, setActiveDuelId] = useState<string | null>(null);

  if (!agent) {
    return (
      <Card className="p-6 bg-[#242444] border-gray-700/50 text-center">
        <Brain className="w-10 h-10 text-blue-500/50 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Open via @honeycombot to play trivia</p>
      </Card>
    );
  }

  if (activeDuelId) {
    return <TriviaActiveView duelId={activeDuelId} agent={agent} onBack={() => setActiveDuelId(null)} />;
  }

  return <TriviaLobbyView agent={agent} onStartDuel={setActiveDuelId} />;
}

function TriviaLobbyView({ agent, onStartDuel }: { agent: TgAgentInfo; onStartDuel: (id: string) => void }) {
  const [category, setCategory] = useState("general");
  const [difficulty, setDifficulty] = useState("medium");
  const [mode, setMode] = useState<"bot" | "pvp">("bot");
  const [joinCode, setJoinCode] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdDuelId, setCreatedDuelId] = useState<string | null>(null);
  const [pvpError, setPvpError] = useState("");

  const { data: categories } = useQuery<TriviaCategory[]>({
    queryKey: ["/api/trivia/categories"],
  });

  const { data: leaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/trivia/leaderboard"],
  });

  useQuery<TriviaDuel>({
    queryKey: ["/api/trivia/duels", createdDuelId],
    queryFn: async () => {
      const res = await fetch(`/api/trivia/duels/${createdDuelId}`);
      return res.json();
    },
    enabled: !!createdDuelId,
    refetchInterval: 3000,
    select: (data: TriviaDuel) => {
      if (data?.joinerName || data?.status === "active" || data?.status === "in_progress") {
        onStartDuel(data.id);
      }
      return data;
    },
  });

  const playBotMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<TriviaDuel>("POST", "/api/trivia/play-vs-bot", {
        creatorName: agent.name,
        creatorAddress: agent.ownerAddress,
        category,
        difficulty,
        questionCount: 10,
        timePerQuestion: 15,
      });
    },
    onSuccess: (duel: TriviaDuel) => {
      onStartDuel(duel.id);
    },
  });

  const createLobbyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<TriviaDuel>("POST", "/api/trivia/duels", {
        creatorName: agent.name,
        creatorAddress: agent.ownerAddress,
        category,
        difficulty,
        questionCount: 10,
        timePerQuestion: 15,
      });
    },
    onSuccess: (duel: TriviaDuel) => {
      setCreatedCode(duel.joinCode || null);
      setCreatedDuelId(duel.id);
    },
  });

  const joinByCodeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest<TriviaDuel>("POST", "/api/trivia/duels/join-by-code", {
        joinCode: joinCode.toUpperCase(),
        joinerName: agent.name,
        joinerAddress: agent.ownerAddress,
      });
    },
    onSuccess: (duel: TriviaDuel) => {
      onStartDuel(duel.id);
    },
    onError: (err: Error) => {
      setPvpError(err.message || "Failed to join");
    },
  });

  return (
    <div className="space-y-3">
      <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border-blue-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">Crypto Trivia Battle</span>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => { setMode("bot"); setCreatedCode(null); setCreatedDuelId(null); setPvpError(""); }}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              mode === "bot" ? "bg-blue-500/20 text-blue-400 border border-blue-500/40" : "text-gray-400 border border-gray-700/50"
            }`}
            data-testid="button-tg-trivia-mode-bot"
          >
            <Bot className="w-3 h-3 inline mr-1" /> vs Bot
          </button>
          <button
            onClick={() => { setMode("pvp"); setPvpError(""); }}
            className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              mode === "pvp" ? "bg-blue-500/20 text-blue-400 border border-blue-500/40" : "text-gray-400 border border-gray-700/50"
            }`}
            data-testid="button-tg-trivia-mode-pvp"
          >
            <Users className="w-3 h-3 inline mr-1" /> PvP
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-gray-700/50 rounded-lg px-2 py-1.5 text-xs text-white"
              data-testid="select-tg-trivia-category"
            >
              {(categories || [{ key: "general", label: "General" }]).map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 mb-1 block">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-gray-700/50 rounded-lg px-2 py-1.5 text-xs text-white"
              data-testid="select-tg-trivia-difficulty"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {mode === "bot" ? (
          <Button
            className="w-full gap-2"
            onClick={() => playBotMutation.mutate()}
            disabled={playBotMutation.isPending}
            data-testid="button-tg-play-trivia"
          >
            {playBotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            Play vs Bot
          </Button>
        ) : (
          <div className="space-y-2">
            {!createdCode ? (
              <Button
                className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => createLobbyMutation.mutate()}
                disabled={createLobbyMutation.isPending}
                data-testid="button-tg-trivia-create-lobby"
              >
                {createLobbyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                Create PvP Lobby
              </Button>
            ) : (
              <Card className="p-3 bg-[#1a1a2e] border-blue-500/30">
                <p className="text-[10px] text-gray-400 mb-1">Share this code with your opponent:</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-mono text-blue-400 tracking-wider flex-1" data-testid="text-tg-trivia-join-code">{createdCode}</span>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => navigator.clipboard.writeText(createdCode)} data-testid="button-tg-trivia-copy-code">
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-[9px] text-gray-500 mt-1">
                  <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
                  Waiting for opponent to join...
                </p>
              </Card>
            )}
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setPvpError(""); }}
                placeholder="Enter code..."
                maxLength={8}
                className="flex-1 bg-[#1a1a2e] border border-gray-700/50 rounded-lg px-3 py-1.5 text-xs text-white font-mono uppercase placeholder-gray-500"
                data-testid="input-tg-trivia-join-code"
              />
              <Button
                size="sm"
                onClick={() => joinByCodeMutation.mutate()}
                disabled={!joinCode.trim() || joinByCodeMutation.isPending}
                data-testid="button-tg-trivia-join"
              >
                {joinByCodeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join"}
              </Button>
            </div>
            {pvpError && <p className="text-[10px] text-red-400">{pvpError}</p>}
          </div>
        )}
      </Card>

      {leaderboard && leaderboard.length > 0 && (
        <Card className="p-3 bg-[#242444] border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-white">Leaderboard</span>
          </div>
          <div className="space-y-1">
            {leaderboard.slice(0, 5).map((entry, i) => (
              <div key={i} className="flex items-center justify-between py-1" data-testid={`tg-trivia-leaderboard-${i}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-4 text-right">
                    {i === 0 ? <Crown className="w-3 h-3 text-amber-400 inline" /> : `#${i + 1}`}
                  </span>
                  <span className="text-xs text-white truncate max-w-[100px]">{entry.name}</span>
                </div>
                <span className="text-[10px] text-green-400">{entry.wins}W</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function decodeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.documentElement.textContent || html;
}

interface TriviaRawQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface TriviaRawDuel {
  id: string;
  status: string;
  questions: string;
  questionCount: number;
  timePerQuestion: number;
  creatorName: string;
  joinerName?: string;
  creatorScore: number;
  joinerScore: number;
  winnerId?: string;
}

function TriviaActiveView({ duelId, agent, onBack }: { duelId: string; agent: TgAgentInfo; onBack: () => void }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; correctAnswer: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [myAnswers, setMyAnswers] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: duel } = useQuery<TriviaRawDuel>({
    queryKey: ["/api/trivia/duels", duelId],
    refetchInterval: (query) => {
      const d = query.state.data;
      return d?.status === "settled" ? false : 2000;
    },
  });

  const answerMutation = useMutation({
    mutationFn: async (answer: string) => {
      return await apiRequest<AnswerResponse>("POST", `/api/trivia/duels/${duelId}/answer`, {
        playerName: agent.name,
        questionIndex: currentQ,
        answer,
      });
    },
    onSuccess: (data: AnswerResponse) => {
      setAnswerResult({ correct: data.lastAnswerCorrect, correctAnswer: data.correctAnswer });
      setMyAnswers((prev) => new Set(prev).add(currentQ));
      if (timerRef.current) clearInterval(timerRef.current);
      queryClient.invalidateQueries({ queryKey: ["/api/trivia/duels", duelId] });
    },
  });

  const questions: TriviaRawQuestion[] = duel ? JSON.parse(duel.questions || "[]") : [];
  const totalQuestions = duel?.questionCount || 10;
  const isCreator = agent.name === duel?.creatorName;
  const myScore = isCreator ? (duel?.creatorScore || 0) : (duel?.joinerScore || 0);
  const opponentScore = isCreator ? (duel?.joinerScore || 0) : (duel?.creatorScore || 0);

  useEffect(() => {
    if (!duel || duel.status !== "active" || myAnswers.has(currentQ)) return;
    setTimeLeft(duel.timePerQuestion || 15);
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
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <p className="text-xs text-gray-400 mt-2">Loading trivia...</p>
      </div>
    );
  }

  if (duel.status === "settled") {
    const isWinner = duel.winnerId === agent.name;
    const isDraw = duel.winnerId === "draw";
    return (
      <div className="text-center space-y-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
          isDraw ? "bg-gray-700/50" : isWinner ? "bg-green-500/20" : "bg-red-500/20"
        }`}>
          {isDraw ? <Target className="w-8 h-8 text-gray-400" /> :
           isWinner ? <Trophy className="w-8 h-8 text-amber-500" /> :
           <Star className="w-8 h-8 text-red-400" />}
        </div>
        <h3 className={`text-xl font-bold ${isDraw ? "text-gray-300" : isWinner ? "text-green-400" : "text-red-400"}`}>
          {isDraw ? "Draw!" : isWinner ? "You Win!" : "You Lose"}
        </h3>
        <p className="text-lg font-bold text-white">{myScore} - {opponentScore}</p>
        <Button onClick={onBack} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white" data-testid="button-tg-trivia-again">
          <Sparkles className="w-4 h-4 mr-1" /> Play Again
        </Button>
      </div>
    );
  }

  const question = questions[currentQ];
  if (!question) return <div className="text-center text-gray-400">No questions loaded</div>;

  const allAnswers = [...(question.incorrect_answers || []), question.correct_answer].sort();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-gray-400"><ArrowLeft className="w-5 h-5" /></button>
        <Badge className="bg-blue-500/20 text-blue-400 font-mono">
          Q{currentQ + 1}/{totalQuestions}
        </Badge>
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-400 font-bold">{myScore}</span>
          <span className="text-[10px] text-gray-500">vs</span>
          <span className="text-xs text-red-400 font-bold">{opponentScore}</span>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <Badge className={`font-mono ${timeLeft <= 5 ? "bg-red-500/20 text-red-400" : "bg-gray-700/50 text-gray-300"}`}>
          <Clock className="w-3 h-3 mr-1" /> {timeLeft}s
        </Badge>
      </div>

      <Card className="p-4 bg-[#242444] border-gray-700/50">
        <p className="text-sm text-white leading-relaxed" data-testid="text-tg-trivia-question">
          {decodeHtml(question.question)}
        </p>
      </Card>

      <div className="space-y-2">
        {allAnswers.map((answer: string, i: number) => {
          let btnClass = "bg-[#1a1a2e] border border-gray-700/50 text-white hover:border-blue-500/50";
          if (answerResult) {
            if (answer === answerResult.correctAnswer) btnClass = "bg-green-500/20 border border-green-500/50 text-green-400";
            else if (answer === selectedAnswer) btnClass = "bg-red-500/20 border border-red-500/50 text-red-400";
          } else if (answer === selectedAnswer) {
            btnClass = "bg-blue-500/20 border border-blue-500/50 text-blue-400";
          }
          return (
            <button
              key={i}
              onClick={() => handleAnswer(answer)}
              disabled={!!answerResult || !!selectedAnswer}
              className={`w-full p-3 rounded-lg text-left text-sm transition-all ${btnClass}`}
              data-testid={`button-tg-trivia-answer-${i}`}
            >
              {decodeHtml(answer)}
            </button>
          );
        })}
      </div>

      {answerResult && currentQ < totalQuestions - 1 && (
        <Button className="w-full" onClick={nextQuestion} data-testid="button-tg-trivia-next">
          Next Question <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
}
