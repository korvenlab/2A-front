/** Mensagens amigáveis para erro de query Supabase — evita texto cru tipo permission denied na UI. */

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
    return "Sem permissão para esta ação. Se precisar de acesso, fale com o administrador.";
  }
  return m || "Não foi possível concluir a operação.";
}
