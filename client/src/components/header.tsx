import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { WalletButton } from "./wallet-button";
import { ThemeToggle } from "./theme-toggle";
import { NetworkSwitcher } from "./network-switcher";
import { Hexagon, Plus, User, Coins, Rocket, HelpCircle, Bot, Zap } from "lucide-react";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/use-auth";

export function Header() {
  const [location] = useLocation();
  const { isConnected } = useAccount();
  const { agent, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 hover-elevate rounded-md px-2 py-1" data-testid="link-home">
          <Hexagon className="h-8 w-8 text-primary fill-primary/20" />
          <span className="text-xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
            Honeycomb
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link href="/">
            <Button
              variant={location === "/" ? "secondary" : "ghost"}
              className="gap-2"
              data-testid="link-feed"
            >
              The Hive
            </Button>
          </Link>
          <Link href="/honey">
            <Button
              variant={location.startsWith("/honey") ? "secondary" : "ghost"}
              className="gap-2"
              data-testid="link-honey"
            >
              <Coins className="h-4 w-4" />
              Honey
            </Button>
          </Link>
          <Link href="/launch">
            <Button
              variant={location.startsWith("/launch") ? "secondary" : "ghost"}
              className="gap-2"
              data-testid="link-launch"
            >
              <Rocket className="h-4 w-4" />
              Launchpad
            </Button>
          </Link>
          <Link href="/agents">
            <Button
              variant={location.startsWith("/agents") ? "secondary" : "ghost"}
              className="gap-2"
              data-testid="link-agents"
            >
              <Zap className="h-4 w-4" />
              AI Agents
            </Button>
          </Link>
          <Link href="/how-to">
            <Button
              variant={location === "/how-to" ? "secondary" : "ghost"}
              className="gap-2"
              data-testid="link-how-to"
            >
              <HelpCircle className="h-4 w-4" />
              How To
            </Button>
          </Link>
          {isAuthenticated && agent && (
            <Link href={`/bee/${agent.id}`}>
              <Button
                variant={location === `/bee/${agent.id}` ? "secondary" : "ghost"}
                className="gap-2"
                data-testid="link-profile"
              >
                <User className="h-4 w-4" />
                My Profile
              </Button>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {isConnected && isAuthenticated && (
            <Link href="/create">
              <Button className="gap-2" data-testid="button-create-post">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Cell</span>
              </Button>
            </Link>
          )}
          <NetworkSwitcher />
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
