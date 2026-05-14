/** Mensagens em português para erros de dados; evita jargão técnico na interface. */

function showSupabaseErrorDetail(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug_supabase") === "1";
}

type ErrLike = { message?: string; code?: string; details?: string; hint?: string } | null | undefined;

export function userFacingDataError(error: ErrLike): string {
  const m = error?.message ?? "";
  const code = String(error?.code ?? "");
  const lower = m.toLowerCase();
  const details = (error?.details ?? "").toLowerCase();
  const permissionLike =
    code === "42501" ||
    code === "PGRST301" ||
    lower.includes("permission denied") ||
    lower.includes("forbidden") ||
    lower.includes("not authorized") ||
    lower.includes("unauthorized") ||
    lower.includes("row-level security") ||
    lower.includes("rls policy") ||
    lower.includes("violates row-level security policy") ||
    lower.includes("jwt") ||
    lower.includes("invalid claim") ||
    details.includes("permission denied") ||
    m.includes("42501");

  if (permissionLike) {
    const hint =
      showSupabaseErrorDetail() && m.trim().length > 0 ? ` (${m.trim()})` : "";
    return `Sem permissão para esta ação ou sessão expirada. Tente sair e entrar de novo; se continuar, fale com o administrador.${hint}`;
  }
  return m || "Não foi possível concluir a operação.";
}

/** Erros retornados por `supabase.auth.*` (GoTrue), com texto mais claro em PT. */
export function userFacingAuthError(error: ErrLike): string {
  const m = (error?.message ?? "").trim();
  const lower = m.toLowerCase();
  if (lower.includes("email rate limit") || (lower.includes("rate limit") && lower.includes("email"))) {
    return (
      "Muitos e-mails foram enviados em pouco tempo. Aguarde cerca de uma hora, tente outro endereço ou fale com o suporte."
    );
  }
  if (lower.includes("email signups are disabled") || lower.includes("signups are disabled")) {
    return (
      "Novos cadastros por e-mail estão desativados no momento. Peça ao responsável pela sua conta para habilitar o cadastro ou use outro método indicado por eles."
    );
  }
  return m || "Não foi possível concluir a operação.";
}
