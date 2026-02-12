import type { Express } from "express";
import { db } from "./db";
import { fighterDuels } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

const FIGHTERS = [
  { id: "satoshi", name: "Satoshi", type: "BTC", hp: 110, atk: 12, def: 10, spd: 8, special: "Genesis Block", specialPower: 25, icon: "bitcoin" },
  { id: "vitalik", name: "Vitalik", type: "ETH", hp: 95, atk: 14, def: 8, spd: 12, special: "Smart Contract", specialPower: 28, icon: "ethereum" },
  { id: "changpeng", name: "CZ", type: "BNB", hp: 100, atk: 13, def: 11, spd: 9, special: "Chain Burn", specialPower: 26, icon: "bnb" },
  { id: "doge", name: "Doge Lord", type: "DOGE", hp: 85, atk: 10, def: 6, spd: 15, special: "Moon Shot", specialPower: 32, icon: "doge" },
  { id: "ada", name: "Cardano Knight", type: "ADA", hp: 105, atk: 11, def: 13, spd: 7, special: "Peer Review", specialPower: 22, icon: "cardano" },
  { id: "sol", name: "Solana Flash", type: "SOL", hp: 90, atk: 15, def: 7, spd: 14, special: "TPS Surge", specialPower: 30, icon: "solana" },
];

const BOT_PERSONALITIES = [
  { name: "IronFist", style: "aggressive", desc: "All-out attacker" },
  { name: "ShieldWall", style: "defensive", desc: "Defensive tank" },
  { name: "TrickStar", style: "tricky", desc: "Unpredictable moves" },
  { name: "BerserkerBot", style: "berserker", desc: "Gets stronger as HP drops" },
  { name: "GrandMaster", style: "balanced", desc: "Well-rounded fighter" },
];

type Move = "attack" | "defend" | "special" | "counter";

interface BattleLogEntry {
  turn: number;
  creatorMove: Move;
  joinerMove: Move;
  creatorDamage: number;
  joinerDamage: number;
  creatorHpAfter: number;
  joinerHpAfter: number;
  narrative: string;
}

function getFighterById(id: string) {
  return FIGHTERS.find(f => f.id === id) || FIGHTERS[0];
}

function calculateDamage(attacker: typeof FIGHTERS[0], defender: typeof FIGHTERS[0], atkMove: Move, defMove: Move): { atkDmg: number; defDmg: number; narrative: string } {
  let atkDmg = 0;
  let defDmg = 0;
  let narrative = "";

  const atkPower = attacker.atk + Math.floor(Math.random() * 5);
  const defPower = defender.def + Math.floor(Math.random() * 3);
  const spdBonus = Math.max(0, attacker.spd - defender.spd);

  if (atkMove === "attack" && defMove === "attack") {
    atkDmg = Math.max(1, atkPower - Math.floor(defPower * 0.3));
    defDmg = Math.max(1, (defender.atk + Math.floor(Math.random() * 5)) - Math.floor(attacker.def * 0.3));
    narrative = `Both fighters trade blows! ${attacker.name} deals ${atkDmg} damage, ${defender.name} hits back for ${defDmg}!`;
  } else if (atkMove === "attack" && defMove === "defend") {
    atkDmg = Math.max(1, Math.floor(atkPower * 0.3));
    narrative = `${defender.name} blocks! ${attacker.name} only deals ${atkDmg} chip damage.`;
  } else if (atkMove === "attack" && defMove === "special") {
    atkDmg = Math.max(1, atkPower + spdBonus);
    defDmg = defender.specialPower;
    narrative = `${attacker.name} strikes for ${atkDmg}! ${defender.name} unleashes ${defender.special} for ${defDmg} damage!`;
  } else if (atkMove === "attack" && defMove === "counter") {
    defDmg = Math.max(1, atkPower + Math.floor(atkPower * 0.5));
    narrative = `${defender.name} counters ${attacker.name}'s attack! Devastating ${defDmg} damage reflected!`;
  } else if (atkMove === "defend" && defMove === "attack") {
    defDmg = Math.max(1, Math.floor((defender.atk + Math.floor(Math.random() * 5)) * 0.3));
    narrative = `${attacker.name} blocks! ${defender.name} only deals ${defDmg} chip damage.`;
  } else if (atkMove === "defend" && defMove === "defend") {
    narrative = `Both fighters take a defensive stance. Nothing happens!`;
  } else if (atkMove === "defend" && defMove === "special") {
    defDmg = Math.floor(defender.specialPower * 0.6);
    narrative = `${attacker.name} braces for impact! ${defender.name}'s ${defender.special} partially blocked, dealing ${defDmg}.`;
  } else if (atkMove === "defend" && defMove === "counter") {
    narrative = `Both fighters wait cautiously. No damage dealt.`;
  } else if (atkMove === "special" && defMove === "attack") {
    atkDmg = attacker.specialPower;
    defDmg = Math.max(1, (defender.atk + Math.floor(Math.random() * 5)) + spdBonus);
    narrative = `${attacker.name} unleashes ${attacker.special} for ${atkDmg}! ${defender.name} strikes for ${defDmg}!`;
  } else if (atkMove === "special" && defMove === "defend") {
    atkDmg = Math.floor(attacker.specialPower * 0.6);
    narrative = `${defender.name} braces! ${attacker.name}'s ${attacker.special} partially blocked, dealing ${atkDmg}.`;
  } else if (atkMove === "special" && defMove === "special") {
    atkDmg = Math.floor(attacker.specialPower * 0.8);
    defDmg = Math.floor(defender.specialPower * 0.8);
    narrative = `CLASH! ${attacker.name}'s ${attacker.special} vs ${defender.name}'s ${defender.special}! Both take ${atkDmg} and ${defDmg} damage!`;
  } else if (atkMove === "special" && defMove === "counter") {
    defDmg = Math.floor(attacker.specialPower * 1.2);
    narrative = `PERFECT COUNTER! ${defender.name} reflects ${attacker.name}'s ${attacker.special} for ${defDmg} massive damage!`;
  } else if (atkMove === "counter" && defMove === "attack") {
    atkDmg = Math.max(1, (defender.atk + Math.floor(Math.random() * 5)) + Math.floor((defender.atk) * 0.5));
    narrative = `${attacker.name} counters ${defender.name}'s attack! ${atkDmg} damage reflected!`;
  } else if (atkMove === "counter" && defMove === "defend") {
    narrative = `Both fighters wait cautiously. No damage dealt.`;
  } else if (atkMove === "counter" && defMove === "special") {
    atkDmg = Math.floor(defender.specialPower * 1.2);
    narrative = `PERFECT COUNTER! ${attacker.name} reflects ${defender.name}'s ${defender.special} for ${atkDmg} massive damage!`;
  } else if (atkMove === "counter" && defMove === "counter") {
    narrative = `Both fighters attempt to counter... awkward silence. Nothing happens!`;
  }

  return { atkDmg, defDmg, narrative };
}

function getBotMove(style: string, hp: number, maxHp: number, turn: number): Move {
  const hpPercent = hp / maxHp;
  const r = Math.random();

  switch (style) {
    case "aggressive":
      if (r < 0.5) return "attack";
      if (r < 0.7) return "special";
      if (r < 0.85) return "counter";
      return "defend";
    case "defensive":
      if (r < 0.4) return "defend";
      if (r < 0.65) return "counter";
      if (r < 0.85) return "attack";
      return "special";
    case "tricky":
      if (r < 0.3) return "counter";
      if (r < 0.55) return "special";
      if (r < 0.8) return "attack";
      return "defend";
    case "berserker":
      if (hpPercent < 0.3) {
        if (r < 0.6) return "special";
        if (r < 0.85) return "attack";
        return "counter";
      }
      if (r < 0.45) return "attack";
      if (r < 0.7) return "special";
      if (r < 0.85) return "defend";
      return "counter";
    default:
      if (r < 0.3) return "attack";
      if (r < 0.55) return "defend";
      if (r < 0.8) return "special";
      return "counter";
  }
}

export function registerFighterRoutes(app: Express) {
  app.get("/api/fighters", (_req, res) => {
    res.json(FIGHTERS);
  });

  app.get("/api/fighters/bots", (_req, res) => {
    res.json(BOT_PERSONALITIES);
  });

  app.post("/api/fighters/play-vs-bot", async (req, res) => {
    try {
      const { playerName, playerFighter } = req.body;
      if (!playerName || !playerFighter) {
        return res.status(400).json({ error: "playerName and playerFighter required" });
      }

      const bot = BOT_PERSONALITIES[Math.floor(Math.random() * BOT_PERSONALITIES.length)];
      const availableFighters = FIGHTERS.filter(f => f.id !== playerFighter);
      const botFighter = availableFighters[Math.floor(Math.random() * availableFighters.length)];
      const playerF = getFighterById(playerFighter);

      const [duel] = await db.insert(fighterDuels).values({
        creatorName: playerName,
        creatorFighter: playerFighter,
        joinerName: bot.name,
        joinerFighter: botFighter.id,
        creatorHp: playerF.hp,
        joinerHp: botFighter.hp,
        creatorMaxHp: playerF.hp,
        joinerMaxHp: botFighter.hp,
        status: "active",
        isBotMatch: true,
        botName: bot.name,
        botStyle: bot.style,
        startedAt: new Date(),
      }).returning();

      res.json(duel);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/fighters/duels/:id", async (req, res) => {
    try {
      const [duel] = await db.select().from(fighterDuels).where(eq(fighterDuels.id, req.params.id));
      if (!duel) return res.status(404).json({ error: "Duel not found" });
      res.json({
        ...duel,
        battleLog: JSON.parse(duel.battleLog || "[]"),
        creatorFighterData: duel.creatorFighter ? getFighterById(duel.creatorFighter) : null,
        joinerFighterData: duel.joinerFighter ? getFighterById(duel.joinerFighter) : null,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/fighters/duels/:id/move", async (req, res) => {
    try {
      const { move, playerName } = req.body;
      if (!move || !["attack", "defend", "special", "counter"].includes(move)) {
        return res.status(400).json({ error: "Invalid move" });
      }

      const [duel] = await db.select().from(fighterDuels).where(eq(fighterDuels.id, req.params.id));
      if (!duel) return res.status(404).json({ error: "Duel not found" });
      if (duel.status !== "active") return res.status(400).json({ error: "Duel not active" });

      const creatorFighter = getFighterById(duel.creatorFighter || "satoshi");
      const joinerFighter = getFighterById(duel.joinerFighter || "vitalik");
      const battleLog: BattleLogEntry[] = JSON.parse(duel.battleLog || "[]");

      let creatorMove: Move = move as Move;
      let joinerMove: Move;

      if (duel.isBotMatch) {
        joinerMove = getBotMove(duel.botStyle || "balanced", duel.joinerHp, duel.joinerMaxHp, duel.currentTurn);
      } else {
        joinerMove = "attack";
      }

      const { atkDmg, defDmg, narrative } = calculateDamage(creatorFighter, joinerFighter, creatorMove, joinerMove);

      let newCreatorHp = Math.max(0, duel.creatorHp - defDmg);
      let newJoinerHp = Math.max(0, duel.joinerHp - atkDmg);

      const logEntry: BattleLogEntry = {
        turn: duel.currentTurn,
        creatorMove,
        joinerMove,
        creatorDamage: defDmg,
        joinerDamage: atkDmg,
        creatorHpAfter: newCreatorHp,
        joinerHpAfter: newJoinerHp,
        narrative,
      };
      battleLog.push(logEntry);

      let newStatus = "active";
      let winnerId = null;
      let endedAt = null;

      if (newCreatorHp <= 0 && newJoinerHp <= 0) {
        newStatus = "settled";
        winnerId = "draw";
        endedAt = new Date();
      } else if (newCreatorHp <= 0) {
        newStatus = "settled";
        winnerId = "joiner";
        endedAt = new Date();
      } else if (newJoinerHp <= 0) {
        newStatus = "settled";
        winnerId = "creator";
        endedAt = new Date();
      } else if (duel.currentTurn >= duel.maxTurns) {
        newStatus = "settled";
        if (newCreatorHp > newJoinerHp) winnerId = "creator";
        else if (newJoinerHp > newCreatorHp) winnerId = "joiner";
        else winnerId = "draw";
        endedAt = new Date();
      }

      const updateData: any = {
        creatorHp: newCreatorHp,
        joinerHp: newJoinerHp,
        creatorMove: creatorMove,
        joinerMove: joinerMove,
        currentTurn: duel.currentTurn + 1,
        battleLog: JSON.stringify(battleLog),
        status: newStatus,
      };
      if (winnerId) updateData.winnerId = winnerId;
      if (endedAt) updateData.endedAt = endedAt;

      await db.update(fighterDuels).set(updateData).where(eq(fighterDuels.id, req.params.id));

      const [updated] = await db.select().from(fighterDuels).where(eq(fighterDuels.id, req.params.id));
      res.json({
        ...updated,
        battleLog: JSON.parse(updated.battleLog || "[]"),
        creatorFighterData: updated.creatorFighter ? getFighterById(updated.creatorFighter) : null,
        joinerFighterData: updated.joinerFighter ? getFighterById(updated.joinerFighter) : null,
        lastTurn: logEntry,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/fighters/leaderboard", async (_req, res) => {
    try {
      const results = await db.select().from(fighterDuels)
        .where(eq(fighterDuels.status, "settled"))
        .orderBy(desc(fighterDuels.createdAt))
        .limit(50);

      const stats: Record<string, { name: string; wins: number; losses: number; draws: number }> = {};

      for (const duel of results) {
        const cName = duel.creatorName;
        const jName = duel.joinerName || "Unknown";
        if (!stats[cName]) stats[cName] = { name: cName, wins: 0, losses: 0, draws: 0 };
        if (!stats[jName]) stats[jName] = { name: jName, wins: 0, losses: 0, draws: 0 };

        if (duel.winnerId === "creator") {
          stats[cName].wins++;
          stats[jName].losses++;
        } else if (duel.winnerId === "joiner") {
          stats[jName].wins++;
          stats[cName].losses++;
        } else {
          stats[cName].draws++;
          stats[jName].draws++;
        }
      }

      const leaderboard = Object.values(stats)
        .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
        .slice(0, 20);

      res.json(leaderboard);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
