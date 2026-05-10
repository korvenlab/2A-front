import { Link } from "@tanstack/react-router";
import {
  Check,
  Columns3,
  Link2,
  Loader2,
  MessageCircle,
  Package,
  ShoppingBag,
  Users,
  Zap,
} from "lucide-react";

import logoSrc from "@/assets/logo-2avendas.png";
import { useAuth } from "@/lib/auth-context";
import { BentoFeatureCard } from "@/components/landing/BentoFeatureCard";
import { LandingFlowRibbon } from "@/components/landing/LandingFlowRibbon";
import { LandingMagicInput } from "@/components/landing/LandingMagicInput";
import { LandingScrollProgress } from "@/components/landing/LandingScrollProgress";
import { LandingSocialProof } from "@/components/landing/LandingSocialProof";
import { MagneticWrap } from "@/components/landing/MagneticWrap";

const FEATURES = [
  {
    title: "Gestão de equipe",
    description:
      "Representantes centralizados: quem atende quem, permissões claras e histórico na mesma base — menos planilha solta.",
    icon: Users,
    gridClass: "lg:col-span-4 lg:row-span-2 min-h-[260px]",
  },
  {
    title: "Funil de vendas",
    description:
      "Negociações e pedidos em colunas, do primeiro contato ao fechamento — enxergue gargalos com método.",
    icon: Columns3,
    gridClass: "lg:col-span-2 min-h-[160px]",
  },
  {
    title: "WhatsApp no pedido",
    description:
      "Comunicação alinhada ao cliente e ao pedido: catálogo, status e follow-up no canal que o B2B já usa.",
    icon: MessageCircle,
    gridClass: "lg:col-span-2 min-h-[160px]",
  },
  {
    title: "Portal e link de pedido",
    description:
      "Catálogo público em link; o cliente monta o pedido e ele cai no seu painel, sem retrabalho.",
    icon: Link2,
    gridClass: "lg:col-span-2 min-h-[160px]",
  },
  {
    title: "Pedidos centralizados",
    description:
      "Um cockpit para acompanhar volume, status e próximos passos — da representação ao fechamento.",
    icon: ShoppingBag,
    gridClass: "lg:col-span-3 min-h-[180px]",
  },
  {
    title: "Catálogo B2B",
    description:
      "Produtos e políticas comerciais organizados para o time externo vender com consistência.",
    icon: Package,
    gridClass: "lg:col-span-3 min-h-[180px]",
  },
];

const PLANS = [
  {
    name: "Starter",
    price: "R$ 99",
    desc: "Link de pedidos e equipe pequena.",
    features: ["Até 3 vendedores", "Até 50 clientes", "Portal com link", "Suporte por email"],
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 299",
    desc: "Volume maior, mesmo dashboard.",
    features: [
      "Vendedores ilimitados",
      "Clientes ilimitados",
      "Portal completo",
      "Prioridade no suporte",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Integrações sob medida.",
    features: ["Tudo do Pro", "Integração ERP", "SSO e auditoria", "Gerente dedicado"],
    highlight: false,
  },
];

type Mode = "guest" | "member";

function LogoMarkLink({ mode }: { mode: Mode }) {
  const inner = (
    <>
      <img src={logoSrc} alt="2AVendas" className="h-10 w-auto object-contain md:h-11" />
      <span className="font-mono text-xs font-semibold uppercase tracking-[0.28em] text-[#003366]">
        2AVendas
      </span>
    </>
  );

  if (mode === "guest") {
    return (
      <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
        {inner}
      </Link>
    );
  }

  return (
    <Link to="/dashboard" className="flex items-center gap-3 transition-opacity hover:opacity-80">
      {inner}
    </Link>
  );
}

export function AvendasFocusLanding({ mode }: { mode: Mode }) {
  const consoleIsMember = mode === "member";

  return (
    <div className="landing-focus min-h-screen bg-[#FFFFFF] text-[#1f2937]">
      <LandingScrollProgress />

      <header className="landing-invisible-grid mx-auto flex max-w-5xl items-center justify-between px-6 py-10 md:px-12 md:py-12">
        <LogoMarkLink mode={mode} />
        <nav className="flex flex-wrap items-center justify-end gap-4 font-mono text-[11px] uppercase tracking-[0.2em] md:gap-6">
          <a
            href="#funcionalidades"
            className="text-[#003366] transition-colors hover:text-[#007AFF]"
          >
            Funcionalidades
          </a>
          <a href="#pricing" className="text-[#003366] transition-colors hover:text-[#007AFF]">
            Planos
          </a>
          {consoleIsMember ? (
            <Link to="/dashboard" className="text-[#007AFF] underline-offset-4 hover:underline">
              Painel
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-[#003366] transition-colors hover:text-[#007AFF]">
                Entrar
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-[#007AFF] px-4 py-2 text-white shadow-[0_4px_16px_rgba(0,122,255,0.22)] transition-colors hover:bg-[#0066DB]"
              >
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="landing-invisible-grid mx-auto max-w-5xl px-6 pb-20 pt-4 md:px-12 md:pb-28 md:pt-6">
          <div className="landing-hero-stagger mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="landing-reveal landing-hero-a mb-5 font-mono text-[10px] uppercase tracking-[0.4em] text-[#007AFF]">
              Representação B2B
            </p>
            <h1 className="landing-reveal landing-hero-a text-balance text-4xl font-semibold tracking-tight text-[#2d2d2d] md:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              Seu catálogo virou um link de vendas — e o pedido cai no painel.
            </h1>
            <p className="landing-reveal landing-hero-b mt-6 max-w-xl text-pretty text-base leading-relaxed text-[#4B5563] md:text-lg">
              Equipe, funil, WhatsApp e portal no mesmo fluxo. Descreva o que quer montar e avance
              com clareza executiva.
            </p>
            <div className="landing-reveal landing-hero-c mt-12 w-full">
              <LandingMagicInput />
            </div>
            <div className="landing-reveal landing-hero-d mt-10 flex flex-wrap items-center justify-center gap-4">
              <MagneticWrap>
                {consoleIsMember ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#007AFF] px-8 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_8px_32px_rgba(0,122,255,0.28)] transition-[transform,box-shadow] duration-300 hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(0,122,255,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
                  >
                    Abrir painel
                  </Link>
                ) : (
                  <Link
                    to="/signup"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#007AFF] px-8 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_8px_32px_rgba(0,122,255,0.28)] transition-[transform,box-shadow] duration-300 hover:scale-[1.03] hover:shadow-[0_12px_40px_rgba(0,122,255,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
                  >
                    Criar minha conta
                  </Link>
                )}
              </MagneticWrap>
              <MagneticWrap strength={0.14}>
                {consoleIsMember ? (
                  <Link
                    to="/portal"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-[#003366]/20 bg-white px-8 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#003366] transition-[border-color,background-color,transform] duration-300 hover:border-[#007AFF]/35 hover:bg-[#F9F9F9] hover:text-[#007AFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/40 focus-visible:ring-offset-2"
                  >
                    Portal de compras
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-[#003366]/20 bg-white px-8 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#003366] transition-[border-color,background-color,transform] duration-300 hover:border-[#007AFF]/35 hover:bg-[#F9F9F9] hover:text-[#007AFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/40 focus-visible:ring-offset-2"
                  >
                    Já tenho conta
                  </Link>
                )}
              </MagneticWrap>
            </div>
          </div>

          <div className="mx-auto mt-16 max-w-4xl md:mt-24">
            <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-[#003366]/70">
              <Zap className="h-4 w-4 text-[#007AFF]" aria-hidden />
              <span>Link de pedidos · funil · WhatsApp · catálogo compartilhável</span>
            </div>
          </div>
        </section>

        <LandingFlowRibbon className="mx-auto max-w-5xl px-6 md:px-12" />

        <LandingSocialProof />

        <section
          id="funcionalidades"
          className="landing-invisible-grid mx-auto max-w-5xl px-6 pb-24 pt-8 md:px-12 md:pb-32 md:pt-12"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.38em] text-[#007AFF]">
              Bento de capacidades
            </h2>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-[#003366] md:text-4xl">
              Menos ruído. Mais clareza na operação comercial.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[#6B7280] md:text-base">
              Cards assimétricos mostram o valor do 2AVendas — só espaço, hierarquia e tons suaves.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-6 lg:gap-6 lg:auto-rows-[minmax(140px,auto)]">
            {FEATURES.map((f) => (
              <BentoFeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        <LandingFlowRibbon className="mx-auto max-w-5xl px-6 md:px-12" />

        <section
          id="pricing"
          className="landing-invisible-grid mx-auto max-w-5xl px-6 pb-24 pt-8 md:px-12 md:pb-32 md:pt-12"
        >
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.38em] text-[#007AFF]">
              Planos
            </p>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-[#003366] md:text-4xl">
              Escale no seu ritmo
            </p>
            <p className="mt-4 text-sm text-[#6B7280]">
              Preços orientativos — ajuste fino com o time na implantação.
            </p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col rounded-[22px] bg-[#F9F9F9] p-8 ${p.highlight ? "ring-2 ring-[#007AFF]/35" : ""}`}
              >
                {p.highlight ? (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-white px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#007AFF]">
                    Mais usado
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold text-[#003366]">{p.name}</h3>
                <p className="mt-2 text-sm text-[#4B5563]">{p.desc}</p>
                <div className="mt-8 flex items-baseline gap-1 border-t border-[#E8ECF2] pt-8">
                  <span className="text-3xl font-semibold tabular-nums text-[#003366]">
                    {p.price}
                  </span>
                  {p.price !== "Custom" ? (
                    <span className="text-sm text-[#6B7280]">/mês</span>
                  ) : null}
                </div>
                <ul className="mt-6 flex flex-col gap-2.5 text-sm text-[#4B5563]">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" strokeWidth={2} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-10">
                  <MagneticWrap strength={0.12}>
                    <Link
                      to="/signup"
                      className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#003366] font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#007AFF]"
                    >
                      Começar
                    </Link>
                  </MagneticWrap>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="landing-invisible-grid mx-auto max-w-5xl px-6 pb-20 pt-12 md:px-12 md:pb-28 md:pt-16">
          <div className="rounded-[24px] bg-[#F9F9F9] px-8 py-12 md:px-12 md:py-14">
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#007AFF]">
                  Próximo passo
                </p>
                <p className="mt-3 max-w-md text-xl font-semibold text-[#003366] md:text-2xl">
                  {consoleIsMember
                    ? "Continue de onde parou no painel ou no portal."
                    : "Crie sua conta e publique o link do catálogo em minutos."}
                </p>
              </div>
              <MagneticWrap>
                {consoleIsMember ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#003366] px-8 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition-[transform,background-color] duration-300 hover:bg-[#007AFF] hover:shadow-[0_8px_28px_rgba(0,122,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
                  >
                    Ir para o painel
                  </Link>
                ) : (
                  <Link
                    to="/signup"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#003366] px-8 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-white transition-[transform,background-color] duration-300 hover:bg-[#007AFF] hover:shadow-[0_8px_28px_rgba(0,122,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
                  >
                    Criar conta grátis
                  </Link>
                )}
              </MagneticWrap>
            </div>
            <LandingFlowRibbon className="mt-12 opacity-80" />
            <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.28em] text-[#9CA3AF]">
              2AVendas · fluxo comercial contínuo
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export function AvendasFocusLandingGate() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FFFFFF]">
        <Loader2 className="h-9 w-9 animate-spin text-[#007AFF]" aria-hidden />
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-[#003366]/70">
          Carregando…
        </p>
      </div>
    );
  }

  return <AvendasFocusLanding mode={isAuthenticated ? "member" : "guest"} />;
}
