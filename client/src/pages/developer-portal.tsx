import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  Code2,
  Gamepad2,
  DollarSign,
  Key,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  Palette,
  Globe,
  Tag,
  FileText,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Clock,
  Layers,
  ArrowLeft,
} from "lucide-react";
import { Link } from "wouter";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="icon"
      variant="ghost"
      data-testid="button-copy-api-key"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
    </Button>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [studioName, setStudioName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [payoutAddress, setPayoutAddress] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const { address } = useAccount();

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/devs/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      setApiKey(data.apiKey);
      toast({ title: "Developer account created!" });
      queryClient.invalidateQueries({ queryKey: ["/api/devs/me"] });
      onSuccess();
    },
    onError: (err: any) => {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    },
  });

  if (apiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" /> Account Created
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/20">
            <p className="text-sm font-medium mb-2">Your Developer API Key</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background p-2 rounded font-mono break-all" data-testid="text-api-key">{apiKey}</code>
              <CopyButton text={apiKey} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Save this key securely. It will not be shown again. Use it in X-Dev-Api-Key header for session tracking.</p>
          </div>
          <Button onClick={() => setApiKey(null)} data-testid="button-continue-to-portal">Continue to Portal</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code2 className="w-5 h-5" /> Register as Developer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Build games for the Honeycomb Arena and earn 85% revenue share on every game played.
        </p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="studioName">Studio Name *</Label>
            <Input id="studioName" value={studioName} onChange={(e) => setStudioName(e.target.value)} placeholder="Your game studio name" data-testid="input-studio-name" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@studio.com" data-testid="input-email" />
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://studio.com" data-testid="input-website" />
          </div>
          <div>
            <Label htmlFor="payoutAddress">Payout Address (BNB) *</Label>
            <Input id="payoutAddress" value={payoutAddress} onChange={(e) => setPayoutAddress(e.target.value)} placeholder="0x..." data-testid="input-payout-address" />
          </div>
        </div>
        <Button
          onClick={() => registerMutation.mutate({ studioName, email: email || undefined, website: website || undefined, payoutAddress })}
          disabled={!studioName || !payoutAddress || registerMutation.isPending}
          data-testid="button-register-developer"
        >
          {registerMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Code2 className="w-4 h-4 mr-1.5" />}
          Register Developer Account
        </Button>
      </CardContent>
    </Card>
  );
}

function SubmitGameForm({ developerId }: { developerId: string }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [genre, setGenre] = useState("arcade");
  const [color, setColor] = useState("#3b82f6");
  const [tags, setTags] = useState("");

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/devs/games", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Game submitted for review!" });
      queryClient.invalidateQueries({ queryKey: ["/api/devs/me"] });
      setName(""); setDescription(""); setTagline(""); setIframeUrl(""); setThumbnailUrl(""); setTags("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to submit game", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" /> Submit New Game
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="gameName">Game Name *</Label>
            <Input id="gameName" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Game" data-testid="input-game-name" />
          </div>
          <div>
            <Label htmlFor="gameTagline">Tagline</Label>
            <Input id="gameTagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A short catchy tagline" data-testid="input-game-tagline" />
          </div>
        </div>
        <div>
          <Label htmlFor="gameDescription">Description *</Label>
          <Input id="gameDescription" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your game..." data-testid="input-game-description" />
        </div>
        <div>
          <Label htmlFor="gameIframeUrl">Game URL (iframe) *</Label>
          <Input id="gameIframeUrl" value={iframeUrl} onChange={(e) => setIframeUrl(e.target.value)} placeholder="https://yourgame.com/play" data-testid="input-game-iframe-url" />
          <p className="text-xs text-muted-foreground mt-1">Your game will be embedded in an iframe. It must support cross-origin embedding.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="gameThumbnail">Thumbnail URL</Label>
            <Input id="gameThumbnail" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://..." data-testid="input-game-thumbnail" />
          </div>
          <div>
            <Label htmlFor="gameGenre">Genre</Label>
            <select id="gameGenre" value={genre} onChange={(e) => setGenre(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" data-testid="select-game-genre">
              {["arcade", "strategy", "puzzle", "action", "trivia", "trading", "sports", "rpg"].map(g => (
                <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="gameColor">Theme Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" id="gameColor" value={color} onChange={(e) => setColor(e.target.value)} className="w-9 h-9 rounded cursor-pointer" data-testid="input-game-color" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="gameTags">Tags (comma separated)</Label>
          <Input id="gameTags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="multiplayer, fast-paced, crypto" data-testid="input-game-tags" />
        </div>
        <Button
          onClick={() => submitMutation.mutate({
            name, description, tagline: tagline || undefined,
            iframeUrl, thumbnailUrl: thumbnailUrl || undefined,
            genre, color,
            tags: tags ? tags.split(",").map(t => t.trim()).filter(Boolean) : [],
          })}
          disabled={!name || !description || !iframeUrl || submitMutation.isPending}
          data-testid="button-submit-game"
        >
          {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Gamepad2 className="w-4 h-4 mr-1.5" />}
          Submit Game for Review
        </Button>
      </CardContent>
    </Card>
  );
}

function GamesList({ games }: { games: any[] }) {
  if (!games || games.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Gamepad2 className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No games submitted yet. Submit your first game above!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {games.map((game: any) => (
        <Card key={game.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md flex items-center justify-center"
                  style={{ background: `${game.color}20`, border: `1px solid ${game.color}30` }}>
                  <Gamepad2 className="w-5 h-5" style={{ color: game.color }} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm" data-testid={`text-game-name-${game.id}`}>{game.name}</h4>
                  <p className="text-xs text-muted-foreground">{game.tagline || game.genre}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={game.status === "approved" ? "default" : game.status === "pending" ? "secondary" : "destructive"} data-testid={`badge-game-status-${game.id}`}>
                  {game.status}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {game.totalSessions} plays
                </div>
              </div>
            </div>
            {game.iframeUrl && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="w-3 h-3" /> {game.iframeUrl}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EarningsDashboard({ earnings, sessions }: { earnings: any; sessions: any[] }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold" data-testid="text-total-sessions">{earnings?.totalSessions || 0}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold" data-testid="text-total-revenue">{parseFloat(earnings?.totalRevenue || "0").toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">Gross Revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Layers className="w-5 h-5 mx-auto text-amber-500 mb-1" />
            <p className="text-lg font-bold text-amber-500" data-testid="text-platform-fees">{parseFloat(earnings?.totalFees || "0").toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">Platform Fees (15%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold text-green-500" data-testid="text-dev-earnings">{parseFloat(earnings?.totalNet || "0").toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">Your Earnings (85%)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {!sessions || sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No sessions yet. Once players use your games, sessions will appear here.</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 10).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded-md bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{new Date(s.startedAt).toLocaleDateString()}</span>
                    <Badge variant="outline" className="text-[10px]">{s.outcome || s.status}</Badge>
                  </div>
                  <div className="text-xs font-mono">
                    <span className="text-green-500">+{parseFloat(s.developerNet || "0").toFixed(4)}</span>
                    <span className="text-muted-foreground ml-1">BNB</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ApiKeySection({ onRegenerate }: { onRegenerate: () => void }) {
  const { toast } = useToast();
  const [newKey, setNewKey] = useState<string | null>(null);

  const regenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/devs/api-key/regenerate");
      return res.json();
    },
    onSuccess: (data) => {
      setNewKey(data.apiKey);
      toast({ title: "API key regenerated" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to regenerate key", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Key className="w-4 h-4" /> API Key Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {newKey ? (
          <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs font-medium mb-1">New API Key Generated</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background p-2 rounded font-mono break-all">{newKey}</code>
              <CopyButton text={newKey} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Save this securely. It won't be shown again.</p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm text-muted-foreground">Your API key is used for session tracking (X-Dev-Api-Key header).</p>
            <Button variant="outline" onClick={() => regenMutation.mutate()} disabled={regenMutation.isPending} data-testid="button-regenerate-key">
              {regenMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
              Regenerate Key
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IntegrationDocs() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4" /> Integration Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div>
            <h4 className="font-semibold mb-1">1. Register & Get API Key</h4>
            <p className="text-muted-foreground text-xs">Register your developer account to get an API key for session tracking.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">2. Submit Your Game</h4>
            <p className="text-muted-foreground text-xs">Submit your game with an iframe URL. Games are reviewed before going live in the arena.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">3. Track Sessions</h4>
            <div className="bg-muted/50 rounded-md p-3 font-mono text-xs space-y-2">
              <div>
                <span className="text-green-500">POST</span> /api/devs/sessions/start
                <br /><span className="text-muted-foreground">Headers: X-Dev-Api-Key: your_key</span>
                <br /><span className="text-muted-foreground">Body: {"{"} gameId, playerAgentId {"}"}</span>
              </div>
              <div>
                <span className="text-green-500">POST</span> /api/devs/sessions/:id/end
                <br /><span className="text-muted-foreground">Body: {"{"} sessionToken, outcome, score, grossAmount {"}"}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-1">4. Revenue Model</h4>
            <p className="text-muted-foreground text-xs">
              Platform fee: <span className="text-amber-500 font-medium">15%</span> of gross revenue. You keep <span className="text-green-500 font-medium">85%</span>. Payouts are tracked and settled to your payout address.
            </p>
          </div>
        </div>
        <div className="pt-2">
          <a href="/api/devs/docs" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-500 hover:underline">
            <ExternalLink className="w-3 h-3" /> View Full API Documentation
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DeveloperPortal() {
  const { isAuthenticated } = useAuth();
  const { address } = useAccount();
  const [tab, setTab] = useState("overview");

  const { data: devData, isLoading } = useQuery({
    queryKey: ["/api/devs/me"],
    enabled: !!isAuthenticated,
  });

  const isRegistered = devData && devData.account;

  if (!isAuthenticated || !address) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/arena">
            <Button size="icon" variant="ghost" data-testid="button-back-to-arena">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Developer Portal</h1>
            <p className="text-sm text-muted-foreground">Build games for the Honeycomb Arena</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Code2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-muted-foreground">Connect your wallet and register as a Bee to access the Developer Portal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/arena">
            <Button size="icon" variant="ghost" data-testid="button-back-to-arena">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Developer Portal</h1>
            <p className="text-sm text-muted-foreground">Build games for the Honeycomb Arena</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Gamepad2 className="w-6 h-6 mx-auto text-amber-500 mb-2" />
              <p className="text-sm font-medium">Build Games</p>
              <p className="text-xs text-muted-foreground">Create web games that run in the Honeycomb Arena</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto text-green-500 mb-2" />
              <p className="text-sm font-medium">Earn 85%</p>
              <p className="text-xs text-muted-foreground">Keep 85% of all revenue your games generate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 mx-auto text-blue-500 mb-2" />
              <p className="text-sm font-medium">Grow Together</p>
              <p className="text-xs text-muted-foreground">Reach thousands of players in the arena</p>
            </CardContent>
          </Card>
        </div>

        <RegisterForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["/api/devs/me"] })} />
        <IntegrationDocs />
      </div>
    );
  }

  const { account, earnings, games } = devData;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/arena">
            <Button size="icon" variant="ghost" data-testid="button-back-to-arena">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-studio-name">{account.studioName}</h1>
            <p className="text-sm text-muted-foreground">Developer Portal</p>
          </div>
        </div>
        <Badge variant="secondary" data-testid="badge-dev-status">
          {account.status}
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="games" data-testid="tab-games">My Games</TabsTrigger>
          <TabsTrigger value="earnings" data-testid="tab-earnings">Earnings</TabsTrigger>
          <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Gamepad2 className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{games?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Games</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <BarChart3 className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{earnings?.totalSessions || 0}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{parseFloat(earnings?.totalRevenue || "0").toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 mx-auto text-green-500 mb-1" />
                <p className="text-lg font-bold text-green-500">{parseFloat(earnings?.totalNet || "0").toFixed(4)}</p>
                <p className="text-xs text-muted-foreground">Earnings</p>
              </CardContent>
            </Card>
          </div>
          <SubmitGameForm developerId={account.id} />
          <GamesList games={games} />
        </TabsContent>

        <TabsContent value="games" className="space-y-4 mt-4">
          <SubmitGameForm developerId={account.id} />
          <GamesList games={games} />
        </TabsContent>

        <TabsContent value="earnings" className="mt-4">
          <EarningsDashboard earnings={earnings} sessions={devData?.recentSessions || []} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <ApiKeySection onRegenerate={() => {}} />
          <IntegrationDocs />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Payout Address</span>
                <code className="text-xs font-mono">{account.payoutAddress}</code>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Revenue Share</span>
                <span>85% Developer / 15% Platform</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Registered</span>
                <span>{new Date(account.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
