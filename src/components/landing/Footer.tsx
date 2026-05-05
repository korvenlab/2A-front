import { Logo } from "@/components/Logo";

export function LandingFooter() {
  return (
    <footer id="contact" className="border-t border-border bg-secondary/40">
      <div className="container mx-auto px-4 py-12 grid gap-8 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted-foreground">A plataforma B2B definitiva para representações comerciais.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Produto</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#features" className="hover:text-foreground">Funcionalidades</a></li>
            <li><a href="#pricing" className="hover:text-foreground">Preços</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Empresa</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Sobre</li><li>Contato</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>Privacidade</li><li>Termos</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} 2AVendas — Todos os direitos reservados.
      </div>
    </footer>
  );
}
