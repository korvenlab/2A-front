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
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 md:gap-x-14">
        {BRANDS.map((name) => (
          <span
            key={name}
            className="landing-social-brand select-none font-mono text-sm font-semibold tracking-[0.12em] text-[#B8BCC4] transition-colors duration-300 md:text-base"
          >
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
