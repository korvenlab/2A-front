import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar senha — 2AVendas" }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = z.string().email().safeParse(email);
    if (!parsed.success) return toast.error("E-mail inválido");
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Link enviado! Verifique seu e-mail.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" style={{ background: "var(--gradient-soft)" }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Recuperar senha</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Informe seu e-mail e enviaremos um link para você criar uma nova senha.
        </p>
        {sent ? (
          <div className="mt-6 rounded-lg bg-success/10 border border-success/20 p-4 text-sm">
            Se existir uma conta com esse e-mail, um link foi enviado.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 h-11" />
            </div>
            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
            </Button>
          </form>
        )}
        <Link to="/login" className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para login
        </Link>
      </div>
    </div>
  );
}
