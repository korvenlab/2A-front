import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/Header";
import { LandingFooter } from "@/components/landing/Footer";
import { Check, UserCircle, ClipboardList, UsersRound } from "lucide-react";
import catalogClientPreview from "@/assets/image_77364b.png";

const borderSubtle = "border border-[color:var(--landing-blue-line)]";
const borderSection = "border-b border-[color:var(--landing-blue-line-faint)]";
const surfacePanel = "bg-[#111111]";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "24 Vendas — Link de pedidos B2B e painel único" },
      {
        name: "description",
        content:
          "Link para o cliente B2B comprar sozinho. Pedidos entram no seu painel. Vendedores e pedidos em uma tela.",
      },
      { property: "og:title", content: "24 Vendas — Pedidos pelo link, gestão no painel" },
      {
        property: "og:description",
        content:
          "Cliente usa seu link; você gerencia tudo em um só lugar.",
      },
    ],
  }),
  component: Landing,
});

const mockClienteLinhas = [
  { nome: "Ref. Industrial XL", preco: "R$ 184,90" },
  { nome: "Kit Montagem B", preco: "R$ 92,00" },
  { nome: "Peça Substituição 04", preco: "R$ 36,50" },
];

const fluxoPedido = [
  { etapa: "1", texto: "Cliente abre o link que você enviou." },
  { etapa: "2", texto: "Marca produtos e confirma o pedido." },
  { etapa: "3", texto: "O pedido aparece na sua lista." },
];

const operacaoBlocos = [
  {
    icon: UserCircle,
    titulo: "Vendedores",
    texto: "Cadastre sua equipe e saiba quem está vendendo.",
  },
  {
    icon: ClipboardList,
    titulo: "Pedidos",
    texto: "Receba pedidos feitos por você ou direto pelo link do cliente.",
  },
  {
    icon: UsersRound,
    titulo: "Clientes",
    texto: "Sua base de clientes B2B organizada e acessível.",
  },
];

const plans = [
  {
    name: "Starter",
    price: "R$ 99",
    desc: "Operação enxuta com link de pedidos.",
    features: ["Até 3 vendedores", "Até 50 clientes", "Portal com link", "Suporte por email"],
    cta: "Criar minha conta",
  },
  {
    name: "Pro",
    price: "R$ 299",
    desc: "Volume maior, mesma tela de gestão.",
    features: ["Vendedores ilimitados", "Clientes ilimitados", "Portal completo", "App mobile", "Suporte prioritário"],
    cta: "Criar minha conta",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Integrações e escopo sob medida.",
    features: ["Tudo do Pro", "Integração ERP customizada", "SSO e auditoria", "Gerente dedicado"],
    cta: "Falar com vendas",
  },
];

function ClienteAcessaCard() {
  return (
    <div className={`${borderSubtle} rounded-[4px] ${surfacePanel}`}>
      <div className="border-b border-[color:var(--landing-blue-line-faint)] bg-[color:var(--landing-blue-fill)] px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[color:var(--landing-blue-soft)]">
          O que seu cliente acessa
        </p>
      </div>
      <ul className="divide-y divide-[color:var(--landing-blue-line-faint)]">
        {mockClienteLinhas.map((row) => (
          <li
            key={row.nome}
            className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <span className="min-w-0 text-[rgba(255,255,255,0.88)]">{row.nome}</span>
            <div className="flex flex-shrink-0 flex-wrap items-center gap-3 sm:justify-end">
              <span className="tabular-nums text-[rgba(255,255,255,0.55)]">{row.preco}</span>
              <button
                type="button"
                className="rounded-[4px] border border-[color:var(--landing-blue-line)] bg-transparent px-3 py-1.5 text-xs font-medium text-[color:var(--landing-blue-bright)] hover:bg-[color:var(--landing-blue-fill)]"
                disabled
              >
                Adicionar ao pedido
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FluxoTable() {
  return (
    <div className={`overflow-hidden rounded-[4px] ${borderSubtle}`}>
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[color:var(--landing-blue-line-faint)] bg-[color:var(--landing-blue-fill-strong)]">
            <th className="w-12 px-3 py-2.5 font-medium text-[color:var(--landing-blue-soft)]">#</th>
            <th className="px-3 py-2.5 font-medium text-white">Etapa</th>
          </tr>
        </thead>
        <tbody>
          {fluxoPedido.map((row) => (
            <tr key={row.etapa} className="border-b border-[color:var(--landing-blue-line-faint)] last:border-0">
              <td className="px-3 py-2.5 font-mono text-xs text-[color:var(--landing-blue-bright)]">{row.etapa}</td>
              <td className="px-3 py-2.5 text-[rgba(255,255,255,0.78)]">{row.texto}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Landing() {
  return (
    <div className="landing-hard-tech flex min-h-screen flex-col bg-[#0a0a0a] font-sans text-[rgba(255,255,255,0.92)] antialiased selection:bg-blue-500/35">
      <LandingHeader technical />

      <section id="produto" className={borderSection}>
        <div className="container mx-auto max-w-6xl px-4 py-12 lg:py-16">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-10 lg:items-start">
            <div className="max-w-xl">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.25rem] lg:leading-tight">
                Sua representação comercial aberta para pedidos{" "}
                <span className="text-[color:var(--landing-blue-bright)]">24h</span>.
              </h1>
              <p className="mt-5 text-base leading-relaxed text-[color:var(--landing-blue-soft)]">
                Dê um link para seu cliente B2B comprar sozinho. Gerencie vendedores e pedidos em uma tela única. Sem
                complicação.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  size="lg"
                  asChild
                  className="h-11 rounded-[4px] border-0 bg-white px-8 text-sm font-semibold text-black shadow-none hover:bg-[#e8e8e8]"
                >
                  <Link to="/signup">Criar minha conta</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-11 rounded-[4px] border-[color:var(--landing-blue-line)] bg-transparent text-[color:var(--landing-blue-soft)] shadow-none hover:bg-[color:var(--landing-blue-fill)] hover:text-white"
                >
                  <Link to="/login">Entrar</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[color:var(--landing-blue-soft)]">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[color:var(--landing-blue-bright)]" strokeWidth={2} />
                  14 dias grátis
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[color:var(--landing-blue-bright)]" strokeWidth={2} />
                  Sem cartão
                </span>
              </div>
            </div>

            <div className="grid gap-6">
              <figure className={`overflow-hidden rounded-[4px] ${borderSubtle} ${surfacePanel}`}>
                <img
                  src={catalogClientPreview}
                  alt="Catálogo B2B — tela real do sistema"
                  width={1200}
                  height={900}
                  className="block w-full h-auto object-cover object-top"
                />
              </figure>
              <div className="grid gap-6 sm:grid-cols-2">
                <p className="text-sm leading-relaxed text-[color:var(--landing-blue-soft)]">
                  O cliente clica no seu link, escolhe os produtos e o pedido aparece no seu painel. Só isso.
                </p>
                <ClienteAcessaCard />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fluxo" className={borderSection}>
        <div className="container mx-auto max-w-6xl px-4 py-14 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--landing-blue-bright)]">
                Fluxo
              </h2>
              <p className="mt-3 text-lg font-medium text-white">Do link do cliente ao pedido na lista</p>
              <p className="mt-2 text-sm text-[color:var(--landing-blue-soft)]">Três passos. Sem etapas extras na landing.</p>
            </div>
            <div className="lg:col-span-8">
              <FluxoTable />
            </div>
          </div>
        </div>
      </section>

      <section id="operacao" className={borderSection}>
        <div className="container mx-auto max-w-6xl px-4 py-14 lg:py-16">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--landing-blue-bright)]">
            Painel
          </h2>
          <p className="mt-3 max-w-2xl text-lg font-medium text-white">Uma grade para o que você controla no sistema.</p>
          <div className="mt-10 grid gap-px rounded-[4px] border border-[color:var(--landing-blue-line)] bg-[color:var(--landing-blue-line)] md:grid-cols-3">
            {operacaoBlocos.map(({ icon: Icon, titulo, texto }) => (
              <div key={titulo} className={`${surfacePanel} p-6 lg:p-8`}>
                <Icon className="h-5 w-5 text-[color:var(--landing-blue-bright)]" strokeWidth={1.5} />
                <h3 className="mt-4 text-sm font-semibold text-white">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--landing-blue-soft)]">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className={borderSection}>
        <div className="container mx-auto max-w-6xl px-4 py-14 lg:py-16">
          <div className="max-w-xl">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[color:var(--landing-blue-bright)]">
              Preços
            </h2>
            <p className="mt-3 text-lg font-medium text-white">Valores mensais. Sem texto promocional longo.</p>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col rounded-[4px] border p-6 lg:p-7 ${
                  p.highlight
                    ? "border-[color:var(--landing-blue-bright)] bg-[color:var(--landing-blue-fill-strong)]"
                    : "border-[color:var(--landing-blue-line-faint)] bg-[#0f0f0f]"
                }`}
              >
                {p.highlight && (
                  <span className="mb-4 inline-block w-fit rounded-[4px] border border-[color:var(--landing-blue-line)] bg-[color:var(--landing-blue-fill)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[color:var(--landing-blue-soft)]">
                    Mais usado
                  </span>
                )}
                <h3 className="text-base font-semibold text-white">{p.name}</h3>
                <p className="mt-2 min-h-[40px] text-sm text-[color:var(--landing-blue-soft)]">{p.desc}</p>
                <div className="mt-6 flex items-baseline gap-1 border-t border-[color:var(--landing-blue-line-faint)] pt-6">
                  <span className="text-2xl font-semibold tabular-nums text-white">{p.price}</span>
                  {p.price !== "Custom" && (
                    <span className="text-sm text-[color:var(--landing-blue-soft)]">/mês</span>
                  )}
                </div>
                <ul className="mt-6 flex flex-col gap-2.5 text-sm text-[color:var(--landing-blue-soft)]">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--landing-blue-bright)]" strokeWidth={2} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <Button
                    asChild
                    variant="outline"
                    className={`h-10 w-full rounded-[4px] border shadow-none ${
                      p.highlight
                        ? "border-transparent bg-white text-black hover:bg-[#e8e8e8]"
                        : "border-[color:var(--landing-blue-line)] bg-transparent text-[color:var(--landing-blue-soft)] hover:bg-[color:var(--landing-blue-fill)] hover:text-white"
                    }`}
                  >
                    <Link to="/signup">{p.cta}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="">
        <div className="container mx-auto max-w-6xl px-4 py-14 lg:py-16">
          <div
            className={`rounded-[4px] ${borderSubtle} bg-[color:var(--landing-blue-fill)] px-6 py-10 lg:px-10 lg:py-12`}
          >
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
              <div>
                <h2 className="text-xl font-semibold text-white lg:text-2xl">Teste com sua equipe e com um link real.</h2>
                <p className="mt-3 text-sm text-[color:var(--landing-blue-soft)]">
                  Conta em minutos. Você configura catálogo e envia o link quando estiver pronto.
                </p>
              </div>
              <div className="flex justify-start lg:justify-end">
                <Button
                  size="lg"
                  asChild
                  className="h-11 rounded-[4px] bg-white px-8 text-sm font-semibold text-black shadow-none hover:bg-[#e8e8e8]"
                >
                  <Link to="/signup">Criar minha conta</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter technical />
    </div>
  );
}
