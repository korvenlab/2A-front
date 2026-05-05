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
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>) => ({
    invite: typeof search.invite === "string" ? search.invite : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Cadastre-se grátis — 2AVendas" },
      { name: "description", content: "Crie sua representação no 2AVendas em menos de 1 minuto. 14 dias grátis." },
    ],
  }),
  component: SignupPage,
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome").max(100),
  organizationName: z.string().trim().min(2, "Informe o nome da empresa").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "Mínimo 8 caracteres").max(72),
});

function SignupPage() {
  const search = Route.useSearch();
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) navigate({ to: "/dashboard" });
  }, [isAuthenticated, loading, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ fullName, organizationName, email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: {
          full_name: parsed.data.fullName,
          organization_name: parsed.data.organizationName,
          role: "admin",
          invite_token: search.invite,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Você já pode acessar.");
  };

  const onGoogle = async () => {
    setSubmitting(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:block">
        <LoginCarousel />
      </div>
      <div className="flex flex-col justify-center px-6 py-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Logo />
          <h1 className="mt-8 text-3xl font-bold tracking-tight">Crie sua representação</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            14 dias grátis. Sem cartão de crédito.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fullName">Seu nome</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1.5 h-11" />
            </div>
            <div>
              <Label htmlFor="org">Nome da empresa / representação</Label>
              <Input id="org" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required className="mt-1.5 h-11" />
            </div>
            <div>
              <Label htmlFor="email">E-mail corporativo</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 h-11" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5 h-11" />
              <p className="mt-1 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>
            <Button type="submit" className="w-full h-11 shadow-md" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar conta grátis"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full h-11" onClick={onGoogle} disabled={submitting}>
            Cadastrar com Google
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
