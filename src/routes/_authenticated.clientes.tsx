import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Loader2,
  Search,
  ShoppingBag,
  UsersRound,
  UserPlus,
  Copy,
  LogIn,
  Trash2,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { brl, dt } from "@/lib/format";
import { invitePortalLoginUrl, inviteSignupUrl } from "@/lib/invite-links";
import { copyTextToClipboard } from "@/lib/clipboard";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";
import { downloadCsv } from "@/lib/csv-download";
import { SavedViewsBar } from "@/components/SavedViewsBar";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — 2AVendas" }] }),
  component: CustomersPage,
});

interface Customer {
  id: string;
  name: string;
  legal_name: string | null;
  industry: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  assigned_seller_id: string | null;
}
interface SellerOpt {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface CustomerOrderRow {
  id: string;
  order_number: number;
  status: string;
  total: number;
  created_at: string;
}

interface ClientInvitation {
  id: string;
  email: string;
  token: string;
  purpose: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

const orderStatusPt: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  faturado: "Faturado",
  cancelado: "Cancelado",
};

const empty: Omit<Customer, "id"> = {
  name: "",
  legal_name: "",
  industry: "",
  email: "",
  phone: "",
  document: "",
  city: "",
  state: "",
  notes: "",
  assigned_seller_id: null,
};

function CustomersPage() {
  useMenuGate("clientes");
  const { organization, role, user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sellers, setSellers] = useState<SellerOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Omit<Customer, "id">>(empty);
  const [saving, setSaving] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [ufFilter, setUfFilter] = useState("__all__");
  const [industryFilter, setIndustryFilter] = useState("__all__");
  const [sellerFilter, setSellerFilter] = useState("__all__");
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyOrders, setHistoryOrders] = useState<CustomerOrderRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [clientInvites, setClientInvites] = useState<ClientInvitation[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSaving, setInviteSaving] = useState(false);
  const isAdmin = role === "admin";

  const distinctStates = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) {
      const u = (c.state ?? "").trim().toUpperCase();
      if (u) set.add(u);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const distinctIndustries = useMemo(() => {
    const set = new Set<string>();
    for (const c of customers) {
      const ind = c.industry?.trim();
      if (ind) set.add(ind);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let rows = customers;
    const q = clientSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) => {
        const hay = [
          c.name,
          c.legal_name ?? "",
          c.email ?? "",
          c.phone ?? "",
          c.document ?? "",
          c.city ?? "",
          c.state ?? "",
          c.industry ?? "",
          c.notes ?? "",
        ]
          .join("\n")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    if (ufFilter !== "__all__") {
      rows = rows.filter((c) => (c.state ?? "").trim().toUpperCase() === ufFilter);
    }
    if (industryFilter !== "__all__") {
      if (industryFilter === "__none__") rows = rows.filter((c) => !c.industry?.trim());
      else rows = rows.filter((c) => (c.industry?.trim() ?? "") === industryFilter);
    }
    if (isAdmin && sellerFilter !== "__all__") {
      if (sellerFilter === "__none__") rows = rows.filter((c) => !c.assigned_seller_id);
      else rows = rows.filter((c) => c.assigned_seller_id === sellerFilter);
    }
    return rows;
  }, [customers, clientSearch, ufFilter, industryFilter, sellerFilter, isAdmin]);

  const exportClientsCsv = () => {
    downloadCsv(
      `clientes-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Nome", "Razao_social", "Email", "Telefone", "Documento", "Cidade", "UF", "Industria", "Notas"],
      filteredCustomers.map((c) => [
        c.name,
        c.legal_name ?? "",
        c.email ?? "",
        c.phone ?? "",
        c.document ?? "",
        c.city ?? "",
        c.state ?? "",
        c.industry ?? "",
        (c.notes ?? "").replace(/\s+/g, " ").slice(0, 500),
      ]),
    );
    toast.success("CSV exportado.");
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select(
        "id,name,legal_name,industry,email,phone,document,city,state,notes,assigned_seller_id",
      )
      .order("name");
    if (error) toast.error(userFacingDataError(error));
    setCustomers((data as Customer[]) ?? []);

    if (organization?.id) {
      const { data: inv } = await supabase
        .from("seller_invitations")
        .select("id,email,token,purpose,accepted_at,expires_at,created_at")
        .eq("organization_id", organization.id)
        .eq("purpose", "client_catalog")
        .order("created_at", { ascending: false });
      setClientInvites((inv as ClientInvitation[]) ?? []);
    } else {
      setClientInvites([]);
    }

    if (isAdmin && organization?.id) {
      const { data: rs } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", organization.id)
        .eq("role", "vendedor");
      const ids = (rs ?? []).map((r: { user_id: string }) => r.user_id);
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        const list: SellerOpt[] = (profs ?? []).map(
          (p: { id: string; full_name: string | null; email: string | null }) => ({
            user_id: p.id,
            full_name: p.full_name,
            email: p.email,
          }),
        );
        setSellers(list);
      } else {
        setSellers([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [isAdmin, organization?.id]);

  useEffect(() => {
    if (!historyCustomer) {
      setHistoryOrders([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      let q = supabase
        .from("orders")
        .select("id,order_number,status,total,created_at")
        .eq("customer_id", historyCustomer.id)
        .order("created_at", { ascending: false });
      if (role === "vendedor" && user?.id) {
        q = q.eq("seller_id", user.id);
      }
      const { data, error } = await q;
      if (cancelled) return;
      setHistoryLoading(false);
      if (error) {
        toast.error(userFacingDataError(error));
        setHistoryOrders([]);
      } else {
        setHistoryOrders((data as CustomerOrderRow[]) ?? []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyCustomer, role, user?.id]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, assigned_seller_id: isAdmin ? null : (user?.id ?? null) });
    setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    const { id: _id, ...rest } = c;
    setForm(rest);
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }
    if (!form.legal_name?.trim()) {
      toast.error("Razão social é obrigatória");
      return;
    }
    if (!organization) {
      toast.error(
        "Organização não carregada. Aguarde alguns segundos e tente de novo, ou recarregue a página.",
      );
      return;
    }
    if (!user) {
      toast.error("Sessão inválida. Faça login novamente.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        legal_name: form.legal_name?.trim() || null,
        industry: form.industry?.trim() || null,
        email: form.email || null,
        phone: form.phone || null,
        document: form.document || null,
        city: form.city || null,
        state: form.state || null,
        notes: form.notes || null,
        assigned_seller_id: isAdmin ? form.assigned_seller_id : user.id,
      };
      const { error } = editing
        ? await supabase.from("customers").update(payload).eq("id", editing.id)
        : await supabase
            .from("customers")
            .insert({ ...payload, organization_id: organization.id });
      if (error) {
        toast.error(userFacingDataError(error));
        return;
      }
      toast.success(editing ? "Cliente atualizado com sucesso." : "Cliente criado com sucesso.");
      setOpen(false);
      await load();
    } catch (e) {
      console.error("[clientes] save", e);
      toast.error(e instanceof Error ? e.message : "Erro inesperado ao salvar o cliente.");
    } finally {
      setSaving(false);
    }
  };

  const sellerLabel = (id: string | null) => {
    const s = sellers.find((x) => x.user_id === id);
    return s ? (s.full_name ?? s.email ?? "—") : "—";
  };

  const inviteClient = async () => {
    if (!inviteEmail.trim()) return toast.error("Informe um e-mail");
    if (!organization) {
      toast.error(
        "Organização não carregada. Aguarde alguns segundos e recarregue se precisar.",
      );
      return;
    }
    if (!user) {
      toast.error("Sessão inválida. Faça login novamente.");
      return;
    }
    setInviteSaving(true);
    try {
      const { error } = await supabase.from("seller_invitations").insert({
        organization_id: organization.id,
        invited_by: user.id,
        email: inviteEmail.trim().toLowerCase(),
        purpose: "client_catalog",
      });
      if (error) {
        toast.error(userFacingDataError(error));
        return;
      }
      toast.success("Convite para cliente criado com sucesso.");
      setInviteEmail("");
      setInviteOpen(false);
      await load();
    } catch (e) {
      console.error("[clientes] inviteClient", e);
      toast.error(e instanceof Error ? e.message : "Erro ao criar convite.");
    } finally {
      setInviteSaving(false);
    }
  };

  const revokeClientInvite = async (id: string) => {
    const { error } = await supabase.from("seller_invitations").delete().eq("id", id);
    if (error) {
      toast.error(userFacingDataError(error));
      return;
    }
    toast.success("Convite revogado.");
    await load();
  };

  const copyInvite = async (text: string, message: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) toast.success(message);
    else toast.error("Não foi possível copiar. Use HTTPS ou copie o link manualmente.");
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader
        title="Clientes"
        description={
          isAdmin
            ? "Carteira B2B da representação: cadastro manual, convites ao catálogo e filtros por UF, indústria e vendedor. Novos representantes ficam em Vendedores."
            : "Sua carteira de clientes e convites ao catálogo. Cadastre empresas ou envie link para o cliente acessar seus produtos."
        }
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary">
                  <UserPlus className="h-4 w-4" /> Convidar cliente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar cliente</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>E-mail do cliente</Label>
                    <Input
                      type="email"
                      placeholder="cliente@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Gera um link para o cliente acessar o catálogo da sua representação. Quem ainda não tem conta usa o link de cadastro;
                      quem já usa o 2AVendas pode usar o link para quem já tem conta.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setInviteOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void inviteClient()}
                    disabled={inviteSaving}
                    className="inline-flex items-center gap-2"
                  >
                    {inviteSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {inviteSaving ? "Gerando…" : "Gerar convite"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4" /> Novo cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <Tabs defaultValue="identificacao" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="identificacao">Identificação</TabsTrigger>
                    <TabsTrigger value="industria">Indústria</TabsTrigger>
                  </TabsList>
                  <TabsContent value="identificacao" className="space-y-4 pt-3 outline-none">
                    <div className="grid gap-2">
                      <Label>Nome da empresa (nome fantasia) *</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Como o cliente prefere ser identificado"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Razão social *</Label>
                      <Input
                        value={form.legal_name ?? ""}
                        onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                        placeholder="Denominação jurídica"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>E-mail</Label>
                        <Input
                          type="email"
                          value={form.email ?? ""}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Telefone</Label>
                        <Input
                          value={form.phone ?? ""}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>CNPJ/CPF</Label>
                        <Input
                          value={form.document ?? ""}
                          onChange={(e) => setForm({ ...form, document: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2 grid-cols-3 col-span-1">
                        <div className="col-span-2 grid gap-2">
                          <Label>Cidade</Label>
                          <Input
                            value={form.city ?? ""}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>UF</Label>
                          <Input
                            maxLength={2}
                            value={form.state ?? ""}
                            onChange={(e) =>
                              setForm({ ...form, state: e.target.value.toUpperCase() })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="grid gap-2">
                        <Label>Vendedor responsável</Label>
                        <Select
                          value={form.assigned_seller_id ?? "none"}
                          onValueChange={(v) =>
                            setForm({
                              ...form,
                              assigned_seller_id: v === "none" ? null : v,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem vendedor</SelectItem>
                            {sellers.map((s) => (
                              <SelectItem key={s.user_id} value={s.user_id}>
                                {s.full_name ?? s.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label>Observações</Label>
                      <Textarea
                        value={form.notes ?? ""}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="industria" className="space-y-3 pt-3 outline-none">
                    <div className="grid gap-2">
                      <Label>Segmento ou indústria</Label>
                      <Input
                        value={form.industry ?? ""}
                        onChange={(e) => setForm({ ...form, industry: e.target.value })}
                        placeholder="Ex.: agronegócio, cosméticos, TI corporativo…"
                      />
                      <p className="text-xs text-muted-foreground">
                        Opcional. Visível na carteira para contextualizar o cliente.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Convites para clientes
        </h2>
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {clientInvites.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nenhum convite de cliente gerado ainda. Use <strong className="text-foreground">Convidar cliente</strong>{" "}
              acima.
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
                {clientInvites.map((i) => {
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
                      <TableCell className="text-muted-foreground">{dt(i.expires_at)}</TableCell>
                      <TableCell className="text-right">
                        {!accepted && (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Copiar link — cliente novo (cadastro)"
                              onClick={() =>
                                void copyInvite(inviteSignupUrl(i.token), "Link de cadastro copiado")
                              }
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Copiar link — cliente que já tem conta"
                              onClick={() =>
                                void copyInvite(
                                  invitePortalLoginUrl(i.token),
                                  "Link para quem já tem conta copiado",
                                )
                              }
                            >
                              <LogIn className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void revokeClientInvite(i.id)}
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

      {!loading ? (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4 lg:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-end">
            <div className="relative min-w-[min(100%,280px)] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Buscar nome, razão social, e-mail, telefone, documento, cidade…"
                className="h-10 pl-9"
              />
            </div>
            <div className="grid gap-1.5 min-w-[140px]">
              <span className="text-xs font-medium text-muted-foreground">UF</span>
              <Select value={ufFilter} onValueChange={setUfFilter}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {distinctStates.map((uf) => (
                    <SelectItem key={uf} value={uf}>
                      {uf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5 min-w-[180px]">
              <span className="text-xs font-medium text-muted-foreground">Indústria</span>
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue placeholder="Indústria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  <SelectItem value="__none__">Sem indústria</SelectItem>
                  {distinctIndustries.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isAdmin && (
              <div className="grid gap-1.5 min-w-[200px]">
                <span className="text-xs font-medium text-muted-foreground">Vendedor</span>
                <Select value={sellerFilter} onValueChange={setSellerFilter}>
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    <SelectItem value="__none__">Sem vendedor</SelectItem>
                    {sellers.map((s) => (
                      <SelectItem key={s.user_id} value={s.user_id}>
                        {s.full_name ?? s.email ?? s.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {organization?.id && user?.id ? (
                <>
                  <SavedViewsBar<{
                    clientSearch: string;
                    ufFilter: string;
                    industryFilter: string;
                    sellerFilter: string;
                  }>
                    pageKey="clientes"
                    userId={user.id}
                    orgId={organization.id}
                    snapshot={{ clientSearch, ufFilter, industryFilter, sellerFilter }}
                    onApply={(p) => {
                      setClientSearch(p.clientSearch);
                      setUfFilter(p.ufFilter);
                      setIndustryFilter(p.industryFilter);
                      setSellerFilter(p.sellerFilter);
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" className="gap-1 h-9" onClick={exportClientsCsv}>
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </>
              ) : null}
              {(clientSearch.trim() !== "" ||
                ufFilter !== "__all__" ||
                industryFilter !== "__all__" ||
                (isAdmin && sellerFilter !== "__all__")) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    setClientSearch("");
                    setUfFilter("__all__");
                    setIndustryFilter("__all__");
                    setSellerFilter("__all__");
                  }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Mostrando{" "}
              <strong className="text-foreground">{filteredCustomers.length}</strong>
              {customers.length > 0 ? (
                <>
                  {" "}
                  de {customers.length} cliente{customers.length !== 1 ? "s" : ""}
                </>
              ) : null}
            </p>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <UsersRound className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Nenhum cliente cadastrado.
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <UsersRound className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Nenhum cliente corresponde aos filtros.
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setClientSearch("");
                  setUfFilter("__all__");
                  setIndustryFilter("__all__");
                  setSellerFilter("__all__");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade/UF</TableHead>
                {isAdmin && <TableHead>Vendedor</TableHead>}
                <TableHead className="text-right w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-medium">{c.name}</div>
                    {c.legal_name?.trim() ? (
                      <div className="text-xs text-muted-foreground">RS: {c.legal_name}</div>
                    ) : null}
                    {c.industry?.trim() ? (
                      <div className="text-xs text-muted-foreground/90">{c.industry.trim()}</div>
                    ) : null}
                    {c.document && (
                      <div className="text-xs text-muted-foreground">{c.document}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div>{c.email ?? "—"}</div>
                    <div className="text-xs">{c.phone ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.city ? `${c.city}${c.state ? "/" + c.state : ""}` : "—"}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-muted-foreground">
                      {sellerLabel(c.assigned_seller_id)}
                    </TableCell>
                  )}
                  <TableCell className="text-right space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      title="Histórico de pedidos"
                      onClick={() => setHistoryCustomer(c)}
                    >
                      <ShoppingBag className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Sheet open={historyCustomer !== null} onOpenChange={(o) => !o && setHistoryCustomer(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Pedidos — {historyCustomer?.name ?? ""}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {historyLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : historyOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido encontrado para este cliente.</p>
            ) : (
              <ul className="space-y-3">
                {historyOrders.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-medium">
                        #{String(o.order_number).padStart(4, "0")}
                      </span>
                      <span className="text-xs text-muted-foreground">{dt(o.created_at)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {orderStatusPt[o.status] ?? o.status}
                      </span>
                      <span className="font-semibold">{brl(o.total)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
