/** Mensagens amigáveis para erro de query Supabase — evita texto cru tipo permission denied na UI. */

function showSupabaseErrorDetail(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug_supabase") === "1";
}

export function userFacingDataError(error: { message?: string } | null | undefined): string {
  const m = error?.message ?? "";
  const lower = m.toLowerCase();
  if (
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    lower.includes("rls policy") ||
    lower.includes("new row violates row-level security") ||
    m.includes("42501")
  ) {
    const hint =
      showSupabaseErrorDetail() && m.trim().length > 0 ? ` (${m.trim()})` : "";
    return `Sem permissão para esta ação. Se precisar de acesso, fale com o administrador.${hint}`;
  }
  return m || "Não foi possível concluir a operação.";
}
