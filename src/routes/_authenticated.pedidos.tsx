import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { brl, dt, moneyNumber } from "@/lib/format";
import { formatPct } from "@/lib/commission";
import {
  fetchOrderCommissionLinesByOrderIds,
  viewerCommissionForOrder,
  type OrderCommissionLine,
} from "@/lib/order-commission";
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Plus,
  Loader2,
  ShoppingBag,
  Trash2,
  Building2,
  Package,
  Search,
  FileText,
  Download,
  User,
} from "lucide-react";
import { WhatsAppGlyph } from "@/components/icons/whatsapp";
import { useMenuGate } from "@/hooks/use-menu-gate";
import { userFacingDataError } from "@/lib/supabase-user-error";
import { normalizeProductImageUrls } from "@/lib/product-images";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { downloadCsv } from "@/lib/csv-download";
import { recordOutreach, whatsAppShareUrl } from "@/lib/outreach";
import { SavedViewsBar } from "@/components/SavedViewsBar";
import {
  buildOrderWhatsAppMessage,
  fetchOrderItemsByOrderIds,
  fetchOrderTotalsFallback,
  formatOrderCode,
  formatOrderItemsPreview,
  repLabelForSellerId,
  type OrderItemLineSummary,
} from "@/lib/order-display";

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
  seller_id: string | null;
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

interface OrderItemLine {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  thumb_url: string | null;
}

function isPedidoRowInteractiveTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return !!el.closest("button,a,[role=combobox],[data-radix-select-viewport]");
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
  const { organization, user, role, profile } = useAuth();
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
  const [commissionBySeller, setCommissionBySeller] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<Order | null>(null);
  const [deletingOrder, setDeletingOrder] = useState(false);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [orderDetailLines, setOrderDetailLines] = useState<OrderItemLine[]>([]);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderDetailSellerLabel, setOrderDetailSellerLabel] = useState<string | null>(null);
  const [primaryAdminUserId, setPrimaryAdminUserId] = useState<string | null>(null);
  const [sellerProfiles, setSellerProfiles] = useState<
    Record<string, { full_name: string | null; email: string | null }>
  >({});
  const [orderItemsByOrderId, setOrderItemsByOrderId] = useState<
    Record<string, OrderItemLineSummary[]>
  >({});
  const [commissionLinesByOrderId, setCommissionLinesByOrderId] = useState<
    Record<string, OrderCommissionLine[]>
  >({});

  const load = async () => {
    setLoading(true);
    const orgId = organization?.id;
    let primaryAdmin: string | null = null;
    if (orgId) {
      const { data: adminId } = await supabase.rpc("organization_primary_admin_user_id", {
        p_org_id: orgId,
      });
      primaryAdmin = (adminId as string | null) ?? null;
      setPrimaryAdminUserId(primaryAdmin);
    }

    let ordersQuery = supabase
      .from("orders")
      .select(
        "id,order_number,status,total,notes,created_at,customer_id,seller_id,nfe_key,nfe_issued_at,customers(name,legal_name,industry,email,phone,document,city,state,address,assigned_seller_id)",
      )
      .order("created_at", { ascending: false });
    if (role === "vendedor" && user?.id) {
      const { data: myClients } = await supabase
        .from("customers")
        .select("id")
        .eq("assigned_seller_id", user.id);
      const clientIds = (myClients ?? []).map((c: { id: string }) => c.id);
      if (clientIds.length > 0) {
        ordersQuery = ordersQuery.or(
          `seller_id.eq.${user.id},customer_id.in.(${clientIds.join(",")})`,
        );
      } else {
        ordersQuery = ordersQuery.eq("seller_id", user.id);
      }
    }
    const { data, error } = await ordersQuery;
    if (error) toast.error(userFacingDataError(error));
    const list = (data as unknown as Order[]) ?? [];
    const zeroIds = list.filter((o) => moneyNumber(o.total) <= 0).map((o) => o.id);
    const totalsFallback = await fetchOrderTotalsFallback(supabase, zeroIds);
    const normalized = list.map((o) => {
      const fromDb = moneyNumber(o.total);
      const fixed = fromDb > 0 ? fromDb : moneyNumber(totalsFallback[o.id] ?? 0);
      return { ...o, total: fixed };
    });
    setOrders(normalized);
    const itemsByOrder = await fetchOrderItemsByOrderIds(
      supabase,
      normalized.map((o) => o.id),
    );
    setOrderItemsByOrderId(itemsByOrder);
    const commissionLines = await fetchOrderCommissionLinesByOrderIds(
      supabase,
      normalized.map((o) => o.id),
    );
    setCommissionLinesByOrderId(commissionLines);

    const sellerIds = [
      ...new Set(
        normalized
          .map((o) => o.seller_id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ];
    if (primaryAdmin && !sellerIds.includes(primaryAdmin)) sellerIds.push(primaryAdmin);
    if (sellerIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", sellerIds);
      const map: Record<string, { full_name: string | null; email: string | null }> = {};
      for (const p of profs ?? []) {
        const row = p as { id: string; full_name: string | null; email: string | null };
        map[row.id] = { full_name: row.full_name, email: row.email };
      }
      setSellerProfiles(map);
    } else {
      setSellerProfiles({});
    }

    const nextPct: Record<string, number> = {};
    if (orgId) {
      if (role === "vendedor" && user?.id) {
        const { data: row } = await supabase
          .from("organization_seller_commissions")
          .select("commission_pct")
          .eq("organization_id", orgId)
          .eq("seller_user_id", user.id)
          .maybeSingle();
        nextPct[user.id] = Number((row as { commission_pct?: number } | null)?.commission_pct) || 0;
      } else if (role === "admin") {
        const sellerIds = [
          ...new Set(
            list.map((o) => o.seller_id).filter((id): id is string => typeof id === "string" && id.length > 0),
          ),
        ];
        if (sellerIds.length > 0) {
          const { data: rows } = await supabase
            .from("organization_seller_commissions")
            .select("seller_user_id, commission_pct")
            .eq("organization_id", orgId)
            .in("seller_user_id", sellerIds);
          for (const r of rows ?? []) {
            const row = r as { seller_user_id: string; commission_pct: number };
            nextPct[row.seller_user_id] = Number(row.commission_pct) || 0;
          }
        }
      }
    }
    setCommissionBySeller(nextPct);

    let customersQuery = supabase
      .from("customers")
      .select("id,name,legal_name")
      .order("name");
    let productsQuery = supabase
      .from("products")
      .select("id,name,price,category,supplier,image_url,image_urls")
      .eq("active", true)
      .order("name");
    if (orgId) {
      customersQuery = customersQuery.eq("organization_id", orgId);
      productsQuery = productsQuery.eq("organization_id", orgId);
    }
    if (role === "vendedor" && user?.id) {
      customersQuery = customersQuery.eq("assigned_seller_id", user.id);
      productsQuery = productsQuery.or(
        `owner_seller_id.eq.${user.id},owner_seller_id.is.null`,
      );
    }
    const [{ data: cs, error: csErr }, { data: ps, error: psErr }] = await Promise.all([
      customersQuery,
      productsQuery,
    ]);
    if (csErr) toast.error(userFacingDataError(csErr));
    if (psErr) toast.error(userFacingDataError(psErr));
    setCustomers((cs as CustomerOpt[]) ?? []);
    setProducts(
      ((ps as ProductOpt[]) ?? []).map((p) => ({
        ...p,
        price: moneyNumber(p.price),
      })),
    );
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

  const newOrdersCount = useMemo(
    () => orders.filter((o) => o.status === "enviado").length,
    [orders],
  );

  const ordersFiltered = useMemo(() => {
    if (statusFilter === "__new__") {
      return orders.filter((o) => o.status === "enviado");
    }
    if (statusFilter === "__all__") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const exportOrdersCsv = () => {
    downloadCsv(
      `pedidos-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "Código",
        "Status",
        "Cliente",
        "Produtos",
        "Data",
        "Total",
        "Comissão_estimada",
        "Email",
        "Telefone",
      ],
      ordersFiltered.map((o) => {
        const sid = o.seller_id;
        const pct = sid && commissionBySeller[sid] != null ? commissionBySeller[sid] : 0;
        const est =
          sid && user?.id
            ? viewerCommissionForOrder(commissionLinesByOrderId[o.id] ?? [], pct, {
                sellerId: sid,
                adminUserId: user.id,
                viewerRole: role,
                viewerUserId: user.id,
              })
            : null;
        return [
          formatOrderCode(o.order_number),
          statusLabels[o.status] ?? o.status,
          o.customers?.name ?? "",
          formatOrderItemsPreview(orderItemsByOrderId[o.id]) || "—",
          o.created_at.slice(0, 19).replace("T", " "),
          o.total,
          est ?? "",
          o.customers?.email ?? "",
          o.customers?.phone ?? "",
        ];
      }),
    );
    toast.success("CSV gerado.");
  };

  const shareOrderWhatsApp = async (o: Order) => {
    const phone = o.customers?.phone?.trim();
    if (!phone) return toast.error("Cliente sem telefone.");
    if (!organization?.id) return;
    const code = formatOrderCode(o.order_number);
    let lines = orderItemsByOrderId[o.id] ?? [];
    if (lines.length === 0) {
      const { data, error: itemsErr } = await supabase
        .from("order_items")
        .select("product_name,quantity")
        .eq("order_id", o.id)
        .order("created_at", { ascending: true });
      if (itemsErr) {
        toast.error(userFacingDataError(itemsErr) ?? "Não foi possível carregar os itens do pedido.");
        return;
      }
      lines = (data ?? []).map((row) => ({
        product_name: String((row as { product_name?: string }).product_name ?? "").trim() || "Produto",
        quantity: Math.max(1, Math.trunc(moneyNumber((row as { quantity?: number }).quantity)) || 1),
      }));
    }

    const representationName =
      profile?.organization_staff?.trim() ||
      organization.name?.trim() ||
      "Representação";
    const customerName = o.customers?.name?.trim() || "Cliente";

    const msg = buildOrderWhatsAppMessage({
      representationName,
      orderCode: code,
      customerName,
      customerLegalName: o.customers?.legal_name,
      items: lines,
      totalLabel: brl(o.total),
      statusLabel: statusLabels[o.status] ?? o.status,
    });

    const url = whatsAppShareUrl(phone, msg);
    if (!url) return toast.error("Telefone inválido.");
    window.open(url, "_blank", "noopener,noreferrer");
    const { error } = await recordOutreach(supabase, {
      organization_id: organization.id,
      channel: "whatsapp",
      summary: `Pedido ${code} — WhatsApp`,
      body: msg,
      customer_id: o.customer_id,
      order_id: o.id,
    });
    if (error) toast.error("WhatsApp aberto, mas o registro no sistema falhou.");
    else toast.success("Envio registrado.");
  };

  const total = useMemo(
    () =>
      items.reduce((s, it) => s + moneyNumber(it.unit_price) * moneyNumber(it.quantity), 0),
    [items],
  );

  const draftTotals = useMemo(() => {
    let units = 0;
    for (const it of items) {
      units += Math.max(1, Math.trunc(moneyNumber(it.quantity)) || 1);
    }
    return { lines: items.length, units };
  }, [items]);

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
          unit_price: moneyNumber(p.price),
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
      .select("id,order_number")
      .single();
    if (error || !ord) {
      setSaving(false);
      return toast.error(userFacingDataError(error) ?? "Falha ao criar pedido");
    }
    let resolvedNumber = Math.trunc(moneyNumber(ord.order_number));
    if (resolvedNumber <= 0) {
      const { data: ensured, error: ensureErr } = await supabase.rpc("ensure_order_number", {
        p_order_id: ord.id,
      });
      if (ensureErr || ensured == null || Math.trunc(moneyNumber(ensured)) <= 0) {
        await supabase.from("orders").delete().eq("id", ord.id);
        setSaving(false);
        return toast.error(
          userFacingDataError(ensureErr) ??
            "Não foi possível gerar o código do pedido. Rode as migrações do Supabase (ensure_order_number) e tente de novo.",
        );
      }
      resolvedNumber = Math.trunc(moneyNumber(ensured));
    }

    const { error: errIt } = await supabase.from("order_items").insert(
      items.map((it) => {
        const unit = moneyNumber(it.unit_price);
        const qty = Math.max(1, Math.trunc(moneyNumber(it.quantity)) || 1);
        return {
          order_id: ord.id,
          product_id: it.product_id,
          product_name: it.product_name,
          unit_price: unit,
          quantity: qty,
          subtotal: Math.round(unit * qty * 100) / 100,
        };
      }),
    );
    setSaving(false);
    if (errIt) {
      await supabase.from("orders").delete().eq("id", ord.id);
      return toast.error(userFacingDataError(errIt));
    }
    toast.success(
      resolvedNumber > 0
        ? `Pedido ${formatOrderCode(resolvedNumber)} criado.`
        : "Pedido criado.",
    );
    setOpen(false);
    reset();
    load();
  };

  const changeStatus = async (id: string, status: OrderStatus) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error(userFacingDataError(error) ?? "Não foi possível alterar o status.");
    } else {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      if (orderDetail?.id === id) setOrderDetail({ ...orderDetail, status });
      toast.success("Status atualizado.");
      void load();
    }
  };

  const openOrderDetail = useCallback(async (o: Order) => {
    setOrderDetail(o);
    setOrderDetailLoading(true);
    setOrderDetailLines([]);
    setOrderDetailSellerLabel(null);
    const [{ data: lineRows, error: lineErr }, profRes] = await Promise.all([
      supabase
        .from("order_items")
        .select("id,product_name,quantity,unit_price,subtotal,products(image_url,image_urls)")
        .eq("order_id", o.id)
        .order("created_at", { ascending: true }),
      o.seller_id
        ? supabase.from("profiles").select("full_name,email").eq("id", o.seller_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setOrderDetailLoading(false);
    if (lineErr) {
      toast.error(userFacingDataError(lineErr) ?? "Não foi possível carregar os itens.");
      return;
    }
    setOrderDetailLines(
      ((lineRows ?? []) as {
        id: string;
        product_name: string;
        quantity: number;
        unit_price: unknown;
        subtotal: unknown;
        products: { image_url: string | null; image_urls: unknown } | null;
      }[]).map((row) => ({
        id: row.id,
        product_name: row.product_name,
        quantity: row.quantity,
        unit_price: moneyNumber(row.unit_price),
        subtotal: moneyNumber(row.subtotal),
        thumb_url:
          normalizeProductImageUrls(row.products?.image_urls, row.products?.image_url)[0] ?? null,
      })),
    );
    if (o.seller_id) {
      const p = profRes.data as { full_name: string | null; email: string | null } | null;
      const map = {
        [o.seller_id]: { full_name: p?.full_name ?? null, email: p?.email ?? null },
      };
      setOrderDetailSellerLabel(
        repLabelForSellerId(o.seller_id, primaryAdminUserId, map, user?.id),
      );
    } else {
      setOrderDetailSellerLabel("Administrador");
    }
  }, [primaryAdminUserId, user?.id]);

  const confirmDeleteOrder = async () => {
    if (!deleteOrderTarget) return;
    setDeletingOrder(true);
    try {
      const { error } = await supabase.from("orders").delete().eq("id", deleteOrderTarget.id);
      if (error) {
        toast.error(userFacingDataError(error) ?? "Não foi possível excluir o pedido.");
        return;
      }
      toast.success("Pedido excluído.");
      setDeleteOrderTarget(null);
      await load();
    } finally {
      setDeletingOrder(false);
    }
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
    <div className="p-6 lg:p-10 space-y-6 pb-28 lg:pb-10">
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
                    <SelectContent className="z-[200] max-h-[min(320px,55vh)]">
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
                        <SelectValue placeholder="Escolha um produto" />
                      </SelectTrigger>
                      <SelectContent className="z-[200] max-h-[min(380px,65vh)]">
                        {pickProductsFiltered.length === 0 ? (
                          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            {products.length === 0
                              ? "Nenhum produto ativo no catálogo. Cadastre em Catálogo."
                              : "Nenhum produto encontrado para essa busca."}
                          </div>
                        ) : (
                          pickProductsFiltered.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="py-2.5">
                              <span className="flex flex-col gap-0.5 text-left">
                                <span className="font-medium leading-tight">{p.name}</span>
                                <span className="text-xs font-normal text-muted-foreground">
                                  {(p.category?.trim() || "Sem categoria") +
                                    (p.supplier?.trim() ? ` · ${p.supplier.trim()}` : "")}
                                  {" · "}
                                  {brl(p.price)}
                                </span>
                              </span>
                            </SelectItem>
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
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2.5 text-sm">
                      <p className="text-foreground">
                        <span className="font-semibold tabular-nums">{draftTotals.lines}</span>{" "}
                        {draftTotals.lines === 1 ? "linha" : "linhas"}{" "}
                        <span className="text-muted-foreground">·</span>{" "}
                        <span className="font-semibold tabular-nums">{draftTotals.units}</span> unidades
                        no total
                      </p>
                    </div>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <div className="max-h-[min(380px,48vh)] overflow-auto">
                        <Table>
                          <TableHeader className="sticky top-0 z-10 border-b border-border bg-card">
                            <TableRow className="border-0 hover:bg-transparent">
                              <TableHead className="w-11 text-center text-muted-foreground font-normal">
                                Nº
                              </TableHead>
                              <TableHead className="min-w-[200px]">Produto</TableHead>
                              <TableHead className="w-[6.5rem] min-w-[6.5rem]">Qtd</TableHead>
                              <TableHead className="w-[7.5rem] min-w-[7.5rem]">Preço</TableHead>
                              <TableHead className="w-28 min-w-[7rem] text-right">Subtotal</TableHead>
                              <TableHead className="w-12 p-2" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((it, idx) => (
                              <TableRow key={it.product_id}>
                                <TableCell className="text-center tabular-nums text-muted-foreground font-medium align-top pt-4">
                                  {idx + 1}
                                </TableCell>
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
                                <TableCell className="align-top">
                                  <Input
                                    type="number"
                                    min={1}
                                    className="tabular-nums text-right min-w-[5.25rem] w-full h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    value={it.quantity}
                                    onChange={(e) =>
                                      updateItem(idx, {
                                        quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
                                      })
                                    }
                                  />
                                </TableCell>
                                <TableCell className="align-top">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className="tabular-nums text-right min-w-[6.25rem] w-full h-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    value={moneyNumber(it.unit_price)}
                                    onChange={(e) =>
                                      updateItem(idx, {
                                        unit_price: moneyNumber(e.target.value),
                                      })
                                    }
                                  />
                                </TableCell>
                                <TableCell className="text-right font-medium tabular-nums align-top pt-4">
                                  {brl(moneyNumber(it.unit_price) * moneyNumber(it.quantity))}
                                </TableCell>
                                <TableCell className="align-top p-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setItems(items.filter((_, i) => i !== idx))
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex justify-end items-center gap-3 px-4 py-3 bg-secondary/30 border-t border-border">
                        <span className="text-sm text-muted-foreground">Total</span>
                        <span className="text-lg font-bold tabular-nums">{brl(total)}</span>
                      </div>
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Filtrar status</span>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[168px] h-9">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os status</SelectItem>
              <SelectItem value="__new__">
                Novos{newOrdersCount > 0 ? ` (${newOrdersCount})` : ""}
              </SelectItem>
              {(Object.keys(statusLabels) as OrderStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {organization?.id && user?.id ? (
          <SavedViewsBar<{ statusFilter: string }>
            pageKey="pedidos"
            userId={user.id}
            orgId={organization.id}
            snapshot={{ statusFilter }}
            onApply={(p) => setStatusFilter(p.statusFilter)}
          />
        ) : null}
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1" onClick={exportOrdersCsv}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

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
        ) : ordersFiltered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Nenhum pedido com o status selecionado.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="min-w-[200px] max-w-[280px]">Produtos</TableHead>
                <TableHead className="hidden xl:table-cell">Contato</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Representante</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right whitespace-nowrap" title="Percentual configurado em Vendedores">
                  Comissão (est.)
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[100px]">NF-e</TableHead>
                <TableHead className="w-[52px] text-center text-muted-foreground" title="Excluir pedido">
                  <Trash2 className="h-3.5 w-3.5 mx-auto text-destructive opacity-80" aria-hidden />
                  <span className="sr-only">Excluir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersFiltered.map((o) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={(e) => {
                    if (isPedidoRowInteractiveTarget(e.target)) return;
                    void openOrderDetail(o);
                  }}
                >
                  <TableCell className="font-mono text-sm tabular-nums">
                    {formatOrderCode(o.order_number)}
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
                    {o.customers?.phone?.trim() ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 h-8 gap-1.5 border-[#25D366]/40 bg-[#25D366]/[0.07] px-2.5 hover:bg-[#25D366]/14"
                        title="Abrir WhatsApp com resumo deste pedido para o cliente"
                        onClick={(e) => {
                          e.stopPropagation();
                          void shareOrderWhatsApp(o);
                        }}
                      >
                        <WhatsAppGlyph className="h-3.5 w-3.5 shrink-0 text-[#25D366]" />
                        <span className="text-xs font-medium leading-none">WhatsApp</span>
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    {(orderItemsByOrderId[o.id] ?? []).length === 0 ? (
                      <span className="text-sm text-muted-foreground">—</span>
                    ) : (
                      <ul className="space-y-1 text-sm max-w-[280px]">
                        {(orderItemsByOrderId[o.id] ?? []).slice(0, 5).map((it, idx) => (
                          <li key={`${o.id}-${idx}`} className="leading-snug">
                            <span className="font-medium text-foreground">{it.product_name}</span>
                            {it.quantity > 1 ? (
                              <span className="text-muted-foreground"> · {it.quantity} un.</span>
                            ) : null}
                          </li>
                        ))}
                        {(orderItemsByOrderId[o.id]?.length ?? 0) > 5 ? (
                          <li className="text-xs text-muted-foreground">
                            +{(orderItemsByOrderId[o.id]!.length - 5)} itens — clique para ver todos
                          </li>
                        ) : null}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">
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
                  <TableCell className="text-muted-foreground">{dt(o.created_at)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[140px]">
                    {repLabelForSellerId(o.seller_id, primaryAdminUserId, sellerProfiles, user?.id)}
                  </TableCell>
                  <TableCell className="text-right font-medium">{brl(o.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(() => {
                      const sid = o.seller_id;
                      const pct =
                        sid && commissionBySeller[sid] != null ? commissionBySeller[sid] : 0;
                      const est =
                        sid && user?.id
                          ? viewerCommissionForOrder(commissionLinesByOrderId[o.id] ?? [], pct, {
                              sellerId: sid,
                              adminUserId: user.id,
                              viewerRole: role,
                              viewerUserId: user.id,
                            })
                          : 0;
                      return (
                        <span
                          className="text-muted-foreground"
                          title={
                            sid
                              ? role === "admin"
                                ? `Sua fatia (rep.) — vendedor ${formatPct(pct)} sobre comissão da indústria`
                                : `${formatPct(pct)} sobre a comissão da indústria por linha`
                              : "Sem vendedor no pedido — comissão não aplicável"
                          }
                        >
                          {sid ? brl(est) : "—"}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
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
                      {o.status === "enviado" ? (
                        <Badge
                          variant="outline"
                          className="whitespace-nowrap border-emerald-300/80 bg-emerald-100/90 text-emerald-900 shadow-sm motion-safe:animate-pulse"
                        >
                          Novo pedido do cliente
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      title="Registrar NF-e emitida externamente"
                      onClick={(e) => {
                        e.stopPropagation();
                        openNfeDialog(o);
                      }}
                    >
                      <FileText className="h-4 w-4" />
                      {o.nfe_key?.trim() ? "Editar" : "Registrar"}
                    </Button>
                  </TableCell>
                  <TableCell className="text-center p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Apagar pedido"
                      aria-label="Apagar pedido"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteOrderTarget(o);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Sheet
        open={orderDetail !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOrderDetail(null);
            setOrderDetailLines([]);
            setOrderDetailSellerLabel(null);
          }
        }}
      >
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden sm:max-w-md">
          {orderDetail ? (
            <>
              <SheetHeader className="space-y-1 pr-8 text-left">
                <SheetTitle className="text-lg">
                  Pedido {formatOrderCode(orderDetail.order_number)}
                </SheetTitle>
                {orderDetail.status === "enviado" ? (
                  <Badge
                    variant="outline"
                    className="mt-2 w-fit border-emerald-300/80 bg-emerald-100/90 text-emerald-900 motion-safe:animate-pulse"
                  >
                    Novo pedido do cliente
                  </Badge>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {dt(orderDetail.created_at)} · {statusLabels[orderDetail.status]}
                </p>
              </SheetHeader>
              <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 pb-6">
                <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm space-y-2">
                  <div className="font-semibold text-foreground">
                    {orderDetail.customers?.name ?? "Cliente"}
                  </div>
                  {orderDetail.customers?.legal_name?.trim() ? (
                    <div className="text-xs text-muted-foreground">
                      RS: {orderDetail.customers.legal_name.trim()}
                    </div>
                  ) : null}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {orderDetail.customers?.email ? <div>{orderDetail.customers.email}</div> : null}
                    {orderDetail.customers?.phone ? <div>{orderDetail.customers.phone}</div> : null}
                    {orderDetail.customers?.city ? (
                      <div>
                        {orderDetail.customers.city}
                        {orderDetail.customers.state ? ` / ${orderDetail.customers.state}` : ""}
                      </div>
                    ) : null}
                  </div>
                  {orderDetail.customers?.phone?.trim() ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full gap-2 border-[#25D366]/45 bg-[#25D366]/[0.06] hover:bg-[#25D366]/14"
                      onClick={() => void shareOrderWhatsApp(orderDetail)}
                    >
                      <WhatsAppGlyph className="h-4 w-4 shrink-0 text-[#25D366]" />
                      Enviar resumo no WhatsApp
                    </Button>
                  ) : null}
                  <div className="flex items-start gap-2 pt-1 border-t border-border text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
                    <div>
                      <span className="font-medium text-foreground">Representante: </span>
                      {orderDetailSellerLabel ?? "—"}
                    </div>
                  </div>
                  {orderDetail.notes?.trim() ? (
                    <p className="text-xs border-t border-border pt-2">
                      <span className="font-medium text-foreground">Obs.: </span>
                      {orderDetail.notes.trim()}
                    </p>
                  ) : null}
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Itens</h3>
                  {orderDetailLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : orderDetailLines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum item encontrado.</p>
                  ) : (
                    <ul className="space-y-3">
                      {orderDetailLines.map((line) => (
                        <li
                          key={line.id}
                          className="flex gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
                        >
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                            {line.thumb_url ? (
                              <img
                                src={line.thumb_url}
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
                            <div className="font-medium leading-snug">{line.product_name}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {line.quantity} × {brl(line.unit_price)}
                            </div>
                            <div className="mt-1 text-sm font-semibold text-primary">
                              {brl(line.subtotal)}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3 text-base font-bold">
                  <span>Total do pedido</span>
                  <span>{brl(orderDetail.total)}</span>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteOrderTarget !== null}
        onOpenChange={(open) => !open && !deletingOrder && setDeleteOrderTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  O pedido{" "}
                  <strong>
                    {deleteOrderTarget ? formatOrderCode(deleteOrderTarget.order_number) : ""}
                  </strong>{" "}
                  de <strong>{deleteOrderTarget?.customers?.name ?? "cliente"}</strong> será removido com todos os
                  itens.
                </p>
                <p className="text-muted-foreground">Esta ação não pode ser desfeita.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOrder}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingOrder}
              className="inline-flex items-center gap-2"
              onClick={() => void confirmDeleteOrder()}
            >
              {deletingOrder && <Loader2 className="h-4 w-4 animate-spin" />}
              {deletingOrder ? "Excluindo…" : "Excluir pedido"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={nfeTarget !== null} onOpenChange={(o) => !o && setNfeTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>NF-e (registro manual)</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            A emissão fiscal continua no seu ERP ou contador. Aqui você apenas associa a chave ao pedido{" "}
            {nfeTarget ? formatOrderCode(nfeTarget.order_number) : ""}.
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
