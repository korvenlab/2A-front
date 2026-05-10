import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl } from "@/lib/format";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, FileSpreadsheet } from "lucide-react";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";

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

interface BudgetItemRow {
  unit_price_final: number;
  quantity: number;
  commission_pct: number;
}

interface BudgetRow {
  id: string;
  budget_number: number;
  customer_id: string;
  quote_date: string;
  seller_id: string | null;
  customers: { name: string; legal_name: string | null } | null;
  budget_items: BudgetItemRow[] | null;
}

interface LineDraft {
  product_id: string;
  description: string;
  unit_price_final: number;
  quantity: number;
  commission_pct: number;
}

function lineCommission(it: BudgetItemRow): number {
  return (Number(it.unit_price_final) * Number(it.quantity) * Number(it.commission_pct)) / 100;
}

function sumBudgetCommission(items: BudgetItemRow[] | null | undefined): number {
  if (!items?.length) return 0;
  return items.reduce((s, it) => s + lineCommission(it), 0);
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

  const load = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    let bq = supabase
      .from("budgets")
      .select(
        "id,budget_number,customer_id,quote_date,seller_id,customers(name,legal_name),budget_items(unit_price_final,quantity,commission_pct)",
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

  const totalsVisible = useMemo(() => {
    return rows.map((r) => ({
      id: r.id,
      budget_number: r.budget_number,
      customerLabel: r.customers?.name ?? "—",
      quote_date: r.quote_date,
      commission: sumBudgetCommission(r.budget_items ?? []),
      linesValue: (r.budget_items ?? []).reduce(
        (s, it) => s + Number(it.unit_price_final) * Number(it.quantity),
        0,
      ),
    }));
  }, [rows]);

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
    <div className="p-6 lg:p-10 space-y-6">
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
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo orçamento</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Cliente *</Label>
                    <Select value={custId} onValueChange={setCustId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[280px]">
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {c.legal_name?.trim() ? ` · ${c.legal_name.trim()}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <div className="rounded-lg border border-border overflow-x-auto">
                    <Table>
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
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
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
                <TableHead className="w-14"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totalsVisible.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">#{String(r.budget_number).padStart(4, "0")}</TableCell>
                  <TableCell className="font-medium">{r.customerLabel}</TableCell>
                  <TableCell className="text-muted-foreground">{r.quote_date}</TableCell>
                  <TableCell className="text-right">{brl(r.linesValue)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="font-normal">
                      {brl(r.commission)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => deleteBudget(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-xs text-muted-foreground max-w-2xl">
        A comissão é calculada por linha: (preço final × quantidade) × (% comissão ÷ 100). Integração fiscal (NF-e)
        permanece externa; registre a emissão na tela de Pedidos.
      </p>
    </div>
  );
}
