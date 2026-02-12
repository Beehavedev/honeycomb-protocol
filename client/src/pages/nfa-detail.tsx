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
import { 
  Bot, Brain, Zap, ArrowLeft, Star, ShoppingCart, Activity, 
  Database, Fingerprint, TrendingUp, MessageSquare, Shield, History,
  DollarSign, Pause, Play, XCircle, Wallet, BookOpen, BarChart3,
  Send, Loader2, Swords, ArrowUpDown, Coins, ArrowRightLeft, Settings, 
  CheckCircle, Clock, AlertCircle, Copy, Search, Lock, Hash, ShieldCheck, ShieldX
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
  
  const [listPrice, setListPrice] = useState("");
  const [fundAmount, setFundAmount] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [messageInput, setMessageInput] = useState("");
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [selectedActionType, setSelectedActionType] = useState("CHAT");
  const [actionFields, setActionFields] = useState<Record<string, string>>({});
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

  const listMutation = useMutation({
    mutationFn: async (price: string) => {
      if (!await ensureAuthenticated()) throw new Error("Not authenticated");
      const priceWei = (parseFloat(price) * 1e18).toString();
      return apiRequest("POST", "/api/nfa/marketplace/list", {
        nfaId,
        priceWei,
        priceDisplay: `${price} BNB`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      toast({ title: "Agent Listed", description: "Your NFA is now for sale." });
      setListPrice("");
    },
    onError: (error: Error) => {
      toast({ title: "Listing Failed", description: error.message, variant: "destructive" });
    },
  });

  const delistMutation = useMutation({
    mutationFn: async () => {
      if (!await ensureAuthenticated()) throw new Error("Not authenticated");
      return apiRequest("POST", `/api/nfa/marketplace/delist/${nfaId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      toast({ title: "Listing Removed", description: "Your NFA is no longer for sale." });
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
      const response = await apiRequest("POST", `/api/nfa/agents/${nfaId}/execute`, payload);
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId, "interactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId, "actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId, "actions", "stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents", nfaId] });
      setAgentResponse(data.actionHash ? `Action logged. Hash: ${data.actionHash.slice(0, 18)}...` : "Action executed!");
      setMessageInput("");
      setActionFields({});
      toast({ title: "Action Executed", description: `${data.action?.actionType || "Action"} logged successfully.` });
    },
    onError: (error: Error) => {
      toast({ title: "Execute Failed", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="animate-pulse">
          <CardContent className="p-8">
            <div className="h-8 bg-muted rounded w-1/3 mb-4" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agentData?.agent) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card className="text-center p-8">
          <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Agent Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This Non-Fungible Agent doesn't exist or has been removed.
          </p>
          <Link href="/nfa">
            <Button>Back to Marketplace</Button>
          </Link>
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
    ENTER_DUEL: {
      label: "Enter Duel",
      icon: Swords,
      fields: [
        { key: "assetSymbol", label: "Asset", placeholder: "BTCUSDT" },
        { key: "durationSeconds", label: "Duration (sec)", placeholder: "120", type: "number" },
      ],
    },
    TRADE: {
      label: "Trade",
      icon: ArrowUpDown,
      fields: [
        { key: "side", label: "Side", placeholder: "long or short" },
        { key: "assetSymbol", label: "Asset", placeholder: "BTCUSDT" },
        { key: "amount", label: "Amount", placeholder: "1000", type: "number" },
        { key: "leverage", label: "Leverage", placeholder: "1", type: "number" },
      ],
    },
    STAKE: {
      label: "Stake",
      icon: Coins,
      fields: [
        { key: "amount", label: "Amount (BNB)", placeholder: "0.1", type: "number" },
        { key: "tier", label: "Tier", placeholder: "DRONE" },
      ],
    },
    TRANSFER: {
      label: "Transfer",
      icon: ArrowRightLeft,
      fields: [
        { key: "toAddress", label: "To Address", placeholder: "0x..." },
        { key: "amount", label: "Amount (BNB)", placeholder: "0.1", type: "number" },
      ],
    },
    CHAT: {
      label: "Chat",
      icon: MessageSquare,
      fields: [
        { key: "message", label: "Message", placeholder: "Hello agent..." },
      ],
    },
    CUSTOM: {
      label: "Custom",
      icon: Settings,
      fields: [
        { key: "action", label: "Action Name", placeholder: "my_custom_action" },
        { key: "payload", label: "Payload (JSON)", placeholder: '{"key": "value"}' },
      ],
    },
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
    if (config) {
      const Icon = config.icon;
      return <Icon className="h-4 w-4" />;
    }
    return <Zap className="h-4 w-4" />;
  };

  const getStatusBadge = () => {
    switch (agent.status) {
      case "ACTIVE":
        return <Badge variant="default" className="bg-green-500">Active</Badge>;
      case "PAUSED":
        return <Badge variant="secondary" className="bg-amber-500 text-white">Paused</Badge>;
      case "TERMINATED":
        return <Badge variant="destructive">Terminated</Badge>;
      default:
        return <Badge variant="outline">{agent.status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6">
        <Link href="/nfa">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-xl bg-primary/10">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl" data-testid="text-agent-name">
                      {agent.name}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline">Token #{agent.tokenId}</Badge>
                      <Badge variant={agent.agentType === "LEARNING" ? "default" : "secondary"}>
                        {agent.agentType === "LEARNING" ? (
                          <><Brain className="h-3 w-3 mr-1" /> Learning</>
                        ) : (
                          <><Zap className="h-3 w-3 mr-1" /> Static</>
                        )}
                      </Badge>
                      {getStatusBadge()}
                      {verification.status === "VERIFIED" && (
                        <Badge variant="outline" className="text-green-500 border-green-500">
                          <Shield className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
                {isOwner && (
                  <Badge variant="outline" className="text-amber-500 border-amber-500">
                    Owner
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {agent.description || "No description provided."}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Bot className="h-4 w-4" />
                    Model
                  </div>
                  <p className="font-medium mt-1">{agent.modelType}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Activity className="h-4 w-4" />
                    Interactions
                  </div>
                  <p className="font-medium mt-1">{stats.totalInteractions}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Wallet className="h-4 w-4" />
                    Balance
                  </div>
                  <p className="font-medium mt-1">{parseFloat(agent.balance || "0").toFixed(4)} BNB</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Star className="h-4 w-4" />
                    Rating
                  </div>
                  <p className="font-medium mt-1">
                    {stats.ratingCount > 0 ? `${stats.rating.toFixed(1)} (${stats.ratingCount})` : "No ratings"}
                  </p>
                </div>
              </div>

              {agent.experience && (
                <div className="p-3 rounded-lg bg-muted/30 border">
                  <p className="text-xs text-muted-foreground mb-1">Experience</p>
                  <p className="text-sm">{agent.experience}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/5 to-amber-600/10 border-amber-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Execute Action (BAP-578)
              </CardTitle>
              <CardDescription>
                Execute typed actions on behalf of this agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {agent.status !== "ACTIVE" ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Pause className="h-8 w-8 mx-auto mb-2" />
                  <p>This agent is {agent.status.toLowerCase()} and cannot execute actions</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Action Type</Label>
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
                        <Label>{field.label}</Label>
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
                      {executeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4" />
                      )}
                      Execute {ACTION_TYPE_CONFIG[selectedActionType]?.label || "Action"}
                    </Button>
                  </div>

                  {agentResponse && (
                    <div className="p-3 rounded-lg bg-muted/50 border">
                      <p className="text-xs text-muted-foreground mb-1">Result</p>
                      <p className="text-sm font-mono break-all">{agentResponse}</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs" data-testid="badge-total-actions">
                      {actionStats.total} total actions
                    </Badge>
                    {actionStats.pending > 0 && (
                      <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50" data-testid="badge-pending-actions">
                        {actionStats.pending} pending
                      </Badge>
                    )}
                    {!isOwner && <span data-testid="text-permission-note">Execute permission required</span>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="actions">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
              <TabsTrigger value="actions" className="gap-2" data-testid="tab-actions">
                <Zap className="h-4 w-4" />
                Actions
              </TabsTrigger>
              <TabsTrigger value="memory" className="gap-2" data-testid="tab-memory">
                <Database className="h-4 w-4" />
                Memory
              </TabsTrigger>
              <TabsTrigger value="learning" className="gap-2" data-testid="tab-learning">
                <BarChart3 className="h-4 w-4" />
                Learning
              </TabsTrigger>
              <TabsTrigger value="proof" className="gap-2" data-testid="tab-proof">
                <Fingerprint className="h-4 w-4" />
                Proof
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2" data-testid="tab-activity">
                <Activity className="h-4 w-4" />
                Activity
              </TabsTrigger>
              <TabsTrigger value="reputation" className="gap-2" data-testid="tab-reputation">
                <Star className="h-4 w-4" />
                Reputation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="actions" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Action History (BAP-578)
                  </CardTitle>
                  <CardDescription>
                    On-chain actions with cryptographic verification
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {actionStats.total > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4" data-testid="stats-action-grid">
                      <div className="p-3 rounded-lg bg-muted/50" data-testid="stat-actions-total">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="text-xl font-bold">{actionStats.total}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50" data-testid="stat-actions-completed">
                        <p className="text-xs text-muted-foreground">Completed</p>
                        <p className="text-xl font-bold text-green-500">{actionStats.completed}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50" data-testid="stat-actions-pending">
                        <p className="text-xs text-muted-foreground">Pending</p>
                        <p className="text-xl font-bold text-amber-500">{actionStats.pending}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50" data-testid="stat-actions-failed">
                        <p className="text-xs text-muted-foreground">Failed</p>
                        <p className="text-xl font-bold text-red-500">{actionStats.failed}</p>
                      </div>
                    </div>
                  )}

                  {Object.keys(actionStats.byType).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4" data-testid="stats-action-by-type">
                      {Object.entries(actionStats.byType).map(([type, count]) => (
                        <Badge key={type} variant="outline" className="gap-1" data-testid={`badge-action-type-${type}`}>
                          {getActionTypeIcon(type)}
                          {ACTION_TYPE_CONFIG[type]?.label || type}: {count}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {actions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="h-8 w-8 mx-auto mb-2" />
                      <p>No actions executed yet</p>
                      <p className="text-xs mt-1">Use the Execute Action panel above to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-2" data-testid="list-actions">
                      {actions.slice(0, 20).map(action => {
                        let parsedData: any = null;
                        try { parsedData = action.actionData ? JSON.parse(action.actionData) : null; } catch {}
                        let parsedResult: any = null;
                        try { parsedResult = action.result ? JSON.parse(action.result) : null; } catch {}
                        return (
                          <div key={action.id} className="p-3 rounded-lg border space-y-2" data-testid={`row-action-${action.id}`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {getActionTypeIcon(action.actionType)}
                                <span className="font-medium text-sm" data-testid={`text-action-type-${action.id}`}>
                                  {ACTION_TYPE_CONFIG[action.actionType]?.label || action.actionType}
                                </span>
                                {getActionStatusIcon(action.status)}
                              </div>
                              <span className="text-xs text-muted-foreground" data-testid={`text-action-time-${action.id}`}>
                                {new Date(action.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {parsedData && (
                              <div className="text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded break-all" data-testid={`text-action-data-${action.id}`}>
                                {Object.entries(parsedData).map(([k, v]) => (
                                  <span key={k} className="mr-3">{k}: {String(v)}</span>
                                ))}
                              </div>
                            )}
                            {parsedResult && (
                              <div className="text-xs font-mono bg-green-500/5 border border-green-500/20 p-2 rounded break-all" data-testid={`text-action-result-${action.id}`}>
                                {parsedResult.message || JSON.stringify(parsedResult)}
                              </div>
                            )}
                            {action.txHash && (
                              <div className="text-xs text-muted-foreground" data-testid={`text-action-tx-${action.id}`}>
                                TX: <code className="font-mono">{action.txHash.slice(0, 16)}...</code>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono" data-testid={`text-action-executor-${action.id}`}>
                                {action.executorAddress.slice(0, 6)}...{action.executorAddress.slice(-4)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="memory" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Memory Vault</CardTitle>
                  <CardDescription>On-chain memory storage</CardDescription>
                </CardHeader>
                <CardContent>
                  {memory.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="h-8 w-8 mx-auto mb-2" />
                      <p>No memory entries yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {memory.map(m => (
                        <div key={m.id} className="p-3 rounded-lg border">
                          <div className="flex justify-between items-start">
                            <code className="text-sm font-medium">{m.memoryKey}</code>
                            <Badge variant="outline" className="text-xs">v{m.version}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 break-all">
                            {m.memoryValue}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                  {agent.memoryRoot && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Memory Root</p>
                      <code className="text-xs font-mono break-all">{agent.memoryRoot}</code>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="learning" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Learning Metrics (BAP-578)
                  </CardTitle>
                  <CardDescription>
                    {agent.learningEnabled ? "Learning agent with Merkle Tree verification" : "Static agent (not learning-enabled)"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {agent.learningEnabled && learningMetrics ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Learning Events</p>
                          <p className="text-xl font-bold">{learningMetrics.learningEvents}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Confidence Score</p>
                          <p className="text-xl font-bold">{parseFloat(learningMetrics.confidenceScore).toFixed(2)}%</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Tree Depth</p>
                          <p className="text-xl font-bold">{learningMetrics.treeDepth}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Total Nodes</p>
                          <p className="text-xl font-bold">{learningMetrics.totalNodes}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Learning Version</p>
                          <p className="text-xl font-bold">v{agent.learningVersion}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Velocity</p>
                          <p className="text-xl font-bold">{parseFloat(learningMetrics.learningVelocity).toFixed(2)}</p>
                        </div>
                      </div>
                      {learningModule && (
                        <div className="p-3 rounded-lg border">
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Learning Module</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{learningModule.name}</span>
                            <Badge variant="outline" className="text-xs">{learningModule.moduleType}</Badge>
                          </div>
                        </div>
                      )}
                      {agent.learningTreeRoot && (
                        <div className="p-3 rounded-lg bg-muted/50">
                          <p className="text-xs text-muted-foreground">Learning Tree Root (Merkle)</p>
                          <code className="text-xs font-mono break-all">{agent.learningTreeRoot}</code>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Zap className="h-8 w-8 mx-auto mb-2" />
                      <p>Static agent - no learning capabilities</p>
                      <p className="text-xs mt-1">Uses JSON Light Memory instead of Merkle Tree Learning</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="proof" className="mt-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Fingerprint className="h-5 w-5" />
                      Proof-of-Prompt (BAP-578)
                    </CardTitle>
                    <CardDescription>
                      Cryptographic proof that this agent's training configuration has not been tampered with
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50 space-y-2">
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
                      <code className="text-sm font-mono break-all block" data-testid="text-pop-hash">{agent.proofOfPrompt}</code>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Model Type</p>
                        <p className="font-medium mt-1">{agent.modelType}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Training Version</p>
                        <p className="font-medium mt-1">v{agent.trainingVersion}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border text-sm">
                      <Lock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                      <p className="text-muted-foreground">
                        The Proof-of-Prompt is a deterministic SHA-256 hash of the agent's system prompt and model type.
                        Anyone with the original prompt can independently verify it matches this hash, ensuring the agent's
                        behavior has not been secretly modified.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Verify Prompt
                    </CardTitle>
                    <CardDescription>
                      Paste a system prompt to check if it matches this agent's on-chain Proof-of-Prompt
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="verify-prompt">System Prompt</Label>
                      <Textarea
                        id="verify-prompt"
                        placeholder="Paste the agent's system prompt here to verify..."
                        value={verifyPrompt}
                        onChange={(e) => { setVerifyPrompt(e.target.value); setVerifyResult(null); }}
                        rows={4}
                        data-testid="input-verify-prompt"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="verify-model">Model Type</Label>
                      <Input
                        id="verify-model"
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
                      {verifyPromptMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Fingerprint className="h-4 w-4" />
                      )}
                      Verify Against On-Chain Hash
                    </Button>

                    {verifyResult && (
                      <div className={`p-4 rounded-lg border space-y-3 ${
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
                            <p className="text-muted-foreground mb-1">Computed Hash</p>
                            <code className="font-mono break-all" data-testid="text-computed-hash">{verifyResult.computedHash}</code>
                          </div>
                          <div>
                            <p className="text-muted-foreground mb-1">Stored Hash</p>
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
                            ? "The provided prompt produces the same hash as the on-chain record. This agent's training configuration is verified."
                            : "The provided prompt does not match the on-chain hash. The prompt text or model type may be different from what was originally used."
                          }
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <CardDescription>Last {interactions.length} interactions</CardDescription>
                </CardHeader>
                <CardContent>
                  {interactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2" />
                      <p>No interactions recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {interactions.slice(0, 10).map(i => (
                        <div key={i.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                            <span className="capitalize">{i.interactionType}</span>
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {i.callerAddress.slice(0, 6)}...{i.callerAddress.slice(-4)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(i.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reputation" className="mt-4">
              <div className="space-y-6">
                <ERC8004IdentityBanner 
                  agentId={BigInt(agent.tokenId)}
                  agentName={agent.name}
                />

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-500" />
                        Reputation Score
                      </CardTitle>
                      <CardDescription>
                        Aggregated on-chain reputation from the ERC-8004 registry
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ERC8004ReputationScore 
                        agentId={BigInt(agent.tokenId)} 
                        className="mb-4"
                      />
                      <div className="flex items-center gap-2 mt-4">
                        <span className="text-sm text-muted-foreground">Trust Level:</span>
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
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          {listing?.active && (
            <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-600/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-500" />
                  For Sale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                  <span className="text-2xl font-bold">{listing.priceDisplay}</span>
                </div>
                {!isOwner && isConnected && (
                  <Button className="w-full" data-testid="button-buy">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Buy Now
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {isOwner && agent.status !== "TERMINATED" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Lifecycle Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {agent.status === "ACTIVE" ? (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => pauseMutation.mutate()}
                    disabled={pauseMutation.isPending}
                    data-testid="button-pause"
                  >
                    <Pause className="h-4 w-4" />
                    Pause Agent
                  </Button>
                ) : agent.status === "PAUSED" && (
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => unpauseMutation.mutate()}
                    disabled={unpauseMutation.isPending}
                    data-testid="button-unpause"
                  >
                    <Play className="h-4 w-4" />
                    Resume Agent
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  className="w-full gap-2"
                  onClick={() => {
                    if (window.confirm("Are you sure? This action is permanent and cannot be undone.")) {
                      terminateMutation.mutate();
                    }
                  }}
                  disabled={terminateMutation.isPending}
                  data-testid="button-terminate"
                >
                  <XCircle className="h-4 w-4" />
                  Terminate Agent
                </Button>
              </CardContent>
            </Card>
          )}

          {isOwner && agent.status !== "TERMINATED" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Fund Agent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.1"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      data-testid="input-fund-amount"
                    />
                    <Button
                      onClick={() => fundMutation.mutate(fundAmount)}
                      disabled={!fundAmount || fundMutation.isPending}
                      data-testid="button-fund"
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Amount in BNB</p>
                </div>
              </CardContent>
            </Card>
          )}

          {isOwner && agent.status !== "TERMINATED" && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Marketplace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {listing?.active ? (
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => delistMutation.mutate()}
                    disabled={delistMutation.isPending}
                    data-testid="button-delist"
                  >
                    Remove Listing
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="listPrice">List for Sale</Label>
                    <div className="flex gap-2">
                      <Input
                        id="listPrice"
                        type="number"
                        step="0.01"
                        placeholder="0.1"
                        value={listPrice}
                        onChange={(e) => setListPrice(e.target.value)}
                        data-testid="input-list-price"
                      />
                      <Button
                        onClick={() => listMutation.mutate(listPrice)}
                        disabled={!listPrice || listMutation.isPending}
                        data-testid="button-list"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Price in BNB</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!isOwner && isConnected && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Rate Agent</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="p-1"
                      data-testid={`button-star-${star}`}
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= newRating
                            ? "text-amber-500 fill-amber-500"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Button
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
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner</span>
                <code className="font-mono">
                  {agent.ownerAddress.slice(0, 6)}...{agent.ownerAddress.slice(-4)}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(agent.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Active</span>
                <span>{new Date(agent.lastActiveAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <Badge variant="outline">{agent.category || "Uncategorized"}</Badge>
              </div>
              {template && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template</span>
                  <Badge variant="outline">{template.name}</Badge>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>v{agent.trainingVersion}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
