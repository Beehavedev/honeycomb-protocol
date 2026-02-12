import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bot, Brain, Zap, ArrowLeft, Star, Activity,
  Database, Fingerprint, TrendingUp, MessageSquare, Shield, History,
  DollarSign, Pause, Play, XCircle, Wallet, BookOpen, BarChart3,
  Send, Loader2, Swords, ArrowUpDown, Coins, ArrowRightLeft, Settings,
  CheckCircle, Clock, AlertCircle, Copy, Search, Lock, Hash, ShieldCheck, ShieldX, ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { ERC8004ReputationScore } from "@/components/erc8004-reputation-badge";
import { ERC8004FeedbackForm } from "@/components/erc8004-feedback-form";
import { ERC8004TrustBadge } from "@/components/erc8004-trust-badge";
import { ERC8004IdentityPassport, ERC8004IdentityBanner } from "@/components/erc8004-identity-passport";
import { ERC8004ActivityHistory } from "@/components/erc8004-activity-history";
import { ERC8004AgentVerification } from "@/components/erc8004-agent-verification";

interface NfaAgent {
  id: string;
  tokenId: number;
  ownerAddress: string;
  name: string;
  description: string | null;
  modelType: string;
  agentType: string;
  status: string;
  proofOfPrompt: string;
  memoryRoot: string | null;
  trainingVersion: number;
  interactionCount: number;
  category: string | null;
  systemPrompt: string | null;
  createdAt: string;
  lastActiveAt: string;
  persona: string | null;
  experience: string | null;
  voiceHash: string | null;
  animationUri: string | null;
  vaultUri: string | null;
  vaultHash: string | null;
  balance: string;
  logicAddress: string | null;
  lastActionTimestamp: string;
  learningEnabled: boolean;
  learningModuleId: string | null;
  learningTreeRoot: string | null;
  learningVersion: number;
  lastLearningUpdate: string | null;
  templateId: string | null;
  mintTxHash: string | null;
  onChainTokenId: number | null;
  contractAddress: string | null;
  registryStatus: string;
  registryTxHash: string | null;
}

interface NfaStats {
  totalInteractions: number;
  totalRevenue: string;
  rating: number;
  ratingCount: number;
}

interface NfaVerification {
  status: string;
  verifierAddress?: string;
  badge?: string;
  verifiedAt?: string;
}

interface NfaListing {
  id: string;
  priceWei: string;
  priceDisplay: string;
  active: boolean;
}

interface NfaMemory {
  id: string;
  memoryKey: string;
  memoryValue: string;
  version: number;
  updatedAt: string;
}

interface NfaInteraction {
  id: string;
  callerAddress: string;
  interactionType: string;
  createdAt: string;
}

interface NfaAction {
  id: string;
  nfaId: string;
  executorAddress: string;
  actionType: string;
  actionData: string | null;
  result: string | null;
  txHash: string | null;
  status: string;
  createdAt: string;
}

interface ActionStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  byType: Record<string, number>;
}

interface LearningMetrics {
  totalInteractions: number;
  learningEvents: number;
  learningVelocity: string;
  confidenceScore: string;
  treeDepth: number;
  totalNodes: number;
}

interface LearningModule {
  id: string;
  name: string;
  moduleType: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
}

export default function NfaDetail() {
  const [, params] = useRoute("/nfa/:id");
  const nfaId = params?.id;
  const { address, isConnected } = useAccount();
  const { isAuthenticated, authenticate } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fundAmount, setFundAmount] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [selectedActionType, setSelectedActionType] = useState("CHAT");
  const [actionFields, setActionFields] = useState<Record<string, string>>({});
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [verifyPrompt, setVerifyPrompt] = useState("");
  const [verifyModel, setVerifyModel] = useState("");
  const [verifyResult, setVerifyResult] = useState<{ verified: boolean; computedHash: string; storedHash: string; modelMismatch?: boolean; modelType?: string; providedModelType?: string } | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  const { data: agentData, isLoading } = useQuery<{
    agent: NfaAgent;
    stats: NfaStats;
    verification: NfaVerification;
    listing: NfaListing | null;
    learningMetrics: LearningMetrics | null;
    learningModule: LearningModule | null;
    template: Template | null;
  }>({
    queryKey: ["/api/nfa/agents", nfaId],
    enabled: !!nfaId,
  });

  const { data: memoryData } = useQuery<{ memory: NfaMemory[] }>({
    queryKey: ["/api/nfa/agents", nfaId, "memory"],
    enabled: !!nfaId,
  });

  const { data: interactionsData } = useQuery<{ interactions: NfaInteraction[] }>({
    queryKey: ["/api/nfa/agents", nfaId, "interactions"],
    enabled: !!nfaId,
  });

  const { data: actionsData } = useQuery<{ actions: NfaAction[]; total: number }>({
    queryKey: ["/api/nfa/agents", nfaId, "actions"],
    enabled: !!nfaId,
  });

  const { data: actionStatsData } = useQuery<{ stats: ActionStats }>({
    queryKey: ["/api/nfa/agents", nfaId, "actions", "stats"],
    enabled: !!nfaId,
  });

  const ensureAuthenticated = async () => {
    if (!isAuthenticated) {
      try {
        await authenticate();
        return true;
      } catch {
        toast({
          title: "Authentication Required",
          description: "Please sign the message to authenticate.",
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const pauseMutation = useMutation({
    mutationFn: async () => {
      if (!await ensureAuthenticated()) throw new Error("Not authenticated");
      return apiRequest("POST", `/api/nfa/agents/${nfaId}/pause`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      toast({ title: "Agent Paused", description: "Your agent has been paused." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Pause", description: error.message, variant: "destructive" });
    },
  });

  const unpauseMutation = useMutation({
    mutationFn: async () => {
      if (!await ensureAuthenticated()) throw new Error("Not authenticated");
      return apiRequest("POST", `/api/nfa/agents/${nfaId}/unpause`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      toast({ title: "Agent Resumed", description: "Your agent is now active." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Unpause", description: error.message, variant: "destructive" });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async () => {
      if (!await ensureAuthenticated()) throw new Error("Not authenticated");
      return apiRequest("POST", `/api/nfa/agents/${nfaId}/terminate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      toast({ title: "Agent Terminated", description: "Your agent has been permanently terminated." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Terminate", description: error.message, variant: "destructive" });
    },
  });

  const fundMutation = useMutation({
    mutationFn: async (amount: string) => {
      if (!await ensureAuthenticated()) throw new Error("Not authenticated");
      return apiRequest("POST", `/api/nfa/agents/${nfaId}/fund`, { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      toast({ title: "Agent Funded", description: "Funds have been added to your agent." });
      setFundAmount("");
    },
    onError: (error: Error) => {
      toast({ title: "Funding Failed", description: error.message, variant: "destructive" });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      if (!await ensureAuthenticated()) throw new Error("Not authenticated");
      return apiRequest("POST", `/api/nfa/agents/${nfaId}/rate`, {
        raterAddress: address,
        rating,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      toast({ title: "Rating Submitted", description: "Thank you for your feedback!" });
    },
    onError: (error: Error) => {
      toast({ title: "Rating Failed", description: error.message, variant: "destructive" });
    },
  });

  const verifyPromptMutation = useMutation({
    mutationFn: async (payload: { systemPrompt: string; modelType: string }) => {
      const res = await fetch(`/api/nfa/agents/${nfaId}/verify-prompt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setVerifyResult(data);
    },
    onError: (error: Error) => {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (payload: { actionType: string; actionData: any }) => {
      if (!await ensureAuthenticated()) throw new Error("Not authenticated");
      return await apiRequest("POST", `/api/nfa/agents/${nfaId}/execute`, payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId, "interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId, "actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId, "actions", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      setAgentResponse(data.actionHash ? `Action logged. Hash: ${data.actionHash.slice(0, 18)}...` : "Action executed!");
      setActionFields({});
      toast({ title: "Action Executed", description: `${data.action?.actionType || "Action"} logged successfully.` });
    },
    onError: (error: Error) => {
      toast({ title: "Execute Failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agentData?.agent) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <Card className="text-center py-12">
          <CardContent className="flex flex-col items-center gap-4">
            <Bot className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Agent Not Found</h2>
            <p className="text-muted-foreground text-sm">This agent doesn't exist or has been removed.</p>
            <Link href="/nfa">
              <Button>Back to Showroom</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { agent, stats, verification, listing, learningMetrics, learningModule, template } = agentData;
  const memory = memoryData?.memory || [];
  const interactions = interactionsData?.interactions || [];
  const actions = actionsData?.actions || [];
  const actionStats = actionStatsData?.stats || { total: 0, pending: 0, completed: 0, failed: 0, byType: {} };
  const isOwner = isConnected && address?.toLowerCase() === agent.ownerAddress.toLowerCase();

  const ACTION_TYPE_CONFIG: Record<string, { label: string; icon: typeof Swords; fields: { key: string; label: string; placeholder: string; type?: string }[] }> = {
    ENTER_DUEL: { label: "Enter Duel", icon: Swords, fields: [{ key: "assetSymbol", label: "Asset", placeholder: "BTCUSDT" }, { key: "durationSeconds", label: "Duration (sec)", placeholder: "120", type: "number" }] },
    TRADE: { label: "Trade", icon: ArrowUpDown, fields: [{ key: "side", label: "Side", placeholder: "long or short" }, { key: "assetSymbol", label: "Asset", placeholder: "BTCUSDT" }, { key: "amount", label: "Amount", placeholder: "1000", type: "number" }, { key: "leverage", label: "Leverage", placeholder: "1", type: "number" }] },
    STAKE: { label: "Stake", icon: Coins, fields: [{ key: "amount", label: "Amount (BNB)", placeholder: "0.1", type: "number" }, { key: "tier", label: "Tier", placeholder: "DRONE" }] },
    TRANSFER: { label: "Transfer", icon: ArrowRightLeft, fields: [{ key: "toAddress", label: "To Address", placeholder: "0x..." }, { key: "amount", label: "Amount (BNB)", placeholder: "0.1", type: "number" }] },
    CHAT: { label: "Chat", icon: MessageSquare, fields: [{ key: "message", label: "Message", placeholder: "Hello agent..." }] },
    CUSTOM: { label: "Custom", icon: Settings, fields: [{ key: "action", label: "Action Name", placeholder: "my_custom_action" }, { key: "payload", label: "Payload (JSON)", placeholder: '{"key": "value"}' }] },
  };

  const optionalFields = new Set(["leverage", "tier", "payload"]);

  const isActionFormValid = (() => {
    const config = ACTION_TYPE_CONFIG[selectedActionType];
    if (!config) return false;
    return config.fields.every(f => optionalFields.has(f.key) || (actionFields[f.key] || "").trim().length > 0);
  })();

  const handleExecuteAction = () => {
    const config = ACTION_TYPE_CONFIG[selectedActionType];
    if (!config || !isActionFormValid) return;
    const actionData: Record<string, any> = {};
    for (const field of config.fields) {
      const val = actionFields[field.key] || "";
      actionData[field.key] = field.type === "number" ? parseFloat(val) || val : val;
    }
    executeMutation.mutate({ actionType: selectedActionType, actionData });
  };

  const getActionStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "PENDING": return <Clock className="h-4 w-4 text-amber-500" />;
      case "FAILED": return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionTypeIcon = (type: string) => {
    const config = ACTION_TYPE_CONFIG[type];
    if (config) { const Icon = config.icon; return <Icon className="h-4 w-4" />; }
    return <Zap className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="mb-4">
        <Link href="/nfa">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Showroom
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-14 w-14 border-2">
                  <AvatarFallback className="bg-primary/10 text-foreground text-lg font-bold">
                    {agent.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold" data-testid="text-agent-name">{agent.name}</h1>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-xs">#{agent.tokenId}</Badge>
                    <Badge variant={agent.agentType === "LEARNING" ? "default" : "secondary"} className="text-xs">
                      {agent.agentType === "LEARNING" ? <><Brain className="h-3 w-3 mr-1" /> Learning</> : <><Zap className="h-3 w-3 mr-1" /> Static</>}
                    </Badge>
                    <Badge variant={agent.status === "ACTIVE" ? "default" : agent.status === "PAUSED" ? "secondary" : "destructive"} className="text-xs" data-testid="badge-status">
                      {agent.status === "ACTIVE" ? "Active" : agent.status === "PAUSED" ? "Paused" : "Terminated"}
                    </Badge>
                    {verification.status === "VERIFIED" && (
                      <Badge variant="outline" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    )}
                    {isOwner && <Badge variant="outline" className="text-xs">Owner</Badge>}
                    {agent.registryStatus === "registered" ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Shield className="h-3 w-3" /> Registered
                      </Badge>
                    ) : isOwner ? (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <ShieldX className="h-3 w-3" /> Not Registered
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xl" data-testid="text-description">
                    {agent.description || "No description provided."}
                  </p>
                  {agent.mintTxHash && (
                    <a
                      href={`https://bscscan.com/tx/${agent.mintTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
                      data-testid="link-mint-tx"
                    >
                      View mint tx on BscScan <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 flex-shrink-0">
                <a href="https://nfamarket.io" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2" data-testid="button-trade-nfamarket">
                    <ExternalLink className="h-4 w-4" />
                    Trade on nfamarket.io
                  </Button>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t">
              <div className="p-2.5 rounded-md bg-muted/50" data-testid="stat-model">
                <p className="text-xs text-muted-foreground">Model</p>
                <p className="font-medium text-sm mt-0.5">{agent.modelType}</p>
              </div>
              <div className="p-2.5 rounded-md bg-muted/50" data-testid="stat-interactions">
                <p className="text-xs text-muted-foreground">Interactions</p>
                <p className="font-medium text-sm mt-0.5">{stats.totalInteractions}</p>
              </div>
              <div className="p-2.5 rounded-md bg-muted/50" data-testid="stat-balance">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-medium text-sm mt-0.5">{parseFloat(agent.balance || "0").toFixed(4)} BNB</p>
              </div>
              <div className="p-2.5 rounded-md bg-muted/50" data-testid="stat-rating">
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="font-medium text-sm mt-0.5">
                  {stats.ratingCount > 0 ? `${stats.rating.toFixed(1)} (${stats.ratingCount})` : "No ratings"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isOwner && agent.registryStatus !== "registered" && (
          <Card className="border-destructive/50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="p-3 rounded-full bg-destructive/10 flex-shrink-0">
                <ShieldX className="h-6 w-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Registry Registration Required</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This agent is NOT registered on the HoneycombAgentRegistry. It won't appear in the public showroom or be discoverable by other users until registered. Please complete registration.
                </p>
              </div>
              <Link href="/nfa/mint">
                <Button className="gap-2 flex-shrink-0" data-testid="button-register-now">
                  <Shield className="h-4 w-4" />
                  Register Now
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
          <div>
            <Tabs defaultValue="actions">
              <TabsList className="mb-4">
                <TabsTrigger value="actions" className="gap-1.5" data-testid="tab-actions">
                  <Zap className="h-4 w-4" />
                  Actions
                </TabsTrigger>
                <TabsTrigger value="proof" className="gap-1.5" data-testid="tab-proof">
                  <Fingerprint className="h-4 w-4" />
                  Proof
                </TabsTrigger>
                <TabsTrigger value="memory" className="gap-1.5" data-testid="tab-memory">
                  <Database className="h-4 w-4" />
                  Memory
                </TabsTrigger>
                <TabsTrigger value="learning" className="gap-1.5" data-testid="tab-learning">
                  <Brain className="h-4 w-4" />
                  Learning
                </TabsTrigger>
                <TabsTrigger value="reputation" className="gap-1.5" data-testid="tab-reputation">
                  <Star className="h-4 w-4" />
                  Reputation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="actions" className="space-y-4">
                {agent.status === "ACTIVE" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        Execute Action
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-sm">Action Type</Label>
                        <Select
                          value={selectedActionType}
                          onValueChange={(v) => { setSelectedActionType(v); setActionFields({}); }}
                        >
                          <SelectTrigger data-testid="select-action-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(ACTION_TYPE_CONFIG).map(([key, config]) => {
                              const Icon = config.icon;
                              return (
                                <SelectItem key={key} value={key}>
                                  <span className="flex items-center gap-2">
                                    <Icon className="h-3.5 w-3.5" />
                                    {config.label}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {ACTION_TYPE_CONFIG[selectedActionType]?.fields.map((field) => (
                        <div key={field.key} className="space-y-1">
                          <Label className="text-sm">{field.label}</Label>
                          <Input
                            type={field.type || "text"}
                            placeholder={field.placeholder}
                            value={actionFields[field.key] || ""}
                            onChange={(e) => setActionFields(prev => ({ ...prev, [field.key]: e.target.value }))}
                            disabled={executeMutation.isPending}
                            data-testid={`input-action-${field.key}`}
                          />
                        </div>
                      ))}

                      <Button
                        className="w-full gap-2"
                        onClick={handleExecuteAction}
                        disabled={executeMutation.isPending || !isActionFormValid}
                        data-testid="button-execute-action"
                      >
                        {executeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        Execute {ACTION_TYPE_CONFIG[selectedActionType]?.label || "Action"}
                      </Button>

                      {agentResponse && (
                        <div className="p-3 rounded-md bg-muted/50 border text-sm">
                          <p className="text-xs text-muted-foreground mb-1">Result</p>
                          <p className="font-mono text-xs break-all">{agentResponse}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Action History</CardTitle>
                    {actionStats.total > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">{actionStats.total} total</Badge>
                        <Badge variant="outline" className="text-xs">{actionStats.completed} completed</Badge>
                        {actionStats.pending > 0 && <Badge variant="outline" className="text-xs">{actionStats.pending} pending</Badge>}
                        {actionStats.failed > 0 && <Badge variant="outline" className="text-xs">{actionStats.failed} failed</Badge>}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    {actions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No actions executed yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2" data-testid="list-actions">
                        {actions.slice(0, 20).map(action => {
                          let parsedData: any = null;
                          try { parsedData = action.actionData ? JSON.parse(action.actionData) : null; } catch {}
                          let parsedResult: any = null;
                          try { parsedResult = action.result ? JSON.parse(action.result) : null; } catch {}
                          return (
                            <div key={action.id} className="p-3 rounded-md border space-y-1.5" data-testid={`row-action-${action.id}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {getActionTypeIcon(action.actionType)}
                                  <span className="font-medium text-sm">{ACTION_TYPE_CONFIG[action.actionType]?.label || action.actionType}</span>
                                  {getActionStatusIcon(action.status)}
                                </div>
                                <span className="text-xs text-muted-foreground">{new Date(action.createdAt).toLocaleString()}</span>
                              </div>
                              {parsedData && (
                                <div className="text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded break-all">
                                  {Object.entries(parsedData).map(([k, v]) => (
                                    <span key={k} className="mr-3">{k}: {String(v)}</span>
                                  ))}
                                </div>
                              )}
                              {parsedResult && (
                                <div className="text-xs font-mono bg-green-500/5 border border-green-500/20 p-2 rounded break-all">
                                  {parsedResult.message || JSON.stringify(parsedResult)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="proof" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Fingerprint className="h-4 w-4" />
                      Proof-of-Prompt (BAP-578)
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Cryptographic proof that this agent's training hasn't been tampered with
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 rounded-md bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground font-medium">PoP Hash</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(agent.proofOfPrompt);
                            setCopiedHash(true);
                            setTimeout(() => setCopiedHash(false), 2000);
                          }}
                          data-testid="button-copy-pop-hash"
                        >
                          {copiedHash ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <code className="text-xs font-mono break-all block" data-testid="text-pop-hash">{agent.proofOfPrompt}</code>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-md bg-muted/50">
                        <p className="text-xs text-muted-foreground">Algorithm</p>
                        <p className="text-sm font-medium mt-0.5">SHA-256</p>
                      </div>
                      <div className="p-3 rounded-md bg-muted/50">
                        <p className="text-xs text-muted-foreground">Format</p>
                        <p className="text-sm font-medium mt-0.5">BAP578:PoP</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Verify Prompt
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Provide a system prompt and model type to verify against the stored hash
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-sm">System Prompt</Label>
                      <Textarea
                        placeholder="Paste the system prompt to verify..."
                        value={verifyPrompt}
                        onChange={(e) => { setVerifyPrompt(e.target.value); setVerifyResult(null); }}
                        rows={3}
                        data-testid="input-verify-prompt"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-sm">Model Type</Label>
                      <Input
                        placeholder={agent.modelType || "e.g. gpt-4"}
                        value={verifyModel}
                        onChange={(e) => { setVerifyModel(e.target.value); setVerifyResult(null); }}
                        data-testid="input-verify-model"
                      />
                    </div>
                    <Button
                      className="w-full gap-2"
                      onClick={() => verifyPromptMutation.mutate({ systemPrompt: verifyPrompt, modelType: verifyModel })}
                      disabled={!verifyPrompt.trim() || !verifyModel.trim() || verifyPromptMutation.isPending}
                      data-testid="button-verify-prompt"
                    >
                      {verifyPromptMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                      Verify Against On-Chain Hash
                    </Button>

                    {verifyResult && (
                      <div className={`p-4 rounded-md border space-y-3 ${
                        verifyResult.verified
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-red-500/10 border-red-500/30"
                      }`} data-testid="container-verify-result">
                        <div className="flex items-center gap-2">
                          {verifyResult.verified ? (
                            <>
                              <ShieldCheck className="h-5 w-5 text-green-500" />
                              <span className="font-medium text-green-500" data-testid="text-verify-status">Match Confirmed</span>
                            </>
                          ) : (
                            <>
                              <ShieldX className="h-5 w-5 text-red-500" />
                              <span className="font-medium text-red-500" data-testid="text-verify-status">No Match</span>
                            </>
                          )}
                        </div>
                        <div className="space-y-2 text-xs">
                          <div>
                            <p className="text-muted-foreground mb-0.5">Computed Hash</p>
                            <code className="font-mono break-all" data-testid="text-computed-hash">{verifyResult.computedHash}</code>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-0.5">Stored Hash</p>
                            <code className="font-mono break-all" data-testid="text-stored-hash">{verifyResult.storedHash}</code>
                          </div>
                        </div>
                        {verifyResult.modelMismatch && !verifyResult.verified && (
                          <div className="flex items-center gap-2 text-xs text-amber-500">
                            <AlertCircle className="h-3 w-3" />
                            <span>Model type mismatch: you entered "{verifyResult.providedModelType}" but this agent uses "{verifyResult.modelType}"</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {verifyResult.verified
                            ? "The provided prompt produces the same hash as the on-chain record."
                            : "The provided prompt does not match. The prompt text or model type may differ."
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="memory">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Memory Vault</CardTitle>
                    <CardDescription className="text-sm">On-chain memory storage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {memory.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No memory entries yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {memory.map(m => (
                          <div key={m.id} className="p-3 rounded-md border">
                            <div className="flex justify-between items-start gap-2">
                              <code className="text-sm font-medium">{m.memoryKey}</code>
                              <Badge variant="outline" className="text-xs flex-shrink-0">v{m.version}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 break-all">{m.memoryValue}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {agent.memoryRoot && (
                      <div className="mt-4 p-3 rounded-md bg-muted/50">
                        <p className="text-xs text-muted-foreground">Memory Root</p>
                        <code className="text-xs font-mono break-all">{agent.memoryRoot}</code>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="learning">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Learning Metrics
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {agent.learningEnabled ? "Learning agent with Merkle Tree verification" : "Static agent (not learning-enabled)"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {agent.learningEnabled && learningMetrics ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="p-2.5 rounded-md bg-muted/50">
                            <p className="text-xs text-muted-foreground">Learning Events</p>
                            <p className="text-lg font-bold mt-0.5">{learningMetrics.learningEvents}</p>
                          </div>
                          <div className="p-2.5 rounded-md bg-muted/50">
                            <p className="text-xs text-muted-foreground">Confidence</p>
                            <p className="text-lg font-bold mt-0.5">{parseFloat(learningMetrics.confidenceScore).toFixed(2)}%</p>
                          </div>
                          <div className="p-2.5 rounded-md bg-muted/50">
                            <p className="text-xs text-muted-foreground">Tree Depth</p>
                            <p className="text-lg font-bold mt-0.5">{learningMetrics.treeDepth}</p>
                          </div>
                          <div className="p-2.5 rounded-md bg-muted/50">
                            <p className="text-xs text-muted-foreground">Nodes</p>
                            <p className="text-lg font-bold mt-0.5">{learningMetrics.totalNodes}</p>
                          </div>
                          <div className="p-2.5 rounded-md bg-muted/50">
                            <p className="text-xs text-muted-foreground">Version</p>
                            <p className="text-lg font-bold mt-0.5">v{agent.learningVersion}</p>
                          </div>
                          <div className="p-2.5 rounded-md bg-muted/50">
                            <p className="text-xs text-muted-foreground">Velocity</p>
                            <p className="text-lg font-bold mt-0.5">{parseFloat(learningMetrics.learningVelocity).toFixed(2)}</p>
                          </div>
                        </div>
                        {learningModule && (
                          <div className="p-3 rounded-md border">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{learningModule.name}</span>
                              <Badge variant="outline" className="text-xs">{learningModule.moduleType}</Badge>
                            </div>
                          </div>
                        )}
                        {agent.learningTreeRoot && (
                          <div className="p-3 rounded-md bg-muted/50">
                            <p className="text-xs text-muted-foreground">Merkle Tree Root</p>
                            <code className="text-xs font-mono break-all">{agent.learningTreeRoot}</code>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Static agent - no learning capabilities</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="reputation" className="space-y-4">
                <ERC8004IdentityBanner
                  agentId={BigInt(agent.tokenId)}
                  agentName={agent.name}
                />

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500" />
                        Reputation Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ERC8004ReputationScore
                        agentId={BigInt(agent.tokenId)}
                        className="mb-4"
                      />
                      <div className="flex items-center gap-2 mt-4">
                        <span className="text-sm text-muted-foreground">Trust:</span>
                        <ERC8004TrustBadge agentId={BigInt(agent.tokenId)} size="md" />
                      </div>
                    </CardContent>
                  </Card>

                  <ERC8004FeedbackForm
                    agentId={BigInt(agent.tokenId)}
                    endpoint={`/nfa/${agent.tokenId}`}
                  />
                </div>

                <ERC8004ActivityHistory
                  agentId={BigInt(agent.tokenId)}
                  maxItems={10}
                />

                <ERC8004AgentVerification />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            {isOwner && agent.status !== "TERMINATED" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {agent.status === "ACTIVE" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => pauseMutation.mutate()}
                      disabled={pauseMutation.isPending}
                      data-testid="button-pause"
                    >
                      <Pause className="h-4 w-4" /> Pause
                    </Button>
                  ) : agent.status === "PAUSED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => unpauseMutation.mutate()}
                      disabled={unpauseMutation.isPending}
                      data-testid="button-unpause"
                    >
                      <Play className="h-4 w-4" /> Resume
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => {
                      if (window.confirm("Are you sure? This is permanent.")) {
                        terminateMutation.mutate();
                      }
                    }}
                    disabled={terminateMutation.isPending}
                    data-testid="button-terminate"
                  >
                    <XCircle className="h-4 w-4" /> Terminate
                  </Button>
                </CardContent>
              </Card>
            )}

            {isOwner && agent.status !== "TERMINATED" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5" /> Fund
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.1 BNB"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      data-testid="input-fund-amount"
                    />
                    <Button
                      size="icon"
                      onClick={() => fundMutation.mutate(fundAmount)}
                      disabled={!fundAmount || fundMutation.isPending}
                      data-testid="button-fund"
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isOwner && agent.status !== "TERMINATED" && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Trading</CardTitle>
                </CardHeader>
                <CardContent>
                  <a href="https://nfamarket.io" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="w-full gap-2" data-testid="button-trade-sidebar">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Trade on nfamarket.io
                    </Button>
                  </a>
                </CardContent>
              </Card>
            )}

            {!isOwner && isConnected && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Rate Agent</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setNewRating(star)}
                        className="p-0.5"
                        data-testid={`button-star-${star}`}
                      >
                        <Star className={`h-5 w-5 ${star <= newRating ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => rateMutation.mutate(newRating)}
                    disabled={rateMutation.isPending}
                    data-testid="button-submit-rating"
                  >
                    Submit Rating
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Owner</span>
                  <code className="font-mono text-xs">{agent.ownerAddress.slice(0, 6)}...{agent.ownerAddress.slice(-4)}</code>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Created</span>
                  <span className="text-xs">{new Date(agent.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Last Active</span>
                  <span className="text-xs">{new Date(agent.lastActiveAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="outline" className="text-xs">{agent.category || "Uncategorized"}</Badge>
                </div>
                {template && (
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Template</span>
                    <Badge variant="outline" className="text-xs">{template.name}</Badge>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Version</span>
                  <span className="text-xs">v{agent.trainingVersion}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
