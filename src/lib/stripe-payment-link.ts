/** Payment Link público da Stripe (buy.stripe.com). Pode sobrescrever com `VITE_STRIPE_PAYMENT_LINK_URL`. */
const DEFAULT_STRIPE_PAYMENT_LINK =
  "https://buy.stripe.com/fZu3cv1OV1jWbA70dt7AI00";

/**
 * Abre o checkout da Stripe com `client_reference_id=orgId:userId` para o webhook
 * gravar `billing_stripe_access_at` nesse usuário (quem está logado ao clicar).
 */
export function buildStripePaymentLinkUrl(organizationId: string, payerUserId: string): string | null {
  const org = organizationId.trim();
  const uid = payerUserId.trim();
  if (!org || !uid) return null;
  const configured = import.meta.env.VITE_STRIPE_PAYMENT_LINK_URL?.trim();
  const base = (configured || DEFAULT_STRIPE_PAYMENT_LINK).replace(/\/$/, "");
  const ref = `${org}:${uid}`;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}client_reference_id=${encodeURIComponent(ref)}`;
}
