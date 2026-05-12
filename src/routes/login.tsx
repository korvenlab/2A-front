import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { LoginFlowAside } from "@/components/auth/LoginFlowAside";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clearPendingPromoCode,
  persistPendingPromoCode,
  redeemTwoAvendasPromo,
  resolvePromoCodeFromSearch,
} from "@/lib/billing-redeem-promo";

const REMEMBER_KEY = "2avendas.rememberedEmail";

const loginInputClass =
  "login-input-clean mt-1.5 h-11 rounded-xl px-3 text-sm font-normal text-[#003366] placeholder:text-[#9CA3AF] focus-visible:ring-0";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): {
    redirect?: string;
    invite?: string;
    two_avendas_promo?: string;
  } => ({
    redirect: (search.redirect as string) || undefined,
    invite: typeof search.invite === "string" ? search.invite : undefined,
    two_avendas_promo:
      typeof search.two_avendas_promo === "string" ? search.two_avendas_promo : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — 2AVendas" },
      { name: "description", content: "Entre na sua conta 2AVendas." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  password: z.string().min(6, { message: "Mínimo 6 caracteres" }).max(72),
});

function inviteTokenFromLoginSearch(search: { invite?: string; redirect?: string }) {
  if (search.invite) return search.invite;
  const red = search.redirect;
  if (!red?.includes("invite=")) return undefined;
  try {
    const qs = red.includes("?") ? red.split("?")[1] ?? "" : "";
    return new URLSearchParams(qs).get("invite") ?? undefined;
  } catch {
    return undefined;
  }
}

type InvitePurposePeek = { purpose: string };

type PromoApplyResult =
  | { status: "no_promo" }
  | { status: "ok" }
  | { status: "config"; detail: "no_api" | "no_token" }
  | { status: "redeem_failed"; message: string };

async function tryRedeemLoginPromo(
  api: string | undefined,
  accessToken: string | null | undefined,
  search: { two_avendas_promo?: string },
): Promise<PromoApplyResult> {
  const promo = resolvePromoCodeFromSearch(search)?.trim();
  if (!promo) return { status: "no_promo" };
  const base = api?.trim();
  if (!base) return { status: "config", detail: "no_api" };
  const tok = accessToken?.trim();
  if (!tok) return { status: "config", detail: "no_token" };
  try {
    await redeemTwoAvendasPromo(base, tok, promo);
    clearPendingPromoCode();
    return { status: "ok" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { status: "redeem_failed", message };
  }
}

async function postLoginNavigation(
  navigate: ReturnType<typeof useNavigate>,
  search: { redirect?: string; invite?: string },
) {
  const r = search.redirect?.trim();
  if (r?.startsWith("/")) {
    window.location.replace(r);
    return;
  }
  const inv = inviteTokenFromLoginSearch(search);
  if (!inv) {
    navigate({ to: "/dashboard", replace: true });
    return;
  }
  const { data, error } = await supabase.rpc("peek_invite_purpose", { p_token: inv });
  if (error || !data?.length) {
    navigate({ to: "/dashboard", replace: true });
    return;
  }
  const purpose = (data as InvitePurposePeek[])[0]?.purpose;
  if (purpose === "client_catalog") {
    window.location.replace(`/portal?invite=${encodeURIComponent(inv)}`);
    return;
  }
  navigate({ to: "/dashboard", replace: true });
}

function LoginPage() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const inviteToken = inviteTokenFromLoginSearch(search);
  const skipAuthenticatedPostLogin = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) setEmail(saved);
    }
  }, []);

  useEffect(() => {
    const p = search.two_avendas_promo?.trim();
    if (p) persistPendingPromoCode(p);
  }, [search.two_avendas_promo]);

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (skipAuthenticatedPostLogin.current) {
      skipAuthenticatedPostLogin.current = false;
      return;
    }
    let cancelled = false;
    void (async () => {
      const api = import.meta.env.VITE_API_URL?.trim();
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token ?? null;
      const promoResult = await tryRedeemLoginPromo(api, token, search);
      if (cancelled) return;
      if (promoResult.status === "config") {
        if (resolvePromoCodeFromSearch(search)?.trim()) {
          if (promoResult.detail === "no_api") {
            toast.error(
              "Não foi possível aplicar o código: o site não tem VITE_API_URL (URL da API). Configure na Vercel e faça redeploy.",
            );
          } else {
            toast.error("Sessão indisponível para aplicar o código. Recarregue a página e entre de novo.");
          }
        }
      } else if (promoResult.status === "redeem_failed") {
        toast.error(promoResult.message);
      } else if (promoResult.status === "ok") {
        toast.success("Acesso promocional aplicado.");
        await refresh();
      }

      if (cancelled) return;
      await postLoginNavigation(navigate, search);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, navigate, search.redirect, search.invite, search.two_avendas_promo]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { data: signData, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) {
      setSubmitting(false);
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
      return;
    }
    const api = import.meta.env.VITE_API_URL?.trim();
    const accessToken = signData.session?.access_token ?? null;
    const promoResult = await tryRedeemLoginPromo(api, accessToken, search);
    if (promoResult.status === "config" && resolvePromoCodeFromSearch(search)?.trim()) {
      if (promoResult.detail === "no_api") {
        toast.error(
          "Não foi possível aplicar o código: o site não tem VITE_API_URL (URL da API). Configure na Vercel e faça redeploy.",
        );
      } else {
        toast.error("Sessão indisponível para aplicar o código. Recarregue a página e tente de novo.");
      }
    } else if (promoResult.status === "redeem_failed") {
      toast.error(promoResult.message);
    } else if (promoResult.status === "ok") {
      toast.success("Acesso promocional aplicado.");
      await refresh();
    }

    if (remember) localStorage.setItem(REMEMBER_KEY, parsed.data.email);
    else localStorage.removeItem(REMEMBER_KEY);
    toast.success("Bem-vindo de volta!");

    skipAuthenticatedPostLogin.current = true;
    await postLoginNavigation(navigate, search);
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FFFFFF] font-sans antialiased">
      <div className="border-b border-[#E8ECF2] bg-[#F9F9F9] px-5 py-4 lg:hidden">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#007AFF]">2AVendas</p>
        <p className="mt-2 text-sm font-normal leading-relaxed text-[#003366]">
          Sua operação B2B centralizada: Vendedores, Funil e Pedidos via Link.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <LoginFlowAside />

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:min-h-screen lg:py-16 xl:px-10">
          <div className="landing-magic-float w-full max-w-[420px] rounded-[22px] border border-[rgba(0,122,255,0.22)] bg-white p-8 md:p-10">
            <div className="mb-9 flex justify-start">
              <Logo light={false} />
            </div>

            <h1 className="text-xl font-semibold tracking-tight text-[#003366]">Entrar na conta</h1>
            <p className="mt-2 text-sm font-normal text-[#475569]">Use seu e-mail e senha cadastrados.</p>
            <Link
              to="/"
              className="mt-3 inline-block text-xs font-mono uppercase tracking-[0.18em] text-[#007AFF] underline-offset-4 hover:underline"
            >
              Voltar ao início
            </Link>

            <form onSubmit={onSubmit} className="mt-8 space-y-5 text-left">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-[#003366]">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                  required
                  className={loginInputClass}
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-sm font-medium text-[#003366]">
                  Senha
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={cn(loginInputClass, "mt-0 pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#007AFF]"
                    aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-normal text-[#007AFF] underline-offset-2 hover:underline"
                  >
                    Esqueci minha senha
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(!!v)}
                  className="rounded-md border border-[rgba(0,122,255,0.22)] bg-white shadow-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/35 data-[state=checked]:border-[#007AFF] data-[state=checked]:bg-[#007AFF] data-[state=checked]:text-white"
                />
                <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-[#475569]">
                  Lembrar e-mail
                </Label>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-xl border-0 bg-[#007AFF] text-sm font-semibold text-white shadow-none hover:bg-[#0066DB]"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>

            <p className="mt-10 text-left text-xs font-normal leading-relaxed text-[#475569]">
              {inviteToken ? (
                <>
                  Primeiro acesso?{" "}
                  <Link
                    to="/signup"
                    search={{
                      invite: inviteToken,
                      ...(search.two_avendas_promo?.trim()
                        ? { two_avendas_promo: search.two_avendas_promo.trim() }
                        : {}),
                    }}
                    className="font-medium text-[#007AFF] underline-offset-2 hover:underline"
                  >
                    Criar conta com o convite
                  </Link>
                </>
              ) : (
                <>
                  Ainda não tem conta?{" "}
                  <Link
                    to="/signup"
                    search={
                      search.two_avendas_promo?.trim()
                        ? { two_avendas_promo: search.two_avendas_promo.trim() }
                        : undefined
                    }
                    className="font-medium text-[#007AFF] underline-offset-2 hover:underline"
                  >
                    Cadastre sua representação
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
