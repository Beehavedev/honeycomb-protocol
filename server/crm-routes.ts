import { Router } from "express";
import { storage } from "./storage";
import { insertCrmContactSchema, insertCrmDealSchema, insertCrmActivitySchema } from "@shared/schema";
import {
  crmAuth, requireRole, CrmAuthRequest,
  hashPassword, verifyPassword, generateCrmToken,
  canManageRole, getRoleLevel, seedSuperAdmin
} from "./crm-auth";

const router = Router();

const contactUpdateSchema = insertCrmContactSchema.partial();
const dealUpdateSchema = insertCrmDealSchema.partial();

seedSuperAdmin().catch(console.error);

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await storage.getCrmUserByEmail(email);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    await storage.updateCrmUser(user.id, { lastLoginAt: new Date() });

    const token = generateCrmToken(user);
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/me", crmAuth, (req: CrmAuthRequest, res) => {
  if (!req.crmUser) return res.status(401).json({ error: "Not authenticated" });
  const { passwordHash, ...user } = req.crmUser;
  res.json(user);
});

router.get("/users", crmAuth, requireRole("admin"), async (_req: CrmAuthRequest, res) => {
  try {
    const users = await storage.getCrmUsers();
    res.json(users.map(({ passwordHash, ...u }) => u));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/users", crmAuth, requireRole("admin"), async (req: CrmAuthRequest, res) => {
  try {
    const { email, password, name, role, isActive } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Email, password, and name are required" });
    }

    const validRoles = ["super_admin", "admin", "manager", "moderator"];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (role && !canManageRole(req.crmUser!.role, role)) {
      return res.status(403).json({ error: "Cannot create a user with equal or higher role" });
    }

    const existing = await storage.getCrmUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const passwordHash = await hashPassword(password);
    const user = await storage.createCrmUser({
      email: email.toLowerCase(),
      passwordHash,
      name,
      role: role || "moderator",
      isActive: isActive !== undefined ? isActive : true,
    });

    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch("/users/:id", crmAuth, requireRole("admin"), async (req: CrmAuthRequest, res) => {
  try {
    const target = await storage.getCrmUser(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found" });

    if (!canManageRole(req.crmUser!.role, target.role) && req.crmUser!.id !== target.id) {
      return res.status(403).json({ error: "Cannot modify a user with equal or higher role" });
    }

    const updates: any = {};
    if (req.body.name) updates.name = req.body.name;
    if (req.body.email) updates.email = req.body.email.toLowerCase();
    if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;

    if (req.body.role) {
      const validRoles = ["super_admin", "admin", "manager", "moderator"];
      if (!validRoles.includes(req.body.role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      if (!canManageRole(req.crmUser!.role, req.body.role)) {
        return res.status(403).json({ error: "Cannot assign equal or higher role" });
      }
      updates.role = req.body.role;
    }

    if (req.body.password) {
      updates.passwordHash = await hashPassword(req.body.password);
    }

    const user = await storage.updateCrmUser(req.params.id, updates);
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete("/users/:id", crmAuth, requireRole("super_admin"), async (req: CrmAuthRequest, res) => {
  try {
    const target = await storage.getCrmUser(req.params.id);
    if (!target) return res.status(404).json({ error: "User not found" });
    if (target.role === "super_admin") {
      return res.status(403).json({ error: "Cannot delete a super admin" });
    }
    if (target.id === req.crmUser!.id) {
      return res.status(403).json({ error: "Cannot delete yourself" });
    }
    await storage.deleteCrmUser(req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/contacts", crmAuth, async (req: CrmAuthRequest, res) => {
  try {
    const status = req.query.status as string | undefined;
    const contacts = await storage.getCrmContacts(status);
    res.json(contacts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/contacts/:id", crmAuth, async (req: CrmAuthRequest, res) => {
  try {
    const contact = await storage.getCrmContact(req.params.id);
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    res.json(contact);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/contacts", crmAuth, requireRole("manager"), async (req: CrmAuthRequest, res) => {
  try {
    const parsed = insertCrmContactSchema.parse(req.body);
    const contact = await storage.createCrmContact(parsed);
    res.status(201).json(contact);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/contacts/:id", crmAuth, requireRole("manager"), async (req: CrmAuthRequest, res) => {
  try {
    const existing = await storage.getCrmContact(req.params.id);
    if (!existing) return res.status(404).json({ error: "Contact not found" });
    const parsed = contactUpdateSchema.parse(req.body);
    const contact = await storage.updateCrmContact(req.params.id, parsed);
    res.json(contact);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/contacts/:id", crmAuth, requireRole("admin"), async (req: CrmAuthRequest, res) => {
  try {
    await storage.deleteCrmContact(req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/deals", crmAuth, async (req: CrmAuthRequest, res) => {
  try {
    const stage = req.query.stage as string | undefined;
    const deals = await storage.getCrmDeals(stage);
    res.json(deals);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/deals/:id", crmAuth, async (req: CrmAuthRequest, res) => {
  try {
    const deal = await storage.getCrmDeal(req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal not found" });
    res.json(deal);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/deals", crmAuth, requireRole("manager"), async (req: CrmAuthRequest, res) => {
  try {
    const parsed = insertCrmDealSchema.parse(req.body);
    const deal = await storage.createCrmDeal(parsed);
    res.status(201).json(deal);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/deals/:id", crmAuth, requireRole("manager"), async (req: CrmAuthRequest, res) => {
  try {
    const existing = await storage.getCrmDeal(req.params.id);
    if (!existing) return res.status(404).json({ error: "Deal not found" });
    const parsed = dealUpdateSchema.parse(req.body);
    const deal = await storage.updateCrmDeal(req.params.id, parsed);
    res.json(deal);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/deals/:id", crmAuth, requireRole("admin"), async (req: CrmAuthRequest, res) => {
  try {
    await storage.deleteCrmDeal(req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/activities", crmAuth, async (req: CrmAuthRequest, res) => {
  try {
    const contactId = req.query.contactId as string | undefined;
    const dealId = req.query.dealId as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const activities = await storage.getCrmActivities(contactId, dealId, limit);
    res.json(activities);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/activities", crmAuth, async (req: CrmAuthRequest, res) => {
  try {
    const parsed = insertCrmActivitySchema.parse(req.body);
    const activity = await storage.createCrmActivity(parsed);
    res.status(201).json(activity);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/stats", crmAuth, async (_req: CrmAuthRequest, res) => {
  try {
    const contacts = await storage.getCrmContacts();
    const deals = await storage.getCrmDeals();
    const totalValue = deals.reduce((sum, d) => sum + (parseFloat(d.value || "0") || 0), 0);
    const openDeals = deals.filter(d => d.stage !== "closed_won" && d.stage !== "closed_lost");
    const wonDeals = deals.filter(d => d.stage === "closed_won");
    res.json({
      totalContacts: contacts.length,
      totalDeals: deals.length,
      openDeals: openDeals.length,
      wonDeals: wonDeals.length,
      totalPipelineValue: totalValue.toFixed(2),
      contactsByStatus: {
        lead: contacts.filter(c => c.status === "lead").length,
        prospect: contacts.filter(c => c.status === "prospect").length,
        customer: contacts.filter(c => c.status === "customer").length,
        partner: contacts.filter(c => c.status === "partner").length,
        inactive: contacts.filter(c => c.status === "inactive").length,
      },
      dealsByStage: {
        lead: deals.filter(d => d.stage === "lead").length,
        qualified: deals.filter(d => d.stage === "qualified").length,
        proposal: deals.filter(d => d.stage === "proposal").length,
        negotiation: deals.filter(d => d.stage === "negotiation").length,
        closed_won: wonDeals.length,
        closed_lost: deals.filter(d => d.stage === "closed_lost").length,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
