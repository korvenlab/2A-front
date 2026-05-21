import { onlyDigits } from "@/lib/document-masks";

export type CepLookupResult = {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento: string;
};

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  complemento?: string;
};

export async function lookupCep(cep: string): Promise<CepLookupResult> {
  const digits = onlyDigits(cep);
  if (digits.length !== 8) {
    throw new Error("CEP deve ter 8 dígitos.");
  }

  let res: Response;
  try {
    res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  } catch {
    throw new Error("Não foi possível consultar o CEP. Verifique sua conexão e tente de novo.");
  }

  if (!res.ok) {
    throw new Error("Serviço de consulta de CEP indisponível. Tente novamente em instantes.");
  }

  let raw: ViaCepResponse;
  try {
    raw = (await res.json()) as ViaCepResponse;
  } catch {
    throw new Error("Resposta inválida ao consultar o CEP.");
  }

  if (raw.erro) {
    throw new Error("CEP não encontrado.");
  }

  return {
    logradouro: (raw.logradouro ?? "").trim(),
    bairro: (raw.bairro ?? "").trim(),
    cidade: (raw.localidade ?? "").trim(),
    uf: (raw.uf ?? "").trim().toUpperCase(),
    complemento: (raw.complemento ?? "").trim(),
  };
}
