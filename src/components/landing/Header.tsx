import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const r = "rounded-[4px]";

export function LandingHeader({ technical }: { technical?: boolean }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-white",
        technical ? "border-[#002B5B] bg-white" : "border-border/60 bg-background/95 backdrop-blur-md",
      )}
    >
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Logo light={false} />
        <nav
          className={cn(
            "hidden items-center gap-8 text-sm font-medium md:flex",
            technical ? "text-[#002B5B]" : "text-muted-foreground",
          )}
        >
          <a href="#produto" className={technical ? "hover:text-[#0056b3]" : "hover:text-foreground"}>
            Produto
          </a>
          <a href="#fluxo" className={technical ? "hover:text-[#0056b3]" : "hover:text-foreground"}>
            Fluxo
          </a>
          <a href="#capacidades" className={technical ? "hover:text-[#0056b3]" : "hover:text-foreground"}>
            Capacidades
          </a>
          <a href="#pricing" className={technical ? "hover:text-[#0056b3]" : "hover:text-foreground"}>
            Preços
          </a>
          <a href="#contact" className={technical ? "hover:text-[#0056b3]" : "hover:text-foreground"}>
            Contato
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            asChild
            className={cn(
              r,
              technical && "font-medium text-[#002B5B] shadow-none hover:bg-[#F8FAFF] hover:text-[#0056b3]",
            )}
          >
            <Link to="/login">Entrar</Link>
          </Button>
          <Button
            asChild
            className={cn(
              "shadow-none",
              technical
                ? `${r} bg-[#0056b3] px-4 font-medium text-white hover:bg-[#004494]`
                : "rounded-md shadow-md",
            )}
          >
            <Link to="/signup">{technical ? "Criar meu link" : "Começar agora"}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
