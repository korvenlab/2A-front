/** Valor monetário vindo do PostgREST (numeric) costuma ser string; normaliza para número finito. */
export function moneyNumber(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  if (typeof n === "number") return Number.isFinite(n) ? n : 0;
  const raw = String(n).trim().replace(/\s/g, "");
  if (!raw) return 0;
  const v = Number(raw.replace(",", "."));
  return Number.isFinite(v) ? v : 0;
}

export const brl = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(moneyNumber(n));

export const dt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("pt-BR") : "—";
