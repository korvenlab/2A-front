const BRANDS = [
  "Representações",
  "Distribuidores",
  "Indústria B2B",
  "Trade marketing",
  "Equipes externas",
];

export function LandingSocialProof() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-16 md:px-10 md:py-20">
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#9CA3AF]">
        Operações que organizam pedido e equipe no mesmo lugar
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
        {BRANDS.map((name) => (
          <span
            key={name}
            className="landing-social-brand select-none font-mono text-sm font-semibold tracking-[0.12em] text-[#B8BCC4] transition-colors duration-300 md:text-base"
          >
            {name}
          </span>
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-[#6B7280]">
        <span className="font-mono text-[#003366]">Portal + funil + pedidos</span> num fluxo só para
        sua representação
      </p>
    </section>
  );
}
