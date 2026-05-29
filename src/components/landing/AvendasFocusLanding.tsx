import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Check,
  Columns3,
  Link2,
  Loader2,
  MessageCircle,
  Package,
  ShoppingBag,
  Users,
} from "lucide-react";

import logoSrc from "@/assets/logo-2avendas.png";
import { useAuth } from "@/lib/auth-context";
import { BentoFeatureCard } from "@/components/landing/BentoFeatureCard";
import { LandingFlowRibbon } from "@/components/landing/LandingFlowRibbon";
import { LandingScrollProgress } from "@/components/landing/LandingScrollProgress";
import { LandingSocialProof } from "@/components/landing/LandingSocialProof";
import { MagneticWrap } from "@/components/landing/MagneticWrap";

const FEATURES = [
  {
    title: "Gestão de equipe",
    description:
      "CRM para representação: vendedores, permissões, comissões e convites na mesma base — você comanda quem vende o quê, sem planilha paralela.",
    icon: Users,
  },
  {
    title: "Funil de vendas",
    description:
      "Pipeline comercial do representante: oportunidades em etapas, do primeiro contato ao pedido — visão clara do que está travando o fechamento.",
    icon: Columns3,
  },
  {
    title: "WhatsApp no pedido",
    description:
      "Fale com o cliente B2B já com contexto do pedido: link direto do painel para o WhatsApp, alinhado a status e follow-up.",
    icon: MessageCircle,
  },
  {
    title: "Pedidos centralizados",
    description:
      "Todos os pedidos da representação num só lugar: status, totais, NF-e e histórico — o cockpit do representante comercial.",
    icon: ShoppingBag,
  },
  {
    title: "Portal e link de pedido",
    description:
      "Catálogo em link para o cliente montar o pedido sozinho; tudo cai centralizado no seu painel — menos troca de e-mail e retrabalho.",
    icon: Link2,
  },
  {
    title: "Catálogo B2B",
    description:
      "Produtos, preços e estoque organizados para a equipe externa e para o portal — uma vitrine única da sua operação B2B.",
    icon: Package,
  },
];

const PLAN_FEATURES = [
  "Faturamento via Excel",
  "CRM e Inteligência Comercial",
  "Contas a pagar e receber",
  "Gestão de equipe de vendas",
  "Gestão por funil (1 por Vendedor)",
  "Gestão de produtos e tabela de preços",
  "Controle de faturamento",
  "Suporte técnico (+ Telefone)",
  "Usuários adicionais ilimitados",
  "Agenda para vendedores",
];

type Mode = "guest" | "member";

function LogoMarkLink({ mode }: { mode: Mode }) {
  const logo = (
    <img src={logoSrc} alt="2AVendas" className="h-12 w-auto object-contain sm:h-14 md:h-16" />
  );

  if (mode === "guest") {
    return (
      <Link to="/" className="transition-opacity hover:opacity-80">
        {logo}
      </Link>
    );
  }

  return (
    <Link to="/dashboard" className="transition-opacity hover:opacity-80">
      {logo}
    </Link>
  );
}

export function AvendasFocusLanding({ mode }: { mode: Mode }) {
  const consoleIsMember = mode === "member";

  return (
    <div className="landing-focus min-h-screen bg-[#FFFFFF] text-[#1f2937]">
      <LandingScrollProgress />

      <header className="landing-sticky-header sticky top-0 z-50 w-full border-b border-[#E8ECF2]/90 bg-white/95 shadow-[0_4px_24px_rgba(0,51,102,0.06)] backdrop-blur-md supports-[backdrop-filter]:bg-white/88">
        <div className="landing-invisible-grid mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4 md:px-12 md:py-5">
          <LogoMarkLink mode={mode} />
          <nav className="flex flex-wrap items-center justify-end gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] sm:gap-3 sm:text-[13px] md:gap-4 md:text-sm">
            <a
              href="#funcionalidades"
              className="rounded-xl px-3 py-2.5 text-[#003366] transition-colors hover:bg-[#007AFF]/[0.06] hover:text-[#007AFF] md:px-4 md:py-3"
            >
              Funcionalidades
            </a>
            <a
              href="#pricing"
              className="rounded-xl px-3 py-2.5 text-[#003366] transition-colors hover:bg-[#007AFF]/[0.06] hover:text-[#007AFF] md:px-4 md:py-3"
            >
              Plano
            </a>
            {consoleIsMember ? (
              <Link
                to="/dashboard"
                className="rounded-xl px-3 py-2.5 text-[#007AFF] underline-offset-4 transition-colors hover:bg-[#007AFF]/[0.06] hover:underline md:px-4 md:py-3"
              >
                Painel
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-xl px-3 py-2.5 text-[#003366] transition-colors hover:bg-[#007AFF]/[0.06] hover:text-[#007AFF] md:px-4 md:py-3"
                >
                  Entrar
                </Link>
                <Link
                  to="/signup"
                  className="rounded-full bg-[#007AFF] px-5 py-2.5 text-white shadow-[0_4px_20px_rgba(0,122,255,0.28)] transition-[background-color,box-shadow,transform] hover:bg-[#0066DB] hover:shadow-[0_6px_24px_rgba(0,122,255,0.34)] active:scale-[0.98] md:px-6 md:py-3"
                >
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-invisible-grid mx-auto max-w-5xl px-6 pb-20 pt-4 md:px-12 md:pb-28 md:pt-6">
          <div className="landing-hero-panel landing-hero-stagger mx-auto flex max-w-3xl flex-col items-center text-center">
            <p className="landing-reveal landing-hero-a landing-hero-badge mb-6 font-mono text-[10px] uppercase tracking-[0.4em] text-[#007AFF]">
              CRM · Representantes comerciais
            </p>
            <h1 className="landing-reveal landing-hero-a text-balance text-[2.35rem] font-bold tracking-tight text-[#1a2332] md:text-5xl lg:text-[3.5rem] lg:leading-[1.06]">
              Pilares essenciais para o dia a dia da representação comercial.
            </h1>
            <p className="landing-reveal landing-hero-b mt-6 max-w-xl text-pretty text-base leading-relaxed text-[#4B5563] md:text-lg">
              Pensado para <strong className="font-semibold text-[#374151]">representantes comerciais</strong>:
              gestão de equipe, funil de vendas, WhatsApp no pedido, pedidos centralizados, portal com link
              de pedido e catálogo B2B — tudo integrado para você vender com método.
            </p>
            <div className="landing-reveal landing-hero-c mt-12 flex flex-wrap items-center justify-center gap-4">
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
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-[#0066DB]/30 bg-[#007AFF] px-8 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-[0_6px_20px_rgba(0,51,102,0.12),0_10px_36px_rgba(0,122,255,0.32)] transition-[transform,box-shadow] duration-300 hover:scale-[1.03] hover:shadow-[0_8px_28px_rgba(0,51,102,0.14),0_14px_44px_rgba(0,122,255,0.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2"
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
                    className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-[#003366]/25 bg-white px-8 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#003366] shadow-[0_4px_20px_rgba(0,51,102,0.08)] transition-[border-color,background-color,transform,box-shadow] duration-300 hover:border-[#007AFF]/45 hover:bg-[#F9F9F9] hover:text-[#007AFF] hover:shadow-[0_6px_28px_rgba(0,51,102,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]/40 focus-visible:ring-offset-2"
                  >
                    Já tenho conta
                  </Link>
                )}
              </MagneticWrap>
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
              O que o CRM entrega
            </h2>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-[#003366] md:text-4xl">
              Tudo o que a operação do representante comercial precisa no dia a dia.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[#6B7280] md:text-base">
              Da gestão da equipe ao pedido fechado: cada bloco abaixo é um pilar do 2AVendas para quem
              representa marcas e atende indústria ou distribuição B2B.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
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
              Plano
            </p>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-[#003366] md:text-4xl">
              Um plano completo para a sua representação
            </p>
            <p className="mt-4 text-sm text-[#6B7280]">
              Valor mensal fixo — tudo o que listamos abaixo na mesma assinatura.
            </p>
          </div>
          <div className="mx-auto mt-14 max-w-lg">
            <div className="landing-pricing-card flex min-w-0 flex-col overflow-hidden rounded-[22px] bg-[#F9F9F9] p-8 ring-2 ring-[#007AFF]/45 md:p-10">
              <span className="mb-3 inline-flex w-fit rounded-full bg-white px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#007AFF]">
                2AVendas
              </span>
              <h3 className="text-xl font-semibold text-[#003366] md:text-2xl">Plano mensal</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#4B5563]">
                CRM, financeiro, equipe, funil, produtos, faturamento e suporte — pacote único para
                representantes comerciais.
              </p>
              <div className="mt-8 flex flex-wrap items-baseline gap-1 border-t border-[#E8ECF2] pt-8">
                <span className="text-4xl font-semibold tabular-nums text-[#003366] md:text-5xl">R$ 150</span>
                <span className="text-base text-[#6B7280]">/mês</span>
              </div>
              <ul className="mt-8 flex flex-col gap-2.5 text-sm text-[#4B5563]">
                {PLAN_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#007AFF]" strokeWidth={2} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10 w-full min-w-0">
                <MagneticWrap strength={0.12} className="w-full">
                  <Link
                    to="/signup"
                    className="flex h-12 w-full min-w-0 items-center justify-center rounded-2xl bg-[#003366] px-4 text-center font-mono text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-white transition-colors hover:bg-[#007AFF] sm:text-[11px] sm:tracking-[0.14em]"
                  >
                    Assinar por R$ 150/mês
                  </Link>
                </MagneticWrap>
              </div>
            </div>
          </div>
        </section>

        <footer className="relative mt-12 w-full border-t border-[#E8ECF2] bg-gradient-to-b from-[#F9F9F9] to-white pb-1">
          <div className="landing-invisible-grid mx-auto max-w-5xl px-6 pt-12 md:px-12 md:pt-16">
            <div className="landing-footer-panel rounded-[24px] bg-[#F9F9F9] px-8 py-12 md:px-12 md:py-14">
              <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-[#007AFF]">
                    Próximo passo
                  </p>
                  <p className="mt-3 max-w-md text-xl font-semibold text-[#003366] md:text-2xl">
                    {consoleIsMember
                      ? "Continue de onde parou no painel ou no portal."
                      : "Leve seu CRM de representante do link do catálogo ao pedido centralizado em minutos."}
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
                      Criar conta
                    </Link>
                  )}
                </MagneticWrap>
              </div>
              <LandingFlowRibbon className="mt-12 opacity-80" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="landing-invisible-grid mx-auto flex max-w-5xl flex-col items-center gap-8 border-t border-[#E8ECF2] px-6 py-10 md:px-12 md:py-12"
          >
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-medium uppercase tracking-widest text-gray-400">
                Desenvolvido por
              </span>
              <a
                href="https://korvenlab.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <img
                  src="/logokorven.png"
                  alt="Korven Lab"
                  className="h-8 object-contain opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0"
                />
              </a>
            </div>

            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} — Korven Lab — Todos os direitos reservados
            </p>
          </motion.div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#007BFF] via-[#6F42C1] to-[#007BFF]" />
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
