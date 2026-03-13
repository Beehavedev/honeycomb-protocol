import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes, runRoutesInit } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { seedDatabase, ensureChannelsExist, ensureTwitterBotExists, ensureNfaLearningModulesExist } from "./seed";
import { startTwitterScheduler } from "./twitter-scheduler";
import { twitterService } from "./twitter-service";
import { storage } from "./storage";
import { ensureArenaBots } from "./arena-bot-engine";
import { startAutoDuelSpawner } from "./auto-duel-spawner";
import { setupTelegramWebhook } from "./telegram-bot";
import { setupArenaChatWS } from "./arena-chat";
import path from "path";

const app = express();

// Serve static files from public folder (for PDFs etc)
app.use("/downloads", express.static(path.join(process.cwd(), "public")));
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  setupArenaChatWS(httpServer);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);

      runBackgroundInit().catch(err => {
        console.error("Background initialization error:", err);
      });
    },
  );
})();

async function runBackgroundInit() {
  log("Starting background initialization...");
  try {
    await seedDatabase();
    await ensureChannelsExist();
    await ensureTwitterBotExists();
    await ensureNfaLearningModulesExist();
    await storage.seedTradingDuels();
    await ensureArenaBots();
    await runRoutesInit();
    await twitterService.updateBotForGiveawayPromotion();
    startTwitterScheduler();
    startAutoDuelSpawner();

    if (process.env.TELEGRAM_BOT_TOKEN) {
      const baseUrl = process.env.TELEGRAM_MINI_APP_URL || "https://thehoneycomb.social";
      const webhookUrl = `${baseUrl}/api/telegram/webhook`;
      setupTelegramWebhook(webhookUrl).then((result) => {
        log(`Telegram webhook: ${result.message}`);
      }).catch((err) => {
        console.error("Telegram webhook setup failed:", err);
      });
    }

    log("Background initialization complete");
  } catch (err) {
    console.error("Background init failed:", err);
  }
}
