import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Store,
  LogOut,
  Loader2,
  Package,
  UserCog,
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
  const { isAuthenticated, loading, signOut, profile, organization, menu, role } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate({ to: "/login", search: { redirect: location.pathname } });
      return;
    }
    if (!menu.dashboard && menu.portal && location.pathname.startsWith("/dashboard")) {
      navigate({ to: "/portal" });
    }
  }, [isAuthenticated, loading, menu.dashboard, menu.portal, navigate, location.pathname]);

  const navItems = useMemo(() => {
    const items: NavEntry[] = [];
    if (menu.dashboard) items.push({ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard });
    if (menu.pedidos) items.push({ to: "/pedidos", label: "Pedidos", icon: ShoppingBag });
    if (menu.clientes) items.push({ to: "/clientes", label: "Clientes", icon: Users });
    if (menu.catalogo) items.push({ to: "/catalogo", label: "Catálogo", icon: Package });
    if (menu.portal) items.push({ to: "/portal", label: "Portal de Compras", icon: Store });
    if (menu.vendedores) {
      items.push({
        to: "/vendedores",
        label: "Gerar link de produtos",
        icon: UserCog,
        highlight: true,
      });
    }
    return items;
  }, [menu]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="p-6 border-b border-border">
          <Logo />
          {organization && (
            <p className="mt-3 text-xs text-muted-foreground truncate">{organization.name}</p>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
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
        <div className="p-3 border-t border-border">
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
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          {navItems.length > 0 ? (
            <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
              {navItems.map((it) => {
                const active = location.pathname === it.to;
                return (
                  <Link
                    key={it.to}
                    to={it.to}
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
