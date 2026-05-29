"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, ZoomIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DASHBOARD_SRC = "/Dashboard.png";
const DASHBOARD_ALT =
  "Painel do 2AVendas — visão do dashboard com pedidos e operação da representação";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +value.toFixed(2)));
}

function LandingHeroLightbox() {
  const [scale, setScale] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);

  const resetZoom = useCallback(() => setScale(1), []);

  const zoomIn = useCallback(
    () => setScale((s) => clampZoom(s + ZOOM_STEP)),
    [],
  );
  const zoomOut = useCallback(
    () => setScale((s) => clampZoom(s - ZOOM_STEP)),
    [],
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      setScale((s) => clampZoom(s + (e.deltaY < 0 ? 0.12 : -0.12)));
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { distance: Math.hypot(dx, dy), scale };
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distance = Math.hypot(dx, dy);
    const ratio = distance / pinchRef.current.distance;
    setScale(clampZoom(pinchRef.current.scale * ratio));
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinchRef.current = null;
  }

  return (
    <>
      <div
        ref={viewportRef}
        className="landing-hero-lightbox-viewport max-h-[min(78dvh,860px)] min-h-[200px] overflow-auto overscroll-contain touch-pan-x touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex min-w-min items-center justify-center p-2 sm:p-4">
          <img
            src={DASHBOARD_SRC}
            alt={DASHBOARD_ALT}
            draggable={false}
            className="block h-auto select-none"
            style={{
              width: `${scale * 100}%`,
              maxWidth: scale <= 1 ? "100%" : "none",
            }}
            onDoubleClick={() => setScale((s) => (s > 1 ? 1 : 2))}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-2 py-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 border-white/20 bg-white/10 text-white hover:bg-white/20"
          onClick={zoomOut}
          disabled={scale <= MIN_ZOOM}
          aria-label="Diminuir zoom"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-[3.5rem] text-center font-mono text-[11px] tabular-nums text-white/80">
          {Math.round(scale * 100)}%
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 border-white/20 bg-white/10 text-white hover:bg-white/20"
          onClick={zoomIn}
          disabled={scale >= MAX_ZOOM}
          aria-label="Aumentar zoom"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white/20 bg-white/10 font-mono text-[10px] uppercase tracking-wider text-white hover:bg-white/20"
          onClick={resetZoom}
          aria-label="Redefinir zoom"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Ajustar
        </Button>
        <p className="w-full text-center font-mono text-[9px] uppercase tracking-[0.12em] text-white/45 sm:w-auto">
          Scroll, pinça ou duplo toque · botões +/−
        </p>
      </div>
    </>
  );
}

export function LandingHeroScreenshot() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="landing-hero-preview landing-hero-screenshot group w-full cursor-zoom-in rounded-[20px] p-1 text-left transition-[box-shadow,transform] duration-300 hover:shadow-[0_8px_32px_rgba(0,122,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2 sm:rounded-[24px] sm:p-2 md:p-2.5"
          aria-label="Ampliar imagem do painel 2AVendas"
        >
          <span className="landing-hero-screenshot-frame relative block overflow-hidden rounded-xl border border-[#E8ECF2] bg-[#f6f9fc] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] md:rounded-2xl">
            <img
              src={DASHBOARD_SRC}
              alt={DASHBOARD_ALT}
              className="landing-hero-screenshot-img block w-full h-auto max-w-full"
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
        className="landing-hero-lightbox top-[50%] flex max-h-[min(96dvh,calc(100dvh-1rem))] w-[min(96vw,1280px)] max-w-[96vw] translate-y-[-50%] flex-col gap-0 overflow-hidden border-[#E8ECF2]/40 bg-[#0f1a2e]/96 p-0 shadow-2xl sm:max-w-[min(96vw,1280px)]"
      >
        <DialogTitle className="sr-only">Painel 2AVendas — visualização ampliada com zoom</DialogTitle>
        {open ? <LandingHeroLightbox key="lightbox" /> : null}
      </DialogContent>
    </Dialog>
  );
}
