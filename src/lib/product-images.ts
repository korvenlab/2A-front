/** Regras de imagens do produto no catálogo e espelho em `image_url` (primeira foto). */

export const MIN_PRODUCT_IMAGES = 1;
export const MAX_PRODUCT_IMAGES = 4;

export function normalizeProductImageUrls(
  image_urls: unknown,
  image_url: string | null | undefined,
): string[] {
  const fromJson = parseJsonUrlArray(image_urls);
  if (fromJson.length > 0) return clampUrls(fromJson);
  const single = typeof image_url === "string" ? image_url.trim() : "";
  return single ? [single] : [];
}

function parseJsonUrlArray(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((x): x is string => typeof x === "string" && x.trim() !== "")
      .map((x) => x.trim());
  }
  return [];
}

function clampUrls(urls: string[]): string[] {
  return urls.slice(0, MAX_PRODUCT_IMAGES);
}

/** Mensagem de erro ou null se válido. */
export function validateProductImageCount(urls: string[]): string | null {
  const n = urls.filter(Boolean).length;
  if (n < MIN_PRODUCT_IMAGES) {
    return `É obrigatório pelo menos ${MIN_PRODUCT_IMAGES} imagem.`;
  }
  if (n > MAX_PRODUCT_IMAGES) {
    return `No máximo ${MAX_PRODUCT_IMAGES} imagens por produto.`;
  }
  return null;
}

export function parseImageUrlsFromCsvCell(cell: string | undefined): string[] {
  if (!cell?.trim()) return [];
  return clampUrls(
    cell
      .split(/[|\n;]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isLikelyHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
