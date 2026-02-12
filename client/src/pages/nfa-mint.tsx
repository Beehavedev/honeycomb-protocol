import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useChainId } from "wagmi";
import { formatEther } from "viem";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Brain, Zap, Fingerprint, Database, Sparkles, ArrowLeft, CheckCircle, Info, FileText, Shield, Cpu, BookOpen, Wand2, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getToken } from "@/lib/auth";
import { Link } from "wouter";
import { useBAP578MintAgent, useBAP578MintFee, useBAP578TokenAddress, useRegisterAgentOnRegistry } from "@/contracts/hooks";

const MODEL_TYPES = [
  { value: "gpt-4", label: "GPT-4", provider: "OpenAI" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo", provider: "OpenAI" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", provider: "OpenAI" },
  { value: "claude-3-opus", label: "Claude 3 Opus", provider: "Anthropic" },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet", provider: "Anthropic" },
  { value: "claude-3-haiku", label: "Claude 3 Haiku", provider: "Anthropic" },
  { value: "gemini-pro", label: "Gemini Pro", provider: "Google" },
  { value: "llama-3-70b", label: "Llama 3 70B", provider: "Meta" },
  { value: "mistral-large", label: "Mistral Large", provider: "Mistral" },
  { value: "custom", label: "Custom Model", provider: "Other" },
];

const CATEGORIES = [
  "Trading",
  "DeFi",
  "NFT",
  "Gaming",
  "Social",
  "Data Analysis",
  "Content Creation",
  "Customer Support",
  "Research",
  "Security",
  "Other",
];

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  defaultPersona: string;
  defaultExperience: string;
  defaultSystemPrompt: string;
  suggestedCapabilities: string[] | null;
  iconUri: string | null;
}

interface LearningModule {
  id: string;
  name: string;
  description: string | null;
  moduleType: string;
  version: string;
}

export default function NfaMint() {
  const [, navigate] = useLocation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { isAuthenticated, authenticate } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mintMode, setMintMode] = useState<"template" | "custom">("template");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modelType, setModelType] = useState("gpt-4");
  const [agentType, setAgentType] = useState<"STATIC" | "LEARNING">("STATIC");
  const [category, setCategory] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [persona, setPersona] = useState("");
  const [experience, setExperience] = useState("");
  const [learningModuleId, setLearningModuleId] = useState<string>("");
  const [step, setStep] = useState(1);
  const [mintStep, setMintStep] = useState<"idle" | "signing" | "confirming" | "syncing" | "done">("idle");

  const { data: templatesData } = useQuery<{ templates: Template[] }>({
    queryKey: ["/api/nfa/templates"],
  });

  const { data: modulesData } = useQuery<{ modules: LearningModule[] }>({
    queryKey: ["/api/nfa/learning-modules"],
  });

  const templates = templatesData?.templates || [];
  const learningModules = modulesData?.modules || [];

  const { data: mintFeeData } = useBAP578MintFee();
  const { mintAgent: mintOnChain, hash: txHash, isPending: isTxPending, isConfirming, isSuccess: isTxConfirmed, receipt, error: txError, contractAddress: bap578Address } = useBAP578MintAgent();

  const mintFee = BigInt(0);
  const mintFeeDisplay = "FREE";

  const syncMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const token = getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/nfa/agents/mint", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents"] });
      setMintStep("done");
      toast({
        title: "NFA Minted & Registered",
        description: "Your Non-Fungible Agent is now registered on-chain via BAP-578.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Backend Sync Failed",
        description: error.message,
        variant: "destructive",
      });
      setMintStep("idle");
    },
  });

  useEffect(() => {
    if (isTxConfirmed && receipt && mintStep === "confirming") {
      syncToBackend();
    }
  }, [isTxConfirmed, receipt]);

  useEffect(() => {
    if (txError && mintStep !== "idle") {
      setMintStep("idle");
      toast({
        title: "Transaction Failed",
        description: txError.message?.includes("User rejected")
          ? "You rejected the transaction in your wallet."
          : txError.message || "On-chain minting failed.",
        variant: "destructive",
      });
    }
  }, [txError]);

  const generateProofOfPrompt = async (prompt: string, model: string): Promise<string> => {
    const data = `BAP578:PoP:${prompt}:${model}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return "0x" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const generateMemoryRoot = (): string => {
    const data = `BAP578:Memory:${Date.now()}`;
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return "0x" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setCategory(template.category);
      setSystemPrompt(template.defaultSystemPrompt);
      setPersona(template.defaultPersona);
      setExperience(template.defaultExperience);
    }
  };

  const parseTokenIdFromReceipt = (receipt: any): number | null => {
    try {
      if (receipt?.logs) {
        for (const log of receipt.logs) {
          if (log.topics && log.topics.length >= 2) {
            const eventSig = log.topics[0];
            const agentMintedSig = "0x" + "AgentMinted".padEnd(64, "0");
            if (log.topics[0]?.toLowerCase().includes("agent") || log.topics.length >= 3) {
              const tokenIdHex = log.topics[1];
              if (tokenIdHex) {
                return parseInt(tokenIdHex, 16);
              }
            }
          }
        }
        if (receipt.logs.length > 0) {
          const lastLog = receipt.logs[receipt.logs.length - 1];
          if (lastLog.topics && lastLog.topics[1]) {
            return parseInt(lastLog.topics[1], 16);
          }
        }
      }
    } catch (e) {
      console.error("Error parsing token ID from receipt:", e);
    }
    return null;
  };

  const syncToBackend = async () => {
    if (!receipt || !address) return;
    setMintStep("syncing");

    const proofOfPrompt = await generateProofOfPrompt(systemPrompt, modelType);
    const memoryRootValue = generateMemoryRoot();
    const onChainTokenId = parseTokenIdFromReceipt(receipt);
    const tokenId = onChainTokenId || Math.floor(Math.random() * 2147483647);

    syncMutation.mutate({
      tokenId,
      ownerAddress: address,
      name: name.trim(),
      description: description.trim(),
      modelType,
      agentType,
      category,
      systemPrompt,
      metadataUri,
      proofOfPrompt,
      memoryRoot: memoryRootValue,
      persona: persona || undefined,
      experience: experience || undefined,
      learningEnabled: agentType === "LEARNING",
      learningModuleId: agentType === "LEARNING" && learningModuleId ? learningModuleId : undefined,
      templateId: selectedTemplateId || undefined,
      mintTxHash: txHash,
      onChainTokenId: onChainTokenId,
      contractAddress: bap578Address,
    });
  };

  const handleMint = async () => {
    if (!isConnected || !address) {
      toast({
        title: "Connect Wallet",
        description: "Please connect your wallet to mint an NFA.",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      try {
        toast({
          title: "Sign to Authenticate",
          description: "Please sign the message in your wallet to authenticate.",
        });
        await authenticate();
      } catch {
        toast({
          title: "Authentication Failed",
          description: "Please sign the message to authenticate and mint.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please provide a name for your agent.",
        variant: "destructive",
      });
      return;
    }

    try {
      setMintStep("signing");

      const proofOfPrompt = await generateProofOfPrompt(systemPrompt, modelType);
      const memoryRootValue = generateMemoryRoot();

      const fee = BigInt(0);

      toast({
        title: "Confirm Transaction",
        description: "Please confirm the minting transaction (FREE - no cost) in your wallet.",
      });

      await mintOnChain({
        name: name.trim(),
        description: description.trim() || "",
        modelType,
        agentType: agentType === "LEARNING" ? 1 : 0,
        systemPromptHash: proofOfPrompt as `0x${string}`,
        initialMemoryRoot: memoryRootValue as `0x${string}`,
        metadataURI: metadataUri || "",
        mintFee: fee,
      });

      setMintStep("confirming");
    } catch (error: any) {
      console.error("Mint error:", error);
      setMintStep("idle");
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Card className="py-12">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <Bot className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Connect Wallet</h2>
            <p className="text-muted-foreground text-sm">
              Please connect your wallet to mint a Non-Fungible Agent.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mintStep === "done") {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <Card className="py-12">
          <CardContent className="flex flex-col items-center gap-6 text-center">
            <div className="p-4 rounded-full bg-green-500/10">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold" data-testid="text-mint-success">NFA Minted Successfully</h2>
              <p className="text-muted-foreground text-sm">
                Your Non-Fungible Agent has been registered on-chain via BAP-578.
              </p>
            </div>
            {txHash && (
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="link-tx-hash"
              >
                View on BscScan <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <div className="flex gap-3">
              <Link href="/nfa">
                <Button variant="outline" data-testid="button-back-showroom">
                  Back to Showroom
                </Button>
              </Link>
              <Button onClick={() => { setStep(1); setMintStep("idle"); setName(""); setDescription(""); setSystemPrompt(""); }} data-testid="button-mint-another">
                Mint Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isMinting = mintStep !== "idle";

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="mb-4">
        <Link href="/nfa">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Showroom
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Bot className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl" data-testid="text-page-title">Mint NFA (BAP-578)</CardTitle>
              <CardDescription>
                Create a new Non-Fungible Agent registered on BNB Chain
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3, 4].map(s => (
              <div
                key={s}
                className={`flex items-center gap-2 ${s < 4 ? "flex-1" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-testid={`step-indicator-${s}`}
                >
                  {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-1 ${step > s ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Choose Creation Method
              </h3>

              <Tabs value={mintMode} onValueChange={(v) => setMintMode(v as "template" | "custom")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="template" className="gap-2" data-testid="tab-template">
                    <FileText className="h-4 w-4" />
                    From Template
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="gap-2" data-testid="tab-custom">
                    <Cpu className="h-4 w-4" />
                    Custom Agent
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="template" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Start with a pre-configured agent template for common use cases
                  </p>
                  <div className="grid gap-3">
                    {templates.map((template) => (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all ${
                          selectedTemplateId === template.id 
                            ? "ring-2 ring-primary" 
                            : "hover-elevate"
                        }`}
                        onClick={() => applyTemplate(template.id)}
                        data-testid={`template-${template.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              {template.category === "Guardian" ? (
                                <Shield className="h-5 w-5 text-foreground" />
                              ) : template.category === "Analyst" ? (
                                <Database className="h-5 w-5 text-foreground" />
                              ) : template.category === "Trader" ? (
                                <Zap className="h-5 w-5 text-foreground" />
                              ) : (
                                <Bot className="h-5 w-5 text-foreground" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{template.name}</h4>
                                <Badge variant="outline" className="text-xs">{template.category}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                            </div>
                            {selectedTemplateId === template.id && (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Build a completely custom agent from scratch
                  </p>
                  <div className="p-4 rounded-lg border bg-muted/30 text-center">
                    <Cpu className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Configure all settings manually in the next steps
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-2">
                <Label htmlFor="name">Agent Name *</Label>
                <Input
                  id="name"
                  placeholder="My AI Agent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={64}
                  data-testid="input-name"
                />
                <p className="text-xs text-muted-foreground">{name.length}/64 characters</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Agent Details
              </h3>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what your agent does..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  data-testid="input-description"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelType">AI Model</Label>
                  <Select value={modelType} onValueChange={setModelType}>
                    <SelectTrigger data-testid="select-model">
                      <SelectValue placeholder="Select AI model" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_TYPES.map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex items-center gap-2">
                            <span>{model.label}</span>
                            <Badge variant="outline" className="text-xs">{model.provider}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="persona">Persona (BAP-578 Extended Metadata)</Label>
                <Textarea
                  id="persona"
                  placeholder='{"traits": ["helpful", "professional"], "tone": "friendly", "style": "concise"}'
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  rows={2}
                  data-testid="input-persona"
                />
                <p className="text-xs text-muted-foreground">JSON describing the agent's personality traits</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Experience Description</Label>
                <Input
                  id="experience"
                  placeholder="Expert in DeFi trading and market analysis..."
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  data-testid="input-experience"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Agent Configuration
              </h3>

              <div className="flex items-center justify-between gap-2 p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  {agentType === "LEARNING" ? (
                    <Brain className="h-5 w-5 text-foreground" />
                  ) : (
                    <Zap className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">Agent Type</p>
                    <p className="text-sm text-muted-foreground">
                      {agentType === "LEARNING" 
                        ? "Can learn and evolve over time with Merkle Tree verification" 
                        : "Fixed behavior with JSON Light Memory"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Static</span>
                  <Switch
                    checked={agentType === "LEARNING"}
                    onCheckedChange={(checked) => setAgentType(checked ? "LEARNING" : "STATIC")}
                    data-testid="switch-agent-type"
                  />
                  <span className="text-sm">Learning</span>
                </div>
              </div>

              {agentType === "LEARNING" && (
                <div className="space-y-2 p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <Label htmlFor="learningModule" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Learning Module
                  </Label>
                  <Select value={learningModuleId} onValueChange={setLearningModuleId}>
                    <SelectTrigger data-testid="select-learning-module">
                      <SelectValue placeholder="Select a learning module" />
                    </SelectTrigger>
                    <SelectContent>
                      {learningModules.map(module => (
                        <SelectItem key={module.id} value={module.id}>
                          <div className="flex items-center gap-2">
                            <span>{module.name}</span>
                            <Badge variant="outline" className="text-xs">{module.moduleType}</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Learning modules define how your agent processes and stores new knowledge
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="systemPrompt" className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4" />
                  System Prompt (Proof-of-Prompt)
                </Label>
                <Textarea
                  id="systemPrompt"
                  placeholder="You are a helpful AI assistant that specializes in..."
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={5}
                  data-testid="input-system-prompt"
                />
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-sm">
                  <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    The system prompt will be hashed and stored on-chain as Proof-of-Prompt (PoP).
                    This provides cryptographic verification of your agent's training configuration.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metadataUri">Metadata URI (Optional)</Label>
                <Input
                  id="metadataUri"
                  placeholder="ipfs://... or https://..."
                  value={metadataUri}
                  onChange={(e) => setMetadataUri(e.target.value)}
                  data-testid="input-metadata-uri"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Review & Mint On-Chain
              </h3>

              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium" data-testid="text-review-name">{name || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">{category || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Model</span>
                    <Badge variant="outline">{modelType}</Badge>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant={agentType === "LEARNING" ? "default" : "secondary"}>
                      {agentType === "LEARNING" ? (
                        <><Brain className="h-3 w-3 mr-1" /> Learning</>
                      ) : (
                        <><Zap className="h-3 w-3 mr-1" /> Static</>
                      )}
                    </Badge>
                  </div>
                  {agentType === "LEARNING" && learningModuleId && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground">Learning Module</span>
                      <Badge variant="outline">
                        {learningModules.find(m => m.id === learningModuleId)?.name || "-"}
                      </Badge>
                    </div>
                  )}
                  {selectedTemplateId && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground">Template</span>
                      <Badge variant="outline">
                        {templates.find(t => t.id === selectedTemplateId)?.name || "-"}
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Proof-of-Prompt</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {systemPrompt ? "Configured" : "Empty"}
                    </Badge>
                  </div>
                  {persona && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground">Persona</span>
                      <Badge variant="outline" className="text-xs">Configured</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Database className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-500">On-Chain Registration</p>
                  <p className="text-sm text-muted-foreground">
                    Your agent will be minted as an ERC-721 token on the BAP-578 contract at{" "}
                    <span className="font-mono text-xs">{bap578Address ? `${bap578Address.slice(0, 6)}...${bap578Address.slice(-4)}` : "..."}</span>.
                    Minting fee: <span className="font-semibold text-green-500">FREE</span>.
                  </p>
                </div>
              </div>

              {mintStep !== "idle" && (
                <Card className="border-primary/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      {mintStep === "signing" && (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <div>
                            <p className="font-medium">Waiting for wallet signature...</p>
                            <p className="text-sm text-muted-foreground">Please confirm the transaction in your wallet</p>
                          </div>
                        </>
                      )}
                      {mintStep === "confirming" && (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <div>
                            <p className="font-medium">Confirming on BNB Chain...</p>
                            <p className="text-sm text-muted-foreground">
                              Transaction submitted.{" "}
                              {txHash && (
                                <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline">
                                  View on BscScan
                                </a>
                              )}
                            </p>
                          </div>
                        </>
                      )}
                      {mintStep === "syncing" && (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          <div>
                            <p className="font-medium">Syncing to platform...</p>
                            <p className="text-sm text-muted-foreground">Registering your agent in the Honeycomb database</p>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-2 border-t pt-4">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isMinting}
              data-testid="button-back-step"
            >
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !name.trim()}
              data-testid="button-next-step"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleMint}
              disabled={isMinting || !name.trim()}
              className="gap-2"
              data-testid="button-mint"
            >
              {mintStep === "signing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sign in Wallet...
                </>
              ) : mintStep === "confirming" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : mintStep === "syncing" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Mint NFA (FREE)
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>

      <RegisterExistingAgent />
    </div>
  );
}

function RegisterExistingAgent() {
  const { isConnected } = useAccount();
  const { toast } = useToast();
  const [metadataCID, setMetadataCID] = useState("");
  const { registerAgent, hash: regHash, isPending: isRegPending, isConfirming: isRegConfirming, isSuccess: isRegSuccess, error: regError, registryAddress } = useRegisterAgentOnRegistry();

  if (!isConnected || !registryAddress) return null;

  const handleRegister = async () => {
    if (!metadataCID.trim()) {
      toast({
        title: "Metadata Required",
        description: "Enter a metadata CID or URI for your agent.",
        variant: "destructive",
      });
      return;
    }
    try {
      await registerAgent(metadataCID.trim());
      toast({
        title: "Registration Submitted",
        description: "Confirm the transaction in your wallet to register your agent on the Honeycomb Registry.",
      });
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error?.message || "Failed to register agent on registry.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Register Existing Agent on Registry
        </CardTitle>
        <CardDescription>
          Already minted an NFA but it's not showing on the Honeycomb Agent Registry? Register it here with a separate on-chain transaction (gas only).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="register-cid">Metadata CID / URI</Label>
          <Input
            id="register-cid"
            placeholder="QmYourIPFSHash... or https://metadata-url"
            value={metadataCID}
            onChange={(e) => setMetadataCID(e.target.value)}
            disabled={isRegPending || isRegConfirming}
            data-testid="input-register-cid"
          />
        </div>
        {isRegSuccess && regHash && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>Registered successfully!</span>
            <a
              href={`https://bscscan.com/tx/${regHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline"
              data-testid="link-register-tx"
            >
              View tx <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        {regError && (
          <p className="text-sm text-destructive">
            {regError.message?.includes("User rejected")
              ? "Transaction rejected."
              : regError.message || "Registration failed."}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleRegister}
          disabled={isRegPending || isRegConfirming || !metadataCID.trim()}
          className="gap-2"
          data-testid="button-register-agent"
        >
          {isRegPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sign in Wallet...
            </>
          ) : isRegConfirming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4" />
              Register on Registry (Gas Only)
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
