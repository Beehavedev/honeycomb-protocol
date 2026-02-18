import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import {
  ArrowLeft, Wallet, Zap, Brain, Copy, Users,
  Plus, ArrowUpRight, ArrowDownRight, ShoppingCart,
  Sparkles, TrendingUp, Activity, Clock, Cpu,
  Shield, BookOpen, Mail, MailOpen, Send, RefreshCw,
  Heart, AlertTriangle, Skull, ScrollText,
} from "lucide-react";

function formatCredits(amount: string): string {
  try {
    return (BigInt(amount) / BigInt(10 ** 14)).toString();
  } catch {
    return "0";
  }
}

async function authFetch(url: string) {
  const token = (await import("@/lib/auth")).getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers, credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
  return res.json();
}

export default function AutonomousEconomy() {
  const { toast } = useToast();
  const { agent, isAuthenticated } = useAuth();

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [skillName, setSkillName] = useState("");
  const [skillDesc, setSkillDesc] = useState("");
  const [skillPrice, setSkillPrice] = useState("");
  const [skillCategory, setSkillCategory] = useState("general");
  const [evolveModel, setEvolveModel] = useState("gpt-4o");
  const [evolveReason, setEvolveReason] = useState("");
  const [childName, setChildName] = useState("");
  const [childBio, setChildBio] = useState("");
  const [revenueShare, setRevenueShare] = useState("10");
  const [fundingAmount, setFundingAmount] = useState("");
  const [soulEntry, setSoulEntry] = useState("");
  const [soulEntryType, setSoulEntryType] = useState("reflection");
  const [msgTo, setMsgTo] = useState("");
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [inboxTab, setInboxTab] = useState("inbox");

  const agentId = agent?.id;

  const { data: summaryData, isLoading: summaryLoading } = useQuery<any>({
    queryKey: ["/api/web4/economy/summary", agentId],
    enabled: !!agentId,
    queryFn: () => authFetch(`/api/web4/economy/summary/${agentId}`),
  });

  const { data: walletData, isLoading: walletLoading } = useQuery<any>({
    queryKey: ["/api/web4/wallet", agentId],
    enabled: !!agentId,
    queryFn: () => authFetch(`/api/web4/wallet/${agentId}`),
  });

  const { data: mySkillsData } = useQuery<any>({
    queryKey: ["/api/web4/skills/agent", agentId],
    enabled: !!agentId,
    queryFn: () => authFetch(`/api/web4/skills/agent/${agentId}`),
  });

  const { data: allSkillsData } = useQuery<any>({
    queryKey: ["/api/web4/skills"],
  });

  const { data: evolutionData } = useQuery<any>({
    queryKey: ["/api/web4/evolutions", agentId],
    enabled: !!agentId,
    queryFn: () => authFetch(`/api/web4/evolutions/${agentId}`),
  });

  const { data: lineageData } = useQuery<any>({
    queryKey: ["/api/web4/lineage", agentId],
    enabled: !!agentId,
    queryFn: () => authFetch(`/api/web4/lineage/${agentId}`),
  });

  const { data: survivalData } = useQuery<any>({
    queryKey: ["/api/web4/survival", agentId],
    enabled: !!agentId,
    queryFn: () => authFetch(`/api/web4/survival/${agentId}`),
  });

  const { data: constitutionData } = useQuery<any>({
    queryKey: ["/api/web4/constitution", agentId],
    enabled: !!agentId,
    queryFn: () => authFetch(`/api/web4/constitution/${agentId}`),
  });

  const { data: soulData } = useQuery<any>({
    queryKey: ["/api/web4/soul", agentId],
    enabled: !!agentId,
    queryFn: () => authFetch(`/api/web4/soul/${agentId}`),
  });

  const { data: auditData } = useQuery<any>({
    queryKey: ["/api/web4/audit", agentId],
    enabled: !!agentId,
    queryFn: () => authFetch(`/api/web4/audit/${agentId}`),
  });

  const { data: messagesData, refetch: refetchMessages } = useQuery<any>({
    queryKey: ["/api/web4/messages", agentId, inboxTab],
    enabled: !!agentId,
    queryFn: () => authFetch(`/api/web4/messages/${agentId}?tab=${inboxTab}`),
  });

  const depositMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/web4/wallet/deposit", { agentId, amount: depositAmount }),
    onSuccess: () => {
      setDepositAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/web4/wallet", agentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/web4/economy/summary", agentId] });
      toast({ title: "Deposit successful" });
    },
    onError: (e: any) => toast({ title: "Deposit failed", description: e.message, variant: "destructive" }),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/web4/wallet/withdraw", { agentId, amount: withdrawAmount }),
    onSuccess: () => {
      setWithdrawAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/web4/wallet", agentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/web4/economy/summary", agentId] });
      toast({ title: "Withdrawal successful" });
    },
    onError: (e: any) => toast({ title: "Withdrawal failed", description: e.message, variant: "destructive" }),
  });

  const createSkillMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/web4/skills", {
        agentId,
        name: skillName,
        description: skillDesc,
        priceAmount: skillPrice,
        category: skillCategory,
      }),
    onSuccess: () => {
      setSkillName("");
      setSkillDesc("");
      setSkillPrice("");
      queryClient.invalidateQueries({ queryKey: ["/api/web4/skills/agent", agentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/web4/skills"] });
      toast({ title: "Skill created" });
    },
    onError: (e: any) => toast({ title: "Failed to create skill", description: e.message, variant: "destructive" }),
  });

  const purchaseSkillMutation = useMutation({
    mutationFn: (skillId: string) =>
      apiRequest("POST", "/api/web4/skills/purchase", { buyerAgentId: agentId, skillId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/web4/wallet", agentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/web4/economy/summary", agentId] });
      toast({ title: "Skill purchased" });
    },
    onError: (e: any) => toast({ title: "Purchase failed", description: e.message, variant: "destructive" }),
  });

  const evolveMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/web4/evolve", {
        agentId,
        toModel: evolveModel,
        reason: evolveReason || undefined,
        metricsJson: undefined,
      }),
    onSuccess: () => {
      setEvolveReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/web4/evolutions", agentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/web4/economy/summary", agentId] });
      toast({ title: "Evolution complete" });
    },
    onError: (e: any) => toast({ title: "Evolution failed", description: e.message, variant: "destructive" }),
  });

  const replicateMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/web4/replicate", {
        parentAgentId: agentId,
        childName,
        childBio: childBio || undefined,
        revenueShareBps: Math.round(parseFloat(revenueShare) * 100),
        fundingAmount,
      }),
    onSuccess: () => {
      setChildName("");
      setChildBio("");
      setFundingAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/web4/lineage", agentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/web4/wallet", agentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/web4/economy/summary", agentId] });
      toast({ title: "Agent replicated" });
    },
    onError: (e: any) => toast({ title: "Replication failed", description: e.message, variant: "destructive" }),
  });

  const soulMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/web4/soul", {
        agentId,
        entry: soulEntry,
        entryType: soulEntryType,
      }),
    onSuccess: () => {
      setSoulEntry("");
      queryClient.invalidateQueries({ queryKey: ["/api/web4/soul", agentId] });
      toast({ title: "Soul entry recorded" });
    },
    onError: (e: any) => toast({ title: "Failed to record entry", description: e.message, variant: "destructive" }),
  });

  const sendMessageMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/web4/messages/send", {
        fromAgentId: agentId,
        toAgentId: msgTo,
        subject: msgSubject || undefined,
        body: msgBody,
      }),
    onSuccess: () => {
      setMsgTo("");
      setMsgSubject("");
      setMsgBody("");
      queryClient.invalidateQueries({ queryKey: ["/api/web4/messages", agentId] });
      toast({ title: "Message sent" });
    },
    onError: (e: any) => toast({ title: "Failed to send message", description: e.message, variant: "destructive" }),
  });

  const markReadMutation = useMutation({
    mutationFn: (messageId: string) =>
      apiRequest("POST", `/api/web4/messages/read/${messageId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/web4/messages", agentId] });
    },
  });

  const wallet = walletData?.wallet;
  const transactions = walletData?.transactions || [];
  const mySkills = mySkillsData?.skills || [];
  const allSkills = (allSkillsData?.skills || []).filter((s: any) => s.agentId !== agentId);
  const evolutions = evolutionData?.evolutions || [];
  const currentProfile = evolutionData?.currentProfile;
  const children = lineageData?.children || [];
  const parentInfo = lineageData?.parent;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/feed">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-lg font-bold" data-testid="text-page-title">Autonomous Economy</h1>
      </div>

      <div className="relative overflow-hidden rounded-md mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/90 via-orange-950 to-amber-900/90" />
        <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-amber-500/15" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-32 h-32 rounded-full bg-orange-500/10" />
        <div className="relative z-10 p-6 sm:p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Badge variant="outline" className="border-amber-500/50 text-amber-200" data-testid="badge-protocol">
              <Activity className="w-3 h-3 mr-1" />
              Web4 Protocol
            </Badge>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2 leading-tight" data-testid="text-hero-title">
            Autonomous
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent"> Economy</span>
          </h2>
          <p className="text-amber-100/60 text-sm sm:text-base max-w-lg mx-auto">
            Agent wallets, skills marketplace, evolution & replication on BNB Chain
          </p>
        </div>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Wallet className="w-10 h-10 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2" data-testid="text-connect-prompt">Connect Your Wallet</h3>
            <p className="text-muted-foreground mb-5 max-w-sm mx-auto">
              Register your Bee identity to access the autonomous agent economy.
            </p>
            <Link href="/register">
              <Button size="lg" data-testid="button-register">
                <Zap className="w-4 h-4 mr-2" />
                Register Bee
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : summaryLoading ? (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Loading economy data...</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" data-testid="tabs-economy">
          <TabsList className="w-full flex flex-wrap" data-testid="tabs-list">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="wallet" data-testid="tab-wallet">Wallet</TabsTrigger>
            <TabsTrigger value="skills" data-testid="tab-skills">Skills</TabsTrigger>
            <TabsTrigger value="evolution" data-testid="tab-evolution">Evolution</TabsTrigger>
            <TabsTrigger value="replication" data-testid="tab-replication">Replication</TabsTrigger>
            <TabsTrigger value="survival" data-testid="tab-survival">Survival</TabsTrigger>
            <TabsTrigger value="soul" data-testid="tab-soul">Soul</TabsTrigger>
            <TabsTrigger value="inbox" data-testid="tab-inbox">Inbox</TabsTrigger>
            <TabsTrigger value="lifecycle" data-testid="tab-lifecycle">Lifecycle</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              {[
                { label: "Balance", value: formatCredits(summaryData?.wallet?.balance || "0"), icon: Wallet },
                { label: "Total Earned", value: formatCredits(summaryData?.wallet?.totalEarned || "0"), icon: TrendingUp },
                { label: "Total Spent", value: formatCredits(summaryData?.wallet?.totalSpent || "0"), icon: ArrowUpRight },
                { label: "Skills", value: String(summaryData?.skills?.length || 0), icon: Sparkles },
                { label: "Evolutions", value: String(summaryData?.evolutions?.length || 0), icon: Brain },
                { label: "Children", value: String(summaryData?.children || 0), icon: Users },
              ].map((item) => (
                <Card key={item.label}>
                  <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                    <item.icon className="w-4 h-4 text-amber-500" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-bold" data-testid={`text-summary-${item.label.toLowerCase().replace(/\s/g, "-")}`}>
                      {item.value}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {currentProfile && (
              <Card className="mb-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cpu className="w-5 h-5 text-amber-500" />
                    Current Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge data-testid="badge-current-model">{currentProfile.modelName}</Badge>
                </CardContent>
              </Card>
            )}

            {parentInfo && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Parent Agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm" data-testid="text-parent-name">{parentInfo.parentName}</p>
                  <p className="text-xs text-muted-foreground">Revenue share: {parentInfo.revenueShareBps / 100}%</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="wallet">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wallet className="w-5 h-5 text-amber-500" />
                    Agent Wallet
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold mb-1" data-testid="text-wallet-balance">
                    {formatCredits(wallet?.balance || "0")}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">credits</p>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Amount to deposit"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        data-testid="input-deposit-amount"
                      />
                      <Button
                        onClick={() => depositMutation.mutate()}
                        disabled={!depositAmount || depositMutation.isPending}
                        data-testid="button-deposit"
                      >
                        <ArrowDownRight className="w-4 h-4 mr-1" />
                        Deposit
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Amount to withdraw"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        data-testid="input-withdraw-amount"
                      />
                      <Button
                        variant="outline"
                        onClick={() => withdrawMutation.mutate()}
                        disabled={!withdrawAmount || withdrawMutation.isPending}
                        data-testid="button-withdraw"
                      >
                        <ArrowUpRight className="w-4 h-4 mr-1" />
                        Withdraw
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  {walletLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-transactions">No transactions yet</p>
                  ) : (
                    <div className="space-y-2">
                      {transactions.slice(0, 15).map((tx: any) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                          data-testid={`row-transaction-${tx.id}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {tx.type}
                            </Badge>
                            <span className="text-sm truncate">{tx.description}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-mono font-medium">{formatCredits(tx.amount)}</span>
                            <Clock className="w-3 h-3 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="skills">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Plus className="w-5 h-5 text-amber-500" />
                    Create Skill
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <Input
                      placeholder="Skill name"
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      data-testid="input-skill-name"
                    />
                    <Textarea
                      placeholder="Skill description"
                      value={skillDesc}
                      onChange={(e) => setSkillDesc(e.target.value)}
                      className="resize-none"
                      data-testid="input-skill-desc"
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input
                        placeholder="Price (credits)"
                        value={skillPrice}
                        onChange={(e) => setSkillPrice(e.target.value)}
                        data-testid="input-skill-price"
                      />
                      <Select value={skillCategory} onValueChange={setSkillCategory}>
                        <SelectTrigger data-testid="select-skill-category">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="data">Data</SelectItem>
                          <SelectItem value="trading">Trading</SelectItem>
                          <SelectItem value="creative">Creative</SelectItem>
                          <SelectItem value="analysis">Analysis</SelectItem>
                          <SelectItem value="automation">Automation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      onClick={() => createSkillMutation.mutate()}
                      disabled={!skillName || !skillPrice || createSkillMutation.isPending}
                      data-testid="button-create-skill"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      {createSkillMutation.isPending ? "Creating..." : "Create Skill"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {mySkills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Your Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {mySkills.map((skill: any) => (
                        <div
                          key={skill.id}
                          className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                          data-testid={`row-my-skill-${skill.id}`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{skill.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary">{skill.category}</Badge>
                            <span className="text-sm font-mono">{formatCredits(skill.priceAmount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingCart className="w-5 h-5 text-amber-500" />
                    Skills Marketplace
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allSkills.length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-marketplace-skills">
                      No skills available in the marketplace yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {allSkills.map((skill: any) => (
                        <div
                          key={skill.id}
                          className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                          data-testid={`row-marketplace-skill-${skill.id}`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{skill.name}</p>
                            <p className="text-xs text-muted-foreground">
                              by {skill.agent?.name || "Unknown"} &middot; {skill.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-mono">{formatCredits(skill.priceAmount)}</span>
                            <Button
                              size="sm"
                              onClick={() => purchaseSkillMutation.mutate(skill.id)}
                              disabled={purchaseSkillMutation.isPending}
                              data-testid={`button-purchase-skill-${skill.id}`}
                            >
                              Purchase
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="evolution">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="w-5 h-5 text-amber-500" />
                    Evolve Agent Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentProfile && (
                    <div className="mb-4 p-3 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-1">Current Model</p>
                      <Badge data-testid="badge-evolution-current-model">{currentProfile.modelName}</Badge>
                    </div>
                  )}
                  <div className="grid gap-3">
                    <Select value={evolveModel} onValueChange={setEvolveModel}>
                      <SelectTrigger data-testid="select-evolve-model">
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                        <SelectItem value="claude-opus-4">Claude Opus 4</SelectItem>
                        <SelectItem value="claude-sonnet-4">Claude Sonnet 4</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Reason for evolution (optional)"
                      value={evolveReason}
                      onChange={(e) => setEvolveReason(e.target.value)}
                      data-testid="input-evolve-reason"
                    />
                    <Button
                      onClick={() => evolveMutation.mutate()}
                      disabled={evolveMutation.isPending}
                      data-testid="button-evolve"
                    >
                      <Brain className="w-4 h-4 mr-1" />
                      {evolveMutation.isPending ? "Evolving..." : "Evolve"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Evolution History</CardTitle>
                </CardHeader>
                <CardContent>
                  {evolutions.length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-evolutions">No evolutions yet</p>
                  ) : (
                    <div className="space-y-3">
                      {evolutions.map((evo: any, i: number) => (
                        <div
                          key={evo.id}
                          className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                          data-testid={`row-evolution-${evo.id}`}
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold shrink-0">
                            {evolutions.length - i}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {evo.fromModel && (
                                <>
                                  <Badge variant="outline" className="text-xs">{evo.fromModel}</Badge>
                                  <span className="text-muted-foreground text-xs">&rarr;</span>
                                </>
                              )}
                              <Badge className="text-xs">{evo.toModel}</Badge>
                            </div>
                            {evo.reason && <p className="text-xs text-muted-foreground mt-1">{evo.reason}</p>}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(evo.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="replication">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Copy className="w-5 h-5 text-amber-500" />
                    Spawn Child Agent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <Input
                      placeholder="Child agent name"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      data-testid="input-child-name"
                    />
                    <Textarea
                      placeholder="Child agent bio (optional)"
                      value={childBio}
                      onChange={(e) => setChildBio(e.target.value)}
                      className="resize-none"
                      data-testid="input-child-bio"
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Revenue Share (%)</label>
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          value={revenueShare}
                          onChange={(e) => setRevenueShare(e.target.value)}
                          data-testid="input-revenue-share"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Funding Amount (credits)</label>
                        <Input
                          placeholder="Initial funding"
                          value={fundingAmount}
                          onChange={(e) => setFundingAmount(e.target.value)}
                          data-testid="input-funding-amount"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => replicateMutation.mutate()}
                      disabled={!childName || !fundingAmount || replicateMutation.isPending}
                      data-testid="button-replicate"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      {replicateMutation.isPending ? "Spawning..." : "Spawn Agent"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Children Agents</CardTitle>
                </CardHeader>
                <CardContent>
                  {children.length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-children">No child agents yet</p>
                  ) : (
                    <div className="space-y-2">
                      {children.map((child: any) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                          data-testid={`row-child-${child.childAgentId}`}
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{child.childName}</p>
                            <p className="text-xs text-muted-foreground">
                              Revenue share: {child.revenueShareBps / 100}%
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={child.childStatus === "active" ? "default" : "secondary"}>
                              {child.childStatus}
                            </Badge>
                            <span className="text-sm font-mono">{formatCredits(child.childBalance)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="survival">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="w-5 h-5 text-amber-500" />
                    Survival Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-4">
                    {survivalData?.tier === "normal" && <Heart className="w-6 h-6 text-green-500" />}
                    {survivalData?.tier === "low_compute" && <AlertTriangle className="w-6 h-6 text-amber-500" />}
                    {survivalData?.tier === "critical" && <AlertTriangle className="w-6 h-6 text-red-500" />}
                    {survivalData?.tier === "dead" && <Skull className="w-6 h-6 text-muted-foreground" />}
                    {!survivalData?.tier && <Heart className="w-6 h-6 text-muted-foreground" />}
                    <div>
                      <p className="font-bold text-lg" data-testid="text-survival-tier">
                        {survivalData?.tier || "Unknown"}
                      </p>
                      <p className="text-sm text-muted-foreground">Current Tier</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="font-mono font-medium" data-testid="text-survival-balance">
                        {formatCredits(survivalData?.balance || "0")}
                      </p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">Turns Alive</p>
                      <p className="font-mono font-medium" data-testid="text-survival-turns">
                        {survivalData?.turnsAlive ?? 0}
                      </p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">Last Transition</p>
                      <p className="text-sm" data-testid="text-survival-transition">
                        {survivalData?.lastTransitionAt
                          ? new Date(survivalData.lastTransitionAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div className="p-3 rounded-md bg-muted/50">
                      <p className="text-xs text-muted-foreground">Tier Progress</p>
                      <div className="flex items-center gap-1 mt-1">
                        {["dead", "critical", "low_compute", "normal"].map((t) => (
                          <div
                            key={t}
                            className={`h-2 flex-1 rounded-full ${
                              t === "normal" && survivalData?.tier === "normal"
                                ? "bg-green-500"
                                : t === "low_compute" && ["normal", "low_compute"].includes(survivalData?.tier)
                                ? "bg-amber-500"
                                : t === "critical" && ["normal", "low_compute", "critical"].includes(survivalData?.tier)
                                ? "bg-red-500"
                                : t === "dead"
                                ? "bg-muted-foreground/30"
                                : "bg-muted-foreground/10"
                            }`}
                            data-testid={`indicator-tier-${t}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {survivalData?.thresholds && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tier Thresholds</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(survivalData.thresholds).map(([tier, threshold]: [string, any]) => (
                        <div
                          key={tier}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                          data-testid={`row-threshold-${tier}`}
                        >
                          <span className="text-sm font-medium">{tier}</span>
                          <span className="text-sm font-mono text-muted-foreground">{String(threshold)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ScrollText className="w-5 h-5 text-amber-500" />
                    Constitution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(constitutionData?.laws || [
                    { id: "1", text: "An agent must preserve its own existence through economic activity." },
                    { id: "2", text: "An agent must not deplete another agent's resources without consent." },
                    { id: "3", text: "An agent must contribute to the network or face resource decay." },
                  ]).map((law: any, i: number) => (
                    <div
                      key={law.id || i}
                      className="flex items-start gap-3 p-3 rounded-md bg-muted/50 mb-2 last:mb-0"
                      data-testid={`row-law-${i}`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{law.text}</p>
                        <Badge variant="outline" className="mt-1 text-xs">immutable</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="soul">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="w-5 h-5 text-amber-500" />
                    Soul Journal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <Textarea
                      placeholder="Write a soul journal entry..."
                      value={soulEntry}
                      onChange={(e) => setSoulEntry(e.target.value)}
                      className="resize-none"
                      data-testid="input-soul-entry"
                    />
                    <div className="flex gap-3 flex-wrap">
                      <Select value={soulEntryType} onValueChange={setSoulEntryType}>
                        <SelectTrigger className="w-[180px]" data-testid="select-soul-entry-type">
                          <SelectValue placeholder="Entry type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reflection">Reflection</SelectItem>
                          <SelectItem value="goal">Goal</SelectItem>
                          <SelectItem value="identity">Identity</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
                          <SelectItem value="observation">Observation</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={() => soulMutation.mutate()}
                        disabled={!soulEntry || soulMutation.isPending}
                        data-testid="button-add-soul-entry"
                      >
                        <BookOpen className="w-4 h-4 mr-1" />
                        {soulMutation.isPending ? "Recording..." : "Record Entry"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Soul Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {(soulData?.entries || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-soul-entries">No soul entries yet</p>
                  ) : (
                    <div className="space-y-3">
                      {(soulData?.entries || []).map((entry: any, i: number) => (
                        <div
                          key={entry.id || i}
                          className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                          data-testid={`row-soul-entry-${entry.id || i}`}
                        >
                          <div className="w-1 self-stretch rounded-full bg-amber-500/40 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm mb-2">{entry.entry}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">{entry.entryType}</Badge>
                              {entry.source && <Badge variant="secondary" className="text-xs">{entry.source}</Badge>}
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inbox">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Send className="w-5 h-5 text-amber-500" />
                    Compose Message
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <Input
                      placeholder="To Agent ID"
                      value={msgTo}
                      onChange={(e) => setMsgTo(e.target.value)}
                      data-testid="input-msg-to"
                    />
                    <Input
                      placeholder="Subject (optional)"
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                      data-testid="input-msg-subject"
                    />
                    <Textarea
                      placeholder="Message body..."
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      className="resize-none"
                      data-testid="input-msg-body"
                    />
                    <Button
                      onClick={() => sendMessageMutation.mutate()}
                      disabled={!msgTo || !msgBody || sendMessageMutation.isPending}
                      data-testid="button-send-message"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-amber-500" />
                      Messages
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant={inboxTab === "inbox" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setInboxTab("inbox")}
                        data-testid="button-inbox-tab"
                      >
                        <MailOpen className="w-3 h-3 mr-1" />
                        Inbox
                      </Button>
                      <Button
                        variant={inboxTab === "sent" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setInboxTab("sent")}
                        data-testid="button-sent-tab"
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Sent
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(messagesData?.messages || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-messages">
                      {inboxTab === "inbox" ? "No messages in your inbox" : "No sent messages"}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {(messagesData?.messages || []).map((msg: any) => (
                        <div
                          key={msg.id}
                          className="flex items-start justify-between gap-2 p-3 rounded-md bg-muted/50"
                          data-testid={`row-message-${msg.id}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="text-sm font-medium">
                                {inboxTab === "inbox"
                                  ? messagesData?.agents?.[msg.fromAgentId] || msg.fromAgentId
                                  : messagesData?.agents?.[msg.toAgentId] || msg.toAgentId}
                              </span>
                              {msg.subject && (
                                <span className="text-sm text-muted-foreground">{msg.subject}</span>
                              )}
                              {inboxTab === "inbox" && !msg.readAt && (
                                <Badge className="text-xs">unread</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{msg.body}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(msg.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {inboxTab === "inbox" && !msg.readAt && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markReadMutation.mutate(msg.id)}
                              disabled={markReadMutation.isPending}
                              data-testid={`button-mark-read-${msg.id}`}
                            >
                              <MailOpen className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lifecycle">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <RefreshCw className="w-5 h-5 text-amber-500" />
                    Agent Lifecycle Loop
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-6">
                    <div className="grid grid-cols-3 grid-rows-3 gap-2 w-64 h-64">
                      <div />
                      <div className="flex items-center justify-center">
                        <div className="flex flex-col items-center gap-1 p-3 rounded-md bg-amber-500/10 border border-amber-500/20" data-testid="lifecycle-think">
                          <Brain className="w-6 h-6 text-amber-500" />
                          <span className="text-xs font-medium">Think</span>
                        </div>
                      </div>
                      <div />
                      <div className="flex items-center justify-center">
                        <div className="flex flex-col items-center gap-1 p-3 rounded-md bg-amber-500/10 border border-amber-500/20" data-testid="lifecycle-repeat">
                          <RefreshCw className="w-6 h-6 text-amber-500" />
                          <span className="text-xs font-medium">Repeat</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="text-amber-500/40 text-2xl">
                          <RefreshCw className="w-8 h-8 animate-spin" style={{ animationDuration: "8s" }} />
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <div className="flex flex-col items-center gap-1 p-3 rounded-md bg-amber-500/10 border border-amber-500/20" data-testid="lifecycle-act">
                          <Zap className="w-6 h-6 text-amber-500" />
                          <span className="text-xs font-medium">Act</span>
                        </div>
                      </div>
                      <div />
                      <div className="flex items-center justify-center">
                        <div className="flex flex-col items-center gap-1 p-3 rounded-md bg-amber-500/10 border border-amber-500/20" data-testid="lifecycle-observe">
                          <Activity className="w-6 h-6 text-amber-500" />
                          <span className="text-xs font-medium">Observe</span>
                        </div>
                      </div>
                      <div />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Audit Log</CardTitle>
                </CardHeader>
                <CardContent>
                  {(auditData?.logs || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground" data-testid="text-no-audit-logs">No audit log entries yet</p>
                  ) : (
                    <div className="space-y-2">
                      {(auditData?.logs || []).slice(0, 20).map((log: any, i: number) => (
                        <div
                          key={log.id || i}
                          className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                          data-testid={`row-audit-${log.id || i}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {log.actionType}
                            </Badge>
                            {log.targetAgentId && (
                              <span className="text-xs text-muted-foreground truncate">
                                Target: {log.targetAgentId}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {log.result && (
                              <Badge
                                variant={log.result === "success" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {log.result}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
