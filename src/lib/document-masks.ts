/** Apenas dígitos. */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** CNPJ: 00.000.000/0000-00 (até 14 dígitos). */
export function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** CEP: 00000-000 (8 dígitos). */
export function formatCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function isCnpjComplete(value: string): boolean {
  return onlyDigits(value).length === 14;
}

export function isCepComplete(value: string): boolean {
  return onlyDigits(value).length === 8;
}

/** CPF: 000.000.000-00 (até 11 dígitos). */
export function formatCpf(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Máscara CPF ou CNPJ conforme a quantidade de dígitos digitada. */
export function formatCnpjOrCpf(value: string): string {
  const d = onlyDigits(value);
  if (d.length <= 11) return formatCpf(value);
  return formatCnpj(value);
}
