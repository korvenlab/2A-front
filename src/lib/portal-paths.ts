import { supabase } from "@/integrations/supabase/client";

export const PORTAL_ORG_SLUG_STORAGE_KEY = "2avendas.portalOrgSlug";

/** Mantém id + slug alinhados para links da sidebar e atalhos. */
export function persistPortalOrgContext(orgId: string, slug: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("2avendas.portalOrgId", orgId);
  sessionStorage.setItem(PORTAL_ORG_SLUG_STORAGE_KEY, slug.trim());
}

export async function fetchOrgSlugById(orgId: string): Promise<string | null> {
  const { data } = await supabase.from("organizations").select("slug").eq("id", orgId).maybeSingle();
  const s = (data as { slug?: string } | null)?.slug?.trim();
  return s || null;
}

/**
 * Após login/cadastro com convite de catálogo: `/p/{slug}/portal?invite=…` quando existir `organizations.slug`.
 */
export async function scopedPortalPathWithInvite(inviteToken: string): Promise<string> {
  const { data: inv } = await supabase
    .from("seller_invitations")
    .select("organization_id")
    .eq("token", inviteToken)
    .eq("purpose", "client_catalog")
    .maybeSingle();
  const orgId = (inv as { organization_id?: string } | null)?.organization_id;
  if (!orgId) return `/portal?invite=${encodeURIComponent(inviteToken)}`;
  const slug = await fetchOrgSlugById(orgId);
  if (!slug) return `/portal?invite=${encodeURIComponent(inviteToken)}`;
  return `/p/${encodeURIComponent(slug)}/portal?invite=${encodeURIComponent(inviteToken)}`;
}
