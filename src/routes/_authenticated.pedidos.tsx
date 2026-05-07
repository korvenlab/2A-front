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
import { Plus, Loader2, ShoppingBag, Trash2 } from "lucide-react";

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
  customers: {
    name: string;
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
}
interface ProductOpt {
  id: string;
  name: string;
  price: number;
}
interface DraftItem {
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
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

  const load = async () => {
    setLoading(true);
    let ordersQuery = supabase
      .from("orders")
      .select(
        "id,order_number,status,total,notes,created_at,customer_id,customers(name,email,phone,document,city,state,address)",
      )
      .order("created_at", { ascending: false });
    if (role === "vendedor" && user?.id) {
      ordersQuery = ordersQuery.eq("seller_id", user.id);
    }
    const { data, error } = await ordersQuery;
    if (error) toast.error(error.message);
    setOrders((data as unknown as Order[]) ?? []);

    const customersQuery = supabase.from("customers").select("id,name").order("name");
    const productsQuery = supabase
      .from("products")
      .select("id,name,price")
      .eq("active", true)
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

  const total = useMemo(
    () => items.reduce((s, it) => s + it.unit_price * it.quantity, 0),
    [items],
  );

  const reset = () => {
    setCustomerId("");
    setNotes("");
    setItems([]);
    setSelectedProduct("");
  };

  const addItem = () => {
    const p = products.find((x) => x.id === selectedProduct);
    if (!p) return;
    if (items.find((i) => i.product_id === p.id)) {
      setItems(
        items.map((i) =>
          i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i,
        ),
      );
    } else {
      setItems([
        ...items,
        { product_id: p.id, product_name: p.name, unit_price: p.price, quantity: 1 },
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
      return toast.error(error?.message ?? "Falha ao criar pedido");
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
    if (errIt) return toast.error(errIt.message);
    toast.success("Pedido criado");
    setOpen(false);
    reset();
    load();
  };

  const changeStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else load();
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
              if (!v) reset();
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
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Adicionar produto</Label>
                  <div className="flex gap-2">
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Escolha um produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {brl(p.price)}
                          </SelectItem>
                        ))}
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
                          <TableHead>Produto</TableHead>
                          <TableHead className="w-24">Qtd</TableHead>
                          <TableHead className="w-32">Preço</TableHead>
                          <TableHead className="w-28 text-right">Subtotal</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((it, idx) => (
                          <TableRow key={it.product_id}>
                            <TableCell className="font-medium">
                              {it.product_name}
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
                    {o.customers?.document && (
                      <div className="text-xs text-muted-foreground">{o.customers.document}</div>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
