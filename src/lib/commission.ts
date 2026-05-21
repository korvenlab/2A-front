/**
 * Comissão = percentual sobre uma base (0–100).
 * Pedidos: base da indústria = subtotal × commission_pct da indústria;
 * vendedor recebe % sobre essa base (organization_seller_commissions).
 */

export function commissionFromTotal(total: number, pct: number): number {
  const t = Number(total) || 0;
  const p = Number(pct) || 0;
  return Math.round(t * (p / 100) * 100) / 100;
}

export function parseCommissionPctInput(raw: string): number | null {
  const n = parseFloat(String(raw).trim().replace(",", "."));
  if (Number.isNaN(n)) return null;
  return Math.min(100, Math.max(0, n));
}

export function formatPct(pct: number): string {
  const n = Number(pct) || 0;
  if (Number.isInteger(n)) return `${n}%`;
  return `${n.toFixed(2).replace(/\.?0+$/, "")}%`;
}
