import { onlyDigits } from "@/lib/document-masks";

export type CnpjLookupResult = {
  razaoSocial: string;
  nomeFantasia: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
};

type BrasilApiCnpj = {
  razao_social?: string;
  nome_fantasia?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  ddd_telefone_1?: string;
  telefone_1?: string;
  email?: string | null;
  descricao_situacao_cadastral?: string;
  situacao_cadastral?: number;
};

function buildPhone(d: BrasilApiCnpj): string {
  const ddd = (d.ddd_telefone_1 ?? "").trim();
  const tel = (d.telefone_1 ?? "").trim();
  if (!ddd && !tel) return "";
  if (ddd && tel) return `(${ddd}) ${tel}`;
  return tel || ddd;
}

/** Monta linha de endereço a partir dos dados da Receita. */
export function formatAddressFromCnpj(data: CnpjLookupResult): string {
  const parts: string[] = [];
  const street = [data.logradouro, data.numero].filter((p) => p.trim()).join(", ");
  if (street.trim()) parts.push(street.trim());
  if (data.complemento.trim()) parts.push(data.complemento.trim());
  if (data.bairro.trim()) parts.push(data.bairro.trim());
  return parts.join(" - ");
}

export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult> {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) {
    throw new Error("Informe um CNPJ completo com 14 dígitos.");
  }

  let res: Response;
  try {
    res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
  } catch {
    throw new Error("Não foi possível consultar o CNPJ. Verifique sua conexão e tente de novo.");
  }

  if (res.status === 404) {
    throw new Error("CNPJ não encontrado na Receita Federal.");
  }
  if (!res.ok) {
    throw new Error("Serviço de consulta de CNPJ indisponível. Tente novamente em instantes.");
  }

  let raw: BrasilApiCnpj;
  try {
    raw = (await res.json()) as BrasilApiCnpj;
  } catch {
    throw new Error("Resposta inválida ao consultar o CNPJ.");
  }

  const situacao = (raw.descricao_situacao_cadastral ?? "").toLowerCase();
  if (situacao && situacao !== "ativa" && raw.situacao_cadastral !== 2) {
    throw new Error(`CNPJ com situação cadastral: ${raw.descricao_situacao_cadastral}.`);
  }

  return {
    razaoSocial: (raw.razao_social ?? "").trim(),
    nomeFantasia: (raw.nome_fantasia ?? "").trim(),
    cep: onlyDigits(raw.cep ?? ""),
    logradouro: (raw.logradouro ?? "").trim(),
    numero: (raw.numero ?? "").trim(),
    complemento: (raw.complemento ?? "").trim(),
    bairro: (raw.bairro ?? "").trim(),
    cidade: (raw.municipio ?? "").trim(),
    uf: (raw.uf ?? "").trim().toUpperCase(),
    telefone: buildPhone(raw),
    email: (raw.email ?? "").trim(),
  };
}
