import type { SupabaseClient } from "@supabase/supabase-js";
import { moneyNumber } from "@/lib/format";

/** Código sequencial por organização (ex.: 000042). */
export function formatOrderCode(orderNumber: number | null | undefined): string {
  const n = Math.trunc(moneyNumber(orderNumber));
  if (n <= 0) return "—";
  return n.toString().padStart(6, "0");
}

/** Texto do WhatsApp com representação, cliente, empresa e cada produto com quantidade (sem markdown). */
export function buildOrderWhatsAppMessage(input: {
  representationName: string;
  orderCode: string;
  customerName: string;
  customerLegalName: string | null | undefined;
  items: Array<{ product_name: string; quantity: number }>;
  totalLabel: string;
  statusLabel: string;
}): string {
  const rep = input.representationName.trim() || "Representação";
  const code = input.orderCode.trim() || "—";
  const cust = input.customerName.trim() || "Cliente";
  const legalRaw = input.customerLegalName?.trim() || null;
  const legal =
    legalRaw && legalRaw.toLowerCase() !== cust.toLowerCase() ? legalRaw : null;

  const lines: string[] = [
    "Olá!",
    "",
    `Representação: ${rep}`,
    `Pedido nº ${code}`,
    "",
    `Cliente: ${cust}`,
  ];
  if (legal) {
    lines.push(`Empresa (razão social): ${legal}`);
  }
  lines.push("", "Itens:");
  const items = input.items.filter((it) => (it.product_name ?? "").trim().length > 0);
  if (items.length === 0) {
    lines.push("— (sem itens no cadastro — confira no 2AVendas)");
  } else {
    for (let i = 0; i < items.length; i++) {
      const name = items[i].product_name.trim();
      const q = Math.max(1, Math.trunc(moneyNumber(items[i].quantity)) || 1);
      lines.push(`${i + 1}. ${name} — Quantidade: ${q}`);
    }
  }
  lines.push("", `Total: ${input.totalLabel}`, `Situação: ${input.statusLabel}`);
  return lines.join("\n");
}

export interface OrderItemLineSummary {
  product_name: string;
  quantity: number;
}

/** Itens por pedido (nome + quantidade), para listas e histórico do cliente. */
export async function fetchOrderItemsByOrderIds(
  supabase: SupabaseClient,
  orderIds: string[],
): Promise<Record<string, OrderItemLineSummary[]>> {
  if (orderIds.length === 0) return {};
  const { data, error } = await supabase
    .from("order_items")
    .select("order_id,product_name,quantity")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });
  if (error || !data) return {};
  const out: Record<string, OrderItemLineSummary[]> = {};
  for (const row of data) {
    const orderId = row.order_id as string;
    if (!out[orderId]) out[orderId] = [];
    out[orderId].push({
      product_name: String(row.product_name ?? "").trim() || "Produto",
      quantity: Math.max(1, Math.trunc(moneyNumber(row.quantity)) || 1),
    });
  }
  return out;
}

/** Uma linha compacta para CSV ou tooltip. */
export function formatOrderItemsPreview(
  items: OrderItemLineSummary[] | undefined,
  maxNames = 4,
): string {
  const list = items ?? [];
  if (list.length === 0) return "";
  const parts = list.slice(0, maxNames).map((i) =>
    i.quantity > 1 ? `${i.product_name} (${i.quantity})` : i.product_name,
  );
  const extra = list.length - maxNames;
  if (extra > 0) parts.push(`+${extra} ${extra === 1 ? "item" : "itens"}`);
  return parts.join(" · ");
}

/** Soma subtotais dos itens quando `orders.total` ainda está zerado (ex.: antes do trigger/RLS). */
export async function fetchOrderTotalsFallback(
  supabase: SupabaseClient,
  orderIds: string[],
): Promise<Record<string, number>> {
  if (orderIds.length === 0) return {};
  const { data, error } = await supabase
    .from("order_items")
    .select("order_id,subtotal")
    .in("order_id", orderIds);
  if (error || !data) return {};
  const out: Record<string, number> = {};
  for (const row of data) {
    const id = row.order_id;
    out[id] = (out[id] ?? 0) + moneyNumber(row.subtotal);
  }
  return out;
}

export function repLabelForSellerId(
  sellerId: string | null | undefined,
  primaryAdminUserId: string | null | undefined,
  profilesById: Record<string, { full_name: string | null; email: string | null }>,
  selfUserId?: string | null,
): string {
  if (!sellerId) return "Administrador";
  if (primaryAdminUserId && sellerId === primaryAdminUserId) return "Administrador";
  if (selfUserId && sellerId === selfUserId) {
    const me = profilesById[sellerId];
    const name = me?.full_name?.trim() || me?.email?.trim();
    return name ? `Você (${name})` : "Você";
  }
  const p = profilesById[sellerId];
  return p?.full_name?.trim() || p?.email?.trim() || "Representante";
}
