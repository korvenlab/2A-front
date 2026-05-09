import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingHeader({ technical }: { technical?: boolean }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b",
        technical
          ? "border-[color:var(--landing-blue-line-faint)] bg-[#0a0a0a]/95 backdrop-blur-sm"
          : "border-border/60 bg-background/80 backdrop-blur-md",
      )}
    >
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Logo light={technical} />
        <nav
          className={cn(
            "hidden items-center gap-8 text-sm font-medium md:flex",
            technical ? "text-[color:var(--landing-blue-soft)]" : "text-muted-foreground",
          )}
        >
          <a href="#produto" className={technical ? "hover:text-[color:var(--landing-blue-bright)]" : "hover:text-foreground"}>
            Produto
          </a>
          <a href="#fluxo" className={technical ? "hover:text-[color:var(--landing-blue-bright)]" : "hover:text-foreground"}>
            Fluxo
          </a>
          <a href="#operacao" className={technical ? "hover:text-[color:var(--landing-blue-bright)]" : "hover:text-foreground"}>
            Painel
          </a>
          <a href="#pricing" className={technical ? "hover:text-[color:var(--landing-blue-bright)]" : "hover:text-foreground"}>
            Preços
          </a>
          <a href="#contact" className={technical ? "hover:text-[color:var(--landing-blue-bright)]" : "hover:text-foreground"}>
            Contato
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            asChild
            className={cn(
              technical &&
                "text-[color:var(--landing-blue-soft)] hover:bg-[color:var(--landing-blue-fill)] hover:text-white rounded-[4px]",
            )}
          >
            <Link to="/login">Entrar</Link>
          </Button>
          <Button
            asChild
            className={cn(
              "rounded-[4px] shadow-none",
              technical
                ? "bg-white font-semibold text-black hover:bg-[#e8e8e8]"
                : "shadow-md",
            )}
          >
            <Link to="/signup">{technical ? "Criar minha conta" : "Começar agora"}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
