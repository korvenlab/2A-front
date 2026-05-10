import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { GlobalSearchDialog } from "@/components/GlobalSearchDialog";
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

function AuthLayout() {
  const { isAuthenticated, loading, signingOut, signOut, profile, organization, menu, role } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const [searchOpen, setSearchOpen] = useState(false);
  const staffSearch = role === "admin" || role === "vendedor";
  const sidebarNavRef = useRef<HTMLElement | null>(null);
  const mobileNavRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const desktop = sidebarNavRef.current?.querySelector<HTMLElement>('[data-dashboard-nav-active="true"]');
    desktop?.scrollIntoView({ block: "nearest", behavior: "smooth" });

    const mobile = mobileNavRef.current?.querySelector<HTMLElement>('[data-dashboard-nav-active="true"]');
    mobile?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [location.pathname]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      if (signingOut) return;
      const redirect = `${location.pathname}${location.search}`;
      const invite = new URLSearchParams(location.search).get("invite") ?? undefined;
      navigate({
        to: "/login",
        search: invite ? { redirect, invite } : { redirect },
      });
      return;
    }
    if (!menu.dashboard && menu.portal && location.pathname.startsWith("/dashboard")) {
      navigate({ to: "/portal" });
      return;
    }
    if (!role) {
      navigate({ to: "/portal" });
    }
  }, [isAuthenticated, loading, signingOut, menu.dashboard, menu.portal, navigate, location.pathname, location.search]);

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
  }, [menu, role]);

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
          <Logo />
          {organization && (
            <p className="mt-3 text-xs text-muted-foreground truncate">{organization.name}</p>
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
            const active = location.pathname === it.to;
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
            <Logo />
            <div className="flex items-center gap-1">
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
                const active = location.pathname === it.to;
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
