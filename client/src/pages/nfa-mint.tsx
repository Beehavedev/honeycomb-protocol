import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { parseEther, keccak256, toBytes } from "viem";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, Brain, Zap, Fingerprint, Database, Sparkles, ArrowLeft, CheckCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

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
  "Other",
];

export default function NfaMint() {
  const [, navigate] = useLocation();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isAuthenticated, authenticate, isAuthenticating } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [modelType, setModelType] = useState("gpt-4");
  const [agentType, setAgentType] = useState<"STATIC" | "LEARNING">("STATIC");
  const [category, setCategory] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [step, setStep] = useState(1);
  const [isMinting, setIsMinting] = useState(false);

  const mintMutation = useMutation({
    mutationFn: async (data: {
      tokenId: number;
      ownerAddress: string;
      name: string;
      description: string;
      modelType: string;
      agentType: string;
      category: string;
      systemPrompt: string;
      metadataUri: string;
      proofOfPrompt: string;
    }) => {
      return apiRequest("POST", "/api/nfa/agents/mint", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nfa/marketplace/listings"] });
      toast({
        title: "NFA Minted Successfully!",
        description: "Your Non-Fungible Agent has been created.",
      });
      navigate("/nfa");
    },
    onError: (error: Error) => {
      toast({
        title: "Minting Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateProofOfPrompt = (prompt: string, model: string): string => {
    const data = `${prompt}:${model}:${Date.now()}`;
    return keccak256(toBytes(data));
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

    // Check if user is authenticated, if not trigger authentication
    if (!isAuthenticated) {
      try {
        toast({
          title: "Sign to Authenticate",
          description: "Please sign the message in your wallet to authenticate.",
        });
        await authenticate();
      } catch (error) {
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

    setIsMinting(true);

    try {
      const proofOfPrompt = generateProofOfPrompt(systemPrompt, modelType);
      const tokenId = Date.now();

      await mintMutation.mutateAsync({
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
      });
    } catch (error) {
      console.error("Mint error:", error);
    } finally {
      setIsMinting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="text-center p-8">
          <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connect Wallet</h2>
          <p className="text-muted-foreground mb-4">
            Please connect your wallet to mint a Non-Fungible Agent.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <div className="mb-6">
        <Link href="/nfa">
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Back to Marketplace
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl" data-testid="text-page-title">Mint NFA</CardTitle>
              <CardDescription>
                Create a new Non-Fungible Agent (BAP-578)
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`flex items-center gap-2 ${s < 3 ? "flex-1" : ""}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s ? <CheckCircle className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`flex-1 h-1 ${step > s ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Basic Information
              </h3>

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
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Agent Configuration
              </h3>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  {agentType === "LEARNING" ? (
                    <Brain className="h-5 w-5 text-primary" />
                  ) : (
                    <Zap className="h-5 w-5 text-amber-500" />
                  )}
                  <div>
                    <p className="font-medium">Agent Type</p>
                    <p className="text-sm text-muted-foreground">
                      {agentType === "LEARNING" 
                        ? "Can learn and evolve over time" 
                        : "Fixed behavior, cannot be trained"}
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
                <p className="text-xs text-muted-foreground">
                  Optional IPFS or HTTPS link to extended metadata JSON
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Review & Mint
              </h3>

              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{name || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">{category || "-"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Model</span>
                    <Badge variant="outline">{modelType}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant={agentType === "LEARNING" ? "default" : "secondary"}>
                      {agentType === "LEARNING" ? (
                        <><Brain className="h-3 w-3 mr-1" /> Learning</>
                      ) : (
                        <><Zap className="h-3 w-3 mr-1" /> Static</>
                      )}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Proof-of-Prompt</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {systemPrompt ? "Configured" : "Empty"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-start gap-2 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Database className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-500">On-Chain Registration</p>
                  <p className="text-sm text-muted-foreground">
                    Your agent will be registered as a BAP-578 Non-Fungible Agent on BSC.
                    The Proof-of-Prompt and memory root will be stored immutably on-chain.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between gap-2 border-t pt-4">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              data-testid="button-back-step"
            >
              Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
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
              {isMinting ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Minting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Mint NFA
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
