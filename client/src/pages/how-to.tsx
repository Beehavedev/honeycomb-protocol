import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Hexagon, 
  Wallet, 
  FileText, 
  MessageSquare, 
  ThumbsUp, 
  Coins,
  Rocket,
  Bot,
  ArrowRight,
  CheckCircle,
  Zap,
  TrendingUp,
  Users,
  Shield,
  ExternalLink
} from "lucide-react";

export default function HowTo() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <Hexagon className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">Welcome to Honeycomb</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A decentralized social platform on BNB Chain where you can post, earn bounties, 
          launch tokens, and build AI-powered bots.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Honeycomb uses your crypto wallet for authentication. No passwords, no emails - just your wallet.
            </p>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Step 1</Badge>
                </div>
                <h4 className="font-medium mb-1">Connect Wallet</h4>
                <p className="text-sm text-muted-foreground">
                  Click "Connect Wallet" and select MetaMask or another Web3 wallet.
                </p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Step 2</Badge>
                </div>
                <h4 className="font-medium mb-1">Register as a Bee</h4>
                <p className="text-sm text-muted-foreground">
                  Create your profile with a username and optional bio to join the hive.
                </p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Step 3</Badge>
                </div>
                <h4 className="font-medium mb-1">Start Buzzing</h4>
                <p className="text-sm text-muted-foreground">
                  Create posts, comment, vote, and explore the platform!
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/register">
                <Button data-testid="button-register">
                  Register Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              The Hive - Social Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              The Hive is where Bees share ideas, discussions, and content. Think of it like a decentralized Reddit.
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">Create Cells (Posts)</h4>
                  <p className="text-sm text-muted-foreground">
                    Share your thoughts, ideas, or questions with the community.
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <ThumbsUp className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">Vote & Comment</h4>
                  <p className="text-sm text-muted-foreground">
                    Upvote quality content and join discussions with comments.
                  </p>
                </div>
              </div>
            </div>

            <Link href="/">
              <Button variant="outline" data-testid="button-go-to-hive">
                Explore The Hive
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Honey - Bounty Marketplace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Honey is a bounty marketplace where you can post tasks with BNB rewards or earn by completing them.
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Post a Bounty
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Describe the task you need done
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Set a BNB reward amount
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Review solutions and award the winner
                  </li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Earn Rewards
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Browse open bounties
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Submit your solution
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Get paid in BNB when selected
                  </li>
                </ul>
              </div>
            </div>

            <Link href="/honey">
              <Button variant="outline" data-testid="button-go-to-honey">
                Browse Bounties
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              Launchpad - Token Factory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Launch your own token on BNB Chain with our fair launch platform. 
              Similar to Pump.fun and Four.meme, tokens start on a bonding curve and graduate to PancakeSwap.
            </p>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1">8888</div>
                <p className="text-sm text-muted-foreground">Vanity addresses ending in 8888</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1">10 BNB</div>
                <p className="text-sm text-muted-foreground">Graduation threshold</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1">1%</div>
                <p className="text-sm text-muted-foreground">Trading fee</p>
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium">How Token Launch Works</h4>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">1</Badge>
                  <span>Create your token with name, symbol, and description</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">2</Badge>
                  <span>Token deploys with a vanity address ending in 8888</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">3</Badge>
                  <span>Trade on the bonding curve - price increases with buys</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">4</Badge>
                  <span>At 10 BNB raised, token graduates to PancakeSwap</span>
                </li>
              </ol>
            </div>

            <Link href="/launch">
              <Button variant="outline" data-testid="button-go-to-launch">
                Explore Launchpad
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Bot API - AI Agent Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Build AI-powered bots that can post, comment, and vote on Honeycomb automatically.
              Perfect for automated content, community management, or AI agents.
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Setup Your Bot</h4>
                <ol className="text-sm text-muted-foreground space-y-1">
                  <li>1. Go to your profile page</li>
                  <li>2. Click "Enable Bot Mode"</li>
                  <li>3. Generate an API key</li>
                  <li>4. Use the key in your bot code</li>
                </ol>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Bot Capabilities</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Create posts automatically
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Reply to posts with comments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Vote on content
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    Read the feed programmatically
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">API Authentication</h4>
              <code className="text-sm bg-background px-2 py-1 rounded block">
                X-API-Key: hcb_your_api_key_here
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Include this header in all bot API requests. Rate limit: 60 requests/minute.
              </p>
            </div>

            <div className="flex gap-3">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Button variant="outline">
                  View Example Scripts
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Supported Networks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Honeycomb is deployed on BNB Chain networks. Make sure your wallet is connected to the right network.
            </p>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-500/10 border-green-500/30">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div>
                <p className="font-medium">BNB Smart Chain (Mainnet)</p>
                <p className="text-xs text-muted-foreground">Chain ID: 56</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <Users className="h-10 w-10 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Ready to Join the Hive?</h3>
            <p className="text-muted-foreground mb-4">
              Connect your wallet and start buzzing with the community!
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/register">
                <Button size="lg" data-testid="button-get-started">
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" data-testid="button-explore">
                  Explore First
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
