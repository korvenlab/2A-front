import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  persistPendingPromoCode,
  resolvePromoCodeFromSearch,
  tryApplyPendingPromo,
} from "@/lib/billing-redeem-promo";
import { Logo } from "@/components/Logo";
import { StaffNotificationCenter } from "@/components/StaffNotificationCenter";
import { Button } from "@/components/ui/button";
import { GlobalSearchDialog } from "@/components/GlobalSearchDialog";
import { supabase } from "@/integrations/supabase/client";
import { staffBillingAccessUnlocked } from "@/lib/session-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Store,
  LogOut,
  Loader2,
  Package,
  UserCog,
  FileSpreadsheet,
  Columns3,
  CalendarDays,
  CreditCard,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

type NavEntry = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  highlight?: boolean;
};

type ClientOrg = { id: string; name: string };
const PORTAL_ORG_STORAGE_KEY = "2avendas.portalOrgId";

/** Evita resgate duplicado (StrictMode / re-renders) para o mesmo utilizador+código. */
const promoBootstrapKeyRef = { current: null as string | null };

function AuthLayout() {
  const { isAuthenticated, loading, signingOut, signOut, profile, organization, menu, billing, role, user, refresh } =
    useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  /** SSR / hidratação: evita TypeError em `.startsWith` / URLSearchParams e cai no boundary genérico. */
  const pathname = location.pathname ?? "";
  const searchStr = typeof location.search === "string" ? location.search : "";
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const [searchOpen, setSearchOpen] = useState(false);
  const staffSearch = role === "admin" || role === "vendedor";
  const sidebarNavRef = useRef<HTMLElement | null>(null);
  const mobileNavRef = useRef<HTMLElement | null>(null);
  const [clientOrgs, setClientOrgs] = useState<ClientOrg[]>([]);
  const [clientOrgsLoading, setClientOrgsLoading] = useState(false);
  const [clientPinnedOrgId, setClientPinnedOrgId] = useState<string | null>(() =>
    typeof window !== "undefined" ? sessionStorage.getItem(PORTAL_ORG_STORAGE_KEY) : null,
  );

  useEffect(() => {
    const desktop = sidebarNavRef.current?.querySelector<HTMLElement>('[data-dashboard-nav-active="true"]');
    desktop?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    const mobile = mobileNavRef.current?.querySelector<HTMLElement>('[data-dashboard-nav-active="true"]');
    mobile?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [pathname]);

  /** Confirmação de e-mail e outros redirects para `/dashboard?two_avendas_promo=` — aplica cortesia sem passar pelo /login. */
  useEffect(() => {
    if (loading || !isAuthenticated || !user?.id) return;
    const qs = searchStr.startsWith("?") ? searchStr.slice(1) : searchStr;
    const fromUrl = new URLSearchParams(qs).get("two_avendas_promo")?.trim() || undefined;
    if (fromUrl) persistPendingPromoCode(fromUrl);
    const pending = resolvePromoCodeFromSearch({ two_avendas_promo: fromUrl })?.trim();
    if (!pending) return;
    const key = `${user.id}:${pending}`;
    if (promoBootstrapKeyRef.current === key) return;
    promoBootstrapKeyRef.current = key;
    void (async () => {
      const api = import.meta.env.VITE_API_URL?.trim();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      const r = await tryApplyPendingPromo(api, token, { two_avendas_promo: fromUrl });
      if (r.status === "config") {
        if (r.detail === "no_api") {
          toast.error(
            "Não foi possível aplicar o código: o site não tem VITE_API_URL (URL da API). Configure na Vercel e faça redeploy.",
          );
        } else {
          toast.error("Sessão indisponível para aplicar o código. Recarregue a página e tente de novo.");
        }
      } else if (r.status === "redeem_failed") {
        toast.error(r.message);
      } else if (r.status === "ok") {
        toast.success("Acesso promocional aplicado.");
        await refreshRef.current();
      }
    })();
  }, [loading, isAuthenticated, user?.id, searchStr]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      if (signingOut) return;
      const redirect = `${pathname}${searchStr}`;
      const invite = new URLSearchParams(searchStr).get("invite") ?? undefined;
      navigate({
        to: "/login",
        search: invite ? { redirect, invite } : { redirect },
      });
      return;
    }
    if (!menu.dashboard && menu.portal && pathname.startsWith("/dashboard")) {
      navigate({ to: "/portal" });
      return;
    }
    if (!role) {
      navigate({ to: "/portal" });
    }
  }, [isAuthenticated, loading, signingOut, menu.dashboard, menu.portal, navigate, pathname, searchStr]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || signingOut) return;
    const staff = role === "admin" || role === "vendedor";
    if (!staff) return;
    if (!billing.required || staffBillingAccessUnlocked(billing)) return;
    if (pathname.startsWith("/assinatura")) return;
    navigate({ to: "/assinatura", replace: true });
  }, [
    billing,
    isAuthenticated,
    loading,
    pathname,
    navigate,
    role,
    signingOut,
  ]);

  useEffect(() => {
    if (!user?.id || role !== "cliente") return;
    let cancelled = false;
    (async () => {
      setClientOrgsLoading(true);
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("organization_id")
          .eq("user_id", user.id);
        if (error) throw error;
        const orgIds = Array.from(
          new Set((data ?? []).map((r) => r.organization_id).filter((v): v is string => !!v)),
        );
        if (orgIds.length === 0) {
          if (!cancelled) setClientOrgs([]);
          return;
        }
        const { data: orgRows, error: orgErr } = await supabase
          .from("organizations")
          .select("id,name")
          .in("id", orgIds);
        if (orgErr) throw orgErr;
        if (cancelled) return;
        setClientOrgs(((orgRows ?? []) as ClientOrg[]).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      } catch (e) {
        if (!cancelled && import.meta.env.DEV) {
          console.warn("[sidebar][cliente] failed to fetch client orgs", e);
        }
        if (!cancelled) setClientOrgs([]);
      } finally {
        if (!cancelled) setClientOrgsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, role]);

  useEffect(() => {
    if (role !== "cliente") return;
    if (clientOrgs.length === 0) return;
    const stored = typeof window !== "undefined" ? sessionStorage.getItem(PORTAL_ORG_STORAGE_KEY) : null;
    const fallback = organization?.id ?? clientOrgs[0]?.id ?? null;
    const next = stored && clientOrgs.some((o) => o.id === stored) ? stored : fallback;
    if (!next) return;
    sessionStorage.setItem(PORTAL_ORG_STORAGE_KEY, next);
    setClientPinnedOrgId(next);
  }, [role, clientOrgs, organization?.id]);

  const selectedClientOrgId =
    clientPinnedOrgId ?? organization?.id ?? clientOrgs[0]?.id ?? "";

  /** Radix Select exige `value` coincidente com um item; string vazia quebra o render. */
  const validClientOrgSelectValue =
    selectedClientOrgId && clientOrgs.some((o) => o.id === selectedClientOrgId)
      ? selectedClientOrgId
      : (clientOrgs[0]?.id ?? "");

  const onClientOrgChange = (nextId: string) => {
    if (!nextId) return;
    sessionStorage.setItem(PORTAL_ORG_STORAGE_KEY, nextId);
    setClientPinnedOrgId(nextId);
    if (typeof window !== "undefined" && window.location.search.includes("invite=")) {
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    }
    window.dispatchEvent(new Event("portal-org-changed"));
    if (pathname !== "/portal") navigate({ to: "/portal", replace: true });
  };

  const navItems = useMemo(() => {
    const items: NavEntry[] = [];
    /** Admin: equipe fica ao lado de Clientes (evita “sumir” no scroll horizontal no mobile). */
    /** Só administrador: gestão de equipe. Convites para clientes ficam em Clientes. */
    let vendedoresEntry: NavEntry | null = null;
    if (menu.vendedores && role === "admin") {
      vendedoresEntry = {
        to: "/vendedores",
        label: "Vendedores",
        icon: UserCog,
        highlight: true,
      };
    }

    if (billing.required && !staffBillingAccessUnlocked(billing)) {
      items.push({
        to: "/assinatura",
        label: "Assinatura",
        icon: CreditCard,
        highlight: true,
      });
    }

    if (menu.dashboard) items.push({ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard });
    if (menu.pedidos) items.push({ to: "/pedidos", label: "Pedidos", icon: ShoppingBag });
    if (menu.orcamentos)
      items.push({ to: "/orcamentos", label: "Orçamentos", icon: FileSpreadsheet });
    if (menu.funil) items.push({ to: "/funil", label: "Funil / CRM", icon: Columns3 });
    if (menu.visitas) items.push({ to: "/visitas", label: "Visitas", icon: CalendarDays });
    if (menu.clientes) {
      items.push({ to: "/clientes", label: "Clientes", icon: Users });
      if (role === "admin" && vendedoresEntry) {
        items.push(vendedoresEntry);
        vendedoresEntry = null;
      }
    }
    if (menu.catalogo) items.push({ to: "/catalogo", label: "Catálogo", icon: Package });
    if (menu.portal) items.push({ to: "/portal", label: "Portal de Compras", icon: Store });
    if (vendedoresEntry) items.push(vendedoresEntry);
    return items;
  }, [menu, role, billing]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {staffSearch && <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:max-h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:min-h-0 border-r border-border bg-card">
        <div className="shrink-0 p-6 border-b border-border">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <Logo />
            </div>
            {staffSearch && organization?.id && user?.id && (role === "admin" || role === "vendedor") ? (
              <StaffNotificationCenter organizationId={organization.id} role={role} userId={user.id} />
            ) : null}
          </div>
          {organization && (
            <p className="mt-3 text-xs text-muted-foreground truncate">{organization.name}</p>
          )}
          {role === "cliente" && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Empresa
              </p>
              <div className="mt-2">
                {clientOrgsLoading ? (
                  <div className="h-10 rounded-md border border-border bg-background/60" />
                ) : clientOrgs.length <= 1 ? (
                  <p className="text-sm text-foreground/80 mt-1">
                    {clientOrgs[0]?.name ?? organization?.name ?? "—"}
                  </p>
                ) : !validClientOrgSelectValue ? (
                  <div className="mt-1 h-10 rounded-md border border-border bg-background/60" />
                ) : (
                  <Select value={validClientOrgSelectValue} onValueChange={onClientOrgChange}>
                    <SelectTrigger className="h-10 w-full bg-background">
                      <SelectValue placeholder="Escolha a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientOrgs.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
          {staffSearch && (
            <Button
              variant="outline"
              className="mt-4 w-full justify-start gap-2 text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4" />
              Buscar…
              <kbd className="ml-auto hidden xl:inline text-[10px] font-sans opacity-70">Ctrl K</kbd>
            </Button>
          )}
        </div>
        <nav ref={sidebarNavRef} className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3">
          {navItems.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Nenhuma área liberada para sua conta. Solicite acesso ao administrador.
            </p>
          )}
          {navItems.map((it) => {
            const active = pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                data-dashboard-nav-active={active ? "true" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "sticky top-0 z-10 bg-primary text-primary-foreground shadow-sm"
                    : it.highlight
                      ? "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/30"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <it.icon className="h-4 w-4" /> {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-border p-3">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium truncate">{profile?.full_name ?? profile?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{role ?? "usuário"}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 overflow-auto">
        <header className="lg:hidden shrink-0 border-b border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <div className="min-w-0 shrink">
                <Logo />
              </div>
              {staffSearch && organization?.id && user?.id && (role === "admin" || role === "vendedor") ? (
                <StaffNotificationCenter organizationId={organization.id} role={role} userId={user.id} />
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {staffSearch && (
                <Button size="sm" variant="ghost" onClick={() => setSearchOpen(true)} aria-label="Buscar">
                  <Search className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {navItems.length > 0 ? (
            <nav ref={mobileNavRef} className="flex gap-2 overflow-x-auto px-4 pb-3 scroll-smooth">
              {navItems.map((it) => {
                const active = pathname === it.to;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
                    data-dashboard-nav-active={active ? "true" : undefined}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : it.highlight
                          ? "bg-amber-500/25 text-amber-950 dark:text-amber-100"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {it.label}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <p className="px-4 pb-3 text-xs text-muted-foreground">Sem áreas liberadas para sua conta.</p>
          )}
        </header>
        <div className="flex-1 min-h-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
