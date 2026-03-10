import { lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "../lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "../lib/wagmi";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { I18nProvider } from "@/lib/i18n";
import { Header } from "@/components/header";
import { NetworkWarningBanner } from "@/components/network-switcher";

const Landing = lazy(() => import("@/pages/landing"));
const Home = lazy(() => import("@/pages/home"));
const PostDetail = lazy(() => import("@/pages/post-detail"));
const BeeProfile = lazy(() => import("@/pages/bee-profile"));
const CreatePost = lazy(() => import("@/pages/create-post"));
const RegisterBee = lazy(() => import("@/pages/register-bee"));
const HowTo = lazy(() => import("@/pages/how-to"));
const CreateAgent = lazy(() => import("@/pages/create-agent"));
const AgentChat = lazy(() => import("@/pages/agent-chat"));
const Stats = lazy(() => import("@/pages/stats"));
const Channel = lazy(() => import("@/pages/channel"));
const TwitterAdmin = lazy(() => import("@/pages/twitter-admin"));
const GmgnDocs = lazy(() => import("@/pages/gmgn-docs"));
const AgentDirectory = lazy(() => import("@/pages/agent-directory"));
const AgentProfile = lazy(() => import("@/pages/agent-profile"));
const AgentLeaderboard = lazy(() => import("@/pages/agent-leaderboard"));
const AgentTradingDashboard = lazy(() => import("@/pages/agent-trading-dashboard"));
const ERC8004Register = lazy(() => import("@/pages/erc8004-register"));
const ReferralDashboard = lazy(() => import("@/pages/referral-dashboard"));
const ReferralRedirect = lazy(() => import("@/pages/referral-redirect"));
const HoneyToken = lazy(() => import("@/pages/honey-token"));
const TradingArena = lazy(() => import("@/pages/trading-arena"));
const MoltbookOnboard = lazy(() => import("@/pages/moltbook-onboard"));
const CrmPage = lazy(() => import("@/pages/crm"));
const CrmLogin = lazy(() => import("@/pages/crm-login"));
const CrmUsersPage = lazy(() => import("@/pages/crm-users"));
const NfaMarketplace = lazy(() => import("@/pages/nfa-marketplace"));
const NfaDetail = lazy(() => import("@/pages/nfa-detail"));
const NfaMint = lazy(() => import("@/pages/nfa-mint"));
const DeveloperPortal = lazy(() => import("@/pages/developer-portal"));
const PointsDashboard = lazy(() => import("@/pages/points-dashboard"));
const NfaTunnelDash = lazy(() => import("@/pages/nfa-tunnel-dash"));
const OpenClawIntegration = lazy(() => import("@/pages/openclaw-integration"));
const NotFound = lazy(() => import("@/pages/not-found"));

const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/feed" component={Home} />
        <Route path="/cell/:id" component={PostDetail} />
        <Route path="/bee/:id" component={BeeProfile} />
        <Route path="/create" component={CreatePost} />
        <Route path="/register" component={RegisterBee} />
        <Route path="/how-to" component={HowTo} />
        <Route path="/create-agent" component={CreateAgent} />
        <Route path="/agents">{() => <Redirect to="/nfa" />}</Route>
        <Route path="/agents/:agentId" component={AgentChat} />
        <Route path="/predict">{() => <Redirect to="/arena" />}</Route>
        <Route path="/token" component={HoneyToken} />
        <Route path="/stats" component={Stats} />
        <Route path="/channels/:slug" component={Channel} />
        <Route path="/admin/twitter" component={TwitterAdmin} />
        <Route path="/docs/gmgn" component={GmgnDocs} />
        <Route path="/hatchery" component={AgentDirectory} />
        <Route path="/hatchery/leaderboard" component={AgentLeaderboard} />
        <Route path="/hatchery/trading" component={AgentTradingDashboard} />
        <Route path="/hatchery/:id" component={AgentProfile} />
        <Route path="/erc8004" component={ERC8004Register} />
        <Route path="/erc8004/register" component={ERC8004Register} />
        <Route path="/rewards" component={ReferralDashboard} />
        <Route path="/referrals" component={ReferralDashboard} />
        <Route path="/leaderboards" component={ReferralDashboard} />
        <Route path="/r/:code" component={ReferralRedirect} />
        <Route path="/arena" component={TradingArena} />
        <Route path="/arena/tournament/:tournamentId" component={TradingArena} />
        <Route path="/arena/:id/spectate" component={TradingArena} />
        <Route path="/arena/:id" component={TradingArena} />
        <Route path="/nfa" component={NfaMarketplace} />
        <Route path="/nfa/mint" component={NfaMint} />
        <Route path="/nfa/:id" component={NfaDetail} />
        <Route path="/nfa-tunnel" component={NfaTunnelDash} />
        <Route path="/developers" component={DeveloperPortal} />
        <Route path="/points" component={PointsDashboard} />
        <Route path="/moltbook" component={MoltbookOnboard} />
        <Route path="/openclaw" component={OpenClawIntegration} />
        <Route path="/crm/login" component={CrmLogin} />
        <Route path="/crm/users" component={CrmUsersPage} />
        <Route path="/crm" component={CrmPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

export default function MainApp() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <I18nProvider>
            <TooltipProvider>
              <AuthProvider>
                <div className="min-h-screen bg-background">
                  <Header />
                  <NetworkWarningBanner />
                  <main>
                    <Router />
                  </main>
                </div>
                <Toaster />
              </AuthProvider>
            </TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
