import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { CrmUser } from "@shared/schema";

const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || "default-dev-secret";
if (!process.env.SESSION_SECRET && !process.env.JWT_SECRET) {
  console.warn("[CRM Auth] SESSION_SECRET or JWT_SECRET not set. Using default — set in production!");
}

const ROLE_LEVELS: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  manager: 2,
  moderator: 1,
};

export function getRoleLevel(role: string): number {
  return ROLE_LEVELS[role] || 0;
}

export function canManageRole(actorRole: string, targetRole: string): boolean {
  return getRoleLevel(actorRole) > getRoleLevel(targetRole);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateCrmToken(user: CrmUser): string {
  return jwt.sign(
    { crmUserId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

export interface CrmAuthRequest extends Request {
  crmUser?: CrmUser;
}

export function crmAuth(req: CrmAuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "CRM authentication required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { crmUserId: string; email: string; role: string };
    if (!payload.crmUserId) {
      return res.status(401).json({ error: "Invalid CRM token" });
    }

    storage.getCrmUser(payload.crmUserId).then(user => {
      if (!user || !user.isActive) {
        return res.status(401).json({ error: "CRM user not found or inactive" });
      }
      req.crmUser = user;
      next();
    }).catch(() => {
      return res.status(401).json({ error: "Authentication failed" });
    });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(minRole: string) {
  return (req: CrmAuthRequest, res: Response, next: NextFunction) => {
    if (!req.crmUser) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (getRoleLevel(req.crmUser.role) < getRoleLevel(minRole)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export async function seedSuperAdmin() {
  const existing = await storage.getCrmUserByEmail("admin@honeycomb.com");
  if (!existing) {
    const hash = await hashPassword("admin123");
    await storage.createCrmUser({
      email: "admin@honeycomb.com",
      passwordHash: hash,
      name: "Super Admin",
      role: "super_admin",
      isActive: true,
    });
    console.log("[CRM] Seeded super admin: admin@honeycomb.com / admin123");
  }
}
