import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { firstAccessiblePath } from "@/lib/session-menu";
import { supabase } from "@/integrations/supabase/client";
import {
  PORTAL_ORG_SLUG_STORAGE_KEY,
  scopedPortalPathWithInvite,
} from "@/lib/portal-paths";

const PORTAL_ORG_STORAGE_KEY = "2avendas.portalOrgId";

export const Route = createFileRoute("/_authenticated/portal")({
  component: LegacyPortalEntry,
});

/**
 * Entrada legada do painel B2B do **cliente** (equivalente ao “dashboard” do comprador).
 * Staff é desviado no layout; aqui só clientes autenticados. Redireciona para `/p/{slug}/portal` quando existir slug.
 */
function LegacyPortalEntry() {
  const { loading, isAuthenticated, signingOut, role, menu, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || signingOut || !isAuthenticated || !user?.id) return;

    if (role !== "cliente" || !menu.portal) {
      const dest = firstAccessiblePath(menu) ?? "/dashboard";
      navigate({ to: dest, replace: true });
      return;
    }

    let cancelled = false;
    void (async () => {
      const search = searchRecordFromWindow();
      const invite = search.invite;

      const orgId = typeof window !== "undefined" ? sessionStorage.getItem(PORTAL_ORG_STORAGE_KEY) : null;
      if (orgId) {
        const { data } = await supabase.from("organizations").select("slug").eq("id", orgId).maybeSingle();
        const slug = (data as { slug?: string } | null)?.slug?.trim();
        if (cancelled) return;
        if (slug) {
          navigate({
            to: "/p/$orgSlug/portal",
            params: { orgSlug: slug },
            search,
            replace: true,
          });
          return;
        }
      }

      const slugOnly =
        typeof window !== "undefined" ? sessionStorage.getItem(PORTAL_ORG_SLUG_STORAGE_KEY)?.trim() : null;
      if (slugOnly) {
        if (cancelled) return;
        navigate({
          to: "/p/$orgSlug/portal",
          params: { orgSlug: slugOnly },
          search,
          replace: true,
        });
        return;
      }

      if (invite && typeof invite === "string") {
        const path = await scopedPortalPathWithInvite(invite);
        if (cancelled) return;
        window.location.replace(path);
        return;
      }

      const { data: custRows } = await supabase
        .from("customers")
        .select("organization_id")
        .eq("user_id", user.id);
      const orgIds = Array.from(
        new Set((custRows ?? []).map((r) => r.organization_id).filter((v): v is string => !!v)),
      );
      if (orgIds.length === 1) {
        const { data: org } = await supabase
          .from("organizations")
          .select("slug")
          .eq("id", orgIds[0])
          .maybeSingle();
        const slug = (org as { slug?: string } | null)?.slug?.trim();
        if (cancelled) return;
        if (slug) {
          navigate({
            to: "/p/$orgSlug/portal",
            params: { orgSlug: slug },
            search,
            replace: true,
          });
          return;
        }
      }

      if (cancelled) return;
      navigate({ to: "/dashboard", replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, signingOut, isAuthenticated, user?.id, role, menu.portal, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function searchRecordFromWindow(): Record<string, string | undefined> {
  if (typeof window === "undefined") return {};
  const sp = new URLSearchParams(window.location.search);
  const o: Record<string, string | undefined> = {};
  sp.forEach((v, k) => {
    o[k] = v;
  });
  return o;
}
