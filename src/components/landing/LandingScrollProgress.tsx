import { useEffect, useState } from "react";

export function LandingScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setP(1);
      return;
    }

    function tick() {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      setP(Math.min(1, Math.max(0, scrollTop / max)));
    }

    tick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick);
    return () => {
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed bottom-24 left-6 top-24 z-40 hidden w-[3px] overflow-hidden rounded-full bg-[#E8ECF2] md:block"
      aria-hidden
    >
      <div
        className="landing-scroll-progress-fill w-full rounded-full bg-gradient-to-b from-[#007AFF] via-[#FFFFFF] to-[#003366]"
        style={{
          height: `${Math.round(p * 100)}%`,
          minHeight: p > 0 ? "8px" : "0",
        }}
      />
    </div>
  );
}
