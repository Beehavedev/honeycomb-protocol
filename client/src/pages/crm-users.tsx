import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getCrmToken, getCrmUser, clearCrmAuth } from "./crm-login";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Trash2, Edit2, Users, Shield, ArrowLeft } from "lucide-react";

const ROLES = ["super_admin", "admin", "manager", "moderator"] as const;

const roleColors: Record<string, string> = {
  super_admin: "bg-red-500/20 text-red-400",
  admin: "bg-purple-500/20 text-purple-400",
  manager: "bg-blue-500/20 text-blue-400",
  moderator: "bg-green-500/20 text-green-400",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  moderator: "Moderator",
};

interface CrmUserSafe {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

async function crmFetch(url: string, options?: RequestInit) {
  const token = getCrmToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      clearCrmAuth();
      window.location.href = "/crm/login";
      throw new Error("Session expired");
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

function UserForm({ user, onClose }: { user?: CrmUserSafe; onClose: () => void }) {
  const { toast } = useToast();
  const currentUser = getCrmUser();
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    role: user?.role || "moderator",
    isActive: user?.isActive !== undefined ? user.isActive : true,
  });

  const availableRoles = ROLES.filter(r => {
    const levels: Record<string, number> = { super_admin: 4, admin: 3, manager: 2, moderator: 1 };
    return levels[r] < (levels[currentUser?.role || ""] || 0);
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (user) {
        const body: any = { name: form.name, email: form.email, role: form.role, isActive: form.isActive };
        if (form.password) body.password = form.password;
        return crmFetch(`/api/crm/users/${user.id}`, { method: "PATCH", body: JSON.stringify(body) });
      }
      return crmFetch("/api/crm/users", { method: "POST", body: JSON.stringify(form) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: q => String(q.queryKey[0]).includes("/api/crm/users") });
      toast({ title: user ? "User updated" : "User created" });
      onClose();
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-3">
      <Input data-testid="input-user-name" placeholder="Full name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      <Input data-testid="input-user-email" placeholder="Email *" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <Input data-testid="input-user-password" placeholder={user ? "New password (leave blank to keep)" : "Password *"} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
        <SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger>
        <SelectContent>
          {availableRoles.map(r => <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-2">
        <Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} data-testid="switch-user-active" />
        <Label>Active</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} data-testid="button-cancel-user">Cancel</Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={!form.name || !form.email || (!user && !form.password) || mutation.isPending}
          data-testid="button-save-user"
        >
          {mutation.isPending ? "Saving..." : user ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

export default function CrmUsersPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<CrmUserSafe | undefined>();
  const currentUser = getCrmUser();

  const { data: users = [], isLoading } = useQuery<CrmUserSafe[]>({
    queryKey: ["/api/crm/users"],
    queryFn: () => crmFetch("/api/crm/users"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmFetch(`/api/crm/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: q => String(q.queryKey[0]).includes("/api/crm/users") });
      toast({ title: "User deleted" });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (!currentUser || (currentUser.role !== "super_admin" && currentUser.role !== "admin")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-sm mb-4">You need admin or super admin access to manage users.</p>
            <Button onClick={() => setLocation("/crm")} data-testid="button-back-crm">Go to CRM</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/crm")} data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-users-title">User Management</h1>
              <p className="text-muted-foreground text-sm">Manage CRM users and their permissions</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditUser(undefined); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user"><Plus className="w-4 h-4 mr-1" /> Add User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editUser ? "Edit User" : "New User"}</DialogTitle></DialogHeader>
              <UserForm user={editUser} onClose={() => { setDialogOpen(false); setEditUser(undefined); }} />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> CRM Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No users found.</p>
            ) : (
              <div className="space-y-2">
                {users.map(user => (
                  <div key={user.id} className="flex items-center justify-between gap-3 p-3 rounded-md border flex-wrap" data-testid={`row-user-${user.id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium" data-testid={`text-user-name-${user.id}`}>{user.name}</span>
                        <Badge className={`no-default-hover-elevate no-default-active-elevate ${roleColors[user.role] || ""}`} variant="secondary">
                          {roleLabels[user.role] || user.role}
                        </Badge>
                        {!user.isActive && (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-muted text-muted-foreground">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                      {user.lastLoginAt && <p className="text-xs text-muted-foreground">Last login: {new Date(user.lastLoginAt).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {user.id !== currentUser?.id && user.role !== "super_admin" && (
                        <>
                          <Button size="icon" variant="ghost" data-testid={`button-edit-user-${user.id}`}
                            onClick={() => { setEditUser(user); setDialogOpen(true); }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {currentUser?.role === "super_admin" && (
                            <Button size="icon" variant="ghost" data-testid={`button-delete-user-${user.id}`}
                              onClick={() => deleteMutation.mutate(user.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Permission Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="pb-2 pr-4">Permission</th>
                    {ROLES.map(r => <th key={r} className="pb-2 px-2 text-center">{roleLabels[r]}</th>)}
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    { label: "View CRM data", perms: [true, true, true, true] },
                    { label: "Create contacts/deals", perms: [true, true, true, false] },
                    { label: "Edit contacts/deals", perms: [true, true, true, false] },
                    { label: "Delete contacts/deals", perms: [true, true, false, false] },
                    { label: "Log activities", perms: [true, true, true, true] },
                    { label: "Manage users", perms: [true, true, false, false] },
                    { label: "Delete users", perms: [true, false, false, false] },
                  ].map(row => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.label}</td>
                      {row.perms.map((has, i) => (
                        <td key={i} className="py-2 px-2 text-center">{has ? "Yes" : "-"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
