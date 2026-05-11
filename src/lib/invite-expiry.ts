/** Convites sem prazo: Postgres devolve `expires_at` como `infinity` (string). */

export function inviteExpiresAtStillValid(expiresAt: string | null | undefined): boolean {
  if (expiresAt == null || expiresAt === "") return true;
  const s = String(expiresAt).trim().toLowerCase();
  if (s === "infinity" || s.replace(/^\+/, "").startsWith("infinity")) return true;
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return true;
  return t > Date.now();
}

export function inviteExpiryLabel(
  expiresAt: string | null | undefined,
  formatDate: (iso: string) => string,
): string {
  if (expiresAt == null || expiresAt === "") return "Sem prazo";
  const s = String(expiresAt).trim().toLowerCase();
  if (s === "infinity" || s.replace(/^\+/, "").startsWith("infinity")) return "Sem prazo";
  const t = Date.parse(expiresAt);
  if (Number.isNaN(t)) return "Sem prazo";
  return formatDate(expiresAt);
}
