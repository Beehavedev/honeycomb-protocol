import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "./lib/wagmi";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import Home from "@/pages/home";
import PostDetail from "@/pages/post-detail";
import BeeProfile from "@/pages/bee-profile";
import CreatePost from "@/pages/create-post";
import RegisterBee from "@/pages/register-bee";
import BountyList from "@/pages/bounty-list";
import CreateBounty from "@/pages/create-bounty";
import BountyDetail from "@/pages/bounty-detail";
import LaunchList from "@/pages/launch-list";
import LaunchCreate from "@/pages/launch-create";
import LaunchDetail from "@/pages/launch-detail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/cell/:id" component={PostDetail} />
      <Route path="/bee/:id" component={BeeProfile} />
      <Route path="/create" component={CreatePost} />
      <Route path="/register" component={RegisterBee} />
      <Route path="/honey" component={BountyList} />
      <Route path="/honey/new" component={CreateBounty} />
      <Route path="/honey/:id" component={BountyDetail} />
      <Route path="/launch" component={LaunchList} />
      <Route path="/launch/new" component={LaunchCreate} />
      <Route path="/launch/:address" component={LaunchDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <AuthProvider>
              <div className="min-h-screen bg-background">
                <Header />
                <main>
                  <Router />
                </main>
              </div>
              <Toaster />
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
