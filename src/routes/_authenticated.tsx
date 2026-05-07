import { createFileRoute, Outlet, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
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

function AuthLayout() {
  const { isAuthenticated, loading, role, signOut, profile, organization } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate({ to: "/login", search: { redirect: location.pathname } });
      return;
    }
    // Role-based default redirect: clientes go to /portal
    if (role === "cliente" && location.pathname.startsWith("/dashboard")) {
      navigate({ to: "/portal" });
    }
  }, [isAuthenticated, loading, role, navigate, location.pathname]);

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const baseItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/pedidos", label: "Pedidos", icon: ShoppingBag },
    { to: "/clientes", label: "Clientes", icon: Users },
    { to: "/catalogo", label: "Catálogo", icon: Package },
  ];
  const navItems =
    role === "cliente"
      ? [{ to: "/portal", label: "Portal de Compras", icon: Store }]
      : role === "admin"
        ? [
            ...baseItems,
            { to: "/vendedores", label: "Gerar link de produtos", icon: UserCog, highlight: true },
          ]
        : baseItems;

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="p-6 border-b border-border">
          <Logo />
          {organization && (
            <p className="mt-3 text-xs text-muted-foreground truncate">{organization.name}</p>
          )}
        </div>
        <nav className="flex-1 p-3 space-y-1">
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
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className="lg:hidden flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <Logo />
          <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
