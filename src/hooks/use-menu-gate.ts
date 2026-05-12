import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { firstAccessiblePath, type MenuKey } from "@/lib/session-menu";

/** Redireciona para a primeira rota permitida se o papel não puder usar a atual. */
export function useMenuGate(required: MenuKey) {
  const { menu, loading } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();
  const pathname = location.pathname ?? "";

  useEffect(() => {
    if (loading) return;
    if (menu[required]) return;
    const dest = firstAccessiblePath(menu);
    if (dest && dest !== pathname) navigate({ to: dest, replace: true });
  }, [loading, menu, required, navigate, pathname]);
}
