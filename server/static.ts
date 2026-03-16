import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.warn(`[Static] Build directory not found: ${distPath}. Frontend will not be served.`);
    return;
  }

  app.use(express.static(distPath));

  app.use("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
