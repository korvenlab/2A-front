import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppPage, AppTableCard } from "@/components/layout/AppPage";
import { ListPageSearch } from "@/components/ListPageSearch";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
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
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Loader2,
  ShoppingBag,
  UsersRound,
  Copy,
  Trash2,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { brl, dt } from "@/lib/format";
import {
  inviteSignupUrl,
  UNIVERSAL_CLIENT_INVITE_EMAIL,
} from "@/lib/invite-links";
import { copyTextToClipboard } from "@/lib/clipboard";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";
import { downloadCsv } from "@/lib/csv-download";
import { SavedViewsBar } from "@/components/SavedViewsBar";
import {
  fetchOrderItemsByOrderIds,
  fetchOrderTotalsFallback,
  repLabelForSellerId,
  type OrderItemLineSummary,
} from "@/lib/order-display";
import { moneyNumber } from "@/lib/format";
import { matchesFieldsSearch } from "@/lib/text-search";
import { formatCep, formatCnpj, formatCnpjOrCpf, isCnpjComplete } from "@/lib/document-masks";
import { lookupCnpj, type CnpjLookupResult } from "@/lib/cnpj-lookup";
import { joinStreetAndDistrict } from "@/lib/address-format";
import { AddressCepFields, type AddressCepValues } from "@/components/forms/AddressCepFields";

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
  address: string | null;
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
  items: OrderItemLineSummary[];
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
  address: "",
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
  const [primaryAdminUserId, setPrimaryAdminUserId] = useState<string | null>(null);
  const [sellerProfiles, setSellerProfiles] = useState<
    Record<string, { full_name: string | null; email: string | null }>
  >({});
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
  const [universalClientInvite, setUniversalClientInvite] = useState<ClientInvitation | null>(null);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [postalCode, setPostalCode] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [documentLookupLoading, setDocumentLookupLoading] = useState(false);
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
    if (clientSearch.trim()) {
      rows = rows.filter((c) =>
        matchesFieldsSearch(
          [
            c.name,
            c.legal_name,
            c.email,
            c.phone,
            c.document,
            c.address,
            c.city,
            c.state,
            c.industry,
            c.notes,
          ],
          clientSearch,
        ),
      );
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
    if (!organization?.id) {
      setCustomers([]);
      setSellers([]);
      setUniversalClientInvite(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("customers")
      .select(
        "id,name,legal_name,industry,email,phone,document,address,city,state,notes,assigned_seller_id",
      )
      .eq("organization_id", organization.id)
      .order("name");
    if (error) toast.error(userFacingDataError(error));
    setCustomers((data as Customer[]) ?? []);

    const { data: inv } = await supabase
      .from("seller_invitations")
      .select("id,email,token,purpose,accepted_at,expires_at,created_at")
      .eq("organization_id", organization.id)
      .eq("purpose", "client_catalog")
      .order("created_at", { ascending: false });
    const universal =
      ((inv as ClientInvitation[] | null) ?? []).find(
        (x) =>
          x.purpose === "client_catalog" &&
          x.email.trim().toLowerCase() === UNIVERSAL_CLIENT_INVITE_EMAIL,
      ) ?? null;
    setUniversalClientInvite(universal);

    if (organization?.id) {
      const { data: adminId } = await supabase.rpc("organization_primary_admin_user_id", {
        p_org_id: organization.id,
      });
      setPrimaryAdminUserId((adminId as string | null) ?? null);

      const profileIds = new Set<string>();
      for (const c of (data as Customer[]) ?? []) {
        if (c.assigned_seller_id) profileIds.add(c.assigned_seller_id);
      }
      if (adminId) profileIds.add(adminId as string);

      if (isAdmin) {
        const { data: rs } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("organization_id", organization.id)
          .eq("role", "vendedor");
        const ids = (rs ?? []).map((r: { user_id: string }) => r.user_id);
        for (const id of ids) profileIds.add(id);
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
      } else if (user?.id) {
        profileIds.add(user.id);
        setSellers([]);
      }

      if (profileIds.size > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name,email")
          .in("id", [...profileIds]);
        const map: Record<string, { full_name: string | null; email: string | null }> = {};
        for (const p of profs ?? []) {
          const row = p as { id: string; full_name: string | null; email: string | null };
          map[row.id] = { full_name: row.full_name, email: row.email };
        }
        setSellerProfiles(map);
      } else {
        setSellerProfiles({});
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
        const rows = (data as Omit<CustomerOrderRow, "items">[]) ?? [];
        const zeroIds = rows.filter((o) => moneyNumber(o.total) <= 0).map((o) => o.id);
        const [totalsFallback, itemsByOrder] = await Promise.all([
          fetchOrderTotalsFallback(supabase, zeroIds),
          fetchOrderItemsByOrderIds(
            supabase,
            rows.map((o) => o.id),
          ),
        ]);
        setHistoryOrders(
          rows.map((o) => ({
            ...o,
            total:
              moneyNumber(o.total) > 0
                ? moneyNumber(o.total)
                : moneyNumber(totalsFallback[o.id] ?? 0),
            items: itemsByOrder[o.id] ?? [],
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyCustomer, role, user?.id]);

  const resetAddressAux = () => {
    setPostalCode("");
    setAddressDistrict("");
  };

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, assigned_seller_id: user?.id ?? null });
    resetAddressAux();
    setOpen(true);
  };
  const openEdit = (c: Customer) => {
    setEditing(c);
    const { id: _id, ...rest } = c;
    setForm(rest);
    resetAddressAux();
    setOpen(true);
  };

  const handleCnpjLookup = (data: CnpjLookupResult) => {
    const streetCore = [data.logradouro, data.numero].filter((p) => p.trim()).join(", ");
    const street = data.complemento.trim()
      ? streetCore
        ? `${streetCore} - ${data.complemento.trim()}`
        : data.complemento.trim()
      : streetCore;
    setForm((x) => ({
      ...x,
      legal_name: data.razaoSocial || x.legal_name,
      name: data.nomeFantasia || data.razaoSocial || x.name,
      city: data.cidade || x.city,
      state: data.uf || x.state,
      phone: data.telefone || x.phone,
      email: data.email || x.email,
      address: street || x.address,
    }));
    if (data.cep) setPostalCode(formatCep(data.cep));
    if (data.bairro.trim()) setAddressDistrict(data.bairro.trim());
  };

  const patchAddress = (patch: Partial<AddressCepValues>) => {
    if (patch.cep !== undefined) setPostalCode(patch.cep);
    if (patch.street !== undefined) setForm((x) => ({ ...x, address: patch.street! }));
    if (patch.district !== undefined) setAddressDistrict(patch.district);
    if (patch.city !== undefined) setForm((x) => ({ ...x, city: patch.city! }));
    if (patch.state !== undefined) setForm((x) => ({ ...x, state: patch.state! }));
  };

  const handleDocumentBlur = async () => {
    if (!isCnpjComplete(form.document ?? "")) return;
    setDocumentLookupLoading(true);
    try {
      const data = await lookupCnpj(form.document ?? "");
      handleCnpjLookup(data);
      toast.success("Dados do CNPJ preenchidos.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao consultar CNPJ.");
    } finally {
      setDocumentLookupLoading(false);
    }
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
        "Não foi possível carregar os dados da empresa. Aguarde um instante ou recarregue a página.",
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
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        document: form.document?.trim() || null,
        address:
          joinStreetAndDistrict(form.address ?? "", addressDistrict).trim() || null,
        city: form.city?.trim() || null,
        state: form.state?.trim().toUpperCase().slice(0, 2) || null,
        notes: form.notes?.trim() || null,
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

  const sellerLabel = (id: string | null) =>
    repLabelForSellerId(id, primaryAdminUserId, sellerProfiles, user?.id);

  const fetchUniversalClientInviteFromDb = async (): Promise<ClientInvitation | null> => {
    if (!organization?.id) return null;
    const { data: rows, error } = await supabase
      .from("seller_invitations")
      .select("id,email,token,purpose,accepted_at,expires_at,created_at")
      .eq("organization_id", organization.id)
      .eq("purpose", "client_catalog");
    if (error) {
      toast.error(userFacingDataError(error));
      return null;
    }
    const list = (rows as ClientInvitation[] | null) ?? [];
    const universal =
      list.find(
        (x) =>
          x.purpose === "client_catalog" &&
          x.email.trim().toLowerCase() === UNIVERSAL_CLIENT_INVITE_EMAIL,
      ) ?? null;
    if (universal) setUniversalClientInvite(universal);
    return universal;
  };

  const ensureUniversalClientInvite = async (): Promise<ClientInvitation | null> => {
    if (!organization) {
      toast.error(
        "Não foi possível carregar os dados da empresa. Aguarde um instante ou recarregue a página.",
      );
      return null;
    }
    if (!user) {
      toast.error("Sessão inválida. Faça login novamente.");
      return null;
    }
    if (universalClientInvite) {
      return universalClientInvite;
    }
    setInviteSaving(true);
    try {
      if (!isAdmin) {
        const fromDb = await fetchUniversalClientInviteFromDb();
        if (fromDb) return fromDb;
        toast.error(
          "O link de cadastro ainda não está ativo. Peça a um administrador da empresa para ativá-lo na área de clientes.",
        );
        return null;
      }

      const { data: created, error } = await supabase
        .from("seller_invitations")
        .insert({
          organization_id: organization.id,
          invited_by: user.id,
          email: UNIVERSAL_CLIENT_INVITE_EMAIL,
          purpose: "client_catalog",
        })
        .select("id,email,token,purpose,accepted_at,expires_at,created_at")
        .single();
      if (error) {
        toast.error(userFacingDataError(error));
        return null;
      }
      const createdInvite = (created as ClientInvitation | null) ?? null;
      setUniversalClientInvite(createdInvite);
      return createdInvite;
    } catch (e) {
      console.error("[clientes] inviteClient", e);
      toast.error(e instanceof Error ? e.message : "Erro ao criar convite.");
      return null;
    } finally {
      setInviteSaving(false);
    }
  };

  const copyInvite = async (text: string, message: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) toast.success(message);
    else toast.error("Não foi possível copiar. Use HTTPS ou copie o link manualmente.");
  };

  const runDeleteCustomer = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm.id;
    setDeletingCustomer(true);
    try {
      const { error } = await supabase.rpc("admin_delete_customer", {
        p_customer_id: id,
      });
      if (error) {
        toast.error(userFacingDataError(error));
        return;
      }
      toast.success("Cliente excluído.");
      setDeleteConfirm(null);
      setHistoryCustomer((h) => (h?.id === id ? null : h));
      await load();
    } finally {
      setDeletingCustomer(false);
    }
  };

  return (
    <AppPage>
      <PageHeader
        title="Clientes"
        description={
          isAdmin
            ? "Cadastre empresas, acompanhe a carteira e compartilhe o link de cadastro com clientes. Filtre por UF, indústria e vendedor."
            : "Cadastre empresas e acompanhe a carteira de clientes da empresa. Use o link de cadastro fornecido pelo administrador quando precisar compartilhá-lo."
        }
        action={
          <div className="flex flex-col items-end gap-2">
            {organization?.slug ? (
              <p className="max-w-md text-right text-[11px] leading-snug text-muted-foreground">
                Endereço do portal B2B desta representação:{" "}
                <span className="font-mono text-foreground/90">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/p/${organization.slug}/portal`
                    : `/p/${organization.slug}/portal`}
                </span>
              </p>
            ) : null}
            <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              disabled={inviteSaving}
              className="gap-2 shadow-sm"
              onClick={async () => {
                const inv = await ensureUniversalClientInvite();
                if (!inv) return;
                await copyInvite(inviteSignupUrl(inv.token), "Link copiado.");
              }}
            >
              {inviteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              Copiar link de cadastro
            </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" onClick={openNew}>
                <Plus className="h-4 w-4" /> Novo cliente
              </Button>
            </DialogTrigger>
            <DialogContent size="form">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
              </DialogHeader>
              <DialogBody className="grid gap-4 py-2">
                <Tabs defaultValue="identificacao" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="identificacao">Identificação</TabsTrigger>
                    <TabsTrigger value="industria">Indústria</TabsTrigger>
                  </TabsList>
                  <TabsContent value="identificacao" className="space-y-4 pt-3 outline-none">
                    <div className="grid gap-2">
                      <Label htmlFor="client-document">CNPJ / CPF</Label>
                      <div className="relative">
                        <Input
                          id="client-document"
                          value={form.document ?? ""}
                          disabled={documentLookupLoading}
                          inputMode="numeric"
                          autoComplete="off"
                          placeholder="00.000.000/0000-00 ou 000.000.000-00"
                          className={documentLookupLoading ? "pr-9" : undefined}
                          onChange={(e) =>
                            setForm({ ...form, document: formatCnpjOrCpf(e.target.value) })
                          }
                          onBlur={() => void handleDocumentBlur()}
                        />
                        {documentLookupLoading ? (
                          <Loader2
                            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                            aria-hidden
                          />
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Com CNPJ completo, ao sair do campo os dados da Receita Federal são
                        preenchidos automaticamente.
                      </p>
                    </div>
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
                    <AddressCepFields
                      values={{
                        cep: postalCode,
                        street: form.address ?? "",
                        district: addressDistrict,
                        city: form.city ?? "",
                        state: form.state ?? "",
                      }}
                      onChange={patchAddress}
                    />
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
                          inputMode="tel"
                        />
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="grid gap-2">
                        <Label>Vendedor responsável</Label>
                        <Select
                          value={form.assigned_seller_id ?? user?.id ?? ""}
                          onValueChange={(v) =>
                            setForm({
                              ...form,
                              assigned_seller_id: v || null,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {user?.id ? (
                              <SelectItem value={user.id}>Eu</SelectItem>
                            ) : null}
                            {sellers
                              .filter((s) => s.user_id !== user?.id)
                              .map((s) => (
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
              </DialogBody>
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
          </div>
        }
      />

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4 lg:p-5">
        <ListPageSearch
          value={clientSearch}
          onValueChange={setClientSearch}
          placeholder="Buscar por nome, razão social, contato, documento ou cidade…"
          ariaLabel="Buscar clientes"
          hint={
            <>
              A busca considera nome fantasia, razão social, e-mail, telefone, documento (CNPJ/CPF),
              cidade, UF, indústria e observações. Use os filtros abaixo para refinar por UF,
              indústria ou vendedor.
            </>
          }
          resultText={
            loading
              ? "Carregando…"
              : `${filteredCustomers.length} de ${customers.length} ${
                  customers.length === 1 ? "cliente" : "clientes"
                }`
          }
        />
        <div className="flex flex-col gap-4 border-t border-border pt-4 xl:flex-row xl:flex-wrap xl:items-end">
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
          </div>
      </div>

      <AppTableCard>
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
                <TableHead>Responsável</TableHead>
                <TableHead className="w-[148px] text-right">Ações</TableHead>
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
                  <TableCell className="text-muted-foreground">
                    {sellerLabel(c.assigned_seller_id)}
                  </TableCell>
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
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Excluir cliente"
                        onClick={() => setDeleteConfirm(c)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AppTableCard>

      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && !deletingCustomer && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  O cliente <strong>{deleteConfirm?.name}</strong> será removido permanentemente desta representação,
                  juntamente com{" "}
                  <strong>pedidos</strong>, <strong>orçamentos</strong> e{" "}
                  <strong>oportunidades no funil</strong>.
                </p>
                <p className="text-muted-foreground">
                  Visitas comerciais permanecem no histórico, mas deixam de estar ligadas a este cliente.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCustomer}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingCustomer}
              className="inline-flex items-center gap-2"
              onClick={() => void runDeleteCustomer()}
            >
              {deletingCustomer && <Loader2 className="h-4 w-4 animate-spin" />}
              {deletingCustomer ? "Excluindo…" : "Excluir definitivamente"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                    className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-foreground">
                        #{String(o.order_number).padStart(4, "0")}
                      </span>
                      <span className="text-xs text-muted-foreground">{dt(o.created_at)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {orderStatusPt[o.status] ?? o.status}
                      </span>
                      <span className="font-semibold text-primary">{brl(o.total)}</span>
                    </div>
                    {o.items.length > 0 ? (
                      <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
                        {o.items.map((it, idx) => (
                          <li
                            key={`${o.id}-${idx}`}
                            className="flex items-start justify-between gap-3 text-xs"
                          >
                            <span className="font-medium text-foreground leading-snug">
                              {it.product_name}
                            </span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {it.quantity} un.
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">Sem itens registrados.</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </AppPage>
  );
}
