import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";
import { normalizeProductImageUrls } from "@/lib/product-images";

/** Persistência do catálogo da representação escolhida (cliente com várias vínculos). */
const PORTAL_ORG_STORAGE_KEY = "2avendas.portalOrgId";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({ meta: [{ title: "Portal B2B — 2AVendas" }] }),
  component: Portal,
});

interface Product {
  id: string;
  owner_seller_id: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  price: number;
  stock: number;
  category: string | null;
  supplier: string | null;
  image_url: string | null;
  image_urls: unknown;
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

function CatalogProductCard({
  p,
  draftQty,
  draftVariation,
  onDraftQty,
  onDraftVariation,
  onAdd,
}: {
  p: Product;
  draftQty: number;
  draftVariation: string;
  onDraftQty: (n: number) => void;
  onDraftVariation: (v: string) => void;
  onAdd: () => void;
}) {
  const gallery = normalizeProductImageUrls(p.image_urls, p.image_url);
  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [p.id]);
  const shown = gallery.length ? gallery[Math.min(idx, gallery.length - 1)] : null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[border-color,box-shadow] hover:border-primary/25 hover:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-b from-muted to-muted/70 ring-2 ring-border transition-[ring-color] group-hover:ring-primary/20">
        {shown ? (
          <img
            src={shown}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-14 w-14 text-muted-foreground/35" />
          </div>
        )}
        {gallery.length > 1 && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md opacity-90"
              onClick={(e) => {
                e.stopPropagation();
                setIdx((i) => (i - 1 + gallery.length) % gallery.length);
              }}
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md opacity-90"
              onClick={(e) => {
                e.stopPropagation();
                setIdx((i) => (i + 1) % gallery.length);
              }}
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 px-2">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "w-4 bg-primary" : "w-1.5 bg-background/80 ring-1 ring-border"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIdx(i);
                  }}
                  aria-label={`Foto ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {p.supplier?.trim() ? (
        <div className="flex items-center gap-2 border-b border-border bg-primary/[0.06] px-3 py-2.5">
          <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Indústria</div>
            <div className="truncate text-sm font-semibold text-foreground">{p.supplier.trim()}</div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-4">
        {p.category && (
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{p.category}</div>
        )}
        <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug">{p.name}</h3>
        <div className="mt-1 text-xs text-muted-foreground">
          SKU: {p.sku ?? "—"} • Estoque: {p.stock}
        </div>
        {p.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{p.description}</p>
        )}
        <div className="mt-3 space-y-2">
          <Input
            value={draftVariation}
            onChange={(e) => onDraftVariation(e.target.value)}
            placeholder="Variação (ex.: cor azul, tam M)"
            className="h-9"
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={Math.max(p.stock, 1)}
              value={draftQty}
              onChange={(e) => onDraftQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="h-9 w-24"
            />
            <div className="text-xs text-muted-foreground">Quantidade</div>
          </div>
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">{brl(p.price)}</span>
          <Button size="sm" disabled={p.stock <= 0} onClick={onAdd}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </div>
      </div>
    </div>
  );
}

interface LinkedOrg {
  id: string;
  name: string;
}

function Portal() {
  useMenuGate("portal");
  const { user, profile, organization } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [portalOrgId, setPortalOrgId] = useState<string | null>(null);
  const [linkedOrgs, setLinkedOrgs] = useState<LinkedOrg[]>([]);
  const [pinnedOrgId, setPinnedOrgId] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(PORTAL_ORG_STORAGE_KEY) : null,
  );

  useEffect(() => {
    // Atualiza a empresa escolhida no portal quando a sidebar do cliente mudar o contexto.
    const handler = () => {
      const next =
        typeof window !== "undefined" ? sessionStorage.getItem(PORTAL_ORG_STORAGE_KEY) : null;
      setPinnedOrgId(next);
    };
    window.addEventListener("portal-org-changed", handler);
    return () => window.removeEventListener("portal-org-changed", handler);
  }, []);

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [draftQtyByProduct, setDraftQtyByProduct] = useState<Record<string, number>>({});
  const [draftVariationByProduct, setDraftVariationByProduct] = useState<Record<string, string>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [tab, setTab] = useState<"catalog" | "orders">("catalog");
  const inviteToastRef = useRef<string | null>(null);
  const inviteToken =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("invite")
      : null;

  const ensureCustomer = async (
    orgId: string,
    sellerHint: string | null,
  ): Promise<{ customerId: string | null; sellerId: string | null }> => {
    if (!user?.id) return { customerId: null, sellerId: null };
    const { data: existing } = await supabase
      .from("customers")
      .select("id, assigned_seller_id")
      .eq("user_id", user.id)
      .eq("organization_id", orgId)
      .maybeSingle();
    if (existing) {
      if (sellerHint && existing.assigned_seller_id !== sellerHint) {
        await supabase
          .from("customers")
          .update({ assigned_seller_id: sellerHint })
          .eq("id", existing.id);
      }
      return {
        customerId: existing.id,
        sellerId: sellerHint ?? existing.assigned_seller_id ?? null,
      };
    }
    const clientName =
      profile?.organization_client?.trim() ||
      profile?.full_name?.trim() ||
      user.email ||
      "Cliente";
    const clientLegal = profile?.organization_client_legal?.trim() || null;
    const clientIndustry = profile?.organization_client_industry?.trim() || null;
    const { data, error } = await supabase
      .from("customers")
      .insert({
        organization_id: orgId,
        user_id: user.id,
        name: clientName,
        legal_name: clientLegal,
        industry: clientIndustry,
        email: user.email ?? null,
        assigned_seller_id: sellerHint,
      })
      .select("id")
      .single();
    if (error) {
      toast.error("Não foi possível criar seu cadastro: " + userFacingDataError(error));
      return { customerId: null, sellerId: null };
    }
    return { customerId: data.id, sellerId: sellerHint ?? null };
  };

  const load = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const emailLower = (user.email ?? "").toLowerCase();

    let inviteOrgId: string | null = null;
    let sellerFromInviteUrl: string | null = null;
    if (inviteToken) {
      const { data: invRow } = await supabase
        .from("seller_invitations")
        .select("id, organization_id, invited_by, purpose, expires_at, accepted_at, email")
        .eq("token", inviteToken)
        .eq("purpose", "client_catalog")
        .maybeSingle();
      const ok =
        invRow &&
        new Date(invRow.expires_at).getTime() > Date.now() &&
        invRow.invited_by &&
        (invRow.email ?? "").toLowerCase() === emailLower;
      if (ok) {
        sellerFromInviteUrl = invRow.invited_by;
        inviteOrgId = invRow.organization_id;
        if (!invRow.accepted_at) {
          await supabase
            .from("seller_invitations")
            .update({ accepted_at: new Date().toISOString() })
            .eq("id", invRow.id);
        }
      } else if (inviteToastRef.current !== inviteToken) {
        inviteToastRef.current = inviteToken;
        toast.error("Este convite não corresponde ao seu e-mail ou está expirado.");
      }
    }

    const { data: inviteRows } = await supabase
      .from("seller_invitations")
      .select("organization_id, invited_by, accepted_at")
      .eq("purpose", "client_catalog")
      .eq("email", emailLower);

    const orgIdSet = new Set<string>();
    for (const row of inviteRows ?? []) {
      if (row.accepted_at && row.organization_id) orgIdSet.add(row.organization_id);
    }

    const { data: custRows } = await supabase
      .from("customers")
      .select("organization_id")
      .eq("user_id", user.id);
    for (const c of custRows ?? []) {
      if (c.organization_id) orgIdSet.add(c.organization_id);
    }

    const orgIds = [...orgIdSet];
    let orgList: LinkedOrg[] = [];
    if (orgIds.length > 0) {
      const { data: orgRows } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      orgList = ((orgRows ?? []) as LinkedOrg[]).sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR"),
      );
    }
    setLinkedOrgs(orgList);

    const linkedIdSet = new Set(orgList.map((o) => o.id));
    let chosenOrgId: string | null = null;
    if (inviteOrgId && linkedIdSet.has(inviteOrgId)) {
      chosenOrgId = inviteOrgId;
    } else if (pinnedOrgId && linkedIdSet.has(pinnedOrgId)) {
      chosenOrgId = pinnedOrgId;
    } else if (organization?.id && linkedIdSet.has(organization.id)) {
      chosenOrgId = organization.id;
    } else if (orgList[0]) {
      chosenOrgId = orgList[0].id;
    }

    if (chosenOrgId && chosenOrgId !== pinnedOrgId && linkedIdSet.has(chosenOrgId)) {
      setPinnedOrgId(chosenOrgId);
      sessionStorage.setItem(PORTAL_ORG_STORAGE_KEY, chosenOrgId);
    }

    setPortalOrgId(chosenOrgId);

    if (!chosenOrgId) {
      setCustomerId(null);
      setProducts([]);
      setOrders([]);
      setLoading(false);
      return;
    }

    const sellerHintForOrg =
      inviteOrgId === chosenOrgId ? sellerFromInviteUrl : null;
    const ensured = await ensureCustomer(chosenOrgId, sellerHintForOrg);
    const cid = ensured.customerId;
    const sellerFromRow = ensured.sellerId;

    setCustomerId(cid);

    const sellersFromInvites = Array.from(
      new Set(
        (inviteRows ?? [])
          .filter(
            (r) =>
              r.organization_id === chosenOrgId &&
              r.accepted_at &&
              typeof r.invited_by === "string" &&
              r.invited_by,
          )
          .map((r) => r.invited_by as string),
      ),
    );

    const effectiveSellers = Array.from(
      new Set([...sellersFromInvites, ...(sellerFromRow ? [sellerFromRow] : [])]),
    );

    const productsQuery = supabase
      .from("products")
      .select("id,owner_seller_id,name,sku,description,price,stock,category,supplier,image_url,image_urls")
      .eq("organization_id", chosenOrgId)
      .eq("active", true)
      .order("name");

    const [{ data: prods }, { data: ords }] = await Promise.all([
      effectiveSellers.length > 0
        ? productsQuery.or(
            `owner_seller_id.in.(${effectiveSellers.join(",")}),owner_seller_id.is.null`,
          )
        : productsQuery,
      cid
        ? supabase
            .from("orders")
            .select("id,order_number,status,total,notes,created_at")
            .eq("customer_id", cid)
            .eq("organization_id", chosenOrgId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as OrderRow[] }),
    ]);
    setProducts((prods as Product[]) ?? []);
    setOrders((ords as OrderRow[]) ?? []);
    setLoading(false);
  };

  const onPortalOrgChange = (nextId: string) => {
    setPinnedOrgId(nextId);
    sessionStorage.setItem(PORTAL_ORG_STORAGE_KEY, nextId);
    setCart([]);
    if (typeof window !== "undefined" && window.location.search.includes("invite=")) {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    }
  };

  useEffect(() => {
    if (user?.id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, organization?.id, inviteToken, pinnedOrgId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.supplier ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.product.price * l.quantity, 0),
    [cart],
  );
  const cartCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  const addToCart = (p: Product, qty: number, variation: string) => {
    if (p.stock <= 0) return toast.error("Produto sem estoque");
    if (!p.owner_seller_id) return toast.error("Produto sem vendedor responsável.");
    const existingSeller = cart[0]?.product.owner_seller_id ?? null;
    if (existingSeller && existingSeller !== p.owner_seller_id) {
      return toast.error(
        "Seu carrinho só pode ter produtos de uma empresa por vez. Finalize ou limpe o carrinho para trocar.",
      );
    }
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
    const orderOrgId = portalOrgId ?? organization?.id;
    if (!orderOrgId || !customerId) return toast.error("Cadastro do cliente não disponível");
    if (cart.length === 0) return toast.error("Adicione produtos ao carrinho");
    const orderSellerId = cart[0]?.product.owner_seller_id ?? null;
    if (!orderSellerId) {
      return toast.error("Não foi possível identificar a empresa deste pedido.");
    }
    setPlacing(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        organization_id: orderOrgId,
        customer_id: customerId,
        seller_id: orderSellerId,
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
        description={
          linkedOrgs.length === 0
            ? "Você ainda não tem vínculo com uma representação. Use o link enviado pelo seu representante ou confirme se o convite já foi aceito."
            : linkedOrgs.length > 1
              ? "Escolha abaixo qual representação deseja ver; produtos e pedidos são só da empresa selecionada."
              : `Catálogo da representação ${linkedOrgs[0]?.name ?? organization?.name ?? ""}.`
        }
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
                    {cart.map((l) => {
                      const cartThumb = normalizeProductImageUrls(l.product.image_urls, l.product.image_url)[0];
                      return (
                      <div
                        key={l.key}
                        className="flex items-start gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          {cartThumb ? (
                            <img src={cartThumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{l.product.name}</div>
                          {l.product.supplier?.trim() && (
                            <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3 shrink-0 text-primary/80" aria-hidden />
                              <span className="truncate">{l.product.supplier.trim()}</span>
                            </div>
                          )}
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
                    );
                    })}
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

      {linkedOrgs.length > 1 && portalOrgId ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <Building2 className="h-5 w-5 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Representação (catálogo e pedidos)
            </p>
            <Select value={portalOrgId} onValueChange={onPortalOrgChange}>
              <SelectTrigger className="h-10 w-full max-w-md bg-background">
                <SelectValue placeholder="Escolha a empresa" />
              </SelectTrigger>
              <SelectContent>
                {linkedOrgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : linkedOrgs.length === 1 && portalOrgId ? (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-primary/[0.06] px-4 py-3 text-sm">
          <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span className="text-muted-foreground">Catálogo de</span>
          <span className="font-semibold text-foreground">{linkedOrgs[0].name}</span>
        </div>
      ) : null}

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
              placeholder="Buscar produto, SKU, categoria ou indústria..."
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
                <CatalogProductCard
                  key={p.id}
                  p={p}
                  draftQty={draftQtyByProduct[p.id] ?? 1}
                  draftVariation={draftVariationByProduct[p.id] ?? ""}
                  onDraftQty={(n) => setDraftQtyByProduct((prev) => ({ ...prev, [p.id]: n }))}
                  onDraftVariation={(v) =>
                    setDraftVariationByProduct((prev) => ({ ...prev, [p.id]: v }))
                  }
                  onAdd={() =>
                    addToCart(p, draftQtyByProduct[p.id] ?? 1, draftVariationByProduct[p.id] ?? "")
                  }
                />
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
