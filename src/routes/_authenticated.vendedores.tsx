import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { dt } from "@/lib/format";
import { inviteSignupUrl } from "@/lib/invite-links";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  head: () => ({ meta: [{ title: "Vendedores — 2AVendas" }] }),
  component: SellersPage,
});

interface Seller {
  user_id: string;
  full_name: string | null;
  email: string | null;
  customer_count: number;
}

interface SellerInvitation {
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
  const [invites, setInvites] = useState<SellerInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!organization?.id) return;
    setLoading(true);
    const { data: rs, error } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("organization_id", organization.id)
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
        .eq("organization_id", organization.id)
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
      .eq("organization_id", organization.id)
      .eq("purpose", "seller_signup")
      .order("created_at", { ascending: false });
    setInvites((inv as SellerInvitation[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!organization?.id || !menu.vendedores || role !== "admin") return;
    void load();
  }, [organization?.id, menu.vendedores, role]);

  const inviteSeller = async () => {
    if (!email.trim()) return toast.error("Informe um e-mail");
    if (!organization) {
      toast.error(
        "Organização não carregada. Recarregue a página ou aguarde o painel terminar de carregar.",
      );
      return;
    }
    if (!user) {
      toast.error("Sessão inválida. Faça login novamente.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("seller_invitations").insert({
        organization_id: organization.id,
        invited_by: user.id,
        email: email.trim().toLowerCase(),
        purpose: "seller_signup",
      });
      if (error) {
        toast.error(userFacingDataError(error));
        return;
      }
      toast.success("Convite de vendedor criado com sucesso.");
      setEmail("");
      setOpen(false);
      await load();
    } catch (e) {
      console.error("[vendedores] inviteSeller", e);
      toast.error(e instanceof Error ? e.message : "Erro inesperado ao criar o convite.");
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("seller_invitations").delete().eq("id", id);
    if (error) {
      toast.error(userFacingDataError(error));
      return;
    }
    toast.success("Convite revogado.");
    await load();
  };

  const copyToClipboard = (text: string, message = "Link copiado") => {
    navigator.clipboard.writeText(text);
    toast.success(message);
  };

  if (role !== "admin") {
    return (
      <div className="p-6 lg:p-10 space-y-6">
        <PageHeader
          title="Vendedores"
          description="Somente administradores gerenciam a equipe de vendedores aqui. Para convidar clientes ao catálogo, use a página Clientes e o botão Convidar cliente."
        />
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Convites para <strong className="text-foreground">clientes</strong> ficam em{" "}
            <strong className="text-foreground">Clientes</strong>.
          </p>
          <Button asChild>
            <Link to="/clientes">Ir para Clientes</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8">
      <PageHeader
        title="Vendedores"
        description="Representantes da sua empresa: equipe ativa e convites para novos vendedores. A carteira de clientes B2B está na página Clientes."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Convidar vendedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar vendedor</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label>E-mail do representante</Label>
                  <Input
                    type="email"
                    placeholder="representante@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    O convidado abre o link e cria conta para entrar como vendedor da sua organização.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={inviteSeller}
                  disabled={saving}
                  className="inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Gerando…" : "Gerar link"}
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
                  <TableHead className="text-right">Clientes na carteira</TableHead>
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
          Convites para vendedores
        </h2>
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {invites.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum convite de vendedor pendente.
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
                        <Badge
                          variant={
                            accepted ? "default" : expired ? "destructive" : "secondary"
                          }
                        >
                          {accepted ? "Aceito" : expired ? "Expirado" : "Pendente"}
                        </Badge>
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
                              title="Copiar link de cadastro"
                              onClick={() =>
                                copyToClipboard(inviteSignupUrl(i.token), "Link copiado")
                              }
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
