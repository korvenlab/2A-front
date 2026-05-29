"use client";

import { ZoomIn } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DASHBOARD_SRC = "/Dashboard.png";
const DASHBOARD_ALT =
  "Painel do 2AVendas — visão do dashboard com pedidos e operação da representação";

export function LandingHeroScreenshot() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="landing-hero-preview landing-hero-screenshot group w-full cursor-zoom-in rounded-[20px] p-1 text-left transition-[box-shadow,transform] duration-300 hover:shadow-[0_8px_32px_rgba(0,122,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2 sm:rounded-[24px] sm:p-2 md:p-2.5"
          aria-label="Ampliar imagem do painel 2AVendas"
        >
          <span className="landing-hero-screenshot-frame relative block overflow-hidden rounded-xl border border-[#E8ECF2] bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] md:rounded-2xl">
            <img
              src={DASHBOARD_SRC}
              alt={DASHBOARD_ALT}
              className="landing-hero-screenshot-img block h-auto w-full object-contain object-left-top"
              width={1280}
              height={720}
              loading="eager"
              decoding="async"
            />
            <span
              className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-[#003366]/88 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-lg backdrop-blur-sm transition-opacity group-hover:bg-[#007AFF]/90"
              aria-hidden
            >
              <ZoomIn className="h-3.5 w-3.5" strokeWidth={2} />
              Ampliar
            </span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent
        size="wide"
        className="landing-hero-lightbox top-[50%] max-h-[min(96dvh,calc(100dvh-1rem))] w-[min(96vw,1280px)] max-w-[96vw] translate-y-[-50%] gap-0 overflow-hidden border-[#E8ECF2]/40 bg-[#0f1a2e]/96 p-2 shadow-2xl sm:p-3"
      >
        <DialogTitle className="sr-only">Painel 2AVendas — visualização ampliada</DialogTitle>
        <img
          src={DASHBOARD_SRC}
          alt={DASHBOARD_ALT}
          className="mx-auto max-h-[min(88dvh,900px)] w-full object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
