import { query } from './db';
import {
  parseCompatibility,
  parseItemSpecifics,
  type CompatibilityEntry,
} from './format';
import { mapSearchRow, type ListingRowBase } from './search';
import type { SearchResultItem } from './types';

export type ListingDetail = SearchResultItem & {
  cleanPartNumber: string | null;
  itemSpecifics: [string, string][];
  compatibility: CompatibilityEntry[];
  yard: {
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
    ebaySellerUsername: string | null;
  };
};

type RawDetailRow = ListingRowBase & {
  item_specifics: unknown;
  compatibility: unknown;
  yard_ebay_seller_username: string | null;
};

/** Fetch one listing (any status — SOLD pages stay live for SEO) by its unique slug. */
export async function getListingBySlug(slug: string): Promise<ListingDetail | null> {
  const rows = await query<RawDetailRow>(
    `SELECT l.id, l.ebay_item_id, l.slug, l.fixed_title, l.year, l.make, l.model,
            l.part_name, l.oem_part_number, l.clean_part_number, l.price, l.condition,
            l.ebay_url, l.images, l.status, l.updated_at,
            l.item_specifics, l.compatibility,
            y.name AS yard_name, y.slug AS yard_slug, y.city AS yard_city, y.state AS yard_state,
            y.ebay_seller_username AS yard_ebay_seller_username
       FROM listings l
       JOIN yards y ON y.id = l.yard_id
      WHERE l.slug = $1
      LIMIT 1`,
    [slug],
  );

  const row = rows[0];
  if (!row) return null;

  const base = mapSearchRow(row);
  return {
    ...base,
    cleanPartNumber: row.clean_part_number,
    itemSpecifics: parseItemSpecifics(row.item_specifics),
    compatibility: parseCompatibility(row.compatibility),
    yard: {
      ...base.yard,
      ebaySellerUsername: row.yard_ebay_seller_username,
    },
  };
}

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (m) => `\\${m}`);

/**
 * Similar ACTIVE parts from connected yards — shown on SOLD item pages so the
 * URL keeps its Google ranking and keeps converting.
 * Prefers the same part name, then same make/model, newest first.
 */
export async function getSimilarListings(
  listing: ListingDetail,
  limit = 4,
): Promise<SearchResultItem[]> {
  const partName = listing.partName ? escapeLike(listing.partName) : null;
  const make = listing.make ? escapeLike(listing.make) : null;
  const model = listing.model ? escapeLike(listing.model) : null;

  const rows = await query<ListingRowBase>(
    `SELECT l.id, l.ebay_item_id, l.slug, l.fixed_title, l.year, l.make, l.model,
            l.part_name, l.oem_part_number, l.clean_part_number, l.price, l.condition,
            l.ebay_url, l.images, l.status, l.updated_at,
            y.name AS yard_name, y.slug AS yard_slug, y.city AS yard_city, y.state AS yard_state
       FROM listings l
       JOIN yards y ON y.id = l.yard_id
      WHERE l.status = 'ACTIVE'
        AND l.id <> $1
        AND (
             ($2::text IS NOT NULL AND l.part_name ILIKE $2 ESCAPE '\\')
          OR ($3::text IS NOT NULL AND l.make ILIKE $3 ESCAPE '\\'
              AND ($4::text IS NULL OR l.model ILIKE $4 ESCAPE '\\'))
        )
      ORDER BY
        CASE WHEN $2::text IS NOT NULL AND l.part_name ILIKE $2 ESCAPE '\\' THEN 0 ELSE 1 END ASC,
        l.updated_at DESC
      LIMIT $5`,
    [listing.id, partName, make, model, limit],
  );

  return rows.map(mapSearchRow);
}
