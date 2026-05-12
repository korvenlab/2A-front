import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/billing/unlock")({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" ? search.t : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Liberação de acesso — 2AVendas" },
      { name: "description", content: "Confirme o link de liberação enviado pela equipe Korven." },
    ],
  }),
  component: BillingUnlockPage,
});

type ClaimState = "loading" | "ok" | "error";

function BillingUnlockPage() {
  const { t } = Route.useSearch();
  const [state, setState] = useState<ClaimState>(() => (t?.trim() ? "loading" : "error"));
  const [message, setMessage] = useState(() =>
    t?.trim() ? "" : "Este link está incompleto. Use o link completo enviado pelo Korven Dashboard.",
  );

  useEffect(() => {
    if (!t?.trim()) return;
    let cancelled = false;
    (async () => {
      const raw = import.meta.env.VITE_API_URL?.trim();
      if (!raw) {
        if (!cancelled) {
          setState("error");
          setMessage("Serviço de API não configurado (VITE_API_URL).");
        }
        return;
      }
      const base = raw.replace(/\/$/, "");
      try {
        const res = await fetch(`${base}/api/billing/claim-unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ token: t.trim() }),
        });
        const body = (await res.json()) as { ok?: boolean; error?: string };
        if (cancelled) return;
        if (res.ok && body?.ok) {
          setState("ok");
          setMessage("Acesso da representação foi liberado. Entre com a conta de administrador para usar o painel.");
          return;
        }
        setState("error");
        setMessage(body?.error ?? "Não foi possível validar o link.");
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("Falha de rede. Tente de novo em instantes.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="flex justify-center">
          <Logo />
        </div>
        <h1 className="text-center text-lg font-semibold text-foreground">Liberação Korven</h1>

        {state === "loading" ? (
          <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
            <p>Validando link…</p>
          </div>
        ) : null}

        {state === "ok" ? (
          <div className="flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-foreground">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
            <p>{message}</p>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
            <XCircle className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
            <p>{message}</p>
          </div>
        ) : null}

        {state === "ok" ? (
          <Button asChild className="w-full">
            <Link to="/login" search={{ redirect: "/assinatura" }}>
              Entrar no 2AVendas
            </Link>
          </Button>
        ) : state === "error" && t?.trim() ? (
          <Button asChild variant="outline" className="w-full">
            <Link to="/">Voltar ao início</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
