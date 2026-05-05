import { useEffect, useState } from "react";
import heroImg from "@/assets/login-hero.jpg";
import mobileImg from "@/assets/mobile-app.jpg";
import referralImg from "@/assets/referral.jpg";
import { Smartphone, Gift, Sparkles, Apple } from "lucide-react";

const slides = [
  {
    image: heroImg,
    eyebrow: "Novidade",
    title: "Dashboard B2B totalmente repaginado",
    description: "Acompanhe vendas, metas e a performance dos seus vendedores em tempo real.",
    icon: Sparkles,
  },
  {
    image: mobileImg,
    eyebrow: "App 2AVendas",
    title: "Sua representação no bolso",
    description: "Baixe agora para iOS e Android e venda de qualquer lugar.",
    icon: Smartphone,
    cta: (
      <div className="flex gap-3 mt-6">
        <button className="flex items-center gap-2 rounded-xl bg-primary-foreground/10 backdrop-blur px-4 py-2.5 text-sm font-semibold text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/20 transition">
          <Apple className="h-5 w-5" /> App Store
        </button>
        <button className="flex items-center gap-2 rounded-xl bg-primary-foreground/10 backdrop-blur px-4 py-2.5 text-sm font-semibold text-primary-foreground border border-primary-foreground/20 hover:bg-primary-foreground/20 transition">
          <Smartphone className="h-5 w-5" /> Google Play
        </button>
      </div>
    ),
  },
  {
    image: referralImg,
    eyebrow: "Indique e Ganhe",
    title: "Ganhe 1 mês grátis a cada indicação",
    description: "Convide outras representações e receba créditos a cada cadastro confirmado.",
    icon: Gift,
  },
];

export function LoginCarousel() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: "var(--gradient-hero)" }}>
      {slides.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={i}
            className={`absolute inset-0 flex flex-col justify-end p-12 transition-opacity duration-700 ${
              i === idx ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <img
              src={s.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity"
              loading={i === 0 ? "eager" : "lazy"}
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(180deg, transparent 30%, oklch(0.20 0.10 258 / 0.85) 100%)" }}
            />
            <div className="relative z-10 max-w-md text-primary-foreground">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 backdrop-blur px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <Icon className="h-3.5 w-3.5" /> {s.eyebrow}
              </div>
              <h2 className="mt-4 text-3xl lg:text-4xl font-bold leading-tight">{s.title}</h2>
              <p className="mt-3 text-base text-primary-foreground/80">{s.description}</p>
              {s.cta}
            </div>
          </div>
        );
      })}
      <div className="absolute bottom-6 right-12 z-20 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-primary-foreground" : "w-1.5 bg-primary-foreground/40"}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
