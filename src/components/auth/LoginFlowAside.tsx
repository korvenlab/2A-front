import { LayoutDashboard, Link2, ShoppingBag } from "lucide-react";

function FlowConnector({ vertical }: { vertical?: boolean }) {
  if (vertical) {
    return (
      <div className="relative mx-auto h-12 w-[2px] shrink-0 overflow-hidden rounded-full lg:hidden" aria-hidden>
        <div className="login-flow-line-v absolute inset-0" />
      </div>
    );
  }
  return (
    <div className="relative mx-auto hidden h-[2px] w-full min-w-[48px] max-w-[100px] shrink lg:block" aria-hidden>
      <div className="login-flow-line-h absolute inset-0" />
    </div>
  );
}

function FlowStep({
  icon: Icon,
  label,
  pulseClass,
}: {
  icon: typeof Link2;
  label: string;
  pulseClass: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-2.5 text-center ${pulseClass}`}>
      <Icon className="h-9 w-9 text-[#0056b3]" strokeWidth={1.5} aria-hidden />
      <span className="max-w-[9rem] text-xs font-medium leading-snug text-[#002B5B]">{label}</span>
    </div>
  );
}

/**
 * Fluxo minimalista no login: Link gerado → Pedido do cliente → Painel de gestão.
 * Linha azul em loop suave; ícones em stroke royal.
 */
export function LoginFlowAside() {
  return (
    <aside className="hidden min-h-screen flex-col justify-center border-r-2 border-[#002B5B] bg-white lg:flex lg:px-12 xl:px-16">
      <p className="max-w-md text-lg font-normal leading-relaxed tracking-tight text-[#002B5B]">
        Sua operação B2B centralizada: Vendedores, Funil e Pedidos via Link.
      </p>

      <div className="mt-14 flex max-w-xl flex-col items-stretch gap-2 lg:mt-20 lg:flex-row lg:items-center lg:gap-3">
        <FlowStep icon={Link2} label="Link gerado" pulseClass="login-flow-pulse-a" />
        <FlowConnector vertical />
        <FlowConnector />

        <FlowStep icon={ShoppingBag} label="Pedido do cliente" pulseClass="login-flow-pulse-b" />
        <FlowConnector vertical />
        <FlowConnector />

        <FlowStep icon={LayoutDashboard} label="Painel de gestão" pulseClass="login-flow-pulse-c" />
      </div>
    </aside>
  );
}
