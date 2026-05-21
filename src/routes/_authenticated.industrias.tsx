import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AppPage, AppTableCard } from "@/components/layout/AppPage";
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
import { Loader2, Pencil, Plus, Search, Package } from "lucide-react";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";
import { parseCommissionPctInput, formatPct } from "@/lib/commission";
import { matchesFieldsSearch, matchesIndustrySearch } from "@/lib/text-search";
import { formatCep, formatCnpj } from "@/lib/document-masks";
import type { CnpjLookupResult } from "@/lib/cnpj-lookup";
import { joinStreetAndDistrict } from "@/lib/address-format";
import { CnpjLookupInput } from "@/components/forms/CnpjLookupInput";
import { AddressCepFields, type AddressCepValues } from "@/components/forms/AddressCepFields";
import { SearchCombobox } from "@/components/ui/search-combobox";

export const Route = createFileRoute("/_authenticated/industrias")({
  head: () => ({ meta: [{ title: "Indústrias — 2AVendas" }] }),
  component: IndustriesPage,
});

interface OrganizationIndustry {
  id: string;
  trade_name: string;
  legal_name: string | null;
  responsible_name: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  address_line: string;
  postal_code: string;
  cnpj: string;
  commission_pct: number;
  created_at: string;
}

type IndustryForm = Omit<OrganizationIndustry, "id" | "created_at">;

const emptyForm: IndustryForm = {
  trade_name: "",
  legal_name: "",
  responsible_name: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  address_line: "",
  postal_code: "",
  cnpj: "",
  commission_pct: 0,
};

const MAX_PRODUCT_PREVIEW = 3;

interface SellerPick {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

function sellerDisplayLabel(s: SellerPick): string {
  return s.full_name?.trim() || s.email?.trim() || "Vendedor";
}

function resolveResponsibleSellerId(
  responsibleName: string,
  sellers: SellerPick[],
  selfUserId: string | undefined,
  selfFullName: string | null | undefined,
  selfEmail: string | null | undefined,
): string {
  const t = responsibleName.trim();
  if (!t) return "";
  const selfLabels = [selfFullName?.trim(), selfEmail?.trim(), "Eu (administrador)", "Eu"].filter(
    Boolean,
  ) as string[];
  if (selfUserId && selfLabels.includes(t)) return selfUserId;
  for (const s of sellers) {
    if (sellerDisplayLabel(s) === t) return s.user_id;
  }
  return "";
}

function validateIndustryForm(f: IndustryForm): string | null {
  const t = (s: string) => s.trim();
  const checks: [string, string][] = [
    ["Nome fantasia", t(f.trade_name)],
    ["Responsável", t(f.responsible_name)],
    ["Cidade", t(f.city)],
    ["Estado", t(f.state)],
    ["Endereço", t(f.address_line)],
    ["CEP", t(f.postal_code)],
    ["CNPJ", t(f.cnpj)],
  ];
  for (const [label, v] of checks) {
    if (!v || v.length < 2) return `${label}: informe pelo menos 2 caracteres.`;
  }
  const email = t(f.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "E-mail inválido.";
  const pct = Number(f.commission_pct);
  if (Number.isNaN(pct) || pct < 0 || pct > 100) return "Comissão da indústria: use um valor entre 0 e 100.";
  return null;
}

function IndustriesPage() {
  useMenuGate("industrias");
  const { organization, user, role, profile } = useAuth();
  const isAdmin = role === "admin";
  const [rows, setRows] = useState<OrganizationIndustry[]>([]);
  const [sellers, setSellers] = useState<SellerPick[]>([]);
  const [productNamesByIndustry, setProductNamesByIndustry] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationIndustry | null>(null);
  const [form, setForm] = useState<IndustryForm>(emptyForm);
  const [commissionDraft, setCommissionDraft] = useState("0");
  const [saving, setSaving] = useState(false);
  const [addressDistrict, setAddressDistrict] = useState("");
  const [responsibleSellerId, setResponsibleSellerId] = useState("");

  const defaultResponsibleName = useCallback(() => {
    const name = profile?.full_name?.trim() || profile?.email?.trim();
    if (isAdmin) return name || "Eu (administrador)";
    return name || "";
  }, [profile?.email, profile?.full_name, isAdmin]);

  const load = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    const orgId = organization.id;
    const [indRes, prodRes, rolesRes, orgRes] = await Promise.all([
      supabase
        .from("organization_industries")
        .select(
          "id,trade_name,legal_name,responsible_name,city,state,phone,email,address_line,postal_code,cnpj,commission_pct,created_at",
        )
        .eq("organization_id", orgId)
        .order("trade_name"),
      supabase
        .from("products")
        .select("industry_id,name")
        .eq("organization_id", orgId)
        .not("industry_id", "is", null),
      supabase
        .from("user_roles")
        .select("user_id")
        .eq("organization_id", orgId)
        .eq("role", "vendedor"),
      supabase.from("organizations").select("owner_user_id").eq("id", orgId).maybeSingle(),
    ]);
    if (indRes.error) toast.error(userFacingDataError(indRes.error));
    if (prodRes.error) toast.error(userFacingDataError(prodRes.error));

    const vendedorIds = (rolesRes.data ?? []).map((r: { user_id: string }) => r.user_id);
    const ownerId =
      (orgRes.data as { owner_user_id: string | null } | null)?.owner_user_id ?? null;
    const sellerIds = [
      ...new Set(
        [...vendedorIds, ownerId, user?.id].filter((id): id is string => Boolean(id)),
      ),
    ];
    if (sellerIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", sellerIds);
      setSellers(
        (profs ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => ({
          user_id: p.id,
          full_name: p.full_name,
          email: p.email,
        })),
      );
    } else {
      setSellers([]);
    }

    setRows((indRes.data as OrganizationIndustry[]) ?? []);

    const byIndustry: Record<string, string[]> = {};
    for (const p of prodRes.data ?? []) {
      const industryId = (p as { industry_id: string | null }).industry_id;
      const name = String((p as { name: string }).name ?? "").trim();
      if (!industryId || !name) continue;
      if (!byIndustry[industryId]) byIndustry[industryId] = [];
      byIndustry[industryId].push(name);
    }
    for (const id of Object.keys(byIndustry)) {
      byIndustry[id].sort((a, b) => a.localeCompare(b, "pt-BR"));
    }
    setProductNamesByIndustry(byIndustry);
    setLoading(false);
  }, [organization?.id, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((ind) =>
      matchesIndustrySearch(ind, search, productNamesByIndustry[ind.id] ?? []),
    );
  }, [rows, search, productNamesByIndustry]);

  const comboboxSellers = useMemo(() => {
    if (!user?.id) return sellers;
    if (isAdmin) return sellers.filter((s) => s.user_id !== user.id);
    return sellers.filter((s) => s.user_id === user.id);
  }, [sellers, user?.id, isAdmin]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, responsible_name: defaultResponsibleName() });
    setResponsibleSellerId(user?.id ?? "");
    setAddressDistrict("");
    setCommissionDraft("0");
    setOpen(true);
  };

  const openEdit = (row: OrganizationIndustry) => {
    setEditing(row);
    setAddressDistrict("");
    setResponsibleSellerId(
      resolveResponsibleSellerId(
        row.responsible_name,
        sellers,
        user?.id,
        profile?.full_name,
        profile?.email,
      ),
    );
    setForm({
      trade_name: row.trade_name,
      legal_name: row.legal_name ?? "",
      responsible_name: row.responsible_name,
      city: row.city,
      state: row.state,
      phone: row.phone,
      email: row.email,
      address_line: row.address_line,
      postal_code: row.postal_code,
      cnpj: row.cnpj,
      commission_pct: Number(row.commission_pct) || 0,
    });
    const n = Number(row.commission_pct) || 0;
    setCommissionDraft(Number.isInteger(n) ? String(n) : String(n));
    setOpen(true);
  };

  const save = async () => {
    if (!organization?.id) {
      toast.error("Não foi possível carregar os dados da empresa.");
      return;
    }
    const pct = parseCommissionPctInput(commissionDraft);
    if (pct === null) {
      toast.error("Comissão da indústria: informe um percentual válido (0 a 100).");
      return;
    }
    const payload: IndustryForm = {
      trade_name: form.trade_name.trim(),
      legal_name: form.legal_name?.trim() || null,
      responsible_name: form.responsible_name.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase().slice(0, 2),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address_line: joinStreetAndDistrict(form.address_line, addressDistrict),
      postal_code: formatCep(form.postal_code),
      cnpj: formatCnpj(form.cnpj),
      commission_pct: pct,
    };
    const errMsg = validateIndustryForm(payload);
    if (errMsg) {
      toast.error(errMsg);
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("organization_industries")
          .update(payload)
          .eq("id", editing.id)
          .eq("organization_id", organization.id);
        if (error) {
          toast.error(userFacingDataError(error));
          return;
        }
        toast.success("Indústria atualizada.");
      } else {
        const { error } = await supabase
          .from("organization_industries")
          .insert({ organization_id: organization.id, ...payload });
        if (error) {
          toast.error(userFacingDataError(error));
          return;
        }
        toast.success("Indústria cadastrada.");
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const onDialogOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setEditing(null);
      setForm(emptyForm);
      setAddressDistrict("");
      setResponsibleSellerId("");
      setCommissionDraft("0");
    }
  };

  const handleResponsibleChange = (sellerId: string, seller: SellerPick | undefined) => {
    setResponsibleSellerId(sellerId);
    if (sellerId && user?.id && sellerId === user.id && isAdmin) {
      setForm((x) => ({
        ...x,
        responsible_name: profile?.full_name?.trim() || profile?.email?.trim() || "Eu (administrador)",
      }));
      return;
    }
    if (seller) {
      setForm((x) => ({ ...x, responsible_name: sellerDisplayLabel(seller) }));
    }
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
      trade_name: data.nomeFantasia || data.razaoSocial || x.trade_name,
      postal_code: data.cep ? formatCep(data.cep) : x.postal_code,
      address_line: street || x.address_line,
      city: data.cidade || x.city,
      state: data.uf || x.state,
      phone: data.telefone || x.phone,
      email: data.email || x.email,
    }));
    if (data.bairro.trim()) setAddressDistrict(data.bairro.trim());
  };

  const patchAddress = (patch: Partial<AddressCepValues>) => {
    if (patch.cep !== undefined) setForm((x) => ({ ...x, postal_code: patch.cep! }));
    if (patch.street !== undefined) setForm((x) => ({ ...x, address_line: patch.street! }));
    if (patch.district !== undefined) setAddressDistrict(patch.district);
    if (patch.city !== undefined) setForm((x) => ({ ...x, city: patch.city! }));
    if (patch.state !== undefined) setForm((x) => ({ ...x, state: patch.state! }));
  };

  return (
    <AppPage>
      <PageHeader
        title="Indústrias"
        description="Cadastro central de fabricantes: inclua, edite e defina a comissão da representação. No catálogo, os produtos apenas escolhem uma indústria desta lista."
        action={
          <Button type="button" onClick={openNew}>
            <Plus className="h-4 w-4" /> Nova indústria
          </Button>
        }
      />

      <Dialog open={open} onOpenChange={onDialogOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar indústria" : "Nova indústria"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <CnpjLookupInput
                    label="CNPJ *"
                    value={form.cnpj}
                    onValueChange={(v) => setForm((x) => ({ ...x, cnpj: v }))}
                    onLookup={handleCnpjLookup}
                    hint="Ao sair do campo com CNPJ completo, razão social, fantasia e endereço são preenchidos pela Receita Federal."
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Razão social</Label>
                  <Input
                    value={form.legal_name ?? ""}
                    onChange={(e) => setForm((x) => ({ ...x, legal_name: e.target.value }))}
                    placeholder="Preenchido automaticamente pelo CNPJ"
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Nome fantasia *</Label>
                  <Input
                    value={form.trade_name}
                    onChange={(e) => setForm((x) => ({ ...x, trade_name: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <AddressCepFields
                    values={{
                      cep: form.postal_code,
                      street: form.address_line,
                      district: addressDistrict,
                      city: form.city,
                      state: form.state,
                    }}
                    onChange={patchAddress}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Responsável (vendedor) *</Label>
                  <SearchCombobox
                    items={comboboxSellers}
                    value={responsibleSellerId}
                    onValueChange={(id, item) => handleResponsibleChange(id, item)}
                    getItemId={(s) => s.user_id}
                    getItemLabel={sellerDisplayLabel}
                    getSearchFields={(s) => [s.full_name, s.email]}
                    placeholder="Buscar vendedor…"
                    emptyMessage="Nenhum vendedor encontrado."
                    leadingOption={
                      isAdmin && user?.id
                        ? { value: user.id, label: "Eu" }
                        : undefined
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Vincule a indústria ao representante que acompanha o relacionamento. Administradores
                    podem escolher «Eu».
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((x) => ({ ...x, phone: e.target.value }))}
                    inputMode="tel"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((x) => ({ ...x, email: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label>Comissão da representação (%)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={commissionDraft}
                    onChange={(e) => setCommissionDraft(e.target.value)}
                    placeholder="Ex.: 10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentual sobre o subtotal de cada linha de pedido com produto desta indústria. O
                    vendedor recebe a fatia configurada em{" "}
                    <Link to="/vendedores" className="text-primary underline-offset-2 hover:underline">
                      Vendedores
                    </Link>{" "}
                    sobre essa comissão; o restante fica com a representação.
                  </p>
                </div>
              </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onDialogOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 h-11"
            placeholder="Buscar por nome da indústria ou por produto do catálogo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
            aria-label="Buscar indústrias"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          A busca considera nome fantasia, responsável, CNPJ e{" "}
          <strong className="font-medium text-foreground">nomes dos produtos</strong> vinculados no
          catálogo. Cadastros e alterações de indústria ficam somente nesta tela.
        </p>
        <p className="text-sm text-muted-foreground">
          {loading
            ? "Carregando…"
            : `${filtered.length} de ${rows.length} ${rows.length === 1 ? "indústria" : "indústrias"}`}
        </p>
      </div>

      <AppTableCard>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {rows.length === 0
              ? "Nenhuma indústria cadastrada. Use «Nova indústria» para começar."
              : "Nenhum resultado. Tente outro nome de indústria ou de produto."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indústria</TableHead>
                <TableHead>Produtos no catálogo</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Cidade / UF</TableHead>
                <TableHead className="text-right">Comissão rep.</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ind) => {
                const products = productNamesByIndustry[ind.id] ?? [];
                const matchedProducts =
                  search.trim().length > 0
                    ? products.filter((name) => matchesFieldsSearch([name], search))
                    : [];
                const preview = products.slice(0, MAX_PRODUCT_PREVIEW);
                const extra = products.length - preview.length;

                return (
                  <TableRow
                    key={ind.id}
                    className="cursor-pointer"
                    onClick={() => openEdit(ind)}
                  >
                    <TableCell>
                      <div className="font-medium">{ind.trade_name}</div>
                      <div className="text-xs text-muted-foreground">{ind.responsible_name}</div>
                    </TableCell>
                    <TableCell className="max-w-[240px]">
                      {products.length === 0 ? (
                        <span className="text-xs text-muted-foreground">Nenhum produto vinculado</span>
                      ) : (
                        <div className="space-y-1">
                          <Badge variant="secondary" className="gap-1 font-normal">
                            <Package className="h-3 w-3" />
                            {products.length}{" "}
                            {products.length === 1 ? "produto" : "produtos"}
                          </Badge>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {preview.join(" · ")}
                            {extra > 0 ? ` · +${extra}` : ""}
                          </div>
                          {matchedProducts.length > 0 && q.length > 0 && (
                            <p className="text-xs text-primary">
                              Produto: {matchedProducts.slice(0, 2).join(", ")}
                              {matchedProducts.length > 2 ? "…" : ""}
                            </p>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ind.cnpj}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ind.city}/{ind.state}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatPct(Number(ind.commission_pct) || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(ind);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </AppTableCard>
    </AppPage>
  );
}
