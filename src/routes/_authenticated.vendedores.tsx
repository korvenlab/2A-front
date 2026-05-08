import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { dt } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Loader2, UserCog, Copy, Trash2 } from "lucide-react";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";

export const Route = createFileRoute("/_authenticated/vendedores")({
  head: () => ({ meta: [{ title: "Gerar link de produtos — 2AVendas" }] }),
  component: SellersPage,
});

interface Seller {
  user_id: string;
  full_name: string | null;
  email: string | null;
  customer_count: number;
}
interface Invitation {
  id: string;
  email: string;
  token: string;
  purpose: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

function SellersPage() {
  useMenuGate("vendedores");
  const { organization, user, menu, role } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [invitePurpose, setInvitePurpose] = useState<"client_catalog" | "seller_signup">("client_catalog");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: rs, error } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "vendedor");
    if (error) toast.error(userFacingDataError(error));

    const ids = (rs ?? []).map((r: { user_id: string }) => r.user_id);
    const profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      (profs ?? []).forEach(
        (p: { id: string; full_name: string | null; email: string | null }) => {
          profilesMap[p.id] = { full_name: p.full_name, email: p.email };
        },
      );
    }

    const counts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: cs } = await supabase
        .from("customers")
        .select("assigned_seller_id")
        .in("assigned_seller_id", ids);
      (cs ?? []).forEach((c: { assigned_seller_id: string | null }) => {
        if (c.assigned_seller_id)
          counts[c.assigned_seller_id] = (counts[c.assigned_seller_id] ?? 0) + 1;
      });
    }
    setSellers(
      ids.map((uid) => ({
        user_id: uid,
        full_name: profilesMap[uid]?.full_name ?? null,
        email: profilesMap[uid]?.email ?? null,
        customer_count: counts[uid] ?? 0,
      })),
    );

    const { data: inv } = await supabase
      .from("seller_invitations")
      .select("id,email,token,purpose,accepted_at,expires_at,created_at")
      .order("created_at", { ascending: false });
    setInvites((inv as Invitation[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!organization?.id || !menu.vendedores) return;
    void load();
  }, [organization?.id, menu.vendedores]);

  const invite = async () => {
    if (!organization || !user) return;
    if (!email.trim()) return toast.error("Informe um e-mail");
    if (role !== "admin" && invitePurpose === "seller_signup") {
      return toast.error("Somente admin pode criar convite de vendedor.");
    }
    setSaving(true);
    const { error } = await supabase
      .from("seller_invitations")
      .insert({
        organization_id: organization.id,
        invited_by: user.id,
        email: email.trim().toLowerCase(),
        purpose: invitePurpose,
      });
    setSaving(false);
    if (error) return toast.error(userFacingDataError(error));
    toast.success(
      invitePurpose === "seller_signup"
        ? "Convite de representante criado."
        : "Link de produtos criado para cliente.",
    );
    setEmail("");
    setInvitePurpose("client_catalog");
    setOpen(false);
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("seller_invitations").delete().eq("id", id);
    if (error) toast.error(userFacingDataError(error));
    else load();
  };

  const inviteUrl = (token: string, purpose: string) =>
    purpose === "seller_signup"
      ? `${window.location.origin}/signup?invite=${token}`
      : `${window.location.origin}/portal?invite=${token}`;

  const copyInvite = (token: string, purpose: string) => {
    navigator.clipboard.writeText(inviteUrl(token, purpose));
    toast.success("Link copiado");
  };

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <PageHeader
        title="Gerar link de produtos"
        description="Crie links para clientes acessarem o catálogo dos seus representantes."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Gerar link para cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Gerar convite</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Tipo de convite</Label>
                  <Select
                    value={invitePurpose}
                    onValueChange={(v) =>
                      setInvitePurpose(v as "client_catalog" | "seller_signup")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_catalog">Cliente (link de produtos)</SelectItem>
                      {role === "admin" && (
                        <SelectItem value="seller_signup">
                          Representante (acesso vendedor)
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>
                    {invitePurpose === "seller_signup"
                      ? "E-mail do representante"
                      : "E-mail do cliente"}
                  </Label>
                  <Input
                    type="email"
                    placeholder={
                      invitePurpose === "seller_signup"
                        ? "representante@exemplo.com"
                        : "cliente@exemplo.com"
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {invitePurpose === "seller_signup"
                      ? "O representante deve abrir o link e criar conta para entrar como vendedor."
                      : "O cliente deve fazer login e abrir este link para ver os produtos do representante."}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={invite} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Gerar link
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Equipe ativa
        </h2>
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sellers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <UserCog className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Ainda não há vendedores na equipe.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="text-right">Clientes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((s) => (
                  <TableRow key={s.user_id}>
                    <TableCell className="font-medium">
                      {s.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell className="text-right">{s.customer_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Convites e links
        </h2>
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {invites.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum convite pendente.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((i) => {
                  const accepted = !!i.accepted_at;
                  const expired = !accepted && new Date(i.expires_at) < new Date();
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={i.purpose === "seller_signup" ? "default" : "secondary"}>
                            {i.purpose === "seller_signup" ? "Representante" : "Cliente"}
                          </Badge>
                          <Badge
                            variant={
                              accepted ? "default" : expired ? "destructive" : "secondary"
                            }
                          >
                            {accepted ? "Aceito" : expired ? "Expirado" : "Pendente"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dt(i.expires_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!accepted && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyInvite(i.token, i.purpose)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => revoke(i.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
