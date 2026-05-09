"use client";

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const r = "rounded-[4px]";

const navItems = [
  { href: "#produto", label: "Produto" },
  { href: "#capacidades", label: "Capacidades" },
  { href: "#pricing", label: "Preços" },
  { href: "#contact", label: "Contato" },
] as const;

export function LandingHeader({ technical }: { technical?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinkClass = cn(
    r,
    "relative px-3 py-2 text-sm font-medium outline-none transition-[transform,color,background-color,box-shadow] duration-200 ease-out",
    "hover:text-[#0056b3] active:scale-[0.98] active:transition-none",
    "focus-visible:ring-2 focus-visible:ring-offset-2",
    technical
      ? [
          "text-[#002B5B]",
          "hover:bg-[#0056b3]/[0.08]",
          "active:bg-[#0056b3]/[0.12]",
          "focus-visible:ring-[#0056b3]/45",
        ]
      : [
          "text-muted-foreground",
          "hover:bg-accent/80 hover:text-foreground",
          "active:bg-accent",
          "focus-visible:ring-ring/60",
        ],
    technical && "decoration-[#0056b3] decoration-2 underline-offset-[10px] hover:underline",
  );

  const navMobileLinkClass = cn(
    r,
    "flex w-full items-center px-4 py-3.5 text-left text-base font-medium outline-none transition-[background-color,color,transform] duration-200",
    technical
      ? "text-[#002B5B] hover:bg-[#EFF6FF] active:bg-[#E0E7FF] active:scale-[0.99]"
      : "text-foreground hover:bg-accent active:bg-accent/90 active:scale-[0.99]",
    "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0056b3]/35",
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-white",
        technical ? "border-[#002B5B] bg-white shadow-[0_1px_0_0_rgba(0,43,91,0.06)]" : "border-border/60 bg-background/95 backdrop-blur-md",
      )}
    >
      <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Logo light={false} />

        <nav
          className={cn(
            "hidden items-center gap-1 md:flex lg:gap-2",
            technical ? "text-[#002B5B]" : "text-muted-foreground",
          )}
          aria-label="Principal"
        >
          {navItems.map(({ href, label }) => (
            <a key={href} href={href} className={navLinkClass}>
              {label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            asChild
            className={cn(
              r,
              "hidden transition-[transform,background-color,color] duration-200 ease-out md:inline-flex",
              technical &&
                "font-medium text-[#002B5B] shadow-none hover:bg-[#0056b3]/[0.08] hover:text-[#0056b3] active:scale-[0.98] active:bg-[#0056b3]/[0.12] focus-visible:ring-2 focus-visible:ring-[#0056b3]/35 focus-visible:ring-offset-2",
            )}
          >
            <Link to="/login">Entrar</Link>
          </Button>

          <Button
            asChild
            className={cn(
              "shadow-none transition-[transform,box-shadow,background-color] duration-200 ease-out active:scale-[0.98]",
              technical
                ? cn(
                    r,
                    "bg-[#0056b3] px-4 font-medium text-white",
                    "hover:bg-[#004494] hover:shadow-[0_4px_14px_-4px_rgba(0,86,179,0.55)]",
                    "active:bg-[#003d7a] focus-visible:ring-2 focus-visible:ring-[#0056b3]/50 focus-visible:ring-offset-2",
                  )
                : "rounded-md shadow-md hover:shadow-lg active:shadow-md",
            )}
          >
            <Link to="/signup">{technical ? "Cadastrar" : "Começar agora"}</Link>
          </Button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "md:hidden",
                  r,
                  technical
                    ? "border-2 border-[#002B5B] bg-white text-[#002B5B] shadow-none transition-[transform,background-color] duration-200 hover:bg-[#EFF6FF] active:scale-95 active:bg-[#E0E7FF] focus-visible:ring-2 focus-visible:ring-[#0056b3]/40 focus-visible:ring-offset-2"
                    : undefined,
                )}
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" strokeWidth={1.75} />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className={cn(
                "flex w-[min(100vw,320px)] flex-col border-l-2 bg-white p-0",
                technical ? "border-[#002B5B]" : undefined,
              )}
            >
              <div className="border-b border-[#E0E7FF] px-6 pb-4 pt-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0056b3]">Menu</p>
              </div>
              <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4" aria-label="Mobile">
                {navItems.map(({ href, label }) => (
                  <SheetClose key={href} asChild>
                    <a href={href} className={navMobileLinkClass}>
                      {label}
                    </a>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-2 border-t border-[#E0E7FF] p-4">
                <SheetClose asChild>
                  <Button
                    variant="outline"
                    asChild
                    className={cn(
                      r,
                      "h-11 w-full border-2 border-[#002B5B] bg-white font-medium text-[#002B5B] shadow-none transition-[transform,background-color] duration-200 hover:bg-[#F8FAFC] active:scale-[0.99]",
                    )}
                  >
                    <Link to="/login">Entrar</Link>
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button
                    asChild
                    className={cn(
                      r,
                      "h-11 w-full border-0 bg-[#0056b3] font-semibold text-white shadow-none transition-[transform,background-color] duration-200 hover:bg-[#004494] active:scale-[0.99]",
                    )}
                  >
                    <Link to="/signup">{technical ? "Cadastrar" : "Começar agora"}</Link>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
