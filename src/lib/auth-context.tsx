import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import type { Session, User } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { redeemPendingPromoBeforeMenuForStaff } from "@/lib/billing-redeem-promo";
import {
  defaultBillingFlags,
  emptyMenu,
  fallbackMenuFromRole,
  fetchSessionMenu,
  staffBillingLockedFlags,
  type BillingFlags,
  type MenuFlags,
} from "@/lib/session-menu";

export type AppRole = "admin" | "vendedor" | "cliente";

export interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string | null;
  /** Nome fantasia / nome de uso da empresa do cliente B2B. Distinto da tenant da representação. */
  organization_client: string | null;
  /** Razão social da empresa do cliente B2B. */
  organization_client_legal: string | null;
  /** Segmento ou indústria declarada no cadastro do cliente B2B. */
  organization_client_industry: string | null;
  /** Empresa da representação (admin/vendedor); alinhada ao tenant organizations. */
  organization_staff: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  /** Administrador dono da organização (cadastro direto); espelho na lista de vendedores + comissão própria. */
  owner_user_id: string | null;
  /** % da comissão de cada vendedor retido pela representação (admin). */
  admin_commission_share_pct: number;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  role: AppRole | null;
  /** Habilitações de navegação (API / backend ou fallback por role). */
  menu: MenuFlags;
  /** Cobrança / acesso à plataforma (admin e vendedor na mesma organização). */
  billing: BillingFlags;
  loading: boolean;
  isAuthenticated: boolean;
  /** True durante logout intencional — evita redirect para /login e flicker de erro nas rotas autenticadas. */
  signingOut: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

/** Após sair: página inicial (produção costuma ser o mesmo origin de 2avendas.com). Opcional: `VITE_PUBLIC_HOME_URL`. */
function resolvePublicHomeUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_HOME_URL?.trim();
  if (configured) return `${configured.replace(/\/+$/, "")}/`;
  if (typeof window !== "undefined") return `${window.location.origin}/`;
  return "/";
}

async function resolveMenu(accessToken: string | null | undefined, currentRole: AppRole | null) {
  if (!accessToken) return { menu: emptyMenu(), billing: defaultBillingFlags() };
  const fetched = await fetchSessionMenu(accessToken);
  if (!fetched) {
    if (currentRole === "admin" || currentRole === "vendedor") {
      return { menu: emptyMenu(), billing: staffBillingLockedFlags() };
    }
    return {
      menu: fallbackMenuFromRole(currentRole),
      billing: defaultBillingFlags(),
    };
  }
  let menu = fetched.menu;
  /** Reforço: API antiga sem sellers:view — só quando billing já permite operar (evita abrir /vendedores sem pagamento). */
  const billingOk = !fetched.billing.required || fetched.billing.satisfied;
  if (currentRole === "admin" && billingOk) {
    menu = { ...menu, vendedores: menu.vendedores || true };
  }
  return { menu, billing: fetched.billing };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [menu, setMenu] = useState<MenuFlags>(emptyMenu());
  const [billing, setBilling] = useState<BillingFlags>(defaultBillingFlags());
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  /** Evita que um `loadUserData` antigo sobrescreva menu/billing após resgate promo ou refresh. */
  const loadUserDataSeqRef = useRef(0);

  const loadUserData = async (uid: string, accessToken?: string | null) => {
    const seq = ++loadUserDataSeqRef.current;

    const { data: prof } = await supabase
      .from("profiles")
      .select(
        "id, organization_id, full_name, organization_client, organization_client_legal, organization_client_industry, organization_staff, email, avatar_url",
      )
      .eq("id", uid)
      .maybeSingle();

    const { data: appUserRow } = await supabase
      .from("app_users")
      .select("role, organization_id")
      .eq("id", uid)
      .maybeSingle();
    const appUser = appUserRow as {
      role?: string | null;
      organization_id?: string | null;
    } | null;

    // Mesma prioridade que public.current_user_org() no Postgres (evita path de Storage com org errada).
    let resolvedOrgId: string | null = appUser?.organization_id ?? null;
    if (!resolvedOrgId) {
      resolvedOrgId = (prof as Profile | null)?.organization_id ?? null;
    }
    if (!resolvedOrgId) {
      const { data: urRows } = await supabase
        .from("user_roles")
        .select("organization_id, role")
        .eq("user_id", uid)
        .not("organization_id", "is", null);
      const list = (urRows ?? []) as { organization_id: string; role: AppRole }[];
      const priority: AppRole[] = ["admin", "vendedor", "cliente"];
      list.sort((a, b) => {
        const ia = priority.indexOf(a.role);
        const ib = priority.indexOf(b.role);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      });
      resolvedOrgId = list[0]?.organization_id ?? null;
    }

    let nextOrganization: Organization | null = null;
    if (resolvedOrgId) {
      const { data: org, error: orgFetchErr } = await supabase
        .from("organizations")
        .select("id, name, slug, owner_user_id, admin_commission_share_pct")
        .eq("id", resolvedOrgId)
        .maybeSingle();
      if (orgFetchErr && import.meta.env.DEV) {
        console.warn("[auth] organizations lookup:", orgFetchErr.message);
      }
      if (org) {
        nextOrganization = org as Organization;
      } else {
        nextOrganization = {
          id: resolvedOrgId,
          name: "Representação",
          slug: "representacao",
          owner_user_id: null,
          admin_commission_share_pct: 0,
        };
      }
    }

    /** Unifica app_users + user_roles: não confiar só em app_users (linha desatualizada escondia admin / menu Vendedores). */
    const appRaw = appUser?.role?.trim().toLowerCase() ?? undefined;
    const fromApp: AppRole | null =
      appRaw === "admin" || appRaw === "vendedor" || appRaw === "cliente" ? appRaw : null;

    const { data: rolesRows } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const fromUr = new Set<AppRole>();
    for (const row of rolesRows ?? []) {
      const r = String((row as { role: string }).role)
        .trim()
        .toLowerCase();
      if (r === "admin" || r === "vendedor" || r === "cliente") fromUr.add(r);
    }
    const priority: AppRole[] = ["admin", "vendedor", "cliente"];
    const candidates = new Set<AppRole>(fromUr);
    if (fromApp) candidates.add(fromApp);
    const primary = priority.find((p) => candidates.has(p)) ?? null;

    const token =
      accessToken ??
      (
        await supabase.auth.getSession()
      ).data.session?.access_token ??
      null;
    await redeemPendingPromoBeforeMenuForStaff(token, primary);
    const next = await resolveMenu(token, primary);

    if (seq !== loadUserDataSeqRef.current) return;

    setProfile((prof as Profile) ?? null);
    setOrganization(nextOrganization);
    setRole(primary);
    setMenu(next.menu);
    setBilling(next.billing);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setTimeout(() => {
          void loadUserData(newSession.user.id, newSession.access_token);
        }, 0);
      } else {
        setProfile(null);
        setOrganization(null);
        setRole(null);
        setMenu(emptyMenu());
        setBilling(defaultBillingFlags());
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void loadUserData(data.session.user.id, data.session.access_token).finally(() =>
          setLoading(false),
        );
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    const s = data.session;
    if (s?.user) await loadUserData(s.user.id, s.access_token);
  };

  const signOut = async () => {
    flushSync(() => setSigningOut(true));
    try {
      await supabase.auth.signOut();
      if (typeof window !== "undefined") {
        window.location.replace(resolvePublicHomeUrl());
      }
    } catch (e) {
      flushSync(() => setSigningOut(false));
      throw e;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        organization,
        role,
        menu,
        billing,
        loading,
        isAuthenticated: !!session,
        signingOut,
        refresh,
        signOut,
      }}
    >
      {signingOut ? (
        <div
          className="fixed inset-0 z-[2147483647] flex flex-col items-center justify-center gap-4 bg-background"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Saindo…</p>
        </div>
      ) : null}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
