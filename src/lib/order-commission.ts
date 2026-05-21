import type { SupabaseClient } from "@supabase/supabase-js";
import { commissionFromTotal } from "@/lib/commission";
import { moneyNumber } from "@/lib/format";

export type OrderCommissionLine = { subtotal: number; industryPct: number };

/** Pool da representação sobre uma linha (subtotal × % da indústria). */
export function industryCommissionPool(subtotal: number, industryPct: number): number {
  return commissionFromTotal(subtotal, industryPct);
}

export function splitOrderCommission(
  lines: OrderCommissionLine[],
  sellerPct: number,
  ctx: {
    sellerId: string | null;
    adminUserId: string;
  },
): { seller: number; admin: number } {
  const isAdminSale = !ctx.sellerId || ctx.sellerId === ctx.adminUserId;
  let seller = 0;
  let admin = 0;

  for (const line of lines) {
    const pool = industryCommissionPool(line.subtotal, line.industryPct);
    if (pool <= 0) continue;
    if (isAdminSale) {
      admin += pool;
    } else {
      const sellerShare = commissionFromTotal(pool, sellerPct);
      seller += sellerShare;
      admin += Math.round((pool - sellerShare) * 100) / 100;
    }
  }

  return {
    seller: Math.round(seller * 100) / 100,
    admin: Math.round(admin * 100) / 100,
  };
}

/** Comissão visível na linha do pedido (vendedor ou admin conforme o papel). */
export function viewerCommissionForOrder(
  lines: OrderCommissionLine[],
  sellerPct: number,
  ctx: {
    sellerId: string | null;
    adminUserId: string;
    viewerRole: "admin" | "vendedor" | "cliente" | null;
    viewerUserId: string | null;
  },
): number {
  const split = splitOrderCommission(lines, sellerPct, {
    sellerId: ctx.sellerId,
    adminUserId: ctx.adminUserId,
  });
  if (ctx.viewerRole === "vendedor" && ctx.viewerUserId && ctx.sellerId === ctx.viewerUserId) {
    return split.seller;
  }
  if (ctx.viewerRole === "admin") {
    return split.admin;
  }
  if (ctx.viewerRole === "vendedor") return 0;
  return split.seller + split.admin;
}

export async function fetchOrderCommissionLinesByOrderIds(
  supabase: SupabaseClient,
  orderIds: string[],
): Promise<Record<string, OrderCommissionLine[]>> {
  if (orderIds.length === 0) return {};
  const { data, error } = await supabase
    .from("order_items")
    .select("order_id, subtotal, products(industry_id, organization_industries(commission_pct))")
    .in("order_id", orderIds);
  if (error || !data) return {};

  const out: Record<string, OrderCommissionLine[]> = {};
  for (const row of data) {
    const orderId = row.order_id as string;
    const subtotal = moneyNumber(row.subtotal);
    const prod = row.products as
      | {
          industry_id?: string | null;
          organization_industries?: { commission_pct?: number } | null;
        }
      | null
      | undefined;
    const industryPct = Number(prod?.organization_industries?.commission_pct) || 0;
    if (!out[orderId]) out[orderId] = [];
    out[orderId].push({ subtotal, industryPct });
  }
  return out;
}
