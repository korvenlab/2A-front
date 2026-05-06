import { Link } from "@tanstack/react-router";
import logoSrc from "@/assets/logo-2avendas.png";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center group" aria-label="2A Vendas">
      <img
        src={logoSrc}
        alt="2A Vendas"
        className={`h-16 w-auto object-contain transition-transform group-hover:scale-105 ${light ? "drop-shadow-[0_2px_10px_rgba(255,255,255,0.28)]" : "drop-shadow-[0_2px_6px_rgba(0,0,0,0.07)]"}`}
      />
    </Link>
  );
}
