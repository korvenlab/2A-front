import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

export function LandingFooter({ technical }: { technical?: boolean }) {
  return (
    <footer
      id="contact"
      className={cn(
        "border-t bg-white",
        technical ? "border-[#002B5B] bg-white text-[#333]" : "border-border bg-secondary/40",
      )}
    >
      <div className="container mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo light={false} />
          <p className={cn("text-sm font-normal", technical ? "text-[#333]" : "text-muted-foreground")}>
            Link de pedidos B2B. Pedidos e vendedores na mesma tela.
          </p>
        </div>
        <div>
          <h4 className={cn("mb-3 text-sm font-bold", technical ? "font-['IBM_Plex_Sans',sans-serif] text-[#002B5B]" : undefined)}>Produto</h4>
          <ul className="space-y-2 text-sm font-normal">
            <li>
              <a href="#produto" className={technical ? "text-[#333] hover:text-[#0056b3]" : "text-muted-foreground hover:text-foreground"}>
                Produto
              </a>
            </li>
            <li>
              <a href="#capacidades" className={technical ? "text-[#333] hover:text-[#0056b3]" : "text-muted-foreground hover:text-foreground"}>
                Capacidades
              </a>
            </li>
            <li>
              <a href="#pricing" className={technical ? "text-[#333] hover:text-[#0056b3]" : "text-muted-foreground hover:text-foreground"}>
                Preços
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={cn("mb-3 text-sm font-bold", technical ? "font-['IBM_Plex_Sans',sans-serif] text-[#002B5B]" : undefined)}>Empresa</h4>
          <ul className="space-y-2 text-sm font-normal">
            <li>Sobre</li>
            <li>Contato</li>
          </ul>
        </div>
        <div>
          <h4 className={cn("mb-3 text-sm font-bold", technical ? "font-['IBM_Plex_Sans',sans-serif] text-[#002B5B]" : undefined)}>Legal</h4>
          <ul className="space-y-2 text-sm font-normal">
            <li>Privacidade</li>
            <li>Termos</li>
          </ul>
        </div>
      </div>
      <div
        className={cn(
          "border-t py-6 text-center text-sm font-normal",
          technical ? "border-[#002B5B] text-[#333]/75" : "border-border text-muted-foreground",
        )}
      >
        © {new Date().getFullYear()} 2AVendas — Todos os direitos reservados.
      </div>
    </footer>
  );
}
