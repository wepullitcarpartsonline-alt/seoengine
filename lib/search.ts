import { query } from './db';
import { normalizePartNumber, parseImages } from './format';
import type {
  FacetValue,
  SearchFacets,
  SearchParams,
  SearchResponse,
  SearchResultItem,
  YardFacetValue,
} from './types';

const PAGE_SIZE = 24;
const MIN_PART_NUMBER_LENGTH = 3;
const MAX_FACET_VALUES = 100;

// ---------------------------------------------------------------------------
// Row shapes (snake_case, straight from Postgres)
// ---------------------------------------------------------------------------

export type ListingRowBase = {
  id: number;
  ebay_item_id: string;
  slug: string;
  fixed_title: string;
  year: number | null;
  make: string | null;
  model: string | null;
  part_name: string | null;
  oem_part_number: string | null;
  clean_part_number: string | null;
  price: string | null; // pg returns NUMERIC as string
  condition: string | null;
  ebay_url: string;
  images: unknown;
  status: 'ACTIVE' | 'SOLD';
  updated_at: string;
  yard_name: string;
  yard_slug: string;
  yard_city: string | null;
  yard_state: string | null;
};

export type RawSearchRow = ListingRowBase & { total_count: number };

/** Shared SELECT … JOIN for listing-shaped queries. Append WHERE/ORDER BY/LIMIT. */
export const LISTING_SELECT = `
  SELECT l.id, l.ebay_item_id, l.slug, l.fixed_title, l.year, l.make, l.model,
         l.part_name, l.oem_part_number, l.clean_part_number, l.price, l.condition,
         l.ebay_url, l.images, l.status, l.updated_at,
         y.name AS yard_name, y.slug AS yard_slug, y.city AS yard_city, y.state AS yard_state
    FROM listings l
    JOIN yards y ON y.id = l.yard_id
`;

export function mapSearchRow(row: ListingRowBase): SearchResultItem {
  return {
    id: row.id,
    ebayItemId: row.ebay_item_id,
    slug: row.slug,
    fixedTitle: row.fixed_title,
    year: row.year,
    make: row.make,
    model: row.model,
    partName: row.part_name,
    oemPartNumber: row.oem_part_number,
    price: row.price === null ? null : Number(row.price),
    condition: row.condition,
    ebayUrl: row.ebay_url,
    images: parseImages(row.images),
    status: row.status,
    updatedAt: row.updated_at,
    yard: {
      name: row.yard_name,
      slug: row.yard_slug,
      city: row.yard_city,
      state: row.yard_state,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (m) => `\\${m}`);

function parseIntParam(value?: string): number | null {
  if (!value) return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function parseFloatParam(value?: string): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Multi-yard unified search
// ---------------------------------------------------------------------------

type FilterField = 'q' | 'year' | 'make' | 'model' | 'yard' | 'price';

export async function searchListings(params: SearchParams): Promise<SearchResponse> {
  const q = (params.q ?? '').trim();
  const year = parseIntParam(params.year);
  const make = (params.make ?? '').trim();
  const model = (params.model ?? '').trim();
  const yard = (params.yard ?? '').trim();
  const minPrice = parseFloatParam(params.minPrice);
  const maxPrice = parseFloatParam(params.maxPrice);
  const page = Math.max(1, parseIntParam(params.page) ?? 1);

  /**
   * Builds the `q` (keyword / part number) clause into ONE query's own param
   * array. Returns the WHERE condition plus the ranking ORDER BY expression.
   *
   * Ranking priority:
   *   1. exact match on clean_part_number
   *   2. prefix match on clean_part_number
   *   3. full-text relevance (ts_rank) on search_vector
   */
  const buildQ = (values: unknown[]): { condition: string; rank: string | null } => {
    if (!q) return { condition: '', rank: null };

    const cleanQ = normalizePartNumber(q);

    if (cleanQ.length >= MIN_PART_NUMBER_LENGTH) {
      values.push(cleanQ);
      const exactP = `$${values.length}`;
      values.push(`${cleanQ}%`);
      const prefixP = `$${values.length}`;
      values.push(q);
      const tsqP = `websearch_to_tsquery('english', $${values.length})`;

      return {
        condition:
          `(l.clean_part_number = ${exactP} ` +
          `OR l.clean_part_number LIKE ${prefixP} ` +
          `OR l.search_vector @@ ${tsqP})`,
        rank:
          `CASE
             WHEN l.clean_part_number = ${exactP} THEN 0
             WHEN l.clean_part_number LIKE ${prefixP} THEN 1
             ELSE 2
           END ASC,
           ts_rank(l.search_vector, ${tsqP}) DESC`,
      };
    }

    values.push(q);
    const tsqP = `websearch_to_tsquery('english', $${values.length})`;
    return {
      condition: `l.search_vector @@ ${tsqP}`,
      rank: `ts_rank(l.search_vector, ${tsqP}) DESC`,
    };
  };

  /**
   * Builds the full WHERE clause into one query's own param array.
   * `exclude` lets facet queries drop their own dimension (eBay-style counts).
   */
  const buildWhere = (values: unknown[], qCondition: string, exclude?: FilterField): string => {
    const conditions: string[] = [`l.status = 'ACTIVE'`];

    if (qCondition && exclude !== 'q') conditions.push(qCondition);

    if (year !== null && exclude !== 'year') {
      values.push(year);
      conditions.push(`l.year = $${values.length}`);
    }
    if (make && exclude !== 'make') {
      values.push(escapeLike(make));
      conditions.push(`l.make ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (model && exclude !== 'model') {
      values.push(escapeLike(model));
      conditions.push(`l.model ILIKE $${values.length} ESCAPE '\\'`);
    }
    if (yard && exclude !== 'yard') {
      values.push(yard);
      conditions.push(`y.slug = $${values.length}`);
    }
    if (minPrice !== null && exclude !== 'price') {
      values.push(minPrice);
      conditions.push(`l.price >= $${values.length}`);
    }
    if (maxPrice !== null && exclude !== 'price') {
      values.push(maxPrice);
      conditions.push(`l.price <= $${values.length}`);
    }

    return conditions.join(' AND ');
  };

  // ---- Main results query -------------------------------------------------
  const mainValues: unknown[] = [];
  const { condition: mainQ, rank: mainRank } = buildQ(mainValues);
  const mainWhere = buildWhere(mainValues, mainQ);
  mainValues.push(PAGE_SIZE);
  const limitP = `$${mainValues.length}`;
  mainValues.push((page - 1) * PAGE_SIZE);
  const offsetP = `$${mainValues.length}`;

  const rowsPromise = query<RawSearchRow>(
    `${LISTING_SELECT.replace('SELECT', 'SELECT COUNT(*) OVER ()::int AS total_count,')}
     WHERE ${mainWhere}
     ORDER BY ${mainRank ? `${mainRank}, l.updated_at DESC` : 'l.updated_at DESC'}
     LIMIT ${limitP} OFFSET ${offsetP}`,
    mainValues,
  );

  // ---- Dynamic filter facets (each drops its own dimension) ---------------
  const facetValuesQuery = (
    column: 'make' | 'model' | 'year',
    orderBy: string,
  ): Promise<FacetValue[]> => {
    const facetValues: unknown[] = [];
    const { condition } = buildQ(facetValues);
    const where = buildWhere(facetValues, condition, column);
    return query<FacetValue>(
      `SELECT l.${column}::text AS value, COUNT(*)::int AS count
         FROM listings l
         JOIN yards y ON y.id = l.yard_id
        WHERE ${where} AND l.${column} IS NOT NULL
        GROUP BY l.${column}
        ORDER BY ${orderBy}
        LIMIT ${MAX_FACET_VALUES}`,
      facetValues,
    );
  };

  const yardFacetQuery = (): Promise<YardFacetValue[]> => {
    const facetValues: unknown[] = [];
    const { condition } = buildQ(facetValues);
    const where = buildWhere(facetValues, condition, 'yard');
    return query<YardFacetValue>(
      `SELECT y.slug AS value, y.name AS label, y.city, y.state, COUNT(*)::int AS count
         FROM listings l
         JOIN yards y ON y.id = l.yard_id
        WHERE ${where}
        GROUP BY y.slug, y.name, y.city, y.state
        ORDER BY count DESC, y.name ASC
        LIMIT ${MAX_FACET_VALUES}`,
      facetValues,
    );
  };

  const [rows, makes, models, years, yards] = await Promise.all([
    rowsPromise,
    facetValuesQuery('make', 'count DESC, l.make ASC'),
    facetValuesQuery('model', 'count DESC, l.model ASC'),
    facetValuesQuery('year', 'l.year DESC'),
    yardFacetQuery(),
  ]);

  const total = rows[0]?.total_count ?? 0;

  return {
    results: rows.map(mapSearchRow),
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
    facets: { makes, models, years, yards } satisfies SearchFacets,
  };
}
