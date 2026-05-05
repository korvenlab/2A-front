import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Definir nova senha — 2AVendas" }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Mínimo 8 caracteres");
    if (password !== confirm) return toast.error("As senhas não coincidem");
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada!");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" style={{ background: "var(--gradient-soft)" }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Definir nova senha</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="pwd">Nova senha</Label>
            <Input id="pwd" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5 h-11" />
          </div>
          <div>
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="mt-1.5 h-11" />
          </div>
          <Button type="submit" className="w-full h-11" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
