/** URL pública onde o link do e-mail de recuperação deve abrir (Supabase Auth + Resend SMTP). */
export function passwordResetRedirectUrl(): string {
  const configured = import.meta.env.VITE_APP_URL?.trim();
  const base =
    configured ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");
  return `${base.replace(/\/+$/, "")}/reset-password`;
}
