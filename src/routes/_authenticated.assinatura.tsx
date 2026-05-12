import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { firstAccessiblePath } from "@/lib/session-menu";
import { buildStripePaymentLinkUrl } from "@/lib/stripe-payment-link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/assinatura")({
  head: () => ({ meta: [{ title: "Assinatura — 2AVendas" }] }),
  component: AssinaturaPage,
});

function AssinaturaPage() {
  const { billing, menu, loading, refresh, role, organization, user } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  const search = new URLSearchParams(location.search);
  const checkoutStatus = search.get("checkout");

  useEffect(() => {
    if (loading) return;
    if (role !== "admin" && role !== "vendedor") {
      navigate({ to: "/portal", replace: true });
      return;
    }
    if (!billing.required) {
      const dest = firstAccessiblePath(menu) ?? "/dashboard";
      navigate({ to: dest, replace: true });
      return;
    }
    if (billing.satisfied) {
      const dest = firstAccessiblePath(menu) ?? "/dashboard";
      navigate({ to: dest, replace: true });
    }
  }, [loading, role, billing.required, billing.satisfied, menu, navigate]);

  useEffect(() => {
    if (checkoutStatus === "success") {
      void refresh();
      toast.message("Pagamento recebido", {
        description: "Atualizando seu acesso… Se o menu não liberar em instantes, atualize a página.",
      });
    }
  }, [checkoutStatus, refresh]);

  const openStripePaymentLink = () => {
    const orgId = organization?.id?.trim();
    const payerId = user?.id?.trim();
    if (!orgId) {
      toast.error("Organização não encontrada. Atualize a página ou entre de novo.");
      return;
    }
    if (!payerId) {
      toast.error("Sessão sem usuário. Entre novamente.");
      return;
    }
    const url = buildStripePaymentLinkUrl(orgId, payerId);
    if (!url) {
      toast.error("Não foi possível montar o link de pagamento.");
      return;
    }
    window.location.assign(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  if (role !== "admin" && role !== "vendedor") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  if (billing.satisfied) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ative o 2AVendas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A área operacional da representação fica disponível após a assinatura via Stripe ou liberação pela equipe
          Korven.
        </p>
      </div>

      {checkoutStatus === "success" ? (
        <div className="flex gap-3 rounded-lg border border-border bg-card p-4 text-sm">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="font-medium">Checkout concluído</p>
            <p className="mt-1 text-muted-foreground">
              Estamos confirmando o pagamento. Se o acesso não liberar em alguns segundos, use &quot;Atualizar&quot;
              no navegador.
            </p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => void refresh()}>
              Atualizar sessão
            </Button>
          </div>
        </div>
      ) : null}

      {checkoutStatus === "cancel" ? (
        <p className="text-sm text-muted-foreground">Pagamento cancelado. Você pode tentar novamente quando quiser.</p>
      ) : null}

      {role === "admin" ? (
        <div className="space-y-3">
          <Button type="button" className="w-full gap-2" size="lg" onClick={openStripePaymentLink}>
            <CreditCard className="h-4 w-4" aria-hidden />
            Pagar com Stripe
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Apenas o administrador pode concluir o pagamento. Vendedores aguardam a liberação da organização.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground rounded-lg border border-border bg-muted/40 p-4">
          Somente o administrador da representação pode finalizar o pagamento. Solicite que ele acesse esta página e
          conclua a assinatura, ou peça liberação manual à equipe Korven.
        </p>
      )}
    </div>
  );
}
