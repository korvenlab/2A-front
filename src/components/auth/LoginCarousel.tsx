import { useEffect, useState } from "react";
import heroImg from "@/assets/login-hero.jpg";
import mobileImg from "@/assets/mobile-app.jpg";
import referralImg from "@/assets/referral.jpg";
import { Smartphone, Gift, Link2, Apple } from "lucide-react";

const slides = [
  {
    image: heroImg,
    eyebrow: "Painel",
    title: "Acesse seus pedidos e gerencie sua equipe.",
    description:
      "Seus clientes estão comprando agora? Verifique os novos pedidos feitos pelo seu link exclusivo.",
    icon: Link2,
  },
  {
    image: mobileImg,
    eyebrow: "Mobile",
    title: "Sua representação no bolso",
    description: "Baixe agora para iOS e Android e acompanhe pedidos de qualquer lugar.",
    icon: Smartphone,
    cta: (
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-[6px] border border-[color:var(--landing-blue-line)] bg-[color:var(--landing-blue-fill)] px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-[color:var(--landing-blue-fill-strong)]"
        >
          <Apple className="h-5 w-5" /> App Store
        </button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-[6px] border border-[color:var(--landing-blue-line)] bg-[color:var(--landing-blue-fill)] px-4 py-2.5 text-sm font-medium text-neutral-900 hover:bg-[color:var(--landing-blue-fill-strong)]"
        >
          <Smartphone className="h-5 w-5" /> Google Play
        </button>
      </div>
    ),
  },
  {
    image: referralImg,
    eyebrow: "Indicação",
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
    <div className="login-split-brand relative flex min-h-screen w-full flex-col bg-white">
      {slides.map((s, i) => {
        const Icon = s.icon;
        return (
          <div
            key={i}
            className={`absolute inset-0 flex flex-col transition-opacity duration-700 ${
              i === idx ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="flex flex-1 flex-col justify-center px-10 pb-6 pt-14 lg:px-14 lg:pt-16">
              <div className="mx-auto w-full max-w-2xl">
                <div className="overflow-hidden rounded-[4px] border-2 border-[#002B5B] bg-white shadow-[4px_4px_0_0_#002B5B]">
                  <img
                    src={s.image}
                    alt=""
                    className="block max-h-[min(440px,48vh)] w-full bg-white object-cover object-top"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                </div>
              </div>
            </div>

            <div className="relative border-t border-[color:var(--landing-blue-line-faint)] bg-white px-10 py-10 lg:px-14">
              <div className="mx-auto max-w-lg">
                <div className="flex items-center gap-2 border-l-2 border-[color:var(--landing-blue-deep)] pl-3">
                  <Icon className="h-4 w-4 shrink-0 text-[color:var(--landing-blue-deep)]" strokeWidth={1.5} />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    {s.eyebrow}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold leading-snug tracking-tight text-neutral-900 lg:text-[1.65rem]">
                  {s.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600 lg:text-[15px]">{s.description}</p>
                {s.cta}
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-6 right-10 z-20 flex gap-1.5 lg:right-14">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            className={`h-2 rounded-[3px] transition-all ${
              i === idx ? "w-8 bg-[color:var(--landing-blue-deep)]" : "w-2 bg-neutral-300 hover:bg-neutral-400"
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
