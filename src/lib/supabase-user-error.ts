/** Mensagens amigáveis para erro de query Supabase — evita texto cru tipo permission denied na UI. */

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
