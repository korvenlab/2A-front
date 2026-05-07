import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, dt } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Search,
  PackageSearch,
} from "lucide-react";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [{ title: "Portal B2B — 2AVendas" }] }),
  component: Portal,
});

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  stock: number;
  category: string | null;
  image_url: string | null;
}

interface CartLine {
  key: string;
  product: Product;
  quantity: number;
  variation: string | null;
}

interface OrderRow {
  id: string;
  order_number: number;
  status: string;
  total: number;
  notes: string | null;
  created_at: string;
}

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  rascunho: "outline",
  enviado: "default",
  aprovado: "default",
  faturado: "secondary",
  cancelado: "secondary",
};
const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  faturado: "Faturado",
  cancelado: "Cancelado",
};

function Portal() {
  useMenuGate("portal");
  const { user, profile, organization } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [assignedSellerId, setAssignedSellerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [draftQtyByProduct, setDraftQtyByProduct] = useState<Record<string, number>>({});
  const [draftVariationByProduct, setDraftVariationByProduct] = useState<Record<string, string>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [tab, setTab] = useState<"catalog" | "orders">("catalog");
  const inviteToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("invite")
      : null;

  const ensureCustomer = async () => {
    if (!user || !organization) return { customerId: null as string | null, sellerId: null as string | null };
    let sellerFromToken: string | null = null;
    if (inviteToken) {
      const { data: inv } = await supabase
        .from("seller_invitations")
        .select("organization_id, invited_by, purpose, expires_at")
        .eq("token", inviteToken)
        .eq("purpose", "client_catalog")
        .maybeSingle();
      if (
        inv &&
        inv.organization_id === organization.id &&
        new Date(inv.expires_at).getTime() > Date.now() &&
        inv.invited_by
      ) {
        sellerFromToken = inv.invited_by;
      } else {
        toast.error("Link inválido ou expirado.");
      }
    }
    // Look for existing customer by user_id
    const { data: existing } = await supabase
      .from("customers")
      .select("id, assigned_seller_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      const assigned = existing.assigned_seller_id ?? sellerFromToken ?? null;
      setAssignedSellerId(assigned);
      if (sellerFromToken && sellerFromToken !== existing.assigned_seller_id) {
        await supabase
          .from("customers")
          .update({ assigned_seller_id: sellerFromToken })
          .eq("id", existing.id);
      }
      return { customerId: existing.id, sellerId: assigned };
    }
    // Create one tied to this user
    const { data, error } = await supabase
      .from("customers")
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        name: profile?.full_name || user.email || "Cliente",
        email: user.email ?? null,
        assigned_seller_id: sellerFromToken,
      })
      .select("id")
      .single();
    if (error) {
      toast.error("Não foi possível criar seu cadastro: " + userFacingDataError(error));
      return { customerId: null as string | null, sellerId: null as string | null };
    }
    setAssignedSellerId(sellerFromToken ?? null);
    return { customerId: data.id, sellerId: sellerFromToken ?? null };
  };

  const load = async () => {
    setLoading(true);
    const ensured = await ensureCustomer();
    const cid = ensured.customerId;
    const sellerId = ensured.sellerId;
    setCustomerId(cid);
    const productsQuery = supabase
      .from("products")
      .select("id,name,sku,description,price,stock,category,image_url")
      .eq("active", true)
      .order("name");
    const [{ data: prods }, { data: ords }] = await Promise.all([
      sellerId ? productsQuery.eq("owner_seller_id", sellerId) : productsQuery.eq("id", "__none__"),
      cid
        ? supabase
            .from("orders")
            .select("id,order_number,status,total,notes,created_at")
            .eq("customer_id", cid)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as OrderRow[] }),
    ]);
    setProducts((prods as Product[]) ?? []);
    setOrders((ords as OrderRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (user && organization) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, organization?.id, inviteToken]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
    [cart],
  );
  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  const addToCart = (p: Product, qty: number, variation: string) => {
    if (p.stock <= 0) return toast.error("Produto sem estoque");
    const normalizedQty = Math.max(1, Math.min(qty, p.stock));
    const normalizedVariation = variation.trim();
    const lineKey = `${p.id}::${normalizedVariation.toLowerCase()}`;
    setCart((c) => {
      const found = c.find((l) => l.key === lineKey);
      if (found) {
        return c.map((l) =>
          l.key === lineKey
            ? { ...l, quantity: Math.min(l.quantity + normalizedQty, l.product.stock) }
            : l,
        );
      }
      return [
        ...c,
        {
          key: lineKey,
          product: p,
          quantity: normalizedQty,
          variation: normalizedVariation || null,
        },
      ];
    });
    toast.success(`${p.name} adicionado`);
  };

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) return setCart((c) => c.filter((l) => l.key !== key));
    setCart((c) =>
      c.map((l) =>
        l.key === key ? { ...l, quantity: Math.min(Math.max(qty, 1), l.product.stock) } : l,
      ),
    );
  };

  const removeLine = (key: string) => setCart((c) => c.filter((l) => l.key !== key));

  const placeOrder = async () => {
    if (!organization || !customerId) return toast.error("Cadastro do cliente não disponível");
    if (cart.length === 0) return toast.error("Adicione produtos ao carrinho");
    setPlacing(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        organization_id: organization.id,
        customer_id: customerId,
        seller_id: assignedSellerId,
        status: "enviado",
        notes: notes || null,
        order_number: 0,
      })
      .select("id")
      .single();
    if (error || !order) {
      setPlacing(false);
      return toast.error(userFacingDataError(error) ?? "Erro ao criar pedido");
    }
    const items = cart.map((l) => ({
      order_id: order.id,
      product_id: l.product.id,
      product_name: l.variation ? `${l.product.name} (${l.variation})` : l.product.name,
      quantity: l.quantity,
      unit_price: l.product.price,
      subtotal: l.product.price * l.quantity,
    }));
    const { error: itemsError } = await supabase.from("order_items").insert(items);
    setPlacing(false);
    if (itemsError) return toast.error(userFacingDataError(itemsError));
    toast.success("Pedido enviado com sucesso!");
    setCart([]);
    setNotes("");
    setCartOpen(false);
    setTab("orders");
    load();
  };

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <PageHeader
        title={`Olá, ${profile?.full_name?.split(" ")[0] ?? "cliente"}`}
        description={`Faça novos pedidos em ${organization?.name ?? "sua representação"}.`}
        action={
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetTrigger asChild>
              <Button className="relative">
                <ShoppingCart className="h-4 w-4" />
                Carrinho
                {cartCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1.5 text-xs font-bold text-primary">
                    {cartCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Seu carrinho</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto py-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ShoppingCart className="h-10 w-10 opacity-40" />
                    <p className="mt-3 text-sm">Carrinho vazio</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((l) => (
                      <div
                        key={l.key}
                        className="flex items-start gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{l.product.name}</div>
                          {l.variation && (
                            <div className="text-xs text-muted-foreground">Variação: {l.variation}</div>
                          )}
                          <div className="text-xs text-muted-foreground">{brl(l.product.price)} un.</div>
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQty(l.key, l.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              value={l.quantity}
                              onChange={(e) => updateQty(l.key, parseInt(e.target.value) || 0)}
                              className="h-7 w-14 text-center"
                            />
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQty(l.key, l.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{brl(l.product.price * l.quantity)}</div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground"
                            onClick={() => removeLine(l.key)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3">
                      <label className="text-sm font-medium">Observações</label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ex.: entregar no período da tarde"
                        className="mt-1.5"
                      />
                    </div>
                  </div>
                )}
              </div>
              <SheetFooter className="border-t pt-4">
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-lg">
                    <span>Total</span>
                    <span className="font-bold">{brl(cartTotal)}</span>
                  </div>
                  <Button
                    className="w-full h-11"
                    onClick={placeOrder}
                    disabled={placing || cart.length === 0}
                  >
                    {placing && <Loader2 className="h-4 w-4 animate-spin" />}
                    Enviar pedido
                  </Button>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as "catalog" | "orders")}>
        <TabsList>
          <TabsTrigger value="catalog">
            <Package className="h-4 w-4" /> Catálogo
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingCart className="h-4 w-4" /> Meus pedidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto, SKU ou categoria..."
              className="pl-9 h-11"
            />
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
              <PackageSearch className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Nenhum produto disponível.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col"
                >
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-12 w-12 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    {p.category && (
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {p.category}
                      </div>
                    )}
                    <h3 className="font-semibold mt-1 line-clamp-2">{p.name}</h3>
                    <div className="mt-1 text-xs text-muted-foreground">
                      SKU: {p.sku ?? "—"} • Estoque: {p.stock}
                    </div>
                    {p.description && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {p.description}
                      </p>
                    )}
                    <div className="mt-3 space-y-2">
                      <Input
                        value={draftVariationByProduct[p.id] ?? ""}
                        onChange={(e) =>
                          setDraftVariationByProduct((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        placeholder="Variação (ex.: cor azul, tam M)"
                        className="h-9"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={Math.max(p.stock, 1)}
                          value={draftQtyByProduct[p.id] ?? 1}
                          onChange={(e) =>
                            setDraftQtyByProduct((prev) => ({
                              ...prev,
                              [p.id]: Math.max(1, parseInt(e.target.value) || 1),
                            }))
                          }
                          className="h-9 w-24"
                        />
                        <div className="text-xs text-muted-foreground">Quantidade</div>
                      </div>
                    </div>
                    <div className="mt-auto pt-3 flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">{brl(p.price)}</span>
                      <Button
                        size="sm"
                        disabled={p.stock <= 0}
                        onClick={() =>
                          addToCart(
                            p,
                            draftQtyByProduct[p.id] ?? 1,
                            draftVariationByProduct[p.id] ?? "",
                          )
                        }
                      >
                        <Plus className="h-4 w-4" /> Adicionar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
              Você ainda não fez nenhum pedido.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-semibold">Pedido #{o.order_number}</div>
                    <div className="text-sm text-muted-foreground">{dt(o.created_at)}</div>
                    {o.notes && <div className="text-xs text-muted-foreground mt-1">{o.notes}</div>}
                  </div>
                  <div className="text-right">
                    <Badge variant={statusVariant[o.status] ?? "outline"}>
                      {statusLabels[o.status] ?? o.status}
                    </Badge>
                    <div className="font-bold mt-1">{brl(o.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
