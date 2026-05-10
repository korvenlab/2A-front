import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
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

const REMEMBER_KEY = "2avendas.rememberedEmail";

const loginInputClass =
  "login-input-clean mt-1.5 h-11 px-3 text-sm font-normal text-[#333] placeholder:text-[#94a3b8] focus-visible:ring-0";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; invite?: string } => ({
    redirect: (search.redirect as string) || undefined,
    invite: typeof search.invite === "string" ? search.invite : undefined,
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

function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const inviteToken = inviteTokenFromLoginSearch(search);
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
    if (loading || !isAuthenticated) return;
    const r = search.redirect?.trim();
    if (r?.startsWith("/")) {
      window.location.replace(r);
      return;
    }
    const inv = inviteTokenFromLoginSearch(search);
    if (!inv) {
      navigate({ to: "/dashboard" });
      return;
    }
    let cancelled = false;
    void supabase.rpc("peek_invite_purpose", { p_token: inv }).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data?.length) {
        navigate({ to: "/dashboard" });
        return;
      }
      const purpose = (data as InvitePurposePeek[])[0]?.purpose;
      if (purpose === "client_catalog") {
        window.location.replace(`/portal?invite=${encodeURIComponent(inv)}`);
        return;
      }
      navigate({ to: "/dashboard" });
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, navigate, search.redirect, search.invite]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
      return;
    }
    if (remember) localStorage.setItem(REMEMBER_KEY, parsed.data.email);
    else localStorage.removeItem(REMEMBER_KEY);
    toast.success("Bem-vindo de volta!");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] font-sans antialiased">
      <div className="border-b-2 border-[#002B5B] bg-white px-5 py-5 lg:hidden">
        <p className="text-sm font-normal leading-relaxed text-[#002B5B]">
          Sua operação B2B centralizada: Vendedores, Funil e Pedidos via Link.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <LoginFlowAside />

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:min-h-screen lg:py-16 xl:px-10">
          <div className="w-full max-w-[400px] rounded-[4px] border-2 border-[#002B5B] bg-white p-8 shadow-[4px_4px_0_0_#002B5B]">
            <div className="mb-9 flex justify-start">
              <Logo light={false} />
            </div>

            <h1 className="text-xl font-semibold tracking-tight text-[#002B5B]">Entrar na conta</h1>
            <p className="mt-2 text-sm font-normal text-[#333]">Use seu e-mail e senha cadastrados.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5 text-left">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-[#002B5B]">
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
                <Label htmlFor="password" className="text-sm font-medium text-[#002B5B]">
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#002B5B]"
                    aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-xs font-normal text-[#0056b3] underline-offset-2 hover:underline"
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
                  className="rounded-[4px] border border-[#CBD5E1] bg-white shadow-none focus-visible:ring-2 focus-visible:ring-[#0056b3]/35 data-[state=checked]:border-[#0056b3] data-[state=checked]:bg-[#0056b3] data-[state=checked]:text-white"
                />
                <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-[#333]">
                  Lembrar e-mail
                </Label>
              </div>

              <Button
                type="submit"
                className="h-11 w-full rounded-[4px] border-0 bg-[#0056b3] text-sm font-semibold text-white shadow-none hover:bg-[#004494]"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>

            <p className="mt-10 text-left text-xs font-normal leading-relaxed text-[#333]">
              {inviteToken ? (
                <>
                  Primeiro acesso?{" "}
                  <Link
                    to="/signup"
                    search={{ invite: inviteToken }}
                    className="font-medium text-[#0056b3] underline-offset-2 hover:underline"
                  >
                    Criar conta com o convite
                  </Link>
                </>
              ) : (
                <>
                  Ainda não tem conta?{" "}
                  <Link to="/signup" className="font-medium text-[#0056b3] underline-offset-2 hover:underline">
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
