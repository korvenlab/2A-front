import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
  loading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (uid: string) => {
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

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    const list = (roles ?? []).map((r: { role: AppRole }) => r.role);
    const priority: AppRole[] = ["admin", "vendedor", "cliente"];
    const primary = priority.find((p) => list.includes(p)) ?? null;
    setRole(primary);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        // defer to avoid deadlock
        setTimeout(() => loadUserData(newSession.user.id), 0);
      } else {
        setProfile(null);
        setOrganization(null);
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        loadUserData(data.session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (session?.user) await loadUserData(session.user.id);
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
