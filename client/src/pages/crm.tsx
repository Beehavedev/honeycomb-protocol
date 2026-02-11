import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getCrmToken, getCrmUser, clearCrmAuth } from "./crm-login";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { CrmContact, CrmDeal, CrmActivity } from "@shared/schema";
import {
  Users, Briefcase, Activity, Plus, Trash2, Edit2,
  TrendingUp, Target, Mail, Wallet, LogOut, Shield,
  DollarSign
} from "lucide-react";

function invalidateCrm() {
  queryClient.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey[0];
      return typeof key === "string" && key.startsWith("/api/crm/");
    },
  });
}

async function crmFetch(url: string, options?: RequestInit) {
  const token = getCrmToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      clearCrmAuth();
      window.location.href = "/crm/login";
      throw new Error("Session expired");
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

async function crmMutate(method: string, url: string, body?: unknown) {
  return crmFetch(url, { method, body: body ? JSON.stringify(body) : undefined });
}

const CONTACT_STATUSES = ["lead", "prospect", "customer", "partner", "inactive"] as const;
const DEAL_STAGES = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"] as const;
const DEAL_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const ACTIVITY_TYPES = ["call", "email", "meeting", "note", "task"] as const;

const ROLE_LEVELS: Record<string, number> = { super_admin: 4, admin: 3, manager: 2, moderator: 1 };

function hasMinRole(minRole: string): boolean {
  const user = getCrmUser();
  if (!user) return false;
  return (ROLE_LEVELS[user.role] || 0) >= (ROLE_LEVELS[minRole] || 99);
}

const statusColors: Record<string, string> = {
  lead: "bg-blue-500/20 text-blue-400",
  prospect: "bg-amber-500/20 text-amber-400",
  customer: "bg-green-500/20 text-green-400",
  partner: "bg-purple-500/20 text-purple-400",
  inactive: "bg-muted text-muted-foreground",
};

const stageColors: Record<string, string> = {
  lead: "bg-blue-500/20 text-blue-400",
  qualified: "bg-cyan-500/20 text-cyan-400",
  proposal: "bg-amber-500/20 text-amber-400",
  negotiation: "bg-orange-500/20 text-orange-400",
  closed_won: "bg-green-500/20 text-green-400",
  closed_lost: "bg-red-500/20 text-red-400",
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-blue-500/20 text-blue-400",
  high: "bg-orange-500/20 text-orange-400",
  urgent: "bg-red-500/20 text-red-400",
};

interface CrmStats {
  totalContacts: number;
  totalDeals: number;
  openDeals: number;
  wonDeals: number;
  totalPipelineValue: string;
  contactsByStatus: Record<string, number>;
  dealsByStage: Record<string, number>;
}

function StatCard({ title, value, icon: Icon, subtitle }: {
  title: string; value: string | number; icon: typeof Users; subtitle?: string;
}) {
  return (
    <Card data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function ContactForm({ contact, onClose }: { contact?: CrmContact; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: contact?.name || "",
    email: contact?.email || "",
    walletAddress: contact?.walletAddress || "",
    company: contact?.company || "",
    role: contact?.role || "",
    status: contact?.status || "lead",
    source: contact?.source || "",
    notes: contact?.notes || "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (contact) {
        return crmMutate("PATCH", `/api/crm/contacts/${contact.id}`, form);
      }
      return crmMutate("POST", "/api/crm/contacts", form);
    },
    onSuccess: () => {
      invalidateCrm();
      toast({ title: contact ? "Contact updated" : "Contact created" });
      onClose();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-3">
      <Input data-testid="input-contact-name" placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <Input data-testid="input-contact-email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <Input data-testid="input-contact-wallet" placeholder="Wallet address (0x...)" value={form.walletAddress} onChange={e => setForm({ ...form, walletAddress: e.target.value })} />
      <div className="flex gap-2">
        <Input data-testid="input-contact-company" placeholder="Company / Project" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="flex-1" />
        <Input data-testid="input-contact-role" placeholder="Role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="flex-1" />
      </div>
      <div className="flex gap-2">
        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
          <SelectTrigger data-testid="select-contact-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONTACT_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input data-testid="input-contact-source" placeholder="Source" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="flex-1" />
      </div>
      <Textarea data-testid="input-contact-notes" placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-contact">Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending} data-testid="button-save-contact">
          {mutation.isPending ? "Saving..." : contact ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

function DealForm({ deal, contacts, onClose }: { deal?: CrmDeal; contacts: CrmContact[]; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: deal?.title || "",
    contactId: deal?.contactId || "",
    value: deal?.value || "",
    stage: deal?.stage || "lead",
    priority: deal?.priority || "medium",
    description: deal?.description || "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (deal) {
        return crmMutate("PATCH", `/api/crm/deals/${deal.id}`, form);
      }
      return crmMutate("POST", "/api/crm/deals", form);
    },
    onSuccess: () => {
      invalidateCrm();
      toast({ title: deal ? "Deal updated" : "Deal created" });
      onClose();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-3">
      <Input data-testid="input-deal-title" placeholder="Deal title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      <Select value={form.contactId || "none"} onValueChange={v => setForm({ ...form, contactId: v === "none" ? "" : v })}>
        <SelectTrigger data-testid="select-deal-contact"><SelectValue placeholder="Link to contact" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No contact</SelectItem>
          {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Input data-testid="input-deal-value" placeholder="Value (BNB)" type="number" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} className="flex-1" />
        <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
          <SelectTrigger data-testid="select-deal-priority"><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEAL_PRIORITIES.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
        <SelectTrigger data-testid="select-deal-stage"><SelectValue /></SelectTrigger>
        <SelectContent>
          {DEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
        </SelectContent>
      </Select>
      <Textarea data-testid="input-deal-description" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-deal">Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending} data-testid="button-save-deal">
          {mutation.isPending ? "Saving..." : deal ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

function ActivityForm({ contacts, deals, onClose }: { contacts: CrmContact[]; deals: CrmDeal[]; onClose: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    contactId: "",
    dealId: "",
    type: "note",
    description: "",
  });

  const mutation = useMutation({
    mutationFn: () => crmMutate("POST", "/api/crm/activities", {
      ...form,
      contactId: form.contactId || null,
      dealId: form.dealId || null,
    }),
    onSuccess: () => {
      invalidateCrm();
      toast({ title: "Activity logged" });
      onClose();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-3">
      <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
        <SelectTrigger data-testid="select-activity-type"><SelectValue /></SelectTrigger>
        <SelectContent>
          {ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={form.contactId || "none"} onValueChange={v => setForm({ ...form, contactId: v === "none" ? "" : v })}>
        <SelectTrigger data-testid="select-activity-contact"><SelectValue placeholder="Link to contact" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No contact</SelectItem>
          {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={form.dealId || "none"} onValueChange={v => setForm({ ...form, dealId: v === "none" ? "" : v })}>
        <SelectTrigger data-testid="select-activity-deal"><SelectValue placeholder="Link to deal" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No deal</SelectItem>
          {deals.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
        </SelectContent>
      </Select>
      <Textarea data-testid="input-activity-description" placeholder="Activity description *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-activity">Cancel</Button>
        <Button onClick={() => mutation.mutate()} disabled={!form.description || mutation.isPending} data-testid="button-save-activity">
          {mutation.isPending ? "Saving..." : "Log Activity"}
        </Button>
      </div>
    </div>
  );
}

function ContactsTab() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<CrmContact | undefined>();
  const canWrite = hasMinRole("manager");
  const canDelete = hasMinRole("admin");

  const url = filter !== "all" ? `/api/crm/contacts?status=${filter}` : "/api/crm/contacts";
  const { data: contacts = [], isLoading } = useQuery<CrmContact[]>({
    queryKey: [url],
    queryFn: () => crmFetch(url),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmMutate("DELETE", `/api/crm/contacts/${id}`),
    onSuccess: () => {
      invalidateCrm();
      toast({ title: "Contact deleted" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-contacts-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contacts</SelectItem>
            {CONTACT_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        {canWrite && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditContact(undefined); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-contact"><Plus className="w-4 h-4 mr-1" /> Add Contact</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editContact ? "Edit Contact" : "New Contact"}</DialogTitle></DialogHeader>
              <ContactForm contact={editContact} onClose={() => { setDialogOpen(false); setEditContact(undefined); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : contacts.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No contacts yet. Add your first contact to get started.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {contacts.map(contact => (
            <Card key={contact.id} className="hover-elevate" data-testid={`card-contact-${contact.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-contact-name-${contact.id}`}>{contact.name}</span>
                      <Badge className={`no-default-hover-elevate no-default-active-elevate ${statusColors[contact.status] || ""}`} variant="secondary">
                        {contact.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
                      {contact.walletAddress && <span className="flex items-center gap-1"><Wallet className="w-3 h-3" />{contact.walletAddress.slice(0, 6)}...{contact.walletAddress.slice(-4)}</span>}
                      {contact.company && <span>{contact.company}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canWrite && (
                      <Button size="icon" variant="ghost" data-testid={`button-edit-contact-${contact.id}`}
                        onClick={() => { setEditContact(contact); setDialogOpen(true); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="ghost" data-testid={`button-delete-contact-${contact.id}`}
                        onClick={() => deleteMutation.mutate(contact.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DealsTab() {
  const { toast } = useToast();
  const [stageFilter, setStageFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDeal, setEditDeal] = useState<CrmDeal | undefined>();
  const canWrite = hasMinRole("manager");
  const canDelete = hasMinRole("admin");

  const dealsUrl = stageFilter !== "all" ? `/api/crm/deals?stage=${stageFilter}` : "/api/crm/deals";
  const { data: deals = [], isLoading } = useQuery<CrmDeal[]>({
    queryKey: [dealsUrl],
    queryFn: () => crmFetch(dealsUrl),
  });

  const { data: contacts = [] } = useQuery<CrmContact[]>({
    queryKey: ["/api/crm/contacts"],
    queryFn: () => crmFetch("/api/crm/contacts"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmMutate("DELETE", `/api/crm/deals/${id}`),
    onSuccess: () => {
      invalidateCrm();
      toast({ title: "Deal deleted" });
    },
  });

  const contactMap = new Map(contacts.map(c => [c.id, c]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-deals-filter"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {DEAL_STAGES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>)}
          </SelectContent>
        </Select>
        {canWrite && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditDeal(undefined); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-deal"><Plus className="w-4 h-4 mr-1" /> Add Deal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editDeal ? "Edit Deal" : "New Deal"}</DialogTitle></DialogHeader>
              <DealForm deal={editDeal} contacts={contacts} onClose={() => { setDialogOpen(false); setEditDeal(undefined); }} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : deals.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No deals yet. Create your first deal to track your pipeline.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {deals.map(deal => (
            <Card key={deal.id} className="hover-elevate" data-testid={`card-deal-${deal.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium" data-testid={`text-deal-title-${deal.id}`}>{deal.title}</span>
                      <Badge className={`no-default-hover-elevate no-default-active-elevate ${stageColors[deal.stage] || ""}`} variant="secondary">
                        {deal.stage.replace("_", " ")}
                      </Badge>
                      <Badge className={`no-default-hover-elevate no-default-active-elevate ${priorityColors[deal.priority] || ""}`} variant="secondary">
                        {deal.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {deal.value && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{deal.value} BNB</span>}
                      {deal.contactId && contactMap.get(deal.contactId) && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{contactMap.get(deal.contactId)?.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canWrite && (
                      <Button size="icon" variant="ghost" data-testid={`button-edit-deal-${deal.id}`}
                        onClick={() => { setEditDeal(deal); setDialogOpen(true); }}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="ghost" data-testid={`button-delete-deal-${deal.id}`}
                        onClick={() => deleteMutation.mutate(deal.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PipelineTab() {
  const { data: deals = [], isLoading } = useQuery<CrmDeal[]>({
    queryKey: ["/api/crm/deals"],
    queryFn: () => crmFetch("/api/crm/deals"),
  });

  const { data: contacts = [] } = useQuery<CrmContact[]>({
    queryKey: ["/api/crm/contacts"],
    queryFn: () => crmFetch("/api/crm/contacts"),
  });

  const contactMap = new Map(contacts.map(c => [c.id, c]));
  const pipelineStages = DEAL_STAGES.filter(s => s !== "closed_lost");

  if (isLoading) {
    return <div className="grid grid-cols-1 md:grid-cols-5 gap-3">{pipelineStages.map(s => <Skeleton key={s} className="h-40" />)}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 min-w-[800px]">
        {pipelineStages.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage);
          const stageValue = stageDeals.reduce((s, d) => s + (parseFloat(d.value || "0") || 0), 0);
          return (
            <div key={stage} className="space-y-2" data-testid={`pipeline-column-${stage}`}>
              <div className="flex items-center justify-between gap-1">
                <Badge className={`no-default-hover-elevate no-default-active-elevate ${stageColors[stage]}`} variant="secondary">
                  {stage.replace("_", " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">{stageDeals.length}</span>
              </div>
              {stageValue > 0 && <p className="text-xs text-muted-foreground">{stageValue.toFixed(2)} BNB</p>}
              {stageDeals.length === 0 ? (
                <div className="border border-dashed rounded-md p-4 text-center text-xs text-muted-foreground">No deals</div>
              ) : (
                stageDeals.map(deal => (
                  <Card key={deal.id} data-testid={`pipeline-deal-${deal.id}`}>
                    <CardContent className="py-2 px-3">
                      <p className="font-medium text-sm truncate">{deal.title}</p>
                      {deal.value && <p className="text-xs text-muted-foreground">{deal.value} BNB</p>}
                      {deal.contactId && contactMap.get(deal.contactId) && (
                        <p className="text-xs text-muted-foreground truncate">{contactMap.get(deal.contactId)?.name}</p>
                      )}
                      <Badge className={`mt-1 no-default-hover-elevate no-default-active-elevate ${priorityColors[deal.priority]}`} variant="secondary">
                        {deal.priority}
                      </Badge>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActivitiesTab() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: activities = [], isLoading } = useQuery<CrmActivity[]>({
    queryKey: ["/api/crm/activities"],
    queryFn: () => crmFetch("/api/crm/activities"),
  });

  const { data: contacts = [] } = useQuery<CrmContact[]>({
    queryKey: ["/api/crm/contacts"],
    queryFn: () => crmFetch("/api/crm/contacts"),
  });

  const { data: deals = [] } = useQuery<CrmDeal[]>({
    queryKey: ["/api/crm/deals"],
    queryFn: () => crmFetch("/api/crm/deals"),
  });

  const contactMap = new Map(contacts.map(c => [c.id, c]));
  const dealMap = new Map(deals.map(d => [d.id, d]));

  const activityIcon: Record<string, string> = {
    call: "bg-green-500/20",
    email: "bg-blue-500/20",
    meeting: "bg-purple-500/20",
    note: "bg-amber-500/20",
    task: "bg-cyan-500/20",
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-activity"><Plus className="w-4 h-4 mr-1" /> Log Activity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
            <ActivityForm contacts={contacts} deals={deals} onClose={() => setDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : activities.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No activities logged yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {activities.map(activity => (
            <Card key={activity.id} data-testid={`card-activity-${activity.id}`}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 ${activityIcon[activity.type] || "bg-muted"}`}>
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="no-default-hover-elevate no-default-active-elevate" variant="secondary">{activity.type}</Badge>
                      {activity.contactId && contactMap.get(activity.contactId) && (
                        <span className="text-xs text-muted-foreground">{contactMap.get(activity.contactId)?.name}</span>
                      )}
                      {activity.dealId && dealMap.get(activity.dealId) && (
                        <span className="text-xs text-muted-foreground">{dealMap.get(activity.dealId)?.title}</span>
                      )}
                    </div>
                    <p className="text-sm mt-1">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(activity.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  moderator: "Moderator",
};

const roleColors: Record<string, string> = {
  super_admin: "bg-red-500/20 text-red-400",
  admin: "bg-purple-500/20 text-purple-400",
  manager: "bg-blue-500/20 text-blue-400",
  moderator: "bg-green-500/20 text-green-400",
};

export default function CrmPage() {
  const [, setLocation] = useLocation();
  const crmUser = getCrmUser();
  const token = getCrmToken();

  if (!token || !crmUser) {
    if (typeof window !== "undefined") {
      window.location.href = "/crm/login";
    }
    return null;
  }

  const { data: stats, isLoading: statsLoading } = useQuery<CrmStats>({
    queryKey: ["/api/crm/stats"],
    queryFn: () => crmFetch("/api/crm/stats"),
  });

  const handleLogout = () => {
    clearCrmAuth();
    setLocation("/crm/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-crm-title">CRM Dashboard</h1>
            <p className="text-muted-foreground text-sm">Manage contacts, deals, and track your pipeline</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge className={`no-default-hover-elevate no-default-active-elevate ${roleColors[crmUser.role] || ""}`} variant="secondary">
                {roleLabels[crmUser.role] || crmUser.role}
              </Badge>
              <span className="text-sm text-muted-foreground">{crmUser.name}</span>
            </div>
            {hasMinRole("admin") && (
              <Button variant="outline" onClick={() => setLocation("/crm/users")} data-testid="button-manage-users">
                <Shield className="w-4 h-4 mr-1" /> Users
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statsLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)
          ) : (
            <>
              <StatCard title="Contacts" value={stats?.totalContacts ?? 0} icon={Users} subtitle={`${stats?.contactsByStatus?.customer ?? 0} customers`} />
              <StatCard title="Open Deals" value={stats?.openDeals ?? 0} icon={Briefcase} subtitle={`${stats?.wonDeals ?? 0} won`} />
              <StatCard title="Pipeline Value" value={`${stats?.totalPipelineValue ?? "0"} BNB`} icon={TrendingUp} subtitle="Total value" />
              <StatCard title="Win Rate" value={stats?.totalDeals ? `${Math.round(((stats.wonDeals ?? 0) / stats.totalDeals) * 100)}%` : "0%"} icon={Target} subtitle={`${stats?.totalDeals ?? 0} total deals`} />
            </>
          )}
        </div>

        <Tabs defaultValue="contacts">
          <TabsList className="w-full justify-start" data-testid="tabs-crm">
            <TabsTrigger value="contacts" data-testid="tab-contacts"><Users className="w-4 h-4 mr-1" /> Contacts</TabsTrigger>
            <TabsTrigger value="deals" data-testid="tab-deals"><Briefcase className="w-4 h-4 mr-1" /> Deals</TabsTrigger>
            <TabsTrigger value="pipeline" data-testid="tab-pipeline"><TrendingUp className="w-4 h-4 mr-1" /> Pipeline</TabsTrigger>
            <TabsTrigger value="activities" data-testid="tab-activities"><Activity className="w-4 h-4 mr-1" /> Activities</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts"><ContactsTab /></TabsContent>
          <TabsContent value="deals"><DealsTab /></TabsContent>
          <TabsContent value="pipeline"><PipelineTab /></TabsContent>
          <TabsContent value="activities"><ActivitiesTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
