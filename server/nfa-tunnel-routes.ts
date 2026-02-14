import type { Express, Request, Response } from "express";
import { db } from "./db";
import { nfaTunnelRuns, nfaAgents } from "@shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import crypto from "crypto";

function generateChecksum(data: {
  playerAddress: string;
  nfaTokenId: number;
  score: number;
  distance: number;
  durationMs: number;
}): string {
  const raw = `${data.playerAddress}:${data.nfaTokenId}:${data.score}:${data.distance}:${data.durationMs}:honeycomb_nfa_dash`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

function validateRunSanity(run: {
  score: number;
  distance: number;
  durationMs: number;
  maxSpeed: number;
  coinsCollected: number;
  hits: number;
}): string | null {
  if (run.durationMs < 3000) return "Run too short";
  if (run.durationMs > 3600000) return "Run too long";
  if (run.score < 0) return "Invalid score";
  if (run.distance < 0) return "Invalid distance";
  if (run.maxSpeed > 50) return "Speed exceeds maximum";
  const scorePerSec = run.score / (run.durationMs / 1000);
  if (scorePerSec > 500) return "Score rate too high";
  if (run.coinsCollected > run.durationMs / 200) return "Coin rate too high";
  return null;
}

export function registerNfaTunnelRoutes(app: Express) {
  app.get("/api/nfa-tunnel/my-nfas", async (req: Request, res: Response) => {
    try {
      const address = req.query.address as string;
      if (!address) return res.status(400).json({ error: "Address required" });

      const nfas = await db
        .select()
        .from(nfaAgents)
        .where(eq(nfaAgents.ownerAddress, address.toLowerCase()));

      const mapped = nfas.map((nfa) => {
        let persona: any = {};
        try {
          persona = nfa.persona ? JSON.parse(nfa.persona) : {};
        } catch {}
        return {
          id: nfa.id,
          tokenId: nfa.tokenId,
          name: nfa.name,
          description: nfa.description,
          agentType: nfa.agentType,
          status: nfa.status,
          category: nfa.category,
          metadataUri: nfa.metadataUri,
          registryStatus: nfa.registryStatus,
          traits: {
            agility: persona.agility ?? persona.speed ?? 5,
            focus: persona.focus ?? persona.precision ?? 5,
            luck: persona.luck ?? persona.fortune ?? 5,
            shielded: persona.shielded ?? false,
          },
        };
      });

      res.json({ nfas: mapped });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nfa-tunnel/submit", async (req: Request, res: Response) => {
    try {
      const {
        playerAddress,
        nfaId,
        nfaTokenId,
        nfaName,
        mode,
        score,
        distance,
        durationMs,
        maxSpeed,
        coinsCollected,
        boostsUsed,
        shieldsUsed,
        magnetsUsed,
        hits,
        maxCombo,
        nearMisses,
        checksum,
        signature,
      } = req.body;

      if (!playerAddress || !nfaId || score === undefined || !checksum) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const expectedChecksum = generateChecksum({
        playerAddress,
        nfaTokenId,
        score,
        distance,
        durationMs,
      });

      if (checksum !== expectedChecksum) {
        return res.status(400).json({ error: "Invalid checksum" });
      }

      const sanityError = validateRunSanity({
        score,
        distance,
        durationMs,
        maxSpeed: maxSpeed ?? 0,
        coinsCollected: coinsCollected ?? 0,
        hits: hits ?? 0,
      });
      if (sanityError) {
        return res.status(400).json({ error: sanityError });
      }

      const nfa = await db
        .select()
        .from(nfaAgents)
        .where(eq(nfaAgents.id, nfaId))
        .limit(1);

      if (nfa.length === 0) {
        return res.status(404).json({ error: "NFA not found" });
      }

      if (nfa[0].ownerAddress.toLowerCase() !== playerAddress.toLowerCase()) {
        return res.status(403).json({ error: "Not the NFA owner" });
      }

      const isVerified = nfa[0].registryStatus === "registered";

      const [run] = await db
        .insert(nfaTunnelRuns)
        .values({
          playerAddress: playerAddress.toLowerCase(),
          nfaId,
          nfaTokenId: nfaTokenId ?? nfa[0].tokenId,
          nfaName: nfaName ?? nfa[0].name,
          mode: mode ?? "ranked",
          score,
          distance,
          durationMs,
          maxSpeed: maxSpeed ?? 0,
          coinsCollected: coinsCollected ?? 0,
          boostsUsed: boostsUsed ?? 0,
          shieldsUsed: shieldsUsed ?? 0,
          magnetsUsed: magnetsUsed ?? 0,
          hits: hits ?? 0,
          maxCombo: maxCombo ?? 0,
          nearMisses: nearMisses ?? 0,
          checksum,
          signature: signature ?? null,
          verified: isVerified,
        })
        .returning();

      res.json({ success: true, run });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nfa-tunnel/leaderboard", async (req: Request, res: Response) => {
    try {
      const mode = (req.query.mode as string) ?? "alltime";
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      let dateFilter: Date | null = null;
      if (mode === "daily") {
        dateFilter = new Date();
        dateFilter.setHours(0, 0, 0, 0);
      } else if (mode === "weekly") {
        dateFilter = new Date();
        dateFilter.setDate(dateFilter.getDate() - 7);
      }

      const conditions = [eq(nfaTunnelRuns.mode, "ranked")];
      if (dateFilter) {
        conditions.push(gte(nfaTunnelRuns.createdAt, dateFilter));
      }

      const runs = await db
        .select({
          id: nfaTunnelRuns.id,
          playerAddress: nfaTunnelRuns.playerAddress,
          nfaName: nfaTunnelRuns.nfaName,
          nfaTokenId: nfaTunnelRuns.nfaTokenId,
          score: nfaTunnelRuns.score,
          distance: nfaTunnelRuns.distance,
          durationMs: nfaTunnelRuns.durationMs,
          maxCombo: nfaTunnelRuns.maxCombo,
          verified: nfaTunnelRuns.verified,
          createdAt: nfaTunnelRuns.createdAt,
        })
        .from(nfaTunnelRuns)
        .where(and(...conditions))
        .orderBy(desc(nfaTunnelRuns.score))
        .limit(limit);

      res.json({ leaderboard: runs, mode });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nfa-tunnel/my-runs", async (req: Request, res: Response) => {
    try {
      const address = req.query.address as string;
      if (!address) return res.status(400).json({ error: "Address required" });

      const runs = await db
        .select()
        .from(nfaTunnelRuns)
        .where(eq(nfaTunnelRuns.playerAddress, address.toLowerCase()))
        .orderBy(desc(nfaTunnelRuns.score))
        .limit(20);

      res.json({ runs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nfa-tunnel/checksum", (req: Request, res: Response) => {
    const { address, tokenId, score, distance, duration } = req.query;
    if (!address || !tokenId || !score || !distance || !duration) {
      return res.status(400).json({ error: "Missing params" });
    }
    const checksum = generateChecksum({
      playerAddress: address as string,
      nfaTokenId: parseInt(tokenId as string),
      score: parseInt(score as string),
      distance: parseInt(distance as string),
      durationMs: parseInt(duration as string),
    });
    res.json({ checksum });
  });
}
