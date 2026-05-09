import { Link2 } from "lucide-react";

const r = "rounded-[4px]";

/**
 * Fluxo visual (~6s): link pulsante → catálogo com linhas em sequência → pedido “Novo”.
 * Conectores com gradiente em movimento (linha azul contínua).
 */
export function DataFlowAnimation() {
  return (
    <div className="landing-dataflow-root flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-3 lg:gap-5">
      {/* Bloco A — Link */}
      <div className={`flex shrink-0 flex-col items-center gap-2 ${r} border border-[#E0E7FF] bg-white px-5 py-6 md:w-[148px]`}>
        <Link2 className="landing-dataflow-link-icon h-10 w-10 text-[#0056b3]" strokeWidth={1.85} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[#002B5B]">Link</span>
      </div>

      <div className="relative mx-auto h-14 w-[3px] shrink-0 md:hidden" aria-hidden>
        <div className="landing-dataflow-line-v absolute inset-0" />
      </div>

      <div className="relative mx-auto hidden h-[3px] w-full min-w-[40px] max-w-[100px] shrink md:mx-0 md:block md:flex-1" aria-hidden>
        <div className="landing-dataflow-line-h absolute inset-0" />
      </div>

      {/* Bloco B — Catálogo */}
      <div className={`flex min-w-0 flex-1 flex-col gap-2 ${r} border border-[#E0E7FF] bg-white p-4 md:max-w-[240px]`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#002B5B]">Catálogo</p>
        {["Ref. montagem A", "Peça sintética 12", "Kit industrial Q"].map((label) => (
          <div
            key={label}
            className="landing-dataflow-catalog-row rounded-[3px] border border-[#E0E7FF] bg-white px-3 py-2 text-[13px] font-normal text-[#333]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="relative mx-auto h-14 w-[3px] shrink-0 md:hidden" aria-hidden>
        <div className="landing-dataflow-line-v absolute inset-0" />
      </div>

      <div className="relative mx-auto hidden h-[3px] w-full min-w-[40px] max-w-[100px] shrink md:mx-0 md:block md:flex-1" aria-hidden>
        <div className="landing-dataflow-line-h absolute inset-0" />
      </div>

      {/* Bloco C — Painel */}
      <div className={`landing-dataflow-order-panel flex min-w-0 shrink-0 flex-col ${r} border border-[#E0E7FF] bg-white md:w-[220px]`}>
        <div className="border-b border-[#E0E7FF] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#002B5B]">Pedidos recebidos</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-[13px] text-[#333]">
          <span className="font-bold tabular-nums text-[#0056b3]">#2041</span>
          <span className="text-xs text-[#333]/80">Link</span>
          <span className={`${r} border border-[#0056b3] bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#0056b3]`}>
            Novo
          </span>
        </div>
      </div>
    </div>
  );
}
