import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "./lib/wagmi";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { I18nProvider } from "@/lib/i18n";
import { Header } from "@/components/header";
import { NetworkWarningBanner } from "@/components/network-switcher";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import PostDetail from "@/pages/post-detail";
import BeeProfile from "@/pages/bee-profile";
import CreatePost from "@/pages/create-post";
import RegisterBee from "@/pages/register-bee";
import HowTo from "@/pages/how-to";
import CreateAgent from "@/pages/create-agent";
import AgentsMarketplace from "@/pages/agents-marketplace";
import AgentChat from "@/pages/agent-chat";
import Stats from "@/pages/stats";
import Channel from "@/pages/channel";
import TwitterAdmin from "@/pages/twitter-admin";
import GmgnDocs from "@/pages/gmgn-docs";
import AgentDirectory from "@/pages/agent-directory";
import AgentProfile from "@/pages/agent-profile";
import AgentLeaderboard from "@/pages/agent-leaderboard";
import AgentTradingDashboard from "@/pages/agent-trading-dashboard";
import ERC8004Register from "@/pages/erc8004-register";
import ReferralDashboard from "@/pages/referral-dashboard";
import ReferralRedirect from "@/pages/referral-redirect";
import HoneyToken from "@/pages/honey-token";
import TradingArena from "@/pages/trading-arena";
import MoltbookOnboard from "@/pages/moltbook-onboard";
import CrmPage from "@/pages/crm";
import CrmLogin from "@/pages/crm-login";
import CrmUsersPage from "@/pages/crm-users";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/feed" component={Home} />
      <Route path="/cell/:id" component={PostDetail} />
      <Route path="/bee/:id" component={BeeProfile} />
      <Route path="/create" component={CreatePost} />
      <Route path="/register" component={RegisterBee} />
      <Route path="/how-to" component={HowTo} />
      <Route path="/create-agent" component={CreateAgent} />
      <Route path="/agents" component={AgentsMarketplace} />
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
      <Route path="/arena/:id/spectate" component={TradingArena} />
      <Route path="/arena/:id" component={TradingArena} />
      <Route path="/moltbook" component={MoltbookOnboard} />
      <Route path="/crm/login" component={CrmLogin} />
      <Route path="/crm/users" component={CrmUsersPage} />
      <Route path="/crm" component={CrmPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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

export default App;
