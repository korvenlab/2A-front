import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, dt, moneyNumber } from "@/lib/format";
import { normalizeProductImageUrls } from "@/lib/product-images";
import { AppPage, AppTableCard, AppToolbar } from "@/components/layout/AppPage";
import { PageHeader } from "@/components/PageHeader";
import { SearchCombobox } from "@/components/ui/search-combobox";
import { AdaptiveScroll } from "@/components/ui/adaptive-scroll";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, FileSpreadsheet, Mail, MessageCircle, Download, Package, User } from "lucide-react";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";
import { mailtoUrl, recordOutreach, whatsAppShareUrl } from "@/lib/outreach";
import { downloadCsv } from "@/lib/csv-download";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos — 2AVendas" }] }),
  component: BudgetsPage,
});

interface CustomerPick {
  id: string;
  name: string;
  legal_name: string | null;
}

interface ProductPick {
  id: string;
  name: string;
  price: number;
}

interface BudgetItemDetail {
  id: string;
  line_order: number;
  description: string;
  quantity: number;
  unit_price_final: number;
  commission_pct: number;
  product_id: string | null;
  products: { image_url: string | null; image_urls: unknown } | null;
}

interface BudgetRow {
  id: string;
  budget_number: number;
  customer_id: string;
  quote_date: string;
  seller_id: string | null;
  notes_public: string | null;
  customers: {
    name: string;
    legal_name: string | null;
    email: string | null;
    phone: string | null;
    document: string | null;
    city: string | null;
    state: string | null;
  } | null;
  budget_items: BudgetItemDetail[] | null;
}

interface LineDraft {
  product_id: string;
  description: string;
  unit_price_final: number;
  quantity: number;
  commission_pct: number;
}

function lineCommission(it: BudgetItemDetail): number {
  const sub = moneyNumber(it.unit_price_final) * moneyNumber(it.quantity);
  return (sub * moneyNumber(it.commission_pct)) / 100;
}

function sumBudgetCommission(items: BudgetItemDetail[] | null | undefined): number {
  if (!items?.length) return 0;
  return items.reduce((s, it) => s + lineCommission(it), 0);
}

function budgetRowShareFields(r: BudgetRow) {
  const linesValue = (r.budget_items ?? []).reduce(
    (s, it) => s + moneyNumber(it.unit_price_final) * moneyNumber(it.quantity),
    0,
  );
  return {
    id: r.id,
    budget_number: r.budget_number,
    customer_id: r.customer_id,
    customerLabel: r.customers?.name ?? "—",
    quote_date: r.quote_date,
    commission: sumBudgetCommission(r.budget_items ?? []),
    linesValue,
    custEmail: r.customers?.email?.trim() ?? "",
    custPhone: r.customers?.phone?.trim() ?? "",
  };
}

function isOrcamentoRowInteractiveTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return !!el.closest("button,a,[role=combobox],[data-radix-select-viewport]");
}

function BudgetsPage() {
  useMenuGate("orcamentos");
  const { organization, user, role } = useAuth();
  const [rows, setRows] = useState<BudgetRow[]>([]);
  const [customers, setCustomers] = useState<CustomerPick[]>([]);
  const [products, setProducts] = useState<ProductPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [custId, setCustId] = useState("");
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notesPublic, setNotesPublic] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    { product_id: "", description: "", unit_price_final: 0, quantity: 1, commission_pct: 0 },
  ]);
  const [budgetDetail, setBudgetDetail] = useState<BudgetRow | null>(null);
  const [budgetDetailSeller, setBudgetDetailSeller] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    let bq = supabase
      .from("budgets")
      .select(
        "id,budget_number,customer_id,quote_date,seller_id,notes_public,customers(name,legal_name,email,phone,document,city,state),budget_items(id,line_order,description,quantity,unit_price_final,commission_pct,product_id,products(image_url,image_urls))",
      )
      .eq("organization_id", organization.id)
      .order("quote_date", { ascending: false })
      .order("budget_number", { ascending: false });

    if (role === "vendedor" && user?.id) {
      bq = bq.eq("seller_id", user.id);
    }

    const cq = supabase.from("customers").select("id,name,legal_name").order("name");
    let pq = supabase.from("products").select("id,name,price").eq("active", true).order("name");
    if (role === "vendedor" && user?.id) {
      pq = pq.eq("owner_seller_id", user.id);
    }

    const [{ data: bs, error: be }, { data: cs }, { data: ps }] = await Promise.all([
      bq,
      role === "vendedor" && user?.id ? cq.eq("assigned_seller_id", user.id) : cq,
      pq,
    ]);

    if (be) toast.error(userFacingDataError(be));
    setRows((bs as unknown as BudgetRow[]) ?? []);
    setCustomers((cs as CustomerPick[]) ?? []);
    setProducts((ps as ProductPick[]) ?? []);
    setLoading(false);
  }, [organization?.id, role, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const totalsVisible = useMemo(() => rows.map(budgetRowShareFields), [rows]);

  const openBudgetDetail = useCallback(async (r: BudgetRow) => {
    setBudgetDetail(r);
    setBudgetDetailSeller(null);
    if (!r.seller_id) {
      setBudgetDetailSeller("—");
      return;
    }
    const { data } = await supabase.from("profiles").select("full_name,email").eq("id", r.seller_id).maybeSingle();
    const p = data as { full_name: string | null; email: string | null } | null;
    setBudgetDetailSeller(p?.full_name?.trim() || p?.email?.trim() || "Vendedor");
  }, []);

  const exportOrcamentosCsv = () => {
    downloadCsv(
      `orcamentos-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Numero", "Cliente", "Data", "Valor_itens", "Comissao_estimada"],
      totalsVisible.map((r) => [
        r.budget_number,
        r.customerLabel,
        r.quote_date,
        r.linesValue,
        r.commission,
      ]),
    );
    toast.success("CSV exportado.");
  };

  const shareBudgetEmail = async (r: (typeof totalsVisible)[number]) => {
    if (!r.custEmail) return toast.error("Cliente sem e-mail.");
    if (!organization?.id) return;
    const subject = `Orçamento #${String(r.budget_number).padStart(4, "0")} — ${organization.name}`;
    const body = `Olá,\n\nSegue nossa proposta comercial #${String(r.budget_number).padStart(4, "0")} (${r.quote_date}), valor dos itens ${brl(r.linesValue)}.\n\n`;
    window.location.href = mailtoUrl(r.custEmail, subject, body);
    const { error } = await recordOutreach(supabase, {
      organization_id: organization.id,
      channel: "email",
      summary: `Orçamento #${String(r.budget_number).padStart(4, "0")} — e-mail`,
      body,
      customer_id: r.customer_id,
      budget_id: r.id,
    });
    if (error) toast.error("E-mail aberto; falha ao registrar no sistema.");
    else toast.success("Envio registrado.");
  };

  const shareBudgetWhatsApp = async (r: (typeof totalsVisible)[number]) => {
    if (!r.custPhone) return toast.error("Cliente sem telefone.");
    if (!organization?.id) return;
    const msg = `Olá! Orçamento #${String(r.budget_number).padStart(4, "0")} (${organization.name}) — ${brl(r.linesValue)} em ${r.quote_date}.`;
    const url = whatsAppShareUrl(r.custPhone, msg);
    if (!url) return toast.error("Telefone inválido.");
    window.open(url, "_blank", "noopener,noreferrer");
    const { error } = await recordOutreach(supabase, {
      organization_id: organization.id,
      channel: "whatsapp",
      summary: `Orçamento #${String(r.budget_number).padStart(4, "0")} — WhatsApp`,
      body: msg,
      customer_id: r.customer_id,
      budget_id: r.id,
    });
    if (error) toast.error("WhatsApp aberto; falha ao registrar no sistema.");
    else toast.success("Envio registrado.");
  };

  const resetForm = () => {
    setCustId("");
    setQuoteDate(new Date().toISOString().slice(0, 10));
    setNotesPublic("");
    setLines([{ product_id: "", description: "", unit_price_final: 0, quantity: 1, commission_pct: 0 }]);
  };

  const addLine = () => {
    setLines([
      ...lines,
      { product_id: "", description: "", unit_price_final: 0, quantity: 1, commission_pct: 0 },
    ]);
  };

  const updateLine = (idx: number, patch: Partial<LineDraft>) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const draftCommission = useMemo(() => {
    return lines.reduce((s, l) => {
      const sub = l.unit_price_final * l.quantity;
      return s + (sub * l.commission_pct) / 100;
    }, 0);
  }, [lines]);

  const draftSellTotal = useMemo(() => {
    return lines.reduce((s, l) => s + l.unit_price_final * l.quantity, 0);
  }, [lines]);

  const saveBudget = async () => {
    if (!organization || !user) return;
    if (!custId) return toast.error("Selecione um cliente");
    const validLines = lines.filter(
      (l) => l.description.trim() !== "" && l.quantity > 0 && l.unit_price_final >= 0,
    );
    if (validLines.length === 0) return toast.error("Inclua ao menos uma linha com descrição");

    setSaving(true);
    const { data: bud, error } = await supabase
      .from("budgets")
      .insert({
        organization_id: organization.id,
        customer_id: custId,
        seller_id: user.id,
        quote_date: quoteDate,
        notes_public: notesPublic.trim() || null,
        budget_number: 0,
      })
      .select("id")
      .single();

    if (error || !bud) {
      setSaving(false);
      return toast.error(userFacingDataError(error) ?? "Falha ao criar orçamento");
    }

    const itemRows = validLines.map((l, i) => ({
      budget_id: bud.id,
      line_order: i + 1,
      product_id: l.product_id || null,
      description: l.description.trim(),
      commission_pct: l.commission_pct,
      list_price: l.unit_price_final,
      unit_price_final: l.unit_price_final,
      quantity: l.quantity,
      discount_d1: 0,
      discount_d2: 0,
      discount_d3: 0,
      discount_d4: 0,
      discount_d5: 0,
      discount_d6: 0,
      discount_d7: 0,
      ipi_amount: 0,
      st_amount: 0,
    }));

    const { error: ie } = await supabase.from("budget_items").insert(itemRows);
    setSaving(false);
    if (ie) return toast.error(userFacingDataError(ie));
    toast.success("Orçamento criado");
    setOpen(false);
    resetForm();
    load();
  };

  const deleteBudget = async (id: string) => {
    if (!confirm("Excluir este orçamento e todas as linhas?")) return;
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) toast.error(userFacingDataError(error));
    else {
      toast.success("Orçamento excluído");
      load();
    }
  };

  const pickProduct = (idx: number, pid: string) => {
    const p = products.find((x) => x.id === pid);
    updateLine(idx, {
      product_id: pid,
      description: p?.name ?? "",
      unit_price_final: p?.price ?? 0,
    });
  };

  return (
    <AppPage className="pb-28 lg:pb-10">
      <PageHeader
        title="Orçamentos"
        description="Propostas comerciais, descontos por linha e comissão estimada por item."
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Novo orçamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Novo orçamento</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Cliente *</Label>
                    <SearchCombobox
                      items={customers}
                      value={custId}
                      onValueChange={(id) => setCustId(id)}
                      getItemId={(c) => c.id}
                      getItemLabel={(c) => c.name}
                      getSearchFields={(c) => [c.name, c.legal_name]}
                      placeholder="Buscar cliente por nome ou razão social…"
                      emptyMessage="Nenhum cliente encontrado."
                      renderItem={(c) => (
                        <span className="flex flex-col gap-0.5 text-left">
                          <span className="font-medium leading-tight">{c.name}</span>
                          {c.legal_name?.trim() ? (
                            <span className="text-xs text-muted-foreground">{c.legal_name.trim()}</span>
                          ) : null}
                        </span>
                      )}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Data da cotação</Label>
                    <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Observações (visível ao cliente)</Label>
                  <Textarea value={notesPublic} onChange={(e) => setNotesPublic(e.target.value)} rows={2} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Itens</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>
                      <Plus className="h-4 w-4" /> Linha
                    </Button>
                  </div>
                  <AdaptiveScroll
                    className="rounded-lg border border-border"
                    maxHeight={lines.length > 4 ? "min(50dvh, 20rem)" : undefined}
                    axis={lines.length > 4 ? "both" : "y"}
                  >
                    <Table layout="fluid">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[160px]">Produto</TableHead>
                          <TableHead className="min-w-[140px]">Descrição</TableHead>
                          <TableHead className="w-28">Preço final</TableHead>
                          <TableHead className="w-24">Qtd</TableHead>
                          <TableHead className="w-28">Comissão %</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Select
                                value={line.product_id || "__none__"}
                                onValueChange={(v) =>
                                  v === "__none__"
                                    ? updateLine(idx, { product_id: "" })
                                    : pickProduct(idx, v)
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="Opcional" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[240px]">
                                  <SelectItem value="__none__">Sem vínculo</SelectItem>
                                  {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                value={line.description}
                                onChange={(e) => updateLine(idx, { description: e.target.value })}
                                placeholder="Descrição na proposta"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={line.unit_price_final || ""}
                                onChange={(e) =>
                                  updateLine(idx, {
                                    unit_price_final: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(e) =>
                                  updateLine(idx, {
                                    quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={line.commission_pct}
                                onChange={(e) =>
                                  updateLine(idx, {
                                    commission_pct: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={lines.length <= 1}
                                onClick={() => removeLine(idx)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AdaptiveScroll>
                  <div className="flex flex-wrap justify-end gap-6 text-sm pt-1">
                    <span className="text-muted-foreground">
                      Total venda:{" "}
                      <strong className="text-foreground">{brl(draftSellTotal)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Comissão estimada:{" "}
                      <strong className="text-foreground">{brl(draftCommission)}</strong>
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={saveBudget} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Salvar orçamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <AppToolbar className="justify-end">
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={exportOrcamentosCsv}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </AppToolbar>

      <AppTableCard>
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Nenhum orçamento ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Valor itens</TableHead>
                <TableHead className="text-right">Comissão est.</TableHead>
                <TableHead className="text-center w-[88px]">Enviar</TableHead>
                <TableHead className="w-14"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const r = budgetRowShareFields(row);
                return (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={(e) => {
                      if (isOrcamentoRowInteractiveTarget(e.target)) return;
                      void openBudgetDetail(row);
                    }}
                  >
                    <TableCell className="font-mono text-sm">
                      #{String(r.budget_number).padStart(4, "0")}
                    </TableCell>
                    <TableCell className="font-medium">{r.customerLabel}</TableCell>
                    <TableCell className="text-muted-foreground">{dt(r.quote_date)}</TableCell>
                    <TableCell className="text-right">{brl(r.linesValue)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="font-normal">
                        {brl(r.commission)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          title="E-mail ao cliente"
                          onClick={(e) => {
                            e.stopPropagation();
                            void shareBudgetEmail(r);
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          title="WhatsApp ao cliente"
                          onClick={(e) => {
                            e.stopPropagation();
                            void shareBudgetWhatsApp(r);
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          void deleteBudget(row.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </AppTableCard>

      <p className="text-xs text-muted-foreground max-w-2xl">
        A comissão é calculada por linha: (preço final × quantidade) × (% comissão ÷ 100). Integração fiscal (NF-e)
        permanece externa; registre a emissão na tela de Pedidos.
      </p>

      <Sheet
        open={budgetDetail !== null}
        onOpenChange={(open) => {
          if (!open) {
            setBudgetDetail(null);
            setBudgetDetailSeller(null);
          }
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md">
          {budgetDetail ? (
            <>
              <SheetHeader className="space-y-1 pr-8 text-left">
                <SheetTitle className="text-lg">
                  Orçamento #{String(budgetDetail.budget_number).padStart(4, "0")}
                </SheetTitle>
                <p className="text-xs text-muted-foreground">Cotação: {dt(budgetDetail.quote_date)}</p>
              </SheetHeader>
              <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 pb-6">
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm space-y-2">
                  <div className="font-semibold text-foreground">
                    {budgetDetail.customers?.name ?? "Cliente"}
                  </div>
                  {budgetDetail.customers?.legal_name?.trim() ? (
                    <div className="text-xs text-muted-foreground">
                      RS: {budgetDetail.customers.legal_name.trim()}
                    </div>
                  ) : null}
                  {budgetDetail.customers?.document?.trim() ? (
                    <div className="text-xs text-muted-foreground">{budgetDetail.customers.document.trim()}</div>
                  ) : null}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {budgetDetail.customers?.email ? <div>{budgetDetail.customers.email}</div> : null}
                    {budgetDetail.customers?.phone ? <div>{budgetDetail.customers.phone}</div> : null}
                    {budgetDetail.customers?.city ? (
                      <div>
                        {budgetDetail.customers.city}
                        {budgetDetail.customers.state ? ` / ${budgetDetail.customers.state}` : ""}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-start gap-2 pt-1 border-t border-border text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                    <div>
                      <span className="font-medium text-foreground">Vendedor: </span>
                      {budgetDetailSeller ?? "—"}
                    </div>
                  </div>
                  {budgetDetail.notes_public?.trim() ? (
                    <p className="text-xs border-t border-border pt-2">
                      <span className="font-medium text-foreground">Obs. na proposta: </span>
                      {budgetDetail.notes_public.trim()}
                    </p>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Itens</h3>
                  {!(budgetDetail.budget_items && budgetDetail.budget_items.length > 0) ? (
                    <p className="text-sm text-muted-foreground">Nenhuma linha neste orçamento.</p>
                  ) : (
                    <ul className="space-y-3">
                      {[...(budgetDetail.budget_items ?? [])]
                        .sort((a, b) => a.line_order - b.line_order)
                        .map((it) => {
                          const thumb =
                            normalizeProductImageUrls(it.products?.image_urls, it.products?.image_url)[0] ??
                            null;
                          const unit = moneyNumber(it.unit_price_final);
                          const qty = moneyNumber(it.quantity);
                          const sub = unit * qty;
                          const pct = moneyNumber(it.commission_pct);
                          return (
                            <li
                              key={it.id}
                              className="flex gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
                            >
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center">
                                    <Package className="h-6 w-6 text-muted-foreground/50" aria-hidden />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium leading-snug">{it.description}</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {qty} × {brl(unit)}
                                  {pct > 0 ? ` · Comissão ${pct}%` : null}
                                </div>
                                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <span className="text-sm font-semibold text-primary">{brl(sub)}</span>
                                  {pct > 0 ? (
                                    <span className="text-xs text-muted-foreground">
                                      Comissão est.: {brl((sub * pct) / 100)}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>

                <div className="space-y-1 border-t border-border pt-3 text-sm">
                  <div className="flex justify-between font-bold text-base">
                    <span>Total dos itens</span>
                    <span>{brl(budgetRowShareFields(budgetDetail).linesValue)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Comissão estimada (soma das linhas)</span>
                    <span>{brl(budgetRowShareFields(budgetDetail).commission)}</span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AppPage>
  );
}
