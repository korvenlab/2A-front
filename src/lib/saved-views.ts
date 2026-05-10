export type SavedView<T extends Record<string, unknown>> = {
  id: string;
  name: string;
  payload: T;
};

function storageKey(page: string, userId: string, orgId: string): string {
  return `2av_saved_views:${page}:${userId}:${orgId}`;
}

export function loadSavedViews<T extends Record<string, unknown>>(
  page: string,
  userId: string,
  orgId: string,
): SavedView<T>[] {
  try {
    const raw = localStorage.getItem(storageKey(page, userId, orgId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x) =>
        x &&
        typeof x === "object" &&
        typeof (x as SavedView<T>).id === "string" &&
        typeof (x as SavedView<T>).name === "string" &&
        typeof (x as SavedView<T>).payload === "object",
    ) as SavedView<T>[];
  } catch {
    return [];
  }
}

export function persistSavedViews<T extends Record<string, unknown>>(
  page: string,
  userId: string,
  orgId: string,
  views: SavedView<T>[],
): void {
  localStorage.setItem(storageKey(page, userId, orgId), JSON.stringify(views.slice(0, 12)));
}

export function saveView<T extends Record<string, unknown>>(
  page: string,
  userId: string,
  orgId: string,
  name: string,
  payload: T,
): SavedView<T>[] {
  const list = loadSavedViews<T>(page, userId, orgId);
  const id = crypto.randomUUID();
  const next = [{ id, name: name.trim() || "Sem nome", payload }, ...list].slice(0, 12);
  persistSavedViews(page, userId, orgId, next);
  return next;
}

export function deleteSavedView<T extends Record<string, unknown>>(
  page: string,
  userId: string,
  orgId: string,
  id: string,
): SavedView<T>[] {
  const list = loadSavedViews<T>(page, userId, orgId).filter((v) => v.id !== id);
  persistSavedViews(page, userId, orgId, list);
  return list;
}
