import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Preços</a>
          <a href="#contact" className="hover:text-foreground transition-colors">Contato</a>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/login">Entrar</Link>
          </Button>
          <Button asChild className="shadow-md">
            <Link to="/signup">Experimentar Grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
