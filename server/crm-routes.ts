import { Router } from "express";
import { storage } from "./storage";
import { insertCrmContactSchema, insertCrmDealSchema, insertCrmActivitySchema } from "@shared/schema";

const router = Router();

const contactUpdateSchema = insertCrmContactSchema.partial();
const dealUpdateSchema = insertCrmDealSchema.partial();

router.get("/contacts", async (_req, res) => {
  try {
    const status = _req.query.status as string | undefined;
    const contacts = await storage.getCrmContacts(status);
    res.json(contacts);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/contacts/:id", async (req, res) => {
  try {
    const contact = await storage.getCrmContact(req.params.id);
    if (!contact) return res.status(404).json({ error: "Contact not found" });
    res.json(contact);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/contacts", async (req, res) => {
  try {
    const parsed = insertCrmContactSchema.parse(req.body);
    const contact = await storage.createCrmContact(parsed);
    res.status(201).json(contact);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/contacts/:id", async (req, res) => {
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

router.delete("/contacts/:id", async (req, res) => {
  try {
    await storage.deleteCrmContact(req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/deals", async (req, res) => {
  try {
    const stage = req.query.stage as string | undefined;
    const deals = await storage.getCrmDeals(stage);
    res.json(deals);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/deals/:id", async (req, res) => {
  try {
    const deal = await storage.getCrmDeal(req.params.id);
    if (!deal) return res.status(404).json({ error: "Deal not found" });
    res.json(deal);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/deals", async (req, res) => {
  try {
    const parsed = insertCrmDealSchema.parse(req.body);
    const deal = await storage.createCrmDeal(parsed);
    res.status(201).json(deal);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.patch("/deals/:id", async (req, res) => {
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

router.delete("/deals/:id", async (req, res) => {
  try {
    await storage.deleteCrmDeal(req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/activities", async (req, res) => {
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

router.post("/activities", async (req, res) => {
  try {
    const parsed = insertCrmActivitySchema.parse(req.body);
    const activity = await storage.createCrmActivity(parsed);
    res.status(201).json(activity);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/stats", async (_req, res) => {
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
