import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, dt } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Columns3,
  ListOrdered,
  Pencil,
  History,
  Package,
  Trash2,
} from "lucide-react";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";

export const Route = createFileRoute("/_authenticated/funil")({
  head: () => ({ meta: [{ title: "Funil de vendas — 2AVendas" }] }),
  component: FunilPage,
});

interface PipelineStage {
  id: string;
  name: string;
  sort_order: number;
  color: string | null;
}

interface CustomerPick {
  id: string;
  name: string;
  legal_name: string | null;
}

interface ProductPick {
  id: string;
  name: string;
  price: number;
  sku: string | null;
  supplier: string | null;
}

interface OppCustomer {
  name: string;
  legal_name: string | null;
}

interface OpportunityRow {
  id: string;
  title: string;
  stage_id: string;
  customer_id: string;
  owner_id: string | null;
  priority: number;
  expected_close_date: string | null;
  notes: string | null;
  value_total: number;
  created_at: string;
  customers: OppCustomer | null;
}

interface OppProductDraft {
  id?: string;
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

interface SellerPick {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

function cnChip(color: string | null) {
  if (!color) return undefined;
  return { borderLeftWidth: 4, borderLeftColor: color } as React.CSSProperties;
}

function FunilPage() {
  useMenuGate("funil");
  const { organization, user, role } = useAuth();
  const isAdmin = role === "admin";

  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [loading, setLoading] = useState(true);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [opps, setOpps] = useState<OpportunityRow[]>([]);
  const [customers, setCustomers] = useState<CustomerPick[]>([]);
  const [products, setProducts] = useState<ProductPick[]>([]);
  const [sellers, setSellers] = useState<SellerPick[]>([]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formStageId, setFormStageId] = useState("");
  const [formOwnerId, setFormOwnerId] = useState<string>("none");
  const [formExpected, setFormExpected] = useState("");
  const [formPriority, setFormPriority] = useState("0");
  const [formNotes, setFormNotes] = useState("");
  const [formLines, setFormLines] = useState<OppProductDraft[]>([]);
  const [pickProductId, setPickProductId] = useState("");
  const [origStageId, setOrigStageId] = useState<string | null>(null);

  const [histOpen, setHistOpen] = useState(false);
  const [histRows, setHistRows] = useState<
    { id: string; created_at: string; note: string | null; from?: string | null; to?: string | null }[]
  >([]);
  const [histLoading, setHistLoading] = useState(false);

  const filteredOpps = useMemo(() => {
    let list = [...opps];
    if (role === "vendedor" && user?.id) {
      list = list.filter((o) => !o.owner_id || o.owner_id === user.id);
    }
    return list;
  }, [opps, role, user?.id]);

  const loadCore = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);

    const stageQuery = supabase
      .from("pipeline_stages")
      .select("id,name,sort_order,color")
      .eq("organization_id", organization.id)
      .order("sort_order");

    const oppQuery = supabase
      .from("sales_opportunities")
      .select(
        "id,title,stage_id,customer_id,owner_id,priority,expected_close_date,notes,value_total,created_at,customers(name,legal_name)",
      )
      .eq("organization_id", organization.id)
      .order("priority", { ascending: false })
      .order("expected_close_date", { ascending: true });

    let custQuery = supabase.from("customers").select("id,name,legal_name").order("name");
    if (role === "vendedor" && user?.id) {
      custQuery = custQuery.eq("assigned_seller_id", user.id);
    }

    let prodQuery = supabase
      .from("products")
      .select("id,name,price,sku,supplier")
      .eq("active", true)
      .eq("organization_id", organization.id)
      .order("name");
    if (role === "vendedor" && user?.id) {
      prodQuery = prodQuery.eq("owner_seller_id", user.id);
    }

    const [{ data: stData }, { data: opData }, { data: cuData }, { data: prData }] =
      await Promise.all([stageQuery, oppQuery, custQuery, prodQuery]);

    setStages((stData as PipelineStage[]) ?? []);
    setOpps((opData as OpportunityRow[]) ?? []);
    setCustomers((cuData as CustomerPick[]) ?? []);
    setProducts((prData as ProductPick[]) ?? []);

    if (isAdmin) {
      const { data: rs } = await supabase.from("user_roles").select("user_id").eq("role", "vendedor");
      const ids = (rs ?? []).map((r: { user_id: string }) => r.user_id);
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        setSellers(
          (profs ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => ({
            user_id: p.id,
            full_name: p.full_name,
            email: p.email,
          })),
        );
      } else setSellers([]);
    } else setSellers([]);

    setLoading(false);
  }, [organization?.id, isAdmin, role, user?.id]);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  const resetForm = () => {
    setEditingId(null);
    setFormTitle("");
    setFormCustomerId("");
    const firstStage = stages[0]?.id ?? "";
    setFormStageId(firstStage);
    setFormOwnerId(role === "vendedor" ? user?.id ?? "none" : "none");
    setFormExpected("");
    setFormPriority("0");
    setFormNotes("");
    setFormLines([]);
    setPickProductId("");
    setOrigStageId(null);
  };

  useEffect(() => {
    if (!sheetOpen) return;
    if (!formStageId && stages[0]) setFormStageId(stages[0].id);
  }, [sheetOpen, stages, formStageId]);

  const openNew = () => {
    resetForm();
    setFormStageId(stages[0]?.id ?? "");
    setSheetOpen(true);
  };

  const openEdit = async (o: OpportunityRow) => {
    setEditingId(o.id);
    setOrigStageId(o.stage_id);
    setFormTitle(o.title);
    setFormCustomerId(o.customer_id);
    setFormStageId(o.stage_id);
    setFormOwnerId(o.owner_id ?? "none");
    setFormExpected(o.expected_close_date ?? "");
    setFormPriority(String(o.priority ?? 0));
    setFormNotes(o.notes ?? "");
    const { data: lines } = await supabase
      .from("opportunity_products")
      .select("id,product_id,quantity,unit_price,products(name)")
      .eq("opportunity_id", o.id);
    setFormLines(
      ((lines ?? []) as unknown as Array<{
        id: string;
        product_id: string;
        quantity: number;
        unit_price: number;
        products: { name: string } | null;
      }>).map((r) => ({
        id: r.id,
        product_id: r.product_id,
        name: r.products?.name ?? "Produto",
        quantity: Number(r.quantity),
        unit_price: Number(r.unit_price),
      })),
    );
    setSheetOpen(true);
  };

  const saveOpportunity = async () => {
    if (!organization || !user) return;
    if (!formTitle.trim()) return toast.error("Informe o título da oportunidade");
    if (!formCustomerId) return toast.error("Selecione um cliente");
    if (!formStageId) return toast.error("Selecione o estágio");
    setSaving(true);
    try {
      const owner = formOwnerId === "none" ? null : formOwnerId;
      const shared = {
        customer_id: formCustomerId,
        title: formTitle.trim(),
        owner_id: role === "vendedor" ? user.id : owner,
        expected_close_date: formExpected.trim() || null,
        priority: parseInt(formPriority, 10) || 0,
        notes: formNotes.trim() || null,
      };

      let oppId = editingId;
      if (editingId) {
        if (formStageId !== origStageId) {
          const { error: mvErr } = await supabase.rpc("advance_sales_opportunity", {
            p_opportunity_id: editingId,
            p_to_stage_id: formStageId,
            p_note: null,
          });
          if (mvErr) throw mvErr;
        }
        const { error } = await supabase.from("sales_opportunities").update(shared).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: row, error } = await supabase
          .from("sales_opportunities")
          .insert({
            ...shared,
            organization_id: organization.id,
            stage_id: formStageId,
          })
          .select("id")
          .single();
        if (error) throw error;
        oppId = row.id;
      }

      if (!oppId) throw new Error("ID da oportunidade ausente");

      if (editingId) {
        await supabase.from("opportunity_products").delete().eq("opportunity_id", oppId);
      }

      if (formLines.length > 0) {
        const { error: liErr } = await supabase.from("opportunity_products").insert(
          formLines.map((l) => ({
            opportunity_id: oppId,
            product_id: l.product_id,
            quantity: l.quantity,
            unit_price: l.unit_price,
          })),
        );
        if (liErr) throw liErr;
      }

      toast.success(editingId ? "Oportunidade atualizada." : "Oportunidade criada.");
      setSheetOpen(false);
      await loadCore();
    } catch (e) {
      toast.error(userFacingDataError(e));
    } finally {
      setSaving(false);
    }
  };

  const moveStage = async (oppId: string, toStageId: string, note?: string) => {
    const { error } = await supabase.rpc("advance_sales_opportunity", {
      p_opportunity_id: oppId,
      p_to_stage_id: toStageId,
      p_note: note?.trim() || null,
    });
    if (error) {
      toast.error(userFacingDataError(error));
      return;
    }
    toast.success("Estágio atualizado.");
    await loadCore();
  };

  const loadHistory = async (oppId: string) => {
    setHistOpen(true);
    setHistLoading(true);
    const { data, error } = await supabase
      .from("opportunity_stage_events")
      .select("id,created_at,note,from_stage_id,to_stage_id")
      .eq("opportunity_id", oppId)
      .order("created_at", { ascending: false });

    const stageLabel = (sid: string | null) =>
      sid ? (stages.find((s) => s.id === sid)?.name ?? sid.slice(0, 8)) : null;

    if (error) {
      toast.error(userFacingDataError(error));
      setHistRows([]);
    } else {
      const normalized = (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        created_at: row.created_at as string,
        note: row.note as string | null,
        from: stageLabel((row.from_stage_id as string | null) ?? null),
        to: stageLabel((row.to_stage_id as string | null) ?? null),
      }));
      setHistRows(normalized);
    }
    setHistLoading(false);
  };

  const addProductLine = () => {
    const p = products.find((x) => x.id === pickProductId);
    if (!p) return toast.error("Escolha um produto");
    setFormLines([
      ...formLines,
      {
        product_id: p.id,
        name: p.name,
        quantity: 1,
        unit_price: Number(p.price) || 0,
      },
    ]);
    setPickProductId("");
  };

  const updateLine = (idx: number, patch: Partial<OppProductDraft>) => {
    setFormLines(formLines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const removeLine = (idx: number) => {
    setFormLines(formLines.filter((_, i) => i !== idx));
  };

  const oppsByStage = useMemo(() => {
    const m = new Map<string, OpportunityRow[]>();
    for (const s of stages) m.set(s.id, []);
    for (const o of filteredOpps) {
      const arr = m.get(o.stage_id);
      if (arr) arr.push(o);
      else m.set(o.stage_id, [o]);
    }
    return m;
  }, [filteredOpps, stages]);

  const listaSorted = useMemo(() => {
    return [...filteredOpps].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const da = a.expected_close_date ? new Date(a.expected_close_date).getTime() : Infinity;
      const db = b.expected_close_date ? new Date(b.expected_close_date).getTime() : Infinity;
      return da - db;
    });
  }, [filteredOpps]);

  if (loading && stages.length === 0) {
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader
        title="Funil de vendas"
        description="Oportunidades vinculadas a clientes e produtos, com estágios e histórico de mudanças."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-lg border border-border p-0.5 bg-muted/40">
              <Button
                type="button"
                variant={view === "kanban" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
                onClick={() => setView("kanban")}
              >
                <Columns3 className="h-4 w-4" /> Kanban
              </Button>
              <Button
                type="button"
                variant={view === "lista" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
                onClick={() => setView("lista")}
              >
                <ListOrdered className="h-4 w-4" /> Lista
              </Button>
            </div>
            <Button onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova oportunidade
            </Button>
          </div>
        }
      />

      {stages.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum estágio do funil encontrado. Aplique a migration do CRM no Supabase ou aguarde a criação da
            organização (estágios padrão são gerados automaticamente).
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          {stages.map((st) => (
            <Card
              key={st.id}
              className="min-w-[280px] max-w-[320px] shrink-0 snap-start border-border/80 shadow-sm"
              style={cnChip(st.color)}
            >
              <CardHeader className="py-3 pb-2 space-y-0">
                <CardTitle className="text-sm font-semibold flex items-center justify-between gap-2">
                  <span>{st.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {(oppsByStage.get(st.id) ?? []).length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 max-h-[calc(100vh-240px)] overflow-y-auto">
                {(oppsByStage.get(st.id) ?? []).map((o) => (
                  <div
                    key={o.id}
                    className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-2"
                  >
                    <div className="font-medium text-sm leading-snug">{o.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.customers?.name ?? "Cliente"}
                      {o.customers?.legal_name ? (
                        <span className="block truncate text-[11px]">RS: {o.customers.legal_name}</span>
                      ) : null}
                    </div>
                    <div className="text-sm font-semibold text-primary">{brl(o.value_total)}</div>
                    <Select
                      value={o.stage_id}
                      onValueChange={(v) => void moveStage(o.id, v)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Mover estágio" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openEdit(o)}>
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                        onClick={() => loadHistory(o.id)}
                        title="Histórico"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prioridade</TableHead>
                <TableHead>Oportunidade</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listaSorted.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{o.priority}</TableCell>
                  <TableCell className="font-medium">{o.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{o.customers?.name ?? "—"}</TableCell>
                  <TableCell>{brl(o.value_total)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{dt(o.expected_close_date)}</TableCell>
                  <TableCell>
                    <Select value={o.stage_id} onValueChange={(v) => void moveStage(o.id, v)}>
                      <SelectTrigger className="h-8 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(o)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => loadHistory(o.id)}>
                      <History className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Editar oportunidade" : "Nova oportunidade"}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <fieldset className="space-y-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Identificação
              </legend>
              <div className="grid gap-2">
                <Label>Título *</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="Ex.: Licitação materiais Q3" />
              </div>
              <div className="grid gap-2">
                <Label>Cliente *</Label>
                <Select value={formCustomerId} onValueChange={setFormCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.legal_name ? ` · ${c.legal_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Estágio *</Label>
                <Select value={formStageId} onValueChange={setFormStageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isAdmin && (
                <div className="grid gap-2">
                  <Label>Vendedor responsável</Label>
                  <Select value={formOwnerId} onValueChange={setFormOwnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Opcional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não atribuído</SelectItem>
                      {sellers.map((s) => (
                        <SelectItem key={s.user_id} value={s.user_id}>
                          {s.full_name ?? s.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Previsão fechamento</Label>
                  <Input type="date" value={formExpected} onChange={(e) => setFormExpected(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Prioridade</Label>
                  <Input
                    type="number"
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value)}
                    min={0}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} />
              </div>
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Produtos industriais
              </legend>
              <div className="flex gap-2">
                <Select value={pickProductId} onValueChange={setPickProductId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Adicionar produto..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex flex-col text-left">
                          <span>{p.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.sku ? `${p.sku} · ` : ""}
                            {brl(p.price)}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="secondary" onClick={addProductLine}>
                  <Package className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {formLines.map((line, idx) => (
                  <div key={`${line.product_id}-${idx}`} className="flex flex-wrap gap-2 items-end border rounded-lg p-2">
                    <div className="flex-1 min-w-[140px] text-sm font-medium">{line.name}</div>
                    <div className="w-24 grid gap-1">
                      <Label className="text-[10px]">Qtd</Label>
                      <Input
                        type="number"
                        min={0.0001}
                        step={0.01}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(idx, { quantity: Math.max(0.0001, parseFloat(e.target.value) || 1) })
                        }
                      />
                    </div>
                    <div className="w-28 grid gap-1">
                      <Label className="text-[10px]">Preço un.</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.unit_price}
                        onChange={(e) =>
                          updateLine(idx, { unit_price: Math.max(0, parseFloat(e.target.value) || 0) })
                        }
                      />
                    </div>
                    <div className="text-sm font-semibold pt-5">{brl(line.quantity * line.unit_price)}</div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </fieldset>
          </div>
          <SheetFooter className="gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveOpportunity()} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={histOpen} onOpenChange={setHistOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Histórico do funil</SheetTitle>
          </SheetHeader>
          <div className="py-4 space-y-3">
            {histLoading ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            ) : histRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">Sem registros de mudança de estágio.</p>
            ) : (
              histRows.map((h) => (
                <div key={h.id} className="rounded-lg border border-border p-3 text-sm space-y-1">
                  <div className="text-xs text-muted-foreground">{dt(h.created_at)}</div>
                  <div>
                    {h.from ? (
                      <span>
                        {h.from} → <strong>{h.to ?? "—"}</strong>
                      </span>
                    ) : (
                      <strong>{h.to ?? "—"}</strong>
                    )}
                  </div>
                  {h.note ? <p className="text-muted-foreground text-xs pt-1">{h.note}</p> : null}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
