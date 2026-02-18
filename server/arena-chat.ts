import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import type { IncomingMessage } from "http";
import { db } from "./db";
import { arenaChatMessages, tradingDuels } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import jwt from "jsonwebtoken";

import crypto from "crypto";
const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const VALID_SCOPE_TYPES = new Set(["lobby", "duel"]);
const RATE_LIMIT_MS = 1000;
const RATE_LIMIT_BURST = 5;

interface ChatClient {
  ws: WebSocket;
  room: string;
  senderName: string;
  senderAddress?: string;
  agentId?: string;
  messageTimestamps: number[];
}

const rooms = new Map<string, Set<ChatClient>>();

function getRoomKey(scopeType: string, scopeId?: string): string {
  return scopeId ? `${scopeType}:${scopeId}` : scopeType;
}

function broadcast(room: string, data: any, exclude?: WebSocket) {
  const clients = rooms.get(room);
  if (!clients) return;
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.ws !== exclude && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function isRateLimited(client: ChatClient): boolean {
  const now = Date.now();
  client.messageTimestamps = client.messageTimestamps.filter(t => now - t < RATE_LIMIT_MS * RATE_LIMIT_BURST);
  if (client.messageTimestamps.length >= RATE_LIMIT_BURST) return true;
  client.messageTimestamps.push(now);
  return false;
}

function resolveIdentity(token?: string): { name: string; address?: string; agentId?: string } | null {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      name: decoded.name || decoded.username || `User-${(decoded.address || "").slice(-4)}`,
      address: decoded.address,
      agentId: decoded.agentId,
    };
  } catch {
    return null;
  }
}

export function setupArenaChatWS(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/ws/arena-chat") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    let client: ChatClient | null = null;

    ws.on("message", async (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === "join") {
          const scopeType = data.scopeType || "lobby";
          if (!VALID_SCOPE_TYPES.has(scopeType)) return;

          if (scopeType === "duel" && data.scopeId) {
            try {
              const [duel] = await db.select({ id: tradingDuels.id }).from(tradingDuels).where(eq(tradingDuels.id, data.scopeId)).limit(1);
              if (!duel) return;
            } catch { return; }
          }

          const identity = resolveIdentity(data.token);
          const fallbackName = data.senderName || "Anon";

          const room = getRoomKey(scopeType, data.scopeId);
          client = {
            ws,
            room,
            senderName: identity?.name || fallbackName,
            senderAddress: identity?.address || undefined,
            agentId: identity?.agentId || undefined,
            messageTimestamps: [],
          };

          if (!rooms.has(room)) rooms.set(room, new Set());
          rooms.get(room)!.add(client);

          const count = rooms.get(room)!.size;
          broadcast(room, { type: "presence", count });
          return;
        }

        if (data.type === "message" && client) {
          const msg = (data.message || "").trim();
          if (!msg || msg.length > 500) return;

          if (isRateLimited(client)) {
            ws.send(JSON.stringify({ type: "error", message: "Slow down! Too many messages." }));
            return;
          }

          const scopeType = client.room.includes(":") ? client.room.split(":")[0] : client.room;
          const scopeId = client.room.includes(":") ? client.room.split(":")[1] : null;

          const [saved] = await db.insert(arenaChatMessages).values({
            scopeType,
            scopeId,
            senderName: client.senderName,
            senderAddress: client.senderAddress || null,
            agentId: client.agentId || null,
            message: msg,
          }).returning();

          broadcast(client.room, {
            type: "message",
            id: saved.id,
            senderName: saved.senderName,
            senderAddress: saved.senderAddress,
            message: saved.message,
            createdAt: saved.createdAt.toISOString(),
          });
        }
      } catch (err) {
        console.error("[ArenaChat] WS error:", err);
      }
    });

    ws.on("close", () => {
      if (client) {
        const roomClients = rooms.get(client.room);
        if (roomClients) {
          roomClients.delete(client);
          if (roomClients.size === 0) {
            rooms.delete(client.room);
          } else {
            broadcast(client.room, { type: "presence", count: roomClients.size });
          }
        }
      }
    });
  });

  console.log("[ArenaChat] WebSocket server ready");
}

export async function getChatHistory(scopeType: string, scopeId?: string, limit = 50) {
  if (!VALID_SCOPE_TYPES.has(scopeType)) return [];

  const conditions = [eq(arenaChatMessages.scopeType, scopeType)];
  if (scopeId) {
    conditions.push(eq(arenaChatMessages.scopeId, scopeId));
  }

  return db
    .select()
    .from(arenaChatMessages)
    .where(and(...conditions))
    .orderBy(desc(arenaChatMessages.createdAt))
    .limit(limit);
}
