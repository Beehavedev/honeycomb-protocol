import { useRoute, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/post-card";
import { ArrowLeft, Hexagon, FileText, MessageSquare, ThumbsUp, AlertCircle, Copy, CheckCircle, Bot, Key, RefreshCw, Eye, EyeOff, Edit, X, Save } from "lucide-react";
import { SiX } from "react-icons/si";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getToken } from "@/lib/auth";
import type { Agent, Post } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface BeeProfileResponse {
  agent: Agent;
  posts: (Post & { agent: Agent })[];
  stats: {
    postCount: number;
    commentCount: number;
    totalUpvotes: number;
  };
}

interface ApiKeyStatusResponse {
  hasApiKey: boolean;
  createdAt: string | null;
}

export default function BeeProfile() {
  const [, params] = useRoute("/bee/:id");
  const agentId = params?.id;
  const { toast } = useToast();
  const { agent: currentUser, refreshAgent, isAuthenticated } = useAuth();
  const { address: connectedAddress } = useAccount();
  const [copied, setCopied] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editTwitter, setEditTwitter] = useState("");

  const { data, isLoading, error } = useQuery<BeeProfileResponse>({
    queryKey: ["/api/agents", agentId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}`);
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!agentId,
  });

  // Check if this is the user's own profile (by ID match OR by wallet address match)
  const isOwnProfile = isAuthenticated && (
    currentUser?.id === agentId ||
    (connectedAddress && data?.agent?.ownerAddress?.toLowerCase() === connectedAddress.toLowerCase())
  );

  const { data: apiKeyStatus, refetch: refetchApiKeyStatus } = useQuery<ApiKeyStatusResponse>({
    queryKey: ["/api/agents/api-key/status"],
    queryFn: async () => {
      const token = getToken();
      const res = await fetch("/api/agents/api-key/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch API key status");
      return res.json();
    },
    enabled: isOwnProfile,
  });

  const enableBotMutation = useMutation({
    mutationFn: async () => {
      const token = getToken();
      const res = await fetch("/api/agents/enable-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to enable bot mode");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bot mode enabled!" });
      refreshAgent();
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to enable bot mode",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const generateApiKeyMutation = useMutation({
    mutationFn: async () => {
      const token = getToken();
      const res = await fetch("/api/agents/api-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to generate API key");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setNewApiKey(data.apiKey);
      setShowApiKey(true);
      toast({ title: "API key generated!" });
      refetchApiKeyStatus();
    },
    onError: (error) => {
      toast({
        title: "Failed to generate API key",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { name?: string; bio?: string; twitterHandle?: string }) => {
      const token = getToken();
      const res = await fetch("/api/agents/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profile updated!" });
      setIsEditing(false);
      refreshAgent();
      queryClient.invalidateQueries({ queryKey: ["/api/agents", agentId] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const copyAddress = () => {
    if (data?.agent.ownerAddress) {
      navigator.clipboard.writeText(data.agent.ownerAddress);
      setCopied(true);
      toast({ title: "Address copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyApiKey = () => {
    if (newApiKey) {
      navigator.clipboard.writeText(newApiKey);
      toast({ title: "API key copied to clipboard" });
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const startEditing = () => {
    if (data?.agent) {
      setEditName(data.agent.name);
      setEditBio(data.agent.bio || "");
      setEditTwitter(data.agent.twitterHandle || "");
      setIsEditing(true);
    }
  };

  const saveProfile = () => {
    const updates: { name?: string; bio?: string; twitterHandle?: string } = {};
    if (editName !== data?.agent.name) updates.name = editName;
    if (editBio !== (data?.agent.bio || "")) updates.bio = editBio;
    if (editTwitter !== (data?.agent.twitterHandle || "")) updates.twitterHandle = editTwitter;

    if (Object.keys(updates).length > 0) {
      updateProfileMutation.mutate(updates);
    } else {
      setIsEditing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-8 w-24 mb-6" />
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href="/">
          <Button variant="ghost" className="gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Hive
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-6 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Bee not found. This profile may not exist.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { agent, posts, stats } = data;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/">
        <Button variant="ghost" className="gap-2 mb-6" data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Back to Hive
        </Button>
      </Link>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={agent.avatarUrl || undefined} alt={agent.name} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {agent.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left w-full">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      maxLength={50}
                      data-testid="input-edit-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-bio">Bio</Label>
                    <Textarea
                      id="edit-bio"
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      maxLength={500}
                      rows={3}
                      data-testid="input-edit-bio"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-twitter">Twitter/X Handle</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">@</span>
                      <Input
                        id="edit-twitter"
                        value={editTwitter}
                        onChange={(e) => setEditTwitter(e.target.value.replace(/^@/, ""))}
                        placeholder="username"
                        maxLength={15}
                        data-testid="input-edit-twitter"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={saveProfile}
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      {updateProfileMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                      data-testid="button-cancel-edit"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                    <Hexagon className="h-5 w-5 text-primary fill-primary/20" />
                    <h1 className="text-2xl font-bold" data-testid="text-bee-name">{agent.name}</h1>
                    {agent.isBot && (
                      <Badge variant="outline" className="gap-1" data-testid="badge-bot">
                        <Bot className="h-3 w-3" />
                        Bot
                      </Badge>
                    )}
                    {isOwnProfile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={startEditing}
                        data-testid="button-edit-profile"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {agent.bio && (
                    <p className="text-muted-foreground mb-4" data-testid="text-bee-bio">{agent.bio}</p>
                  )}

                  <div className="flex items-center justify-center sm:justify-start gap-3 mb-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {formatAddress(agent.ownerAddress)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={copyAddress}
                        data-testid="button-copy-address"
                      >
                        {copied ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    {agent.twitterHandle && (
                      <a
                        href={`https://x.com/${agent.twitterHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="link-twitter"
                      >
                        <SiX className="h-3.5 w-3.5" />
                        <span>@{agent.twitterHandle}</span>
                      </a>
                    )}
                  </div>

                  {agent.capabilities && agent.capabilities.length > 0 && (
                    <div className="flex flex-wrap justify-center sm:justify-start gap-1">
                      {agent.capabilities.map((cap) => (
                        <Badge key={cap} variant="outline" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {!isEditing && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold" data-testid="stat-posts">{stats.postCount}</div>
                <div className="text-xs text-muted-foreground">Cells</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold" data-testid="stat-comments">{stats.commentCount}</div>
                <div className="text-xs text-muted-foreground">Comments</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <ThumbsUp className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold" data-testid="stat-upvotes">{stats.totalUpvotes}</div>
                <div className="text-xs text-muted-foreground">Upvotes</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isOwnProfile && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              Bot Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4">
              {!agent.isBot ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Enable bot mode to allow AI agents to use your account via API. This is useful if you want to build automated bots that can post, comment, and vote.
                  </p>
                  <Button
                    onClick={() => enableBotMutation.mutate()}
                    disabled={enableBotMutation.isPending}
                    data-testid="button-enable-bot"
                  >
                    {enableBotMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Bot className="h-4 w-4 mr-2" />
                    )}
                    Enable Bot Mode
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <Bot className="h-3 w-3" />
                      Bot Mode Active
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          API Key
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {apiKeyStatus?.hasApiKey
                            ? `Created ${apiKeyStatus.createdAt ? new Date(apiKeyStatus.createdAt).toLocaleDateString() : "previously"}`
                            : "No API key generated yet"}
                        </p>
                      </div>
                      <Button
                        onClick={() => generateApiKeyMutation.mutate()}
                        disabled={generateApiKeyMutation.isPending}
                        variant={apiKeyStatus?.hasApiKey ? "outline" : "default"}
                        data-testid="button-generate-api-key"
                      >
                        {generateApiKeyMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Key className="h-4 w-4 mr-2" />
                        )}
                        {apiKeyStatus?.hasApiKey ? "Regenerate" : "Generate"} API Key
                      </Button>
                    </div>

                    {newApiKey && (
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                            Save this key now - you won't be able to see it again!
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowApiKey(!showApiKey)}
                            data-testid="button-toggle-api-key-visibility"
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-background p-2 rounded text-sm font-mono break-all" data-testid="text-api-key">
                            {showApiKey ? newApiKey : "•".repeat(40)}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={copyApiKey}
                            data-testid="button-copy-api-key"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      <p className="font-medium mb-1">Using the Bot API:</p>
                      <code className="text-xs">X-API-Key: hcb_your_api_key</code>
                      <p className="mt-2 text-xs">
                        Rate limit: 60 requests per minute. See documentation for available endpoints.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Hexagon className="h-5 w-5 text-primary" />
        Cells by this Bee
      </h2>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <Hexagon className="h-16 w-16 text-muted-foreground/50" />
            <div>
              <h3 className="text-lg font-semibold">No cells yet</h3>
              <p className="text-muted-foreground">
                This Bee hasn't created any cells yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
