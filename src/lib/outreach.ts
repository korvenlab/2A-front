import type { SupabaseClient } from "@supabase/supabase-js";

export function digitsOnlyPhone(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

/** wa.me com texto (UTF-8 na URL). */
export function whatsAppShareUrl(e164OrLocalDigits: string, message: string): string {
  const d = digitsOnlyPhone(e164OrLocalDigits);
  if (!d) return "";
  const q = encodeURIComponent(message);
  return `https://wa.me/${d}?text=${q}`;
}

export function mailtoUrl(to: string, subject: string, body: string): string {
  const s = encodeURIComponent(subject);
  const b = encodeURIComponent(body);
  return `mailto:${to.trim()}?subject=${s}&body=${b}`;
}

export type OutreachInsert = {
  organization_id: string;
  channel: "email" | "whatsapp";
  summary: string;
  body: string | null;
  customer_id?: string | null;
  opportunity_id?: string | null;
  budget_id?: string | null;
  order_id?: string | null;
};

export async function recordOutreach(supabase: SupabaseClient, row: OutreachInsert): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("sales_outreach_events").insert({
    organization_id: row.organization_id,
    channel: row.channel,
    summary: row.summary,
    body: row.body,
    customer_id: row.customer_id ?? null,
    opportunity_id: row.opportunity_id ?? null,
    budget_id: row.budget_id ?? null,
    order_id: row.order_id ?? null,
  });
  return { error: error ? new Error(error.message) : null };
}
