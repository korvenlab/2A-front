export const brl = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(n ?? 0),
  );

export const dt = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("pt-BR") : "—";
