/** URLs a partir do token em `seller_invitations`. */

export function inviteSignupUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/signup?invite=${encodeURIComponent(token)}`;
}

/** Cliente que já tem conta: login com redirect ao portal + aceite do convite. */
export function invitePortalLoginUrl(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const portalPath = `/portal?invite=${encodeURIComponent(token)}`;
  return `${origin}/login?redirect=${encodeURIComponent(portalPath)}`;
}
