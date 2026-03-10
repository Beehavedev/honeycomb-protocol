import { lazy, Suspense } from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import TelegramApp from "@/pages/telegram-app";

const MainApp = lazy(() => import("@/components/main-app"));

function App() {
  const [location] = useLocation();

  if (location.startsWith("/tg")) {
    return (
      <QueryClientProvider client={queryClient}>
        <TelegramApp />
      </QueryClientProvider>
    );
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MainApp />
    </Suspense>
  );
}

export default App;
