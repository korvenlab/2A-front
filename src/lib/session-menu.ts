/** Mapa espelho do GET /api/session/menu do backend — use VITE_API_URL para leitura pelo JWT. */

export type FallbackRole = "admin" | "vendedor" | "cliente";

export interface MenuFlags {
  dashboard: boolean;
  /** Com API: só quem tem `products:manage` (admin/vendedor). Sem isso não aparece link `/catalogo` nem gate. */
  catalogo: boolean;
  clientes: boolean;
  pedidos: boolean;
  /** Orçamentos comerciais — espelha `orders:view` no backend. */
  orcamentos: boolean;
  /** Funil de vendas (CRM) — espelha `customers:view`. */
  funil: boolean;
  /** Visitas comerciais — mesmo público do CRM (`customers:view`). */
  visitas: boolean;
  portal: boolean;
  vendedores: boolean;
}

export type MenuKey = keyof MenuFlags;

export function emptyMenu(): MenuFlags {
  return {
    dashboard: false,
    catalogo: false,
    clientes: false,
    pedidos: false,
    orcamentos: false,
    funil: false,
    visitas: false,
    portal: false,
    vendedores: false,
  };
}

export function fallbackMenuFromRole(role: FallbackRole | null): MenuFlags {
  if (!role || role === "cliente") {
    return {
      dashboard: false,
      catalogo: false,
      clientes: false,
      pedidos: false,
      orcamentos: false,
      funil: false,
      visitas: false,
      portal: true,
      vendedores: false,
    };
  }
  if (role === "admin") {
    return {
      dashboard: true,
      catalogo: true,
      clientes: true,
      pedidos: true,
      orcamentos: true,
      funil: true,
      visitas: true,
      portal: false,
      vendedores: true,
    };
  }
  return {
    dashboard: true,
    catalogo: true,
    clientes: true,
    pedidos: true,
    orcamentos: true,
    funil: true,
    visitas: true,
    portal: false,
    vendedores: false,
  };
}

export async function fetchSessionMenu(accessToken: string): Promise<MenuFlags | null> {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return null;
  const base = raw.replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/api/session/menu`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: "omit",
    });

    if (!res.ok) return null;
    const body = (await res.json()) as {
      ok?: boolean;
      data?: { menu?: Partial<MenuFlags> };
    };
    if (!body?.ok || !body.data?.menu) return null;
    const m = body.data.menu;
    return {
      dashboard: !!m.dashboard,
      catalogo: !!m.catalogo,
      clientes: !!m.clientes,
      pedidos: !!m.pedidos,
      orcamentos: !!m.orcamentos,
      funil: !!m.funil,
      /** API antiga sem `visitas`: espelha carteira de clientes (mesmo público do CRM). */
      visitas: !!(m.visitas ?? m.clientes),
      portal: !!m.portal,
      vendedores: !!m.vendedores,
    };
  } catch {
    return null;
  }
}

/** Primeira rota que o papel pode usar (`null` = nenhuma; evite redirect em loop). */
export function firstAccessiblePath(menu: MenuFlags): string | null {
  const order: { key: MenuKey; path: string }[] = [
    { key: "dashboard", path: "/dashboard" },
    { key: "pedidos", path: "/pedidos" },
    { key: "orcamentos", path: "/orcamentos" },
    { key: "funil", path: "/funil" },
    { key: "visitas", path: "/visitas" },
    { key: "clientes", path: "/clientes" },
    { key: "catalogo", path: "/catalogo" },
    { key: "vendedores", path: "/vendedores" },
    { key: "portal", path: "/portal" },
  ];
  for (const { key, path } of order) {
    if (menu[key]) return path;
  }
  return null;
}
