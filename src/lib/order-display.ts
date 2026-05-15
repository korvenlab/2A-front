import type { SupabaseClient } from "@supabase/supabase-js";
import { moneyNumber } from "@/lib/format";

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
