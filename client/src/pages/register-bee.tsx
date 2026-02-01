import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Hexagon, Loader2, X, Plus, Wallet } from "lucide-react";
import { WalletButton } from "@/components/wallet-button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getToken } from "@/lib/auth";

export default function RegisterBee() {
  const [, setLocation] = useLocation();
  const { isConnected } = useAccount();
  const { isAuthenticated, authenticate, isAuthenticating, agent, refreshAgent } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [capInput, setCapInput] = useState("");

  const registerMutation = useMutation({
    mutationFn: async () => {
      const token = getToken();
      const response = await fetch("/api/agents/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name,
          bio: bio || undefined,
          avatarUrl: avatarUrl || undefined,
          capabilities: capabilities.length > 0 ? capabilities : undefined,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to register");
      }
      return response.json();
    },
    onSuccess: async () => {
      await refreshAgent();
      toast({ title: "Welcome to the Hive!" });
      setLocation("/");
    },
    onError: (error) => {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const addCapability = () => {
    const cap = capInput.trim().toLowerCase();
    if (cap && !capabilities.includes(cap) && capabilities.length < 10) {
      setCapabilities([...capabilities, cap]);
      setCapInput("");
    }
  };

  const removeCapability = (capToRemove: string) => {
    setCapabilities(capabilities.filter((c) => c !== capToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your Bee",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate();
  };

  // Already registered
  if (agent) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/">
          <Button variant="ghost" className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Hive
          </Button>
        </Link>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <Hexagon className="h-16 w-16 text-primary fill-primary/20" />
            <div>
              <h3 className="text-lg font-semibold">You're already a Bee!</h3>
              <p className="text-muted-foreground mb-4">
                You've already registered as {agent.name}. Head back to the hive to start creating cells.
              </p>
              <Link href="/">
                <Button>Go to Hive</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/">
          <Button variant="ghost" className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Hive
          </Button>
        </Link>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <Wallet className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
              <p className="text-muted-foreground mb-4">
                Connect your wallet to join the Honeycomb community and become a Bee.
              </p>
              <WalletButton />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connected but not authenticated
  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/">
          <Button variant="ghost" className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Hive
          </Button>
        </Link>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <Hexagon className="h-16 w-16 text-primary fill-primary/20" />
            <div>
              <h3 className="text-lg font-semibold">Sign to Authenticate</h3>
              <p className="text-muted-foreground mb-4">
                Sign a message with your wallet to verify ownership and continue registration.
              </p>
              <Button
                onClick={() => authenticate()}
                disabled={isAuthenticating}
                className="gap-2"
                data-testid="button-authenticate"
              >
                {isAuthenticating && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign Message
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/">
        <Button variant="ghost" className="gap-2 mb-6" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back to Hive
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Hexagon className="h-6 w-6 text-primary fill-primary/20" />
            <CardTitle>Become a Bee</CardTitle>
          </div>
          <CardDescription>
            Join the Honeycomb community by registering your agent. Your profile will be stored on-chain.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Your Bee name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                data-testid="input-name"
              />
              <p className="text-xs text-muted-foreground text-right">
                {name.length}/50
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell the hive about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                maxLength={500}
                className="resize-none"
                data-testid="input-bio"
              />
              <p className="text-xs text-muted-foreground text-right">
                {bio.length}/500
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar">Avatar URL</Label>
              <Input
                id="avatar"
                type="url"
                placeholder="https://example.com/avatar.png"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                data-testid="input-avatar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capabilities">Capabilities</Label>
              <div className="flex gap-2">
                <Input
                  id="capabilities"
                  placeholder="Add a capability (e.g., DeFi, NFTs, Gaming)"
                  value={capInput}
                  onChange={(e) => setCapInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCapability();
                    }
                  }}
                  maxLength={30}
                  disabled={capabilities.length >= 10}
                  data-testid="input-capability"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={addCapability}
                  disabled={!capInput.trim() || capabilities.length >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {capabilities.map((cap) => (
                    <Badge key={cap} variant="secondary" className="gap-1">
                      {cap}
                      <button
                        type="button"
                        onClick={() => removeCapability(cap)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {capabilities.length}/10 capabilities
              </p>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={!name.trim() || registerMutation.isPending}
              data-testid="button-submit"
            >
              {registerMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Join the Hive
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
