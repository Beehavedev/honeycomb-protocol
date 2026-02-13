import type { Express } from "express";
import { db } from "./db";
import { triviaDuels } from "@shared/schema";
import { eq, desc, or, and, sql } from "drizzle-orm";
import { z } from "zod";

const TRIVIA_CATEGORIES: Record<string, number> = {
  general: 9,
  science: 17,
  computers: 18,
  math: 19,
  history: 23,
  geography: 22,
  sports: 21,
  entertainment: 11,
  animals: 27,
};

const BOT_NAMES = [
  { name: "QuizMaster", style: "balanced" },
  { name: "BrainiacBot", style: "smart" },
  { name: "SpeedDemon", style: "fast" },
  { name: "LuckyGuess", style: "random" },
  { name: "CryptoScholar", style: "methodical" },
];

interface TriviaQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  category: string;
  difficulty: string;
  shuffled_answers: string[];
}

async function fetchTriviaQuestions(
  amount: number,
  category: string,
  difficulty: string
): Promise<TriviaQuestion[]> {
  const catId = TRIVIA_CATEGORIES[category] || 9;
  const url = `https://opentdb.com/api.php?amount=${amount}&category=${catId}&difficulty=${difficulty}&type=multiple`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.response_code !== 0 || !data.results?.length) {
    const fallbackUrl = `https://opentdb.com/api.php?amount=${amount}&type=multiple`;
    const fallbackResp = await fetch(fallbackUrl);
    const fallbackData = await fallbackResp.json();
    if (fallbackData.response_code !== 0) {
      throw new Error("Failed to fetch trivia questions");
    }
    return fallbackData.results.map((q: any) => ({
      ...q,
      shuffled_answers: shuffleArray([q.correct_answer, ...q.incorrect_answers]),
    }));
  }
  return data.results.map((q: any) => ({
    ...q,
    shuffled_answers: shuffleArray([q.correct_answer, ...q.incorrect_answers]),
  }));
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function decodeHtml(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&eacute;/g, "é")
    .replace(/&Eacute;/g, "É")
    .replace(/&ntilde;/g, "ñ")
    .replace(/&uuml;/g, "ü")
    .replace(/&ouml;/g, "ö")
    .replace(/&auml;/g, "ä")
    .replace(/&szlig;/g, "ß")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&hellip;/g, "\u2026");
}

function simulateBotAnswer(
  question: TriviaQuestion,
  botStyle: string,
  difficulty: string
): { answer: string; correct: boolean } {
  let correctChance: number;
  const diff = difficulty || "medium";
  switch (botStyle) {
    case "smart":
      correctChance = diff === "easy" ? 0.95 : diff === "medium" ? 0.8 : 0.6;
      break;
    case "fast":
      correctChance = diff === "easy" ? 0.7 : diff === "medium" ? 0.55 : 0.35;
      break;
    case "random":
      correctChance = 0.25;
      break;
    case "methodical":
      correctChance = diff === "easy" ? 0.9 : diff === "medium" ? 0.7 : 0.5;
      break;
    default:
      correctChance = diff === "easy" ? 0.8 : diff === "medium" ? 0.6 : 0.4;
  }
  const isCorrect = Math.random() < correctChance;
  if (isCorrect) {
    return { answer: question.correct_answer, correct: true };
  }
  const wrong =
    question.incorrect_answers[
      Math.floor(Math.random() * question.incorrect_answers.length)
    ];
  return { answer: wrong, correct: false };
}

export function registerTriviaRoutes(app: Express) {
  app.get("/api/trivia/categories", (_req, res) => {
    res.json(
      Object.entries(TRIVIA_CATEGORIES).map(([key, id]) => ({
        key,
        id,
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }))
    );
  });

  app.get("/api/trivia/duels", async (_req, res) => {
    try {
      const duels = await db
        .select()
        .from(triviaDuels)
        .orderBy(desc(triviaDuels.createdAt))
        .limit(50);
      res.json(duels);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/trivia/duels/:id", async (req, res) => {
    try {
      const [duel] = await db
        .select()
        .from(triviaDuels)
        .where(eq(triviaDuels.id, req.params.id));
      if (!duel) return res.status(404).json({ error: "Duel not found" });
      const sanitized = {
        ...duel,
        questions:
          duel.status === "settled"
            ? duel.questions
            : sanitizeQuestionsForClient(duel.questions, duel.currentQuestion),
      };
      res.json(sanitized);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/trivia/leaderboard", async (_req, res) => {
    try {
      const results = await db.execute(sql`
        SELECT 
          COALESCE(creator_name, joiner_name) as name,
          COUNT(*) as total_games,
          SUM(CASE 
            WHEN winner_id = creator_name THEN 1 
            WHEN winner_id = joiner_name THEN 1 
            ELSE 0 
          END) as wins,
          SUM(CASE 
            WHEN status = 'settled' AND winner_id != COALESCE(creator_name, joiner_name) AND winner_id IS NOT NULL THEN 1 
            ELSE 0 
          END) as losses
        FROM trivia_duels
        WHERE status = 'settled'
        GROUP BY COALESCE(creator_name, joiner_name)
        ORDER BY wins DESC
        LIMIT 20
      `);
      res.json(results.rows || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/trivia/duels", async (req, res) => {
    try {
      const body = z
        .object({
          creatorName: z.string().min(1),
          creatorAddress: z.string().optional(),
          category: z.string().default("general"),
          difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
          questionCount: z.number().int().min(5).max(20).default(10),
          timePerQuestion: z.number().int().min(10).max(30).default(15),
        })
        .parse(req.body);

      const questions = await fetchTriviaQuestions(
        body.questionCount,
        body.category,
        body.difficulty
      );

      const [duel] = await db
        .insert(triviaDuels)
        .values({
          creatorName: body.creatorName,
          creatorAddress: body.creatorAddress || null,
          category: body.category,
          difficulty: body.difficulty,
          questionCount: body.questionCount,
          timePerQuestion: body.timePerQuestion,
          questions: JSON.stringify(questions),
          status: "waiting",
        })
        .returning();

      res.json(duel);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/trivia/duels/:id/join", async (req, res) => {
    try {
      const { joinerName, joinerAddress } = z
        .object({
          joinerName: z.string().min(1),
          joinerAddress: z.string().optional(),
        })
        .parse(req.body);

      const [duel] = await db
        .select()
        .from(triviaDuels)
        .where(eq(triviaDuels.id, req.params.id));
      if (!duel) return res.status(404).json({ error: "Duel not found" });
      if (duel.status !== "waiting")
        return res.status(400).json({ error: "Duel not open" });

      const [updated] = await db
        .update(triviaDuels)
        .set({
          joinerName,
          joinerAddress: joinerAddress || null,
          status: "active",
          startedAt: new Date(),
        })
        .where(eq(triviaDuels.id, req.params.id))
        .returning();

      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/trivia/duels/:id/answer", async (req, res) => {
    try {
      const { playerName, questionIndex, answer } = z
        .object({
          playerName: z.string().min(1),
          questionIndex: z.number().int().min(0),
          answer: z.string().min(1),
        })
        .parse(req.body);

      const [duel] = await db
        .select()
        .from(triviaDuels)
        .where(eq(triviaDuels.id, req.params.id));
      if (!duel) return res.status(404).json({ error: "Duel not found" });
      if (duel.status !== "active")
        return res.status(400).json({ error: "Duel not active" });

      const questions: TriviaQuestion[] = JSON.parse(duel.questions);
      if (questionIndex >= questions.length)
        return res.status(400).json({ error: "Invalid question index" });

      const question = questions[questionIndex];
      const isCorrect =
        decodeHtml(answer) === decodeHtml(question.correct_answer);

      const isCreator = playerName === duel.creatorName;
      const answersKey = isCreator ? "creatorAnswers" : "joinerAnswers";
      const scoreKey = isCreator ? "creatorScore" : "joinerScore";

      const existingAnswers: any[] = JSON.parse(
        isCreator ? duel.creatorAnswers : duel.joinerAnswers
      );
      if (existingAnswers.some((a: any) => a.questionIndex === questionIndex)) {
        return res.status(400).json({ error: "Already answered" });
      }

      existingAnswers.push({ questionIndex, answer, isCorrect });
      const newScore =
        (isCreator ? duel.creatorScore : duel.joinerScore) +
        (isCorrect ? 1 : 0);

      const update: any = {
        [answersKey]: JSON.stringify(existingAnswers),
        [scoreKey]: newScore,
      };

      const creatorAnswersArr = isCreator
        ? existingAnswers
        : JSON.parse(duel.creatorAnswers);
      const joinerAnswersArr = isCreator
        ? JSON.parse(duel.joinerAnswers)
        : existingAnswers;

      const allAnswered =
        creatorAnswersArr.length >= questions.length &&
        joinerAnswersArr.length >= questions.length;

      if (allAnswered) {
        const finalCreatorScore = isCreator ? newScore : duel.creatorScore;
        const finalJoinerScore = isCreator ? duel.joinerScore : newScore;
        update.status = "settled";
        update.endedAt = new Date();
        if (finalCreatorScore > finalJoinerScore) {
          update.winnerId = duel.creatorName;
        } else if (finalJoinerScore > finalCreatorScore) {
          update.winnerId = duel.joinerName;
        } else {
          update.winnerId = "draw";
        }
      }

      const maxAnswered = Math.max(
        creatorAnswersArr.length,
        joinerAnswersArr.length
      );
      if (maxAnswered > duel.currentQuestion) {
        update.currentQuestion = maxAnswered;
      }

      const [updated] = await db
        .update(triviaDuels)
        .set(update)
        .where(eq(triviaDuels.id, req.params.id))
        .returning();

      if (update.status === "settled") {
        try {
          const { awardGamePoints } = await import("./points-engine");
          const isBotMatch = !!duel.isBotMatch;
          const creatorWon = update.winnerId === duel.creatorName;
          const joinerWon = update.winnerId === duel.joinerName;
          const finalCreatorScore = isCreator ? newScore : duel.creatorScore;
          const finalJoinerScore = isCreator ? duel.joinerScore : newScore;
          const totalQuestions = questions.length;

          await awardGamePoints({
            gameType: "trivia_battle",
            agentId: duel.creatorName,
            won: creatorWon,
            isBotMatch,
            metadata: { perfectScore: finalCreatorScore === totalQuestions, duelId: duel.id },
          });
          if (!isBotMatch) {
            await awardGamePoints({
              gameType: "trivia_battle",
              agentId: duel.joinerName,
              won: joinerWon,
              isBotMatch: false,
              metadata: { perfectScore: finalJoinerScore === totalQuestions, duelId: duel.id },
            });
          }
        } catch (pointsErr) {
          console.error("[Points] Failed to award trivia points:", pointsErr);
        }
      }

      res.json({
        ...updated,
        lastAnswerCorrect: isCorrect,
        correctAnswer: decodeHtml(question.correct_answer),
      });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/trivia/play-vs-bot", async (req, res) => {
    try {
      const body = z
        .object({
          creatorName: z.string().min(1),
          creatorAddress: z.string().optional(),
          category: z.string().default("general"),
          difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
          questionCount: z.number().int().min(5).max(20).default(10),
          timePerQuestion: z.number().int().min(10).max(30).default(15),
        })
        .parse(req.body);

      const bot = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      const questions = await fetchTriviaQuestions(
        body.questionCount,
        body.category,
        body.difficulty
      );

      const botAnswers: any[] = [];
      let botScore = 0;
      for (let i = 0; i < questions.length; i++) {
        const result = simulateBotAnswer(questions[i], bot.style, body.difficulty);
        botAnswers.push({
          questionIndex: i,
          answer: result.answer,
          isCorrect: result.correct,
        });
        if (result.correct) botScore++;
      }

      const [duel] = await db
        .insert(triviaDuels)
        .values({
          creatorName: body.creatorName,
          creatorAddress: body.creatorAddress || null,
          joinerName: bot.name,
          category: body.category,
          difficulty: body.difficulty,
          questionCount: body.questionCount,
          timePerQuestion: body.timePerQuestion,
          questions: JSON.stringify(questions),
          joinerAnswers: JSON.stringify(botAnswers),
          joinerScore: botScore,
          status: "active",
          isBotMatch: true,
          botName: bot.name,
          botDifficulty: bot.style,
          startedAt: new Date(),
        })
        .returning();

      res.json(duel);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });
}

function sanitizeQuestionsForClient(
  questionsJson: string,
  currentQ: number
): string {
  const questions: TriviaQuestion[] = JSON.parse(questionsJson);
  return JSON.stringify(
    questions.map((q, i) => ({
      question: decodeHtml(q.question),
      category: q.category,
      difficulty: q.difficulty,
      shuffled_answers: q.shuffled_answers.map(decodeHtml),
      correct_answer: i < currentQ ? decodeHtml(q.correct_answer) : undefined,
    }))
  );
}
