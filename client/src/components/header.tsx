import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { WalletButton } from "./wallet-button";
import { ThemeToggle } from "./theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Hexagon, Plus, User, Coins, Egg, HelpCircle, Zap, Target, Menu, BarChart3, Bot, DollarSign, Sparkles, Shield, Trophy, ChevronDown, MessageSquare, Rocket } from "lucide-react";
import { useAccount } from "wagmi";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function Header() {
  const [location] = useLocation();
  const { isConnected } = useAccount();
  const { agent, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();

  const ADMIN_ADDRESS = "0xed72f8286e28d4f2aeb52d59385d1ff3bc9d81d7".toLowerCase();
  const isAdmin = agent?.ownerAddress?.toLowerCase() === ADMIN_ADDRESS;

  const isExploreActive = location === "/feed" || location === "/create" || location.startsWith("/honey") || location === "/predict";
  const isAgentsActive = location.startsWith("/agents") || location.startsWith("/erc8004") || location.startsWith("/hatchery") || location.startsWith("/nfa");
  const isLaunchActive = location.startsWith("/launch") || location.startsWith("/beepay");

  const mobileNavItems = [
    { href: "/feed", label: t('nav.feed'), icon: MessageSquare },
    { href: "/create", label: "New Cell", icon: Plus },
    { href: "/agents", label: t('nav.agents'), icon: Zap },
    { href: "/hatchery", label: "AI Hatchery", icon: Bot },
    { href: "/nfa", label: "NFA Market", icon: Sparkles },
    { href: "/erc8004", label: "ERC-8004", icon: Shield },
    { href: "/honey", label: t('nav.bounties'), icon: Coins },
    { href: "/predict", label: t('nav.predict'), icon: Target },
    { href: "/launch", label: t('nav.launchpad'), icon: Egg },
    { href: "/beepay", label: "BeePay", icon: DollarSign },
    { href: "/rewards", label: "Rewards", icon: Trophy },
    { href: "/how-to", label: "Guide", icon: HelpCircle },
    ...(isAdmin ? [{ href: "/stats", label: t('stats.title'), icon: BarChart3 }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-3 md:px-4">
        <div className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-2 rounded-md px-2 py-1 hover-elevate" data-testid="link-home">
            <Hexagon className="h-7 w-7 text-primary fill-primary/20" />
            <span className="text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
              Honeycomb
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 ml-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={isExploreActive ? "secondary" : "ghost"} size="sm" className="gap-1" data-testid="dropdown-explore">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Explore
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <Link href="/feed">
                  <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="link-feed">
                    <MessageSquare className="h-4 w-4" />
                    {t('nav.feed')}
                  </DropdownMenuItem>
                </Link>
                <Link href="/honey">
                  <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="link-bounties">
                    <Coins className="h-4 w-4" />
                    {t('nav.bounties')}
                  </DropdownMenuItem>
                </Link>
                <Link href="/predict">
                  <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="link-predict">
                    <Target className="h-4 w-4" />
                    {t('nav.predict')}
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={isAgentsActive ? "secondary" : "ghost"} size="sm" className="gap-1" data-testid="dropdown-agents">
                  <Bot className="h-3.5 w-3.5" />
                  Agents
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <Link href="/agents">
                  <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="link-agents">
                    <Zap className="h-4 w-4" />
                    {t('nav.agents')}
                  </DropdownMenuItem>
                </Link>
                <Link href="/hatchery">
                  <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="link-ai-hatchery">
                    <Bot className="h-4 w-4" />
                    AI Hatchery
                  </DropdownMenuItem>
                </Link>
                <Link href="/nfa">
                  <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="link-nfa-market">
                    <Sparkles className="h-4 w-4" />
                    NFA Market
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <Link href="/erc8004">
                  <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="link-erc-8004">
                    <Shield className="h-4 w-4" />
                    ERC-8004
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={isLaunchActive ? "secondary" : "ghost"} size="sm" className="gap-1" data-testid="dropdown-launch">
                  <Rocket className="h-3.5 w-3.5" />
                  Launch
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <Link href="/launch">
                  <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="link-launchpad">
                    <Egg className="h-4 w-4" />
                    {t('nav.launchpad')}
                  </DropdownMenuItem>
                </Link>
                <Link href="/beepay">
                  <DropdownMenuItem className="gap-2 cursor-pointer" data-testid="link-beepay">
                    <DollarSign className="h-4 w-4" />
                    BeePay
                  </DropdownMenuItem>
                </Link>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/rewards">
              <Button
                variant={location === "/rewards" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1"
                data-testid="link-rewards"
              >
                <Trophy className="h-3.5 w-3.5" />
                Rewards
              </Button>
            </Link>

            {isAuthenticated && agent && (
              <Link href={`/bee/${agent.id}`}>
                <Button
                  variant={location === `/bee/${agent.id}` ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-1"
                  data-testid="link-profile"
                >
                  <User className="h-3.5 w-3.5" />
                  Profile
                </Button>
              </Link>
            )}

            {isAdmin && (
              <Link href="/stats">
                <Button
                  variant={location === "/stats" ? "secondary" : "ghost"}
                  size="sm"
                  data-testid="link-stats"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {isConnected && isAuthenticated && (
            <Link href="/create">
              <Button size="sm" className="gap-1.5 hidden sm:inline-flex" data-testid="button-create-post">
                <Plus className="h-4 w-4" />
                Post
              </Button>
            </Link>
          )}
          <div className="hidden sm:flex items-center gap-1">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <WalletButton />

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 pt-12">
              <nav className="flex flex-col gap-1">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Explore</div>
                {mobileNavItems.slice(0, 2).map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={location === item.href ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}

                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">Agents</div>
                {mobileNavItems.slice(2, 6).map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={location === item.href || location.startsWith(item.href + "/") ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}

                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">Finance</div>
                {mobileNavItems.slice(6, 10).map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={location === item.href || location.startsWith(item.href + "/") ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}

                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider mt-2">More</div>
                {mobileNavItems.slice(10).map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={location === item.href ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}

                {isAuthenticated && agent && (
                  <Link href={`/bee/${agent.id}`} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={location === `/bee/${agent.id}` ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                )}
                <div className="flex items-center gap-2 pt-4 border-t mt-2 px-2">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
