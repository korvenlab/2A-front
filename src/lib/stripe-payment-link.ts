/** Payment Link público da Stripe (buy.stripe.com). Pode sobrescrever com `VITE_STRIPE_PAYMENT_LINK_URL`. */
const DEFAULT_STRIPE_PAYMENT_LINK =
  "https://buy.stripe.com/fZu3cv1OV1jWbA70dt7AI00";

/**
 * Abre o checkout da Stripe com a organização no `client_reference_id`
 * para o webhook do backend mapear `checkout.session.completed` → `billing_stripe_active`.
 */
export function buildStripePaymentLinkUrl(organizationId: string): string | null {
  const id = organizationId.trim();
  if (!id) return null;
  const configured = import.meta.env.VITE_STRIPE_PAYMENT_LINK_URL?.trim();
  const base = (configured || DEFAULT_STRIPE_PAYMENT_LINK).replace(/\/$/, "");
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}client_reference_id=${encodeURIComponent(id)}`;
}
