/** Texto normalizado para busca local (sem acentos, minúsculas). */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Cada palavra da consulta deve aparecer em ao menos um dos campos
 * (substring no texto normalizado ou só dígitos em documento/telefone).
 */
export function matchesFieldsSearch(
  fields: (string | null | undefined)[],
  query: string,
): boolean {
  const q = normalizeSearchText(query);
  if (!q) return true;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const normalizedFields = fields
    .map((f) => (f ?? "").trim())
    .filter((f) => f.length > 0)
    .map((f) => normalizeSearchText(f));

  const digitFields = fields
    .map((f) => (f ?? "").trim())
    .filter((f) => f.length > 0)
    .map((f) => digitsOnly(f));

  return tokens.every((token) => {
    if (normalizedFields.some((f) => f.includes(token))) return true;
    const tokenDigits = digitsOnly(token);
    if (tokenDigits.length >= 2 && digitFields.some((f) => f.includes(tokenDigits))) {
      return true;
    }
    return false;
  });
}

export type ProductSearchFields = {
  name: string;
  sku?: string | null;
  category?: string | null;
  supplier?: string | null;
  description?: string | null;
};

export function matchesProductSearch(product: ProductSearchFields, query: string): boolean {
  return matchesFieldsSearch(
    [product.name, product.sku, product.category, product.supplier, product.description],
    query,
  );
}

export type IndustrySearchFields = {
  trade_name: string;
  responsible_name?: string | null;
  cnpj?: string | null;
};

/** Indústria da organização; opcionalmente nomes de produtos do catálogo vinculados. */
export function matchesIndustrySearch(
  industry: IndustrySearchFields,
  query: string,
  productNames: string[] = [],
): boolean {
  if (matchesFieldsSearch([industry.trade_name, industry.responsible_name, industry.cnpj], query)) {
    return true;
  }
  return productNames.some((name) => matchesFieldsSearch([name], query));
}

/** Escapa termo para uso em filtros ilike do PostgREST (busca remota). */
export function sanitizeIlikeTerm(term: string): string {
  return term.replace(/%/g, "").replace(/,/g, "").slice(0, 64);
}
