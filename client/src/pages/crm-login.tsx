import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Lock, Mail } from "lucide-react";

const CRM_TOKEN_KEY = "crm_token";
const CRM_USER_KEY = "crm_user";

export function getCrmToken(): string | null {
  return localStorage.getItem(CRM_TOKEN_KEY);
}

export function getCrmUser(): { id: string; email: string; name: string; role: string } | null {
  const raw = localStorage.getItem(CRM_USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setCrmAuth(token: string, user: { id: string; email: string; name: string; role: string }) {
  localStorage.setItem(CRM_TOKEN_KEY, token);
  localStorage.setItem(CRM_USER_KEY, JSON.stringify(user));
}

export function clearCrmAuth() {
  localStorage.removeItem(CRM_TOKEN_KEY);
  localStorage.removeItem(CRM_USER_KEY);
}

export default function CrmLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const res = await fetch("/api/crm/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      const data = await res.json();
      setCrmAuth(data.token, data.user);
      toast({ title: `Welcome back, ${data.user.name}` });
      setLocation("/crm");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl" data-testid="text-crm-login-title">CRM Login</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to access the CRM dashboard</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@honeycomb.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="pl-10"
                  data-testid="input-login-email"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10"
                  data-testid="input-login-password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !email || !password} data-testid="button-login">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
