import { Dice5, Filter, LayoutDashboard, Link2, MessageCircle, User, UserRound } from "lucide-react";

function BeamH({ delay }: { delay?: string }) {
  return (
    <div className="hero-sys-track-h hidden lg:block" aria-hidden>
      <div className="hero-sys-beam-h" style={delay ? { animationDelay: delay } : undefined} />
    </div>
  );
}

function BeamV({ delay }: { delay?: string }) {
  return (
    <div className="hero-sys-track-v mx-auto lg:hidden" aria-hidden>
      <div className="hero-sys-beam-v" style={delay ? { animationDelay: delay } : undefined} />
    </div>
  );
}

/**
 * Ciclo ~6s: (1) Vendedor + dado → funil → (2) Cliente + link + WhatsApp → (3) Painel central.
 * Fundo branco; divisões com borda marinho 2px no invólucro externo (via pai).
 */
export function HeroSystemFlow() {
  return (
    <div className="hero-sys-root text-left">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between lg:gap-8 xl:gap-10">
        {/* Etapa 1 */}
        <div className="hero-sys-panel hero-sys-panel-a flex min-h-[172px] w-full shrink-0 flex-[1.05] flex-col justify-between gap-4 border border-[#E0E7FF] bg-white p-5 lg:min-w-[280px] xl:min-w-[300px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Etapa 1</p>
          <div className="flex items-end justify-between gap-3 px-0 sm:px-1">
            <div className="flex flex-col items-center gap-1">
              <UserRound className="h-9 w-9 shrink-0 text-[#0056b3]" strokeWidth={1.6} aria-hidden />
              <span className="text-[10px] font-medium text-[#002B5B]">Vendedor</span>
            </div>
            <Dice5 className="hero-sys-dice h-8 w-8 shrink-0 text-[#0056b3]" strokeWidth={1.6} aria-hidden />
            <div className="flex flex-col items-center gap-1">
              <Filter className="h-9 w-9 shrink-0 text-[#0056b3]" strokeWidth={1.6} aria-hidden />
              <span className="text-[10px] font-medium text-[#002B5B]">Funil</span>
            </div>
          </div>
          <p className="text-[13px] font-normal leading-relaxed text-[#333]">
            Equipe externa joga oportunidades para o funil.
          </p>
        </div>

        <BeamV delay="0s" />
        <BeamH delay="0s" />

        {/* Etapa 2 */}
        <div className="hero-sys-panel hero-sys-panel-b flex min-h-[172px] w-full shrink-0 flex-[1.15] flex-col justify-between gap-4 border border-[#E0E7FF] bg-white p-5 lg:min-w-[300px] xl:min-w-[328px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Etapa 2</p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 px-0 sm:px-1">
            <div className="flex flex-col items-center gap-1">
              <User className="h-8 w-8 text-[#0056b3]" strokeWidth={1.6} aria-hidden />
              <span className="text-[10px] font-medium text-[#002B5B]">Cliente</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Link2 className="h-7 w-7 text-[#0056b3]" strokeWidth={1.6} aria-hidden />
              <span className="text-[10px] font-medium text-[#002B5B]">Link</span>
            </div>
            <div className="hero-sys-wa flex flex-col items-center gap-1">
              <MessageCircle className="h-8 w-8 text-[#0056b3]" strokeWidth={1.6} aria-hidden />
              <span className="text-[10px] font-medium text-[#002B5B]">WhatsApp</span>
            </div>
          </div>
          <p className="text-[13px] font-normal leading-relaxed text-[#333]">
            Cliente usa o link; alertas saem organizados no WhatsApp.
          </p>
        </div>

        <BeamV delay="-2s" />
        <BeamH delay="-2s" />

        {/* Etapa 3 */}
        <div className="hero-sys-panel hero-sys-panel-c flex min-h-[172px] w-full shrink-0 flex-col justify-between gap-4 border border-[#E0E7FF] bg-white p-5 lg:w-[min(100%,248px)] xl:w-[264px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Painel central</p>
          <div className="flex flex-1 items-center justify-center py-2">
            <LayoutDashboard className="hero-sys-dash h-12 w-12 text-[#0056b3]" strokeWidth={1.6} aria-hidden />
          </div>
          <p className="text-[13px] font-normal leading-relaxed text-[#333]">
            Tudo converge no dashboard com controle total.
          </p>
        </div>
      </div>
    </div>
  );
}
