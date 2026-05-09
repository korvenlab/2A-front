import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth-context";
import { LoginCarousel } from "@/components/auth/LoginCarousel";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const REMEMBER_KEY = "2avendas.rememberedEmail";

const loginInputClass =
  "mt-1.5 h-11 rounded-[6px] border-[color:var(--landing-blue-line)] bg-white text-neutral-950 placeholder:text-sky-400/90 shadow-none focus-visible:border-[color:var(--landing-blue-deep)] focus-visible:ring-0";

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
    if (!loading && isAuthenticated) navigate({ to: search.redirect ?? "/dashboard" });
  }, [isAuthenticated, loading, navigate, search.redirect]);

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

  const onGoogle = async () => {
    setSubmitting(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${search.redirect ?? "/dashboard"}`,
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="login-split-brand min-h-screen grid bg-[#f0f7ff] lg:grid-cols-2 lg:bg-white">
      <div className="hidden lg:block">
        <LoginCarousel />
      </div>

      <div className="flex flex-col justify-center border-[color:var(--landing-blue-line-faint)] bg-white px-6 py-10 lg:border-l lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <div className="mb-8 hidden lg:block">
            <Logo />
          </div>

          <h1 className="text-2xl font-medium tracking-tight text-[color:var(--landing-blue-deep)]">Entrar</h1>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email" className="text-sm font-normal text-sky-800/75">
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
              <Label htmlFor="password" className="text-sm font-normal text-sky-800/75">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--landing-blue)] hover:text-[color:var(--landing-blue-deep)]"
                  aria-label={showPwd ? "Ocultar" : "Mostrar"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-2 flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-normal text-[color:var(--landing-blue-deep)] underline-offset-2 hover:text-[color:var(--landing-blue)] hover:underline"
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
                className="border-[color:var(--landing-blue-deep)] text-white shadow-none focus-visible:ring-[color:var(--landing-blue)] data-[state=checked]:border-transparent data-[state=checked]:bg-[color:var(--landing-blue-deep)] data-[state=checked]:text-white"
              />
              <Label htmlFor="remember" className="cursor-pointer text-sm font-normal text-sky-800/70">
                Lembrar e-mail
              </Label>
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-[6px] border-0 bg-[color:var(--landing-blue-deep)] font-semibold text-white shadow-none hover:bg-[color:var(--landing-blue)]"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[color:var(--landing-blue-line-faint)]" />
            <span className="text-xs uppercase tracking-wide text-sky-700/65">ou</span>
            <div className="h-px flex-1 bg-[color:var(--landing-blue-line-faint)]" />
          </div>

          <Button
            variant="outline"
            className="h-11 w-full rounded-[6px] border border-[color:var(--landing-blue-deep)] bg-white font-medium text-neutral-900 shadow-none hover:bg-[color:var(--landing-blue-fill)]"
            onClick={onGoogle}
            disabled={submitting}
          >
            <GoogleIcon /> Continuar com Google
          </Button>

          <p className="mt-8 text-center text-sm text-sky-800/75">
            {inviteToken ? (
              <>
                Primeiro acesso?{" "}
                <Link
                  to="/signup"
                  search={{ invite: inviteToken }}
                  className="font-medium text-[color:var(--landing-blue-deep)] hover:text-[color:var(--landing-blue)] hover:underline"
                >
                  Criar conta com o convite
                </Link>
              </>
            ) : (
              <>
                Ainda não tem conta de representação?{" "}
                <Link
                  to="/signup"
                  className="font-medium text-[color:var(--landing-blue-deep)] hover:text-[color:var(--landing-blue)] hover:underline"
                >
                  Cadastre sua representação
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
