import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { userFacingAuthError } from "@/lib/supabase-user-error";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Definir nova senha — 2AVendas" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [booting, setBooting] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finishBoot = (ready: boolean, err: string | null) => {
      if (cancelled) return;
      setSessionReady(ready);
      setBootError(err);
      setBooting(false);
    };

    const verifySession = async () => {
      const { data } = await supabase.auth.getSession();
      finishBoot(!!data.session, data.session ? null : null);
    };

    void (async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          finishBoot(
            false,
            "Link inválido ou expirado. Solicite um novo e-mail em Recuperar senha.",
          );
          return;
        }
        window.history.replaceState({}, "", window.location.pathname);
        finishBoot(true, null);
        return;
      }
      await verifySession();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        void verifySession();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionReady) {
      toast.error(bootError ?? "Link inválido ou expirado.");
      return;
    }
    if (password.length < 8) {
      toast.error("Mínimo 8 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      toast.error(userFacingAuthError(error));
      return;
    }
    toast.success("Senha atualizada! Entre com a nova senha.");
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background px-4"
      style={{ background: "var(--gradient-soft)" }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Definir nova senha</h1>

        {booting ? (
          <div className="mt-8 flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : bootError || !sessionReady ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {bootError ??
                "Não foi possível validar o link. Solicite um novo e-mail de recuperação."}
            </p>
            <Button type="button" className="w-full h-11" asChild>
              <Link to="/forgot-password">Solicitar novo link</Link>
            </Button>
            <Button type="button" variant="outline" className="w-full h-11" asChild>
              <Link to="/login">Voltar para login</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="pwd">Nova senha</Label>
              <div className="relative mt-1.5">
                <Input
                  id="pwd"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
            </div>
            <div>
              <Label htmlFor="confirm">Confirmar senha</Label>
              <div className="relative mt-1.5">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm((s) => !s)}
                  aria-label={showConfirm ? "Ocultar confirmação" : "Mostrar confirmação"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar senha"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
