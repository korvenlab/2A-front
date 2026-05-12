const BRANDS = [
  "Representantes comerciais",
  "Representações",
  "Distribuidores B2B",
  "Indústria e trade",
  "Equipes de campo",
];

export function LandingSocialProof() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-16 md:px-10 md:py-20">
      <p className="text-center font-mono text-[10px] uppercase tracking-[0.35em] text-[#9CA3AF]">
        Quem precisa de CRM enxuto para representação e pedido no mesmo lugar
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
        <span className="font-mono text-[#003366]">Gestão de equipe · funil · WhatsApp no pedido</span>{" "}
        e <span className="font-mono text-[#003366]">pedidos + portal + catálogo B2B</span> num CRM só
      </p>
    </section>
  );
}
