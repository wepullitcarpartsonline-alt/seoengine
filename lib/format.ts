// Small shared formatting / parsing helpers.

/** "$1,234.56" — pg returns NUMERIC as string, so accept both. */
export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined || price === '') return '—';
  const n = typeof price === 'string' ? Number(price) : price;
  if (Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(n);
}

/** "1234 567-890" -> "1234567890" — must mirror the DB's clean_part_number. */
export function normalizePartNumber(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/** images JSONB may be ["url", ...] or [{url: "..."}, ...] — normalize to string[]. */
export function parseImages(json: unknown): string[] {
  if (!Array.isArray(json)) return [];
  return json
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const rec = item as Record<string, unknown>;
        const url = rec.url ?? rec.imageUrl ?? rec.src;
        return typeof url === 'string' ? url : '';
      }
      return '';
    })
    .filter((url) => url.length > 0);
}

/** item_specifics JSONB object -> ordered [key, value] entries with non-empty values. */
export function parseItemSpecifics(json: unknown): [string, string][] {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return [];
  return Object.entries(json as Record<string, unknown>)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => [key, String(value)]);
}

export type CompatibilityEntry = Record<string, unknown>;

/** compatibility JSONB array -> entries with lowercased keys ({year, make, model, trim, engine, ...}). */
export function parseCompatibility(json: unknown): CompatibilityEntry[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object' && !Array.isArray(e))
    .map((entry) => {
      const normalized: CompatibilityEntry = {};
      for (const [key, value] of Object.entries(entry)) {
        normalized[key.toLowerCase()] = value;
      }
      return normalized;
    });
}

/** Map free-text eBay conditions to schema.org itemCondition values. */
export function conditionToSchemaOrg(condition: string | null | undefined): string {
  const c = (condition ?? '').toLowerCase();
  if (c.includes('new')) return 'https://schema.org/NewCondition';
  if (c.includes('refurb') || c.includes('remanufact')) return 'https://schema.org/RefurbishedCondition';
  if (c.includes('damaged') || c.includes('broken') || c.includes('for parts')) {
    return 'https://schema.org/DamagedCondition';
  }
  return 'https://schema.org/UsedCondition';
}
