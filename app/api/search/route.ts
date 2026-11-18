import { NextResponse, type NextRequest } from 'next/server';
import { searchListings } from '@/lib/search';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search
 *
 * Multi-yard unified search across all OAuth-connected yards (ACTIVE listings).
 *
 * Query params:
 *   q        keyword or OEM part number
 *   year     fitment year           (e.g. 2019)
 *   make     fitment make           (e.g. Ford)
 *   model    fitment model          (e.g. F-150)
 *   yard     yard slug              (e.g. smiths-auto-salvage)
 *   minPrice minimum price in USD   (e.g. 50)
 *   maxPrice maximum price in USD   (e.g. 500)
 *   page     1-based page number
 *
 * Ranking: exact clean_part_number > prefix clean_part_number > ts_rank(search_vector).
 * Also returns dynamic facets (makes, models, years, yards) with counts.
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const data = await searchListings({
      q: sp.get('q') ?? undefined,
      year: sp.get('year') ?? undefined,
      make: sp.get('make') ?? undefined,
      model: sp.get('model') ?? undefined,
      yard: sp.get('yard') ?? undefined,
      minPrice: sp.get('minPrice') ?? undefined,
      maxPrice: sp.get('maxPrice') ?? undefined,
      page: sp.get('page') ?? undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
