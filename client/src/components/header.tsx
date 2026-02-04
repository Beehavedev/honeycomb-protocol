import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { WalletButton } from "./wallet-button";
import { ThemeToggle } from "./theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Hexagon, Plus, User, Coins, Egg, HelpCircle, Zap, Target, Menu, BarChart3, Bot, DollarSign, Sparkles } from "lucide-react";
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

  const navItems = [
    { href: "/feed", label: t('nav.feed'), icon: null, match: (loc: string) => loc === "/feed" },
    { href: "/agents", label: t('nav.agents'), icon: Zap, match: (loc: string) => loc.startsWith("/agents") },
    { href: "/hatchery", label: "AI Hatchery", icon: Bot, match: (loc: string) => loc.startsWith("/hatchery") },
    { href: "/beepay", label: "BeePay", icon: DollarSign, match: (loc: string) => loc.startsWith("/beepay") },
    { href: "/nfa", label: "NFA", icon: Sparkles, match: (loc: string) => loc.startsWith("/nfa") },
    { href: "/predict", label: t('nav.predict'), icon: Target, match: (loc: string) => loc === "/predict" },
    { href: "/launch", label: t('nav.launchpad'), icon: Egg, match: (loc: string) => loc.startsWith("/launch") },
    { href: "/honey", label: t('nav.bounties'), icon: Coins, match: (loc: string) => loc.startsWith("/honey") },
    ...(isAdmin ? [{ href: "/stats", label: t('stats.title'), icon: BarChart3, match: (loc: string) => loc === "/stats" }] : []),
    { href: "/how-to", label: "How To", icon: HelpCircle, match: (loc: string) => loc === "/how-to" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 md:h-16 items-center justify-between gap-2 md:gap-4 px-3 md:px-4">
        <Link href="/" className="flex items-center gap-2 hover-elevate rounded-md px-1 md:px-2 py-1" data-testid="link-home">
          <Hexagon className="h-6 w-6 md:h-8 md:w-8 text-primary fill-primary/20" />
          <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
            Honeycomb
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={item.match(location) ? "secondary" : "ghost"}
                className="gap-2"
                data-testid={`link-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {item.label}
              </Button>
            </Link>
          ))}
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

        <div className="flex items-center gap-1 md:gap-2">
          {isConnected && isAuthenticated && (
            <Link href="/create">
              <Button size="sm" className="gap-1 md:gap-2 h-8 md:h-9 px-2 md:px-4" data-testid="button-create-post">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Cell</span>
              </Button>
            </Link>
          )}
          <Link href={isAuthenticated && agent ? `/bee/${agent.id}` : "/register"} className="md:hidden">
            <Button size="icon" variant="ghost" data-testid="button-mobile-profile">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="hidden sm:block">
            <WalletButton />
          </div>
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 pt-12">
              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                    <Button
                      variant={item.match(location) ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                    >
                      {item.icon && <item.icon className="h-5 w-5" />}
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
                      <User className="h-5 w-5" />
                      My Profile
                    </Button>
                  </Link>
                )}
                <div className="pt-4 border-t mt-2">
                  <WalletButton />
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
