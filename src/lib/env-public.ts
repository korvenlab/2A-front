/**
 * Valida URL pública do Supabase antes de criar o cliente (evita schemes perigosos).
 * Em desenvolvimento permite http para stack local.
 */

export function assertPublicSupabaseUrl(raw: string | undefined | null, envLabel: string): string {
  const trimmed = raw?.trim();
  if (!trimmed) {
    throw new Error(`Missing ${envLabel}. Configure no .env da aplicação.`);
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${envLabel} não é uma URL válida.`);
  }
  const isDev =
    (typeof import.meta !== "undefined" && import.meta.env?.DEV) ||
    (typeof process !== "undefined" && process.env?.NODE_ENV !== "production");
  const allowedProtocols = isDev ? ["http:", "https:"] : ["https:"];
  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new Error(
      `${envLabel} deve usar ${isDev ? "http ou https" : "https"} — recebido: ${parsed.protocol}`,
    );
  }
  return trimmed.replace(/\/+$/, "");
}
