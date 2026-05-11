import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { dt } from "@/lib/format";
import { inviteExpiryLabel, inviteExpiresAtStillValid } from "@/lib/invite-expiry";
import { inviteSignupUrl } from "@/lib/invite-links";
import { copyTextToClipboard } from "@/lib/clipboard";
import { formatPct, parseCommissionPctInput } from "@/lib/commission";
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
import { Plus, Loader2, UserCog, Copy, Trash2, Pencil } from "lucide-react";
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
  commission_pct: number;
}

interface SellerInvitation {
  id: string;
  email: string;
  token: string;
  purpose: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
  default_commission_pct: number | null;
}

function SellersPage() {
  useMenuGate("vendedores");
  const { organization, user, menu, role } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [invites, setInvites] = useState<SellerInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteCommissionPct, setInviteCommissionPct] = useState("5");
  const [saving, setSaving] = useState(false);
  const [editSeller, setEditSeller] = useState<Seller | null>(null);
  const [editPctDraft, setEditPctDraft] = useState("");
  const [savingPct, setSavingPct] = useState(false);

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

    const pctBySeller: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: commRows, error: ce } = await supabase
        .from("organization_seller_commissions")
        .select("seller_user_id, commission_pct")
        .eq("organization_id", organization.id)
        .in("seller_user_id", ids);
      if (ce && import.meta.env.DEV) console.warn("[vendedores] commissions", ce.message);
      for (const row of commRows ?? []) {
        const r = row as { seller_user_id: string; commission_pct: number };
        pctBySeller[r.seller_user_id] = Number(r.commission_pct) || 0;
      }
    }

    setSellers(
      ids.map((uid) => ({
        user_id: uid,
        full_name: profilesMap[uid]?.full_name ?? null,
        email: profilesMap[uid]?.email ?? null,
        customer_count: counts[uid] ?? 0,
        commission_pct: pctBySeller[uid] ?? 0,
      })),
    );

    const { data: inv } = await supabase
      .from("seller_invitations")
      .select(
        "id,email,token,purpose,accepted_at,expires_at,created_at,default_commission_pct",
      )
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
    const pct = parseCommissionPctInput(inviteCommissionPct);
    if (pct === null) return toast.error("Informe um percentual de comissão válido (0 a 100).");
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
        default_commission_pct: pct,
      });
      if (error) {
        toast.error(userFacingDataError(error));
        return;
      }
      toast.success("Convite de vendedor criado com sucesso.");
      setEmail("");
      setInviteCommissionPct("5");
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

  const copyToClipboard = async (text: string, message = "Link copiado") => {
    const ok = await copyTextToClipboard(text);
    if (ok) toast.success(message);
    else toast.error("Não foi possível copiar. Use HTTPS ou copie o link manualmente.");
  };

  const openEditCommission = (s: Seller) => {
    setEditSeller(s);
    setEditPctDraft(String(s.commission_pct));
  };

  const saveCommission = async () => {
    if (!organization || !editSeller) return;
    const pct = parseCommissionPctInput(editPctDraft);
    if (pct === null) {
      toast.error("Percentual inválido (use 0 a 100).");
      return;
    }
    setSavingPct(true);
    try {
      const { error } = await supabase.from("organization_seller_commissions").upsert(
        {
          organization_id: organization.id,
          seller_user_id: editSeller.user_id,
          commission_pct: pct,
        },
        { onConflict: "organization_id,seller_user_id" },
      );
      if (error) {
        toast.error(userFacingDataError(error));
        return;
      }
      toast.success("Comissão atualizada.");
      setEditSeller(null);
      await load();
    } finally {
      setSavingPct(false);
    }
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
        description="Representantes da sua empresa: comissão sobre o total de cada pedido (%), equipe ativa e convites. A carteira de clientes B2B está na página Clientes."
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
                <div className="grid gap-2">
                  <Label>Comissão inicial (% sobre o pedido)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex.: 5 ou 7,5"
                    value={inviteCommissionPct}
                    onChange={(e) => setInviteCommissionPct(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Aplicada automaticamente quando o convite for aceito. Você pode alterar depois na tabela da equipe.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => void inviteSeller()}
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

      <Dialog open={editSeller !== null} onOpenChange={(o) => !o && setEditSeller(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comissão do vendedor</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {editSeller?.full_name ?? editSeller?.email ?? "Vendedor"} — percentual sobre o{" "}
            <strong className="text-foreground">total</strong> de cada pedido (valor líquido registrado no pedido).
          </p>
          <div className="grid gap-2 py-2">
            <Label>Comissão (%)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={editPctDraft}
              onChange={(e) => setEditPctDraft(e.target.value)}
              placeholder="0 a 100"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSeller(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void saveCommission()}
              disabled={savingPct}
              className="inline-flex items-center gap-2"
            >
              {savingPct && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Clientes na carteira</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((s) => (
                  <TableRow key={s.user_id}>
                    <TableCell className="font-medium">
                      {s.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.email}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPct(s.commission_pct)}
                    </TableCell>
                    <TableCell className="text-right">{s.customer_count}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        title="Alterar comissão"
                        onClick={() => openEditCommission(s)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
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
                  <TableHead className="text-right">Comissão inicial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((i) => {
                  const accepted = !!i.accepted_at;
                  const expired = !accepted && !inviteExpiresAtStillValid(i.expires_at);
                  const pct =
                    i.default_commission_pct != null ? Number(i.default_commission_pct) : 5;
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.email}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatPct(pct)}
                      </TableCell>
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
                        {inviteExpiryLabel(i.expires_at, dt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!accepted && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Copiar link de cadastro"
                              onClick={() =>
                                void copyToClipboard(inviteSignupUrl(i.token), "Link copiado")
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void revoke(i.id)}
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
