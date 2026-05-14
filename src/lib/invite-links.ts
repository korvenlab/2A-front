/**
 * URLs a partir do token em `public.seller_invitations`.
 *
 * Cada token é único e pertence a uma única linha de convite — essa linha carrega
 * `organization_id`, ou seja: o link (signup ou portal) identifica sempre a empresa
 * que o gerou, não um endereço “genérico” compartilhado entre tenants.
 * Convites client_catalog (link universal por empresa) são criados na base apenas pelo admin;
 * vendedores da mesma org leem o mesmo token para copiar o link.
 */
/** E-mail interno do convite de catálogo “aberto” (qualquer cliente); o token continua único por empresa. */
export const UNIVERSAL_CLIENT_INVITE_EMAIL = "catalogo+universal@2avendas.local";

export function inviteSignupUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/signup?invite=${encodeURIComponent(token)}`;
}

/**
 * Cliente que já tem conta: login com redirect ao portal + aceite do convite.
 * `organizationSlug` = `organizations.slug` da representação (URL canónica `/p/{slug}/portal`).
 */
export function invitePortalLoginUrl(token: string, organizationSlug?: string | null): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const s = organizationSlug?.trim();
  const portalPath = s
    ? `/p/${encodeURIComponent(s)}/portal?invite=${encodeURIComponent(token)}`
    : `/portal?invite=${encodeURIComponent(token)}`;
  return `${origin}/login?redirect=${encodeURIComponent(portalPath)}`;
}

/** Vitrine pública: só visualização; compra exige conta cliente (mesmo convite universal). */
export function publicStorefrontCatalogUrl(orgSlug: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const s = orgSlug.trim();
  if (!s) return `${origin}/`;
  return `${origin}/p/${encodeURIComponent(s)}/catalogo`;
}
