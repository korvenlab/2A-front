import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/Header";
import { LandingFooter } from "@/components/landing/Footer";
import { Check } from "lucide-react";
import catalogClientPreview from "@/assets/image_77364b.png";

/** Clean Tech — marinho #002B5B estrutura, royal #0056b3 ação, corpo #333 */
const r = "rounded-[4px]";
const borderClean = "border border-[#E0E7FF]";
const borderGrayFlat = "border border-[#D1D5DB]";

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

const pedidosRecebidosMock = [
  { id: "#2041", via: "Link", estado: "Novo" },
  { id: "#2038", via: "Link", estado: "Em análise" },
];

/** Campo travado: prefixo fixo + slug + cursor */
function LinkProtagonistField() {
  return (
    <div
      className={`flex max-w-2xl items-center ${r} ${borderGrayFlat} bg-[#F9FAFB] px-4 py-3.5 font-mono text-[15px] leading-none text-[#333]`}
      role="img"
      aria-label="Endereço do link: 24vendas.com barra sua-representacao"
    >
      <span className="select-none text-[#333]/55">24vendas.com/</span>
      <span className="font-medium text-[#002B5B]">sua-representacao</span>
      <span className="landing-link-cursor ml-px inline-block h-[1.15em] w-[2px] shrink-0 bg-[#0056b3]" aria-hidden />
    </div>
  );
}

function FlatCatalogScreenshot() {
  return (
    <div className={`${r} overflow-hidden ${borderGrayFlat} bg-white`}>
      <img
        src={catalogClientPreview}
        alt="Captura do catálogo no sistema — sem mockup decorativo"
        width={1200}
        height={900}
        className="block max-h-[min(56vh,560px)] w-full object-cover object-top"
      />
    </div>
  );
}

function PedidosRecebidosLista() {
  return (
    <div className={`w-full max-w-md ${r} ${borderClean} bg-white`}>
      <div className="border-b border-[#E0E7FF] px-4 py-2.5">
        <p className="text-xs font-semibold text-[#002B5B]">Pedidos recebidos</p>
      </div>
      <ul className="divide-y divide-[#E0E7FF]">
        {pedidosRecebidosMock.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm font-normal text-[#333]">
            <span className="font-semibold tabular-nums text-[#002B5B]">{row.id}</span>
            <span>{row.via}</span>
            <span className="text-xs font-medium text-[#0056b3]">{row.estado}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Linha reta royal: botão “Enviar link” → lista Pedidos recebidos */
function FluxoEnviarParaPedidos() {
  return (
    <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:gap-0">
      <button
        type="button"
        disabled
        className={`${r} shrink-0 border border-[#002B5B] bg-white px-5 py-2.5 text-sm font-semibold text-[#002B5B]`}
      >
        Enviar link
      </button>

      <div className="flex shrink-0 items-center sm:px-4" aria-hidden>
        <div className="h-9 w-px bg-[#0056b3] sm:hidden" />
        <div className="hidden h-px w-14 bg-[#0056b3] sm:block" />
      </div>

      <div className="min-w-0 flex-1">
        <PedidosRecebidosLista />
      </div>
    </div>
  );
}

function HeroProdutoVisual() {
  return (
    <div className="flex flex-col gap-10 text-left">
      <FlatCatalogScreenshot />
      <FluxoEnviarParaPedidos />
    </div>
  );
}

function FluxoTable() {
  return (
    <div className={`overflow-hidden ${r} ${borderClean} bg-white`}>
      <table className="w-full border-collapse text-left text-sm font-normal">
        <thead>
          <tr className="border-b border-[#E0E7FF] bg-white">
            <th className="landing-heading w-12 px-3 py-2.5 text-sm">#</th>
            <th className="landing-heading px-3 py-2.5 text-sm">Etapa</th>
          </tr>
        </thead>
        <tbody className="text-[#333]">
          {fluxoPedido.map((row) => (
            <tr key={row.etapa} className="border-b border-[#E0E7FF] last:border-0">
              <td className="px-3 py-2.5 tabular-nums font-semibold text-[#002B5B]">{row.etapa}</td>
              <td className="px-3 py-2.5">{row.texto}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Landing() {
  return (
    <div className="landing-clean-tech flex min-h-screen flex-col bg-white antialiased selection:bg-[#E0E7FF]">
      <LandingHeader technical />

      <section id="produto" className="border-b border-[#E0E7FF]">
        <div className="container mx-auto max-w-6xl px-4 py-20 text-left lg:py-28">
          <div className="mb-14 max-w-3xl lg:mb-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Link de pedidos</p>
            <div className="mt-5">
              <LinkProtagonistField />
            </div>
          </div>

          <div className="grid gap-16 lg:grid-cols-2 lg:items-start lg:gap-x-16 lg:gap-y-20">
            <div className="max-w-xl">
              <h1 className="landing-heading text-[1.7rem] leading-[1.2] tracking-tight sm:text-[2rem] lg:text-[2.35rem] lg:leading-[1.15]">
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
                  className={`h-11 ${r} border-0 bg-[#0056b3] px-8 text-sm font-semibold text-white shadow-none hover:bg-[#004494]`}
                >
                  <Link to="/signup">Criar meu link de vendas</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className={`h-11 ${r} ${borderClean} bg-white text-sm font-semibold text-[#002B5B] shadow-none hover:bg-[#002B5B]/[0.03]`}
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
        <div className="container mx-auto max-w-6xl px-4 py-20 text-left lg:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
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
        <div className="container mx-auto max-w-6xl px-4 py-20 text-left lg:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Entrega</p>
          <h2 className="landing-heading mt-4 max-w-2xl text-xl">O que está no produto</h2>
          <div className="mt-14 grid gap-4 md:grid-cols-3 md:gap-0 md:border md:border-[#E0E7FF] md:bg-[#E0E7FF] [&>*]:md:border-r [&>*]:md:border-[#E0E7FF] [&>*]:md:bg-white [&>*]:last:md:border-r-0">
            {entregaCols.map(({ titulo, texto }) => (
              <div key={titulo} className={`${r} border border-[#E0E7FF] bg-white p-6 md:rounded-none md:border-0 md:bg-transparent md:p-10`}>
                <h3 className="landing-heading text-base">{titulo}</h3>
                <p className="mt-4 text-sm font-normal leading-relaxed text-[#333]">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="border-b border-[#E0E7FF]">
        <div className="container mx-auto max-w-6xl px-4 py-20 text-left lg:py-24">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Preços</p>
            <h2 className="landing-heading mt-4 text-xl">Planos mensais</h2>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`flex flex-col ${r} bg-white p-6 lg:p-8 ${p.highlight ? "border-2 border-[#0056b3]" : borderClean}`}
              >
                {p.highlight && (
                  <span className={`mb-4 inline-block w-fit ${r} border border-[#E0E7FF] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0056b3]`}>
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
                        : `${borderClean} bg-white font-semibold text-[#002B5B] hover:bg-[#002B5B]/[0.03]`
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
        <div className="container mx-auto max-w-6xl px-4 py-20 lg:py-24">
          <div className={`${r} ${borderClean} bg-white px-8 py-12 lg:px-12 lg:py-14`}>
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
