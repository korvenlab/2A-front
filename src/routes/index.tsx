import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/Header";
import { LandingFooter } from "@/components/landing/Footer";
import {
  BarChart3,
  Users,
  ShoppingCart,
  Smartphone,
  Shield,
  Zap,
  Check,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import heroImg from "@/assets/login-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "2AVendas — Plataforma B2B para Representações Comerciais" },
      { name: "description", content: "Gerencie vendedores, pedidos e clientes B2B em uma única plataforma. Experimente grátis e organize sua representação." },
      { property: "og:title", content: "2AVendas — Plataforma B2B para Representações" },
      { property: "og:description", content: "Gerencie vendedores, pedidos e clientes B2B em uma única plataforma." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: BarChart3, title: "Dashboard em tempo real", desc: "Acompanhe vendas, metas e performance de cada vendedor com gráficos claros." },
  { icon: Users, title: "Gestão de Vendedores", desc: "Cadastre sua equipe, defina comissões e acompanhe a carteira de clientes de cada um." },
  { icon: ShoppingCart, title: "Portal B2B para Clientes", desc: "Seus clientes fazem pedidos sozinhos por um portal exclusivo, com tabela de preços personalizada." },
  { icon: Smartphone, title: "App Mobile iOS & Android", desc: "Vendedores tiram pedidos offline, sincronizando automaticamente." },
  { icon: Shield, title: "Multi-Empresa Seguro", desc: "Cada representação tem seu ambiente isolado com proteção de dados e papéis definidos." },
  { icon: Zap, title: "Integrações Rápidas", desc: "Conecte seu ERP, emita NFe e exporte relatórios em segundos." },
];

const plans = [
  {
    name: "Starter",
    price: "R$ 99",
    desc: "Para representações pequenas começando agora.",
    features: ["Até 3 vendedores", "Até 50 clientes", "Dashboard básico", "Suporte por email"],
    cta: "Começar grátis",
  },
  {
    name: "Pro",
    price: "R$ 299",
    desc: "A escolha de quem quer crescer rápido.",
    features: ["Vendedores ilimitados", "Clientes ilimitados", "Portal B2B completo", "App mobile incluído", "Suporte prioritário"],
    cta: "Experimentar Grátis",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "Para grandes operações com integrações personalizadas.",
    features: ["Tudo do Pro", "Integração ERP customizada", "SSO e auditoria", "Gerente de conta dedicado"],
    cta: "Falar com vendas",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-soft)" }} />
        <div
          className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div className="container mx-auto px-4 pt-8 pb-12 lg:pt-10 lg:pb-24 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight text-foreground leading-[1.1] lg:leading-[1.05]">
                Sua representação comercial,{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-brand)" }}
                >
                  finalmente organizada
                </span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
                Gerencie vendedores, pedidos e clientes B2B em uma plataforma única.
                Multi-empresa, mobile e pronta para escalar com você.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row flex-wrap gap-3 sm:justify-start justify-center">
                <Button size="lg" asChild className="shadow-lg text-base h-12 px-8 w-full sm:w-auto">
                  <Link to="/signup">
                    Experimentar Grátis <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-12 px-8 w-full sm:w-auto">
                  <Link to="/login">Já tenho conta</Link>
                </Button>
              </div>
              <div className="mt-6 flex items-center justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> 14 dias grátis</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Sem cartão</div>
              </div>
            </div>
            <div className="relative mt-2 lg:mt-0">
              <div
                className="absolute inset-0 rounded-3xl blur-2xl opacity-40"
                style={{ background: "var(--gradient-brand)" }}
              />
              <img
                src={heroImg}
                alt="Dashboard 2AVendas"
                width={1024}
                height={1280}
                className="relative rounded-3xl shadow-2xl w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Tudo que sua representação precisa</h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Funcionalidades pensadas para o dia a dia de quem vive de comissão.
            </p>
          </div>
          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-all hover:-translate-y-1"
                style={{ transition: "var(--transition-smooth)" }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl shadow-md"
                  style={{ background: "var(--gradient-brand)" }}
                >
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-28 bg-secondary/40">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">Planos transparentes</h2>
            <p className="mt-4 text-muted-foreground text-lg">Comece grátis. Pague apenas quando crescer.</p>
          </div>
          <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl border p-8 ${
                  p.highlight
                    ? "border-primary shadow-xl scale-105 bg-card"
                    : "border-border bg-card"
                }`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Mais popular
                  </div>
                )}
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground h-10">{p.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-black">{p.price}</span>
                  {p.price !== "Custom" && <span className="text-muted-foreground">/mês</span>}
                </div>
                <ul className="mt-6 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-success mt-0.5 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-8 w-full"
                  variant={p.highlight ? "default" : "outline"}
                  asChild
                >
                  <Link to="/signup">{p.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div
            className="relative overflow-hidden rounded-3xl p-12 lg:p-16 text-center"
            style={{ background: "var(--gradient-hero)" }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold text-primary-foreground">
              Pronto para vender mais?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80 max-w-xl mx-auto">
              Junte-se a centenas de representações que já organizaram seu comercial com a 2AVendas.
            </p>
            <Button size="lg" variant="secondary" asChild className="mt-8 h-12 px-8 text-base shadow-xl">
              <Link to="/signup">
                Experimentar Grátis <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
