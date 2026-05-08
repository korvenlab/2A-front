import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  emptyMenu,
  fallbackMenuFromRole,
  fetchSessionMenu,
  type MenuFlags,
} from "@/lib/session-menu";

export type AppRole = "admin" | "vendedor" | "cliente";

export interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  role: AppRole | null;
  /** Habilitações de navegação (API / backend ou fallback por role). */
  menu: MenuFlags;
  loading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

async function resolveMenu(accessToken: string | null | undefined, currentRole: AppRole | null) {
  if (!accessToken) return emptyMenu();
  const fetched = await fetchSessionMenu(accessToken);
  return fetched ?? fallbackMenuFromRole(currentRole);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [menu, setMenu] = useState<MenuFlags>(emptyMenu());
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string, accessToken?: string | null) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, organization_id, full_name, email, avatar_url")
      .eq("id", uid)
      .maybeSingle();
    setProfile((prof as Profile) ?? null);

    if (prof?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("id", prof.organization_id)
        .maybeSingle();
      setOrganization((org as Organization) ?? null);
    } else {
      setOrganization(null);
    }

<<<<<<< HEAD
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const list = ((roles ?? []) as { role: AppRole }[]).map((r) => r.role);
=======
    const { data: appUser } = await supabase
      .from("app_users")
      .select("role")
      .eq("id", uid)
      .maybeSingle();
    const appRole = (appUser as { role?: string } | null)?.role?.toLowerCase();
    if (appRole === "admin" || appRole === "vendedor" || appRole === "cliente") {
      setRole(appRole);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    const list = (roles ?? []).map((r: { role: AppRole }) => r.role);
>>>>>>> d7813d8 (fix(auth): stabilize role resolution and least-privilege navigation)
    const priority: AppRole[] = ["admin", "vendedor", "cliente"];
    const primary = priority.find((p) => list.includes(p)) ?? null;
    setRole(primary);

    const token =
      accessToken ??
      (
        await supabase.auth.getSession()
      ).data.session?.access_token ??
      null;
    const nextMenu = await resolveMenu(token, primary);
    setMenu(nextMenu);
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
    await supabase.auth.signOut();
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
        loading,
        isAuthenticated: !!session,
        refresh,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
