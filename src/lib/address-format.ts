/** Junta logradouro e bairro para persistência em um único campo, quando necessário. */
export function joinStreetAndDistrict(street: string, district: string): string {
  const s = street.trim();
  const d = district.trim();
  if (s && d) return `${s} - ${d}`;
  return s || d;
}
