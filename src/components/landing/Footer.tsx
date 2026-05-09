import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

export function LandingFooter({ technical }: { technical?: boolean }) {
  return (
    <footer
      id="contact"
      className={cn(
        "border-t",
        technical
          ? "border-[color:var(--landing-blue-line-faint)] bg-[#0a0a0a] text-[color:var(--landing-blue-soft)]"
          : "border-border bg-secondary/40",
      )}
    >
      <div className="container mx-auto max-w-6xl px-4 py-12 grid gap-10 md:grid-cols-4">
        <div className="space-y-3">
          <Logo light={technical} />
          <p className={cn("text-sm", technical ? "text-[color:var(--landing-blue-soft)]" : "text-muted-foreground")}>
            Link de pedidos B2B. Pedidos e vendedores na mesma tela.
          </p>
        </div>
        <div>
          <h4 className={cn("mb-3 text-sm font-semibold", technical && "text-white")}>Produto</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#produto" className={technical ? "hover:text-[color:var(--landing-blue-bright)]" : "text-muted-foreground hover:text-foreground"}>
                Produto
              </a>
            </li>
            <li>
              <a href="#fluxo" className={technical ? "hover:text-[color:var(--landing-blue-bright)]" : "text-muted-foreground hover:text-foreground"}>
                Fluxo
              </a>
            </li>
            <li>
              <a
                href="#operacao"
                className={technical ? "hover:text-[color:var(--landing-blue-bright)]" : "text-muted-foreground hover:text-foreground"}
              >
                Painel
              </a>
            </li>
            <li>
              <a href="#pricing" className={technical ? "hover:text-[color:var(--landing-blue-bright)]" : "text-muted-foreground hover:text-foreground"}>
                Preços
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={cn("mb-3 text-sm font-semibold", technical && "text-white")}>Empresa</h4>
          <ul className="space-y-2 text-sm">
            <li>Sobre</li>
            <li>Contato</li>
          </ul>
        </div>
        <div>
          <h4 className={cn("mb-3 text-sm font-semibold", technical && "text-white")}>Legal</h4>
          <ul className="space-y-2 text-sm">
            <li>Privacidade</li>
            <li>Termos</li>
          </ul>
        </div>
      </div>
      <div
        className={cn(
          "border-t py-6 text-center text-sm",
          technical
            ? "border-[color:var(--landing-blue-line-faint)] text-[color:var(--landing-blue-soft)] opacity-80"
            : "border-border text-muted-foreground",
        )}
      >
        © {new Date().getFullYear()} 2AVendas — Todos os direitos reservados.
      </div>
    </footer>
  );
}
