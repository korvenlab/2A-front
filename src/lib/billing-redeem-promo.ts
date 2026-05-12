const STORAGE_KEY = "2avendas.promoPending";

export function persistPendingPromoCode(code: string | undefined | null) {
  const c = code?.trim();
  if (!c || typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, c);
}

export function peekPendingPromoCode(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(STORAGE_KEY)?.trim() || null;
}

export function clearPendingPromoCode() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Lê `?two_avendas_promo=` ou valor guardado no sessionStorage (ex.: antes do cadastro). */
export function resolvePromoCodeFromSearch(search: {
  two_avendas_promo?: string;
}): string | null {
  const fromUrl = search.two_avendas_promo?.trim();
  if (fromUrl) return fromUrl;
  return peekPendingPromoCode();
}

export type PromoApplyResult =
  | { status: "no_promo" }
  | { status: "ok" }
  | { status: "config"; detail: "no_api" | "no_token" }
  | { status: "redeem_failed"; message: string };

/** Tenta resgatar código da URL ou do sessionStorage (fluxo login/cadastro/redirect e-mail). */
export async function tryApplyPendingPromo(
  api: string | undefined,
  accessToken: string | null | undefined,
  search: { two_avendas_promo?: string },
): Promise<PromoApplyResult> {
  const promo = resolvePromoCodeFromSearch(search)?.trim();
  if (!promo) return { status: "no_promo" };
  const base = api?.trim();
  if (!base) return { status: "config", detail: "no_api" };
  const tok = accessToken?.trim();
  if (!tok) return { status: "config", detail: "no_token" };
  try {
    await redeemTwoAvendasPromo(base, tok, promo);
    clearPendingPromoCode();
    return { status: "ok" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { status: "redeem_failed", message };
  }
}

export async function redeemTwoAvendasPromo(apiBase: string, accessToken: string, code: string): Promise<void> {
  const base = apiBase.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/billing/redeem-promo`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ code: code.trim() }),
  });
  const raw = await res.text();
  let body: { ok?: boolean; error?: string; code?: string } = {};
  try {
    body = raw ? (JSON.parse(raw) as typeof body) : {};
  } catch {
    /* ignore */
  }
  if (!res.ok || body?.ok === false) {
    const msg = typeof body.error === "string" && body.error.trim() ? body.error.trim() : `HTTP ${res.status}`;
    throw new Error(msg);
  }
}
