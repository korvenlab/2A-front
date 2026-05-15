import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { userFacingAuthError } from "@/lib/supabase-user-error";
import { passwordResetRedirectUrl } from "@/lib/password-recovery";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

const RESEND_COOLDOWN_SEC = 60;

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar senha — 2AVendas" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => {
      setCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const sendLink = async () => {
    const parsed = z.string().email().safeParse(email.trim());
    if (!parsed.success) {
      toast.error("E-mail inválido");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: passwordResetRedirectUrl(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(userFacingAuthError(error));
      return;
    }
    setSent(true);
    setCooldown(RESEND_COOLDOWN_SEC);
    toast.success("Se o e-mail estiver cadastrado, você receberá o link em instantes.");
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendLink();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background px-4"
      style={{ background: "var(--gradient-soft)" }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Recuperar senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.
        </p>
        {sent ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-success/20 bg-success/10 p-4 text-sm">
              Se existir uma conta com esse e-mail, o link foi enviado. Verifique a caixa de entrada
              e o spam. Abra o link no mesmo dispositivo ou navegador em que costuma acessar o
              2AVendas.
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11"
              disabled={submitting || cooldown > 0}
              onClick={() => void sendLink()}
            >
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar link"}
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
            </Button>
          </form>
        )}
        <Link
          to="/login"
          className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para login
        </Link>
      </div>
    </div>
  );
}
