import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LandingFooter } from "@/components/landing/Footer";
import { LandingHeader } from "@/components/landing/Header";
import { HeroSystemFlow } from "@/components/landing/HeroSystemFlow";
import { LandingMagicInput } from "@/components/landing/LandingMagicInput";
import { LandingScrollReveal } from "@/components/landing/LandingScrollReveal";
import { Check } from "lucide-react";

/** Marinho #002B5B contorno forte; #E0E7FF itens internos; página #F8FAFC */
const r = "rounded-[4px]";
const borderInner = "border border-[#E0E7FF]";
const borderOuterNavy = "border-2 border-[#002B5B]";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "2AVendas — Link de pedidos para catálogo B2B" },
      {
        name: "description",
        content:
          "Monte o link do catálogo. Cliente faz pedido sozinho; você vê tudo no dashboard — funil, orçamentos, visitas, NF-e, comissões e outreach.",
      },
      { property: "og:title", content: "Catálogo como link de vendas — 2AVendas" },
      {
        property: "og:description",
        content:
          "Link de pedidos, CRM, orçamentos e operação B2B num só painel.",
      },
    ],
  }),
  component: Landing,
});

const capacidadesItens = [
  {
    ordem: "01",
    titulo: "Gestão de equipe",
    resumo: "Representantes centralizados: quem atende quem, sem planilha solta.",
    detalhe:
      "Toda a equipe externa no mesmo lugar, com permissões claras e histórico na mesma base. Menos grupos espalhados, mais controle total sobre a operação B2B.",
  },
  {
    ordem: "02",
    titulo: "Funil de vendas",
    resumo: "Negociações e pedidos em colunas, do primeiro contato ao fechamento.",
    detalhe:
      "Visualize status por etapa para enxergar gargalos com método. Um fluxo organizado substitui achismo: você sabe o que está em aberto e o que já avançou.",
  },
  {
    ordem: "03",
    titulo: "WhatsApp integrado ao pedido",
    resumo: "Avisos e atualizações alinhados ao cliente e ao pedido — sem caos de prints.",
    detalhe:
      "Dispare mensagens com critério: catálogo, status de pedido e follow-up no canal que o B2B já usa. Menos ruído, mais consistência na comunicação.",
  },
  {
    ordem: "04",
    titulo: "Portal e link de pedido",
    resumo: "Catálogo público em link; o cliente monta o pedido e ele cai no seu painel.",
    detalhe:
      "Seu cliente compra pelo link da sua representação no 2AVendas; você recebe o pedido centralizado, sem retrabalho de transcrever pedido de telefone ou e-mail.",
  },
  {
    ordem: "05",
    titulo: "Orçamentos",
    resumo: "Propostas com itens do catálogo, prontas para virar pedido.",
    detalhe:
      "Monte linhas com produtos e quantidades e mantenha histórico por cliente sem planilhas paralelas.",
  },
  {
    ordem: "06",
    titulo: "Visitas & NF-e",
    resumo: "Campo comercial ligado ao pipeline e à documentação fiscal quando aplicável.",
    detalhe:
      "Agende visitas e acompanhe NF-e no fluxo de pedidos para fechar o ciclo operacional com rastreio.",
  },
  {
    ordem: "07",
    titulo: "Comissões & convites",
    resumo: "Percentuais por organização e vendedor; convites com comissão padrão.",
    detalhe:
      "Alinhe remuneração da equipe externa à política da representação e reduza atrito no onboarding.",
  },
  {
    ordem: "08",
    titulo: "Outreach",
    resumo: "Linha do tempo de contatos com clientes para priorizar retorno.",
    detalhe:
      "Registre touches e próximos passos para ninguém sumir entre uma visita e outra.",
  },
] as const;

const plans = [
  {
    name: "Starter",
    price: "R$ 99",
    desc: "Link de pedidos e equipe pequena.",
    features: ["Até 3 vendedores", "Até 50 clientes", "Portal com link", "Suporte por email"],
    cta: "Criar minha conta",
  },
  {
    name: "Pro",
    price: "R$ 299",
    desc: "Volume maior, mesmo dashboard.",
    features: ["Vendedores ilimitados", "Clientes ilimitados", "Portal completo", "App mobile", "Suporte prioritário"],
    cta: "Criar minha conta",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Integrações sob medida.",
    features: ["Tudo do Pro", "Integração ERP customizada", "SSO e auditoria", "Gerente dedicado"],
    cta: "Falar com vendas",
  },
];

function LinkProtagonistField() {
  return (
    <div
      className={`mx-auto flex w-full max-w-2xl items-center ${r} ${borderInner} bg-white px-4 py-3.5 font-mono text-[15px] leading-none text-[#333]`}
      role="img"
      aria-label="Endereço do link: 2avendas.com barra sua-representacao"
    >
      <span className="select-none text-[#333]/55">2avendas.com/</span>
      <span className="font-medium text-[#002B5B]">sua-representacao</span>
      <span className="landing-link-cursor ml-px inline-block h-[1.15em] w-[2px] shrink-0 bg-[#0056b3]" aria-hidden />
    </div>
  );
}

function HeroProdutoVisual() {
  return (
    <motion.div
      className={`${r} ${borderOuterNavy} mx-auto w-full max-w-5xl overflow-hidden bg-white p-6 md:p-8`}
      whileHover={{
        scale: 1.008,
        transition: { type: "spring", stiffness: 320, damping: 26 },
      }}
    >
      <HeroSystemFlow />
    </motion.div>
  );
}

function Landing() {
  const reduceMotion = useReducedMotion();

  const container = {
    hidden: { opacity: reduceMotion ? 1 : 0 },
    show: {
      opacity: 1,
      transition: reduceMotion ? { duration: 0 } : { staggerChildren: 0.13, delayChildren: 0.05 },
    },
  };

  const item = {
    hidden: reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 310, damping: 30, mass: 0.9 },
    },
  };

  const springBtn = { type: "spring" as const, stiffness: 450, damping: 24 };

  return (
    <div className="landing-clean-tech flex min-h-screen flex-col antialiased selection:bg-[#E0E7FF]">
      <LandingHeader technical />

      <section id="produto" className="border-b border-[#E0E7FF]">
        <div className="container mx-auto max-w-6xl px-4 py-20 lg:py-28">
          <motion.div
            className="flex flex-col items-center gap-14 text-center lg:gap-16"
            variants={container}
            initial="hidden"
            animate="show"
          >
            <div className="w-full max-w-2xl px-1 sm:px-2">
              <motion.p
                variants={item}
                className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0056b3]"
              >
                2AVendas · link de pedidos B2B
              </motion.p>
              <motion.h1
                variants={item}
                className="landing-heading mt-6 text-balance text-[1.7rem] leading-[1.2] tracking-tight sm:text-[2rem] lg:text-[2.35rem] lg:leading-[1.15]"
              >
                Seu catálogo agora é um link de vendas.
              </motion.h1>
              <motion.p
                variants={item}
                className="mx-auto mt-6 max-w-[36rem] text-base font-normal leading-relaxed text-[#333] sm:text-[17px]"
              >
                Envie para o seu cliente B2B. Ele escolhe os produtos e faz o pedido sozinho. Você recebe tudo organizado no
                painel — com funil, orçamentos, visitas comerciais, NF-e nos pedidos, comissões por vendedor e outreach no mesmo
                lugar.
              </motion.p>

              <motion.div variants={item} className="mt-9">
                <LandingMagicInput />
              </motion.div>

              <motion.div variants={item} className="mt-8 space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#002B5B]/80">
                  Seu link público
                </p>
                <LinkProtagonistField />
              </motion.div>

              <motion.div variants={item} className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springBtn} className="w-full sm:w-auto sm:min-w-[14rem]">
                  <Button
                    size="lg"
                    asChild
                    className={`flex h-11 ${r} w-full justify-center border-0 bg-[#0056b3] px-8 text-sm font-semibold text-white shadow-none transition-colors duration-200 hover:bg-[#004494] sm:w-auto`}
                  >
                    <Link to="/signup">Criar meu link de vendas</Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={springBtn} className="w-full sm:w-auto sm:min-w-[10rem]">
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className={`flex h-11 ${r} w-full justify-center ${borderInner} bg-white text-sm font-semibold text-[#002B5B] shadow-none transition-colors duration-200 hover:bg-[#002B5B]/[0.03] sm:w-auto`}
                  >
                    <Link to="/login">Entrar</Link>
                  </Button>
                </motion.div>
              </motion.div>
              <motion.div variants={item} className="mt-8 flex flex-wrap justify-center gap-x-7 gap-y-2 text-xs font-normal text-[#333]">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#0056b3]" strokeWidth={2} />
                  14 dias grátis
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#0056b3]" strokeWidth={2} />
                  Sem cartão
                </span>
              </motion.div>
            </div>

            <motion.div variants={item} className="w-full">
              <HeroProdutoVisual />
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section id="capacidades" className="border-b border-[#E0E7FF]">
        <div className="container mx-auto max-w-6xl px-4 py-24 lg:py-32">
          <LandingScrollReveal>
            <header className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0056b3]">2AVendas</p>
              <h2 className="landing-heading mt-4 text-xl sm:text-2xl">Capacidades do sistema</h2>
              <p className="mt-4 text-sm font-normal leading-relaxed text-[#333]">
                Equipe, funil, WhatsApp, portal, orçamentos, visitas e NF-e, comissões e outreach — cada bloco resume o que
                você ganha na prática.
              </p>
            </header>
          </LandingScrollReveal>

          <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:mt-16 lg:gap-8">
            {capacidadesItens.map(({ ordem, titulo, resumo, detalhe }, i) => (
              <LandingScrollReveal key={ordem} delay={Math.min(i * 0.045, 0.32)}>
                <motion.article
                  whileHover={{
                    scale: 1.02,
                    transition: { type: "spring", stiffness: 380, damping: 24 },
                  }}
                  whileTap={{ scale: 0.995 }}
                  className={`flex flex-col ${r} border-2 border-[#002B5B] bg-white p-6 text-left shadow-[4px_4px_0_0_#002B5B] transition-shadow duration-300 hover:shadow-[6px_8px_0_0_#002B5B33] lg:p-7`}
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-[#E0E7FF] pb-4">
                    <span className="font-mono text-[11px] font-semibold tabular-nums text-[#0056b3]">{ordem}</span>
                    <h3 className="landing-heading text-base leading-snug text-[#002B5B]">{titulo}</h3>
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-snug text-[#002B5B]">{resumo}</p>
                  <p className="mt-3 text-sm font-normal leading-relaxed text-[#333]">{detalhe}</p>
                </motion.article>
              </LandingScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-b border-[#E0E7FF]">
        <div className="container mx-auto max-w-6xl px-4 py-24 text-left lg:py-32">
          <LandingScrollReveal>
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Preços</p>
              <h2 className="landing-heading mt-4 text-xl">Planos mensais</h2>
            </div>
          </LandingScrollReveal>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {plans.map((p, i) => (
              <LandingScrollReveal key={p.name} delay={i * 0.06}>
                <motion.div
                  whileHover={{
                    scale: 1.02,
                    transition: { type: "spring", stiffness: 360, damping: 26 },
                  }}
                  whileTap={{ scale: 0.99 }}
                  className={`flex flex-col ${r} bg-white p-6 lg:p-8 ${
                    p.highlight ? "border-2 border-[#0056b3]" : borderOuterNavy
                  } shadow-sm transition-shadow duration-300 hover:shadow-[0_18px_40px_-12px_rgba(0,43,91,0.14)]`}
                >
                  {p.highlight && (
                    <span
                      className={`mb-4 inline-block w-fit ${r} ${borderInner} bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0056b3]`}
                    >
                      Mais usado
                    </span>
                  )}
                  <h3 className="landing-heading text-base">{p.name}</h3>
                  <p className="mt-3 min-h-[44px] text-sm font-normal text-[#333]">{p.desc}</p>
                  <div className="mt-8 flex items-baseline gap-1 border-t border-[#E0E7FF] pt-8">
                    <span className="landing-heading text-2xl tabular-nums">{p.price}</span>
                    {p.price !== "Custom" && <span className="text-sm font-normal text-[#333]">/mês</span>}
                  </div>
                  <ul className="mt-6 flex flex-col gap-2.5 text-sm font-normal text-[#333]">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0056b3]" strokeWidth={2} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-10">
                    <Button
                      type="button"
                      disabled
                      variant="outline"
                      title="Em breve"
                      className={`h-10 w-full ${r} cursor-not-allowed border-[#CBD5E1] bg-[#F8FAFC] font-semibold text-[#94A3B8] shadow-none transition-colors duration-200 hover:bg-[#F8FAFC]`}
                    >
                      {p.cta}
                    </Button>
                  </div>
                </motion.div>
              </LandingScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter technical />
    </div>
  );
}
