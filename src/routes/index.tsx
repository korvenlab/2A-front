import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/Header";
import { LandingFooter } from "@/components/landing/Footer";
import { DataFlowAnimation } from "@/components/landing/DataFlowAnimation";
import { Check } from "lucide-react";

/** Marinho #002B5B contorno forte; #E0E7FF itens internos; página #F8FAFC */
const r = "rounded-[4px]";
const borderInner = "border border-[#E0E7FF]";
const borderOuterNavy = "border border-[#002B5B]";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "2AVendas — Link de pedidos para catálogo B2B" },
      {
        name: "description",
        content:
          "Monte o link do catálogo. Cliente faz pedido sozinho; você vê tudo no dashboard.",
      },
      { property: "og:title", content: "Catálogo como link de vendas — 2AVendas" },
      {
        property: "og:description",
        content:
          "Link de pedidos, pedidos recebidos no painel, gestão em uma tela.",
      },
    ],
  }),
  component: Landing,
});

const fluxoPedido = [
  { etapa: "1", texto: "Você envia o link do catálogo." },
  { etapa: "2", texto: "O cliente escolhe produtos e confirma." },
  { etapa: "3", texto: "O pedido aparece no seu painel." },
];

const entregaCols = [
  {
    titulo: "Link de pedidos",
    texto: "Cliente compra pelo celular ou PC com seu link.",
  },
  {
    titulo: "Dashboard único",
    texto: "Pedidos em uma tela.",
  },
  {
    titulo: "Multi-empresa",
    texto: "Várias representações no mesmo lugar.",
  },
];

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

/** Campo travado: prefixo fixo + slug + cursor — borda interna lavanda */
function LinkProtagonistField() {
  return (
    <div
      className={`flex max-w-2xl items-center ${r} ${borderInner} bg-white px-4 py-3.5 font-mono text-[15px] leading-none text-[#333]`}
      role="img"
      aria-label="Endereço do link: 24vendas.com barra sua-representacao"
    >
      <span className="select-none text-[#333]/55">24vendas.com/</span>
      <span className="font-medium text-[#002B5B]">sua-representacao</span>
      <span className="landing-link-cursor ml-px inline-block h-[1.15em] w-[2px] shrink-0 bg-[#0056b3]" aria-hidden />
    </div>
  );
}

function HeroProdutoVisual() {
  return (
    <div className={`${r} ${borderOuterNavy} bg-white p-5 md:p-7`}>
      <DataFlowAnimation />
    </div>
  );
}

function FluxoTable() {
  return (
    <div className={`overflow-hidden ${r} border-2 border-[#002B5B] bg-white`}>
      <table className="w-full border-collapse text-left text-sm font-normal">
        <thead>
          <tr className="border-b border-[#E0E7FF] bg-[#EFF6FF]">
            <th className="landing-heading w-12 px-3 py-3 text-sm">#</th>
            <th className="landing-heading px-3 py-3 text-sm">Etapa</th>
          </tr>
        </thead>
        <tbody className="text-[#333]">
          {fluxoPedido.map((row) => (
            <tr key={row.etapa} className="border-b border-[#E0E7FF] last:border-0">
              <td className="px-3 py-3 tabular-nums text-sm font-bold text-[#0056b3]">{row.etapa}</td>
              <td className="px-3 py-3">{row.texto}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Landing() {
  return (
    <div className="landing-clean-tech flex min-h-screen flex-col antialiased selection:bg-[#E0E7FF]">
      <LandingHeader technical />

      <section id="produto" className="border-b border-[#E0E7FF]">
        <div className="container mx-auto max-w-6xl px-4 py-20 text-left lg:py-28">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-start lg:gap-x-14 xl:gap-x-20">
            {/* Coluna única: mesma linha vertical para rótulo, link, título, texto e CTAs */}
            <div className="max-w-xl lg:max-w-none lg:pr-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Link de pedidos</p>
              <div className="mt-5">
                <LinkProtagonistField />
              </div>

              <h1 className="landing-heading mt-9 text-[1.7rem] leading-[1.2] tracking-tight sm:text-[2rem] lg:text-[2.35rem] lg:leading-[1.15]">
                Seu catálogo agora é um link de vendas.
              </h1>
              <p className="mt-6 max-w-[36rem] text-base font-normal leading-relaxed text-[#333] sm:text-[17px]">
                Envie para o seu cliente B2B. Ele escolhe os produtos e faz o pedido sozinho. Você recebe tudo organizado no seu
                painel.
              </p>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  size="lg"
                  asChild
                  className={`h-11 ${r} justify-start border-0 bg-[#0056b3] px-8 text-sm font-semibold text-white shadow-none hover:bg-[#004494] sm:justify-center`}
                >
                  <Link to="/signup">Criar meu link de vendas</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className={`h-11 ${r} justify-start ${borderInner} bg-white text-sm font-semibold text-[#002B5B] shadow-none hover:bg-[#002B5B]/[0.03] sm:justify-center`}
                >
                  <Link to="/login">Entrar</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-xs font-normal text-[#333]">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#0056b3]" strokeWidth={2} />
                  14 dias grátis
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#0056b3]" strokeWidth={2} />
                  Sem cartão
                </span>
              </div>
            </div>

            <HeroProdutoVisual />
          </div>
        </div>
      </section>

      <section id="fluxo" className="border-b border-[#E0E7FF]">
        <div className="container mx-auto max-w-6xl px-4 py-24 text-left lg:py-32">
          <div className="grid gap-16 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Fluxo</p>
              <h2 className="landing-heading mt-4 text-xl">Do link ao pedido no painel</h2>
              <p className="mt-3 text-sm font-normal text-[#333]">Três etapas.</p>
            </div>
            <div className="lg:col-span-8">
              <FluxoTable />
            </div>
          </div>
        </div>
      </section>

      <section id="entrega" className="border-b border-[#E0E7FF]">
        <div className="container mx-auto max-w-6xl px-4 py-24 text-left lg:py-32">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Entrega</p>
          <h2 className="landing-heading mt-4 max-w-2xl text-xl">O que está no produto</h2>
          <div className={`mt-16 grid grid-cols-1 overflow-hidden ${r} ${borderOuterNavy} bg-white md:grid-cols-3`}>
            {entregaCols.map(({ titulo, texto }) => (
              <div
                key={titulo}
                className="border-b border-[#E0E7FF] bg-white p-8 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0"
              >
                <h3 className="landing-heading text-base">{titulo}</h3>
                <p className="mt-4 text-sm font-normal leading-relaxed text-[#333]">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-b border-[#E0E7FF]">
        <div className="container mx-auto max-w-6xl px-4 py-24 text-left lg:py-32">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Preços</p>
            <h2 className="landing-heading mt-4 text-xl">Planos mensais</h2>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col ${r} bg-white p-6 lg:p-8 ${
                  p.highlight ? "border-2 border-[#0056b3]" : borderOuterNavy
                }`}
              >
                {p.highlight && (
                  <span className={`mb-4 inline-block w-fit ${r} ${borderInner} bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0056b3]`}>
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
                    asChild
                    variant="outline"
                    className={`h-10 w-full ${r} shadow-none ${
                      p.highlight
                        ? "border-0 bg-[#0056b3] font-semibold text-white hover:bg-[#004494]"
                        : `${borderInner} bg-white font-semibold text-[#002B5B] hover:bg-[#002B5B]/[0.03]`
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

      <section>
        <div className="container mx-auto max-w-6xl px-4 py-24 lg:py-32">
          <div className={`${r} ${borderOuterNavy} bg-white px-8 py-12 lg:px-12 lg:py-14`}>
            <div className="grid gap-10 text-left lg:grid-cols-2 lg:items-center lg:gap-16">
              <div>
                <h2 className="landing-heading text-xl lg:text-2xl">Configure o link e envie para os clientes.</h2>
                <p className="mt-4 text-sm font-normal leading-relaxed text-[#333]">
                  Conta em minutos. Catálogo no ar; link quando você quiser.
                </p>
              </div>
              <div className="flex justify-start lg:justify-end">
                <Button
                  size="lg"
                  asChild
                  className={`h-11 ${r} border-0 bg-[#0056b3] px-8 text-sm font-semibold text-white shadow-none hover:bg-[#004494]`}
                >
                  <Link to="/signup">Criar meu link de vendas</Link>
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
