// Query-string helpers shared by server and client components.

export type QueryParams = Record<string, string | undefined>;

/**
 * Merge overrides into the current params and serialize.
 * Setting a key to `undefined` (or '') removes it.
 */
export function buildQueryString(current: QueryParams, overrides: QueryParams): string {
  const merged: QueryParams = { ...current, ...overrides };
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }

  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** buildQueryString prefixed with a pathname, ready for href / router.push. */
export function buildHref(pathname: string, current: QueryParams, overrides: QueryParams): string {
  return `${pathname}${buildQueryString(current, overrides)}`;
}
