import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, dt } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  Plus,
  Loader2,
  ShoppingBag,
  Trash2,
  Building2,
  Package,
  Search,
  FileText,
} from "lucide-react";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";
import { normalizeProductImageUrls } from "@/lib/product-images";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({ meta: [{ title: "Pedidos — 2AVendas" }] }),
  component: OrdersPage,
});

type OrderStatus = "rascunho" | "enviado" | "aprovado" | "faturado" | "cancelado";

interface Order {
  id: string;
  order_number: number;
  status: OrderStatus;
  total: number;
  notes: string | null;
  created_at: string;
  customer_id: string;
  nfe_key: string | null;
  nfe_issued_at: string | null;
  customers: {
    name: string;
    legal_name: string | null;
    industry: string | null;
    email: string | null;
    phone: string | null;
    document: string | null;
    city: string | null;
    state: string | null;
    address: string | null;
  } | null;
}
interface CustomerOpt {
  id: string;
  name: string;
  legal_name: string | null;
}
interface ProductOpt {
  id: string;
  name: string;
  price: number;
  category: string | null;
  supplier: string | null;
  image_url: string | null;
  image_urls: unknown;
}
interface DraftItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  supplier: string | null;
  thumb_url: string | null;
}

const statusLabels: Record<OrderStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  faturado: "Faturado",
  cancelado: "Cancelado",
};
const statusVariant: Record<OrderStatus, "default" | "secondary" | "outline" | "destructive"> = {
  rascunho: "secondary",
  enviado: "outline",
  aprovado: "default",
  faturado: "default",
  cancelado: "destructive",
};

function OrdersPage() {
  useMenuGate("pedidos");
  const { organization, user, role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerId, setCustomerId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<DraftItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [productPickSearch, setProductPickSearch] = useState("");
  const [customerPickSearch, setCustomerPickSearch] = useState("");
  const [nfeTarget, setNfeTarget] = useState<Order | null>(null);
  const [nfeKeyDraft, setNfeKeyDraft] = useState("");
  const [nfeDateDraft, setNfeDateDraft] = useState("");
  const [nfeSaving, setNfeSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    let ordersQuery = supabase
      .from("orders")
      .select(
        "id,order_number,status,total,notes,created_at,customer_id,nfe_key,nfe_issued_at,customers(name,legal_name,industry,email,phone,document,city,state,address)",
      )
      .order("created_at", { ascending: false });
    if (role === "vendedor" && user?.id) {
      ordersQuery = ordersQuery.eq("seller_id", user.id);
    }
    const { data, error } = await ordersQuery;
    if (error) toast.error(userFacingDataError(error));
    setOrders((data as unknown as Order[]) ?? []);

    const customersQuery = supabase
      .from("customers")
      .select("id,name,legal_name")
      .order("name");
    const productsQuery = supabase
      .from("products")
      .select("id,name,price,category,supplier,image_url,image_urls")
      .eq("active", true)
      .order("category")
      .order("name");
    const [{ data: cs }, { data: ps }] = await Promise.all([
      role === "vendedor" && user?.id
        ? customersQuery.eq("assigned_seller_id", user.id)
        : customersQuery,
      role === "vendedor" && user?.id
        ? productsQuery.eq("owner_seller_id", user.id)
        : productsQuery,
    ]);
    setCustomers((cs as CustomerOpt[]) ?? []);
    setProducts((ps as ProductOpt[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!organization || !user) return;
    load();
  }, [organization?.id, user?.id, role]);

  const pickCustomersFiltered = useMemo(() => {
    const q = customerPickSearch.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.legal_name ?? "").toLowerCase().includes(q),
    );
  }, [customers, customerPickSearch]);

  const pickProductsFiltered = useMemo(() => {
    const q = productPickSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.supplier ?? "").toLowerCase().includes(q),
    );
  }, [products, productPickSearch]);

  const pickProductsGrouped = useMemo(() => {
    const map = new Map<string, ProductOpt[]>();
    for (const p of pickProductsFiltered) {
      const k = p.category?.trim() || "Sem categoria";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (a === "Sem categoria") return 1;
      if (b === "Sem categoria") return -1;
      return a.localeCompare(b, "pt-BR");
    });
    return keys.map((k) => [k, map.get(k)!] as const);
  }, [pickProductsFiltered]);

  const total = useMemo(
    () => items.reduce((s, it) => s + it.unit_price * it.quantity, 0),
    [items],
  );

  const reset = () => {
    setCustomerId("");
    setCustomerPickSearch("");
    setNotes("");
    setItems([]);
    setSelectedProduct("");
  };

  const addItem = () => {
    const p = products.find((x) => x.id === selectedProduct);
    if (!p) return;
    const thumb = normalizeProductImageUrls(p.image_urls, p.image_url)[0] ?? null;
    const supplier = p.supplier?.trim() || null;
    if (items.find((i) => i.product_id === p.id)) {
      setItems(
        items.map((i) =>
          i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    } else {
      setItems([
        ...items,
        {
          product_id: p.id,
          product_name: p.name,
          unit_price: p.price,
          quantity: 1,
          supplier,
          thumb_url: thumb,
        },
      ]);
    }
    setSelectedProduct("");
  };

  const updateItem = (idx: number, patch: Partial<DraftItem>) => {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const create = async () => {
    if (!organization || !user) return;
    if (!customerId) return toast.error("Selecione um cliente");
    if (items.length === 0) return toast.error("Adicione ao menos um item");
    setSaving(true);
    const { data: ord, error } = await supabase
      .from("orders")
      .insert({
        organization_id: organization.id,
        customer_id: customerId,
        seller_id: user.id,
        notes: notes || null,
        status: "rascunho" as OrderStatus,
        order_number: 0,
      })
      .select("id")
      .single();
    if (error || !ord) {
      setSaving(false);
      return toast.error(userFacingDataError(error) ?? "Falha ao criar pedido");
    }
    const { error: errIt } = await supabase.from("order_items").insert(
      items.map((it) => ({
        order_id: ord.id,
        product_id: it.product_id,
        product_name: it.product_name,
        unit_price: it.unit_price,
        quantity: it.quantity,
        subtotal: it.unit_price * it.quantity,
      })),
    );
    setSaving(false);
    if (errIt) return toast.error(userFacingDataError(errIt));
    toast.success("Pedido criado");
    setOpen(false);
    reset();
    load();
  };

  const changeStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      const msg = userFacingDataError(error);
      toast.error(msg ?? "Não foi possível alterar o status.");
      if (/estoque|Estoque|stock/i.test(msg ?? "")) {
        toast.info(
          "Reduza quantidades no pedido ou repor estoque no catálogo antes de avançar o status.",
        );
      }
    } else load();
  };

  const openNfeDialog = (o: Order) => {
    setNfeTarget(o);
    setNfeKeyDraft(o.nfe_key?.trim() ?? "");
    setNfeDateDraft(o.nfe_issued_at ? o.nfe_issued_at.slice(0, 10) : "");
  };

  const saveNfe = async () => {
    if (!nfeTarget) return;
    setNfeSaving(true);
    const keyTrim = nfeKeyDraft.trim();
    const issued =
      nfeDateDraft.trim() === ""
        ? null
        : new Date(nfeDateDraft + "T12:00:00.000Z").toISOString();
    const { error } = await supabase
      .from("orders")
      .update({
        nfe_key: keyTrim === "" ? null : keyTrim,
        nfe_issued_at: issued,
      })
      .eq("id", nfeTarget.id);
    setNfeSaving(false);
    if (error) toast.error(userFacingDataError(error));
    else {
      toast.success("Dados de NF-e atualizados.");
      setNfeTarget(null);
      load();
    }
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader
        title="Pedidos"
        description="Acompanhe e crie pedidos da representação."
        action={
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                reset();
                setProductPickSearch("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Novo pedido
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo pedido</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto">
                <div className="grid gap-2">
                  <Label>Cliente *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      value={customerPickSearch}
                      onChange={(e) => setCustomerPickSearch(e.target.value)}
                      placeholder="Buscar por nome fantasia ou razão social da empresa…"
                      className="h-10 pl-9 mb-2"
                    />
                  </div>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um cliente na lista" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[min(320px,55vh)]">
                      {pickCustomersFiltered.length === 0 ? (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                          Nenhum cliente encontrado para essa busca.
                        </div>
                      ) : (
                        pickCustomersFiltered.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="py-2.5">
                            <span className="flex flex-col gap-0.5 text-left">
                              <span className="font-medium leading-tight">{c.name}</span>
                              {c.legal_name?.trim() ? (
                                <span className="text-xs font-normal text-muted-foreground">
                                  Razão social: {c.legal_name.trim()}
                                </span>
                              ) : null}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Adicionar produto</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      value={productPickSearch}
                      onChange={(e) => setProductPickSearch(e.target.value)}
                      placeholder="Filtrar por nome, categoria ou indústria…"
                      className="h-10 pl-9 mb-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Escolha um produto (por categoria)" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(380px,65vh)]">
                        {pickProductsFiltered.length === 0 ? (
                          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Nenhum produto encontrado.
                          </div>
                        ) : (
                          pickProductsGrouped.map(([cat, list]) => (
                            <SelectGroup key={cat}>
                              <SelectLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {cat}
                              </SelectLabel>
                              {list.map((p) => (
                                <SelectItem key={p.id} value={p.id} className="py-2.5">
                                  <span className="flex flex-col gap-0.5 text-left">
                                    <span className="font-medium leading-tight">{p.name}</span>
                                    <span className="text-xs font-normal text-muted-foreground">
                                      {p.supplier?.trim() ? `${p.supplier.trim()} · ` : ""}
                                      {brl(p.price)}
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <Button onClick={addItem} disabled={!selectedProduct}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Produto</TableHead>
                          <TableHead className="w-24">Qtd</TableHead>
                          <TableHead className="w-32">Preço</TableHead>
                          <TableHead className="w-28 text-right">Subtotal</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((it, idx) => (
                          <TableRow key={it.product_id}>
                            <TableCell>
                              <div className="flex items-start gap-3">
                                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                                  {it.thumb_url ? (
                                    <img
                                      src={it.thumb_url}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center">
                                      <Package className="h-5 w-5 text-muted-foreground/40" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 pt-0.5">
                                  <div className="font-semibold leading-snug">{it.product_name}</div>
                                  {it.supplier && (
                                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                      <Building2 className="h-3 w-3 shrink-0 text-primary" aria-hidden />
                                      <span className="truncate">{it.supplier}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                value={it.quantity}
                                onChange={(e) =>
                                  updateItem(idx, {
                                    quantity: parseInt(e.target.value) || 1,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={it.unit_price}
                                onChange={(e) =>
                                  updateItem(idx, {
                                    unit_price: parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {brl(it.unit_price * it.quantity)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setItems(items.filter((_, i) => i !== idx))
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end items-center gap-3 px-4 py-3 bg-secondary/30 border-t border-border">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="text-lg font-bold">{brl(total)}</span>
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={create} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Criar pedido
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
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-50" />
            Nenhum pedido ainda.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[100px]">NF-e</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-sm">
                    #{String(o.order_number).padStart(4, "0")}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{o.customers?.name ?? "—"}</div>
                    {o.customers?.legal_name?.trim() ? (
                      <div className="text-xs text-muted-foreground font-normal">
                        RS: {o.customers.legal_name.trim()}
                      </div>
                    ) : null}
                    {o.customers?.industry?.trim() ? (
                      <div className="text-xs text-muted-foreground/90 font-normal">
                        {o.customers.industry.trim()}
                      </div>
                    ) : null}
                    {o.customers?.document && (
                      <div className="text-xs text-muted-foreground font-normal">
                        {o.customers.document}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{o.customers?.email ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{o.customers?.phone ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {o.customers?.city
                        ? `${o.customers.city}${o.customers?.state ? `/${o.customers.state}` : ""}`
                        : "—"}
                    </div>
                    {o.customers?.address && (
                      <div className="text-xs text-muted-foreground truncate max-w-56">
                        {o.customers.address}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dt(o.created_at)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {brl(o.total)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={o.status}
                        onValueChange={(v) => changeStatus(o.id, v as OrderStatus)}
                      >
                        <SelectTrigger className="w-36 h-8 border-0 bg-transparent p-0">
                          <Badge variant={statusVariant[o.status]}>
                            {statusLabels[o.status]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(statusLabels) as OrderStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {statusLabels[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {o.status === "enviado" && (
                        <Badge variant="default" className="whitespace-nowrap">
                          Novo pedido do cliente
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      title="Registrar NF-e emitida externamente"
                      onClick={() => openNfeDialog(o)}
                    >
                      <FileText className="h-4 w-4" />
                      {o.nfe_key?.trim() ? "Editar" : "Registrar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={nfeTarget !== null} onOpenChange={(o) => !o && setNfeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>NF-e (registro manual)</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            A emissão fiscal continua no seu ERP ou contador. Aqui você apenas associa a chave ao pedido{" "}
            {nfeTarget ? `#${String(nfeTarget.order_number).padStart(4, "0")}` : ""}.
          </p>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Chave NF-e (44 dígitos ou referência)</Label>
              <Input
                value={nfeKeyDraft}
                onChange={(e) => setNfeKeyDraft(e.target.value)}
                placeholder="Chave ou número do documento"
              />
            </div>
            <div className="grid gap-2">
              <Label>Data de emissão</Label>
              <Input type="date" value={nfeDateDraft} onChange={(e) => setNfeDateDraft(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNfeTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={saveNfe} disabled={nfeSaving}>
              {nfeSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
