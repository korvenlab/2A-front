/** Mapa espelho do GET /api/session/menu do backend — use VITE_API_URL para leitura pelo JWT. */

import { supabase } from "@/integrations/supabase/client";

const MENU_FETCH_TIMEOUT_MS = 12_000;

function menuAbortSignal(): AbortSignal | undefined {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(MENU_FETCH_TIMEOUT_MS);
  }
  return undefined;
}

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

/** Espelha o objeto `billing` do GET /api/session/menu (staff: assinatura Stripe / unlock manual). */
export interface BillingFlags {
  required: boolean;
  satisfied: boolean;
  /** Assinatura Stripe a nível da organização (webhook legado ou checkout só com org). */
  stripe_active: boolean;
  manual_unlock: boolean;
  /** Este usuário concluiu pagamento Stripe (referência org:user no checkout). */
  user_stripe_paid: boolean;
  /** Cortesia por link promocional ainda válida (GET /api/session/menu). */
  user_complimentary_active?: boolean;
}

export function defaultBillingFlags(): BillingFlags {
  return {
    required: false,
    satisfied: true,
    stripe_active: false,
    manual_unlock: false,
    user_stripe_paid: false,
  };
}

/** Quando o GET /api/session/menu falha: admin/vendedor não devem operar sem confirmação do servidor. */
export function staffBillingLockedFlags(): BillingFlags {
  return {
    required: true,
    satisfied: false,
    stripe_active: false,
    manual_unlock: false,
    user_stripe_paid: false,
  };
}

/** Acesso operacional destrancado: Stripe (org ou utilizador), unlock Korven, ou cortesia por link promocional. */
export function staffBillingAccessUnlocked(b: BillingFlags): boolean {
  return (
    !!b.satisfied ||
    !!b.stripe_active ||
    !!b.manual_unlock ||
    !!b.user_stripe_paid ||
    !!b.user_complimentary_active
  );
}

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

/** Cortesia ainda válida (Supabase pode devolver ISO string ou Date). */
export function complimentaryUntilActive(raw: unknown): boolean {
  if (raw == null) return false;
  let ms: number;
  if (typeof raw === "string") {
    const s = raw.trim();
    if (!s) return false;
    ms = Date.parse(s);
  } else if (typeof raw === "number" && Number.isFinite(raw)) {
    ms = raw < 1e12 ? raw * 1000 : raw;
  } else if (raw instanceof Date) {
    ms = raw.getTime();
  } else {
    return false;
  }
  return Number.isFinite(ms) && ms > Date.now();
}

/**
 * Quando o GET /api/session/menu falha (CORS, rede, URL errada), staff ainda pode ler a própria linha em
 * `app_users` + org via RLS — evita ficar preso em /assinatura com cortesia já gravada na base.
 */
export async function fetchStaffBillingFallbackFromSupabase(userId: string): Promise<BillingFlags | null> {
  const { data: au, error } = await supabase
    .from("app_users")
    .select("organization_id, billing_stripe_access_at, billing_complimentary_access_until")
    .eq("id", userId)
    .maybeSingle();
  if (error || !au) return null;

  const row = au as {
    organization_id?: string | null;
    billing_stripe_access_at?: unknown;
    billing_complimentary_access_until?: unknown;
  };
  const orgIdRaw = row.organization_id;
  const orgId =
    orgIdRaw != null && String(orgIdRaw).trim() !== "" ? String(orgIdRaw).trim() : null;

  let stripe_active = false;
  let manual_unlock = false;
  if (orgId) {
    const { data: org } = await supabase
      .from("organizations")
      .select("billing_stripe_active, billing_manual_unlock")
      .eq("id", orgId)
      .maybeSingle();
    const o = org as { billing_stripe_active?: boolean | null; billing_manual_unlock?: boolean | null } | null;
    stripe_active = !!o?.billing_stripe_active;
    manual_unlock = !!o?.billing_manual_unlock;
  }

  const user_stripe_paid = !!row.billing_stripe_access_at;
  const complimentary = complimentaryUntilActive(row.billing_complimentary_access_until);
  const required = !!orgId;
  const coreUnlocked = stripe_active || manual_unlock || user_stripe_paid || complimentary;

  return {
    required,
    satisfied: !required || coreUnlocked,
    stripe_active,
    manual_unlock,
    user_stripe_paid,
    user_complimentary_active: complimentary || undefined,
  };
}

export interface SessionMenuPayload {
  menu: MenuFlags;
  billing: BillingFlags;
}

async function fetchSessionMenuOnce(accessToken: string): Promise<SessionMenuPayload | null> {
  const raw = import.meta.env.VITE_API_URL?.trim();
  if (!raw) return null;
  const base = raw.replace(/\/$/, "");

  try {
    const res = await fetch(`${base}/api/session/menu`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      credentials: "omit",
      cache: "no-store",
      signal: menuAbortSignal(),
    });

    if (!res.ok) return null;
    const ct = res.headers.get("content-type");
    if (ct && !ct.includes("application/json")) return null;
    const body = (await res.json()) as {
      ok?: boolean;
      data?: {
        menu?: Partial<MenuFlags>;
        billing?: Partial<BillingFlags>;
      };
    };
    if (!body?.ok || !body.data?.menu) return null;
    const m = body.data.menu;
    const b = body.data.billing;
    const menu = {
      dashboard: !!m.dashboard,
      catalogo: !!m.catalogo,
      clientes: !!m.clientes,
      pedidos: !!m.pedidos,
      orcamentos: !!m.orcamentos,
      funil: !!m.funil,
      visitas: !!(m.visitas ?? m.clientes),
      portal: !!m.portal,
      vendedores: !!m.vendedores,
    };
    const complimentary = !!b?.user_complimentary_active;
    const billing: BillingFlags = {
      required: !!b?.required,
      satisfied: !!(b?.satisfied || complimentary),
      stripe_active: !!b?.stripe_active,
      manual_unlock: !!b?.manual_unlock,
      user_stripe_paid: !!b?.user_stripe_paid,
      user_complimentary_active: complimentary || undefined,
    };
    return { menu, billing };
  } catch {
    return null;
  }
}

export async function fetchSessionMenu(accessToken: string): Promise<SessionMenuPayload | null> {
  const first = await fetchSessionMenuOnce(accessToken);
  if (first) return first;
  await new Promise((r) => setTimeout(r, 450));
  return fetchSessionMenuOnce(accessToken);
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
