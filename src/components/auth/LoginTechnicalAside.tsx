const filaRows = [
  { id: "P-2041", origem: "LINK-B2B", status: "NOVO" },
  { id: "P-2038", origem: "LINK-B2B", status: "EM ANALISE" },
  { id: "P-2035", origem: "VENDEDOR", status: "FECHADO" },
];

export function LoginTechnicalAside() {
  return (
    <aside className="tech-font-ui hidden min-h-screen flex-col justify-center bg-[color:var(--tech-bg)] px-10 py-14 lg:flex lg:px-12 xl:px-16">
      <p className="tech-font-mono tech-caps-tracked text-[10px] font-semibold text-[color:var(--tech-label)]">
        Canal pedidos
      </p>
      <h2 className="tech-font-mono mt-5 max-w-md text-lg font-semibold uppercase leading-snug tracking-[2.5px] text-[color:var(--tech-title)] xl:text-xl">
        Pedidos ativos — link exclusivo
      </h2>
      <p className="mt-5 max-w-sm text-sm leading-relaxed text-[color:var(--tech-sub)]">
        Pedidos fechados pelo link do cliente entram na fila do painel. Estado e origem ficam visíveis na próxima tela após
        autenticação.
      </p>

      <div className="tech-font-mono mt-12 border border-white/10 bg-[color:var(--tech-surface)] text-[11px]">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <span className="tech-caps-tracked text-[9px] font-semibold text-[color:var(--tech-label)]">Fila recente</span>
          <span className="text-[color:var(--tech-sub)]">sync ■</span>
        </div>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 text-[9px] uppercase tracking-[1.5px] text-[color:var(--tech-label)]">
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Origem</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="text-[color:var(--tech-sub)]">
            {filaRows.map((row) => (
              <tr key={row.id} className="border-b border-white/[0.06] last:border-0">
                <td className="px-3 py-2.5 tabular-nums text-[color:var(--tech-title)]">{row.id}</td>
                <td className="px-3 py-2.5">{row.origem}</td>
                <td className="px-3 py-2.5 text-[10px]">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
