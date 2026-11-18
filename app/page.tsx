import type { Metadata } from 'next';
import { searchListings } from '@/lib/search';
import type { SearchParams } from '@/lib/types';
import type { QueryParams } from '@/lib/url';
import { SiteHeader } from '@/components/site-header';
import { FitmentSelector } from '@/components/fitment-selector';
import { FiltersSidebar } from '@/components/filters-sidebar';
import { ListingCard } from '@/components/listing-card';
import { Pagination } from '@/components/pagination';

// Inventory changes constantly — always render fresh from Postgres.
export const dynamic = 'force-dynamic';

type RawSearchParams = Record<string, string | string[] | undefined>;

interface HomePageProps {
  searchParams: Promise<RawSearchParams>;
}

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const raw = await searchParams;
  const q = first(raw.q)?.trim();
  if (!q) return {}; // fall back to the layout default

  return {
    title: `${q} — Used OEM Parts Search`,
    description: `Find used OEM ${q} from verified salvage yards. Compare live prices across all connected yards and Buy It Now on eBay.`,
  };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const raw = await searchParams;

  const currentParams: QueryParams = {
    q: first(raw.q),
    year: first(raw.year),
    make: first(raw.make),
    model: first(raw.model),
    yard: first(raw.yard),
    minPrice: first(raw.minPrice),
    maxPrice: first(raw.maxPrice),
    page: first(raw.page),
  };

  const params: SearchParams = { ...currentParams };
  const data = await searchListings(params);

  return (
    <div className="min-h-screen">
      <SiteHeader currentParams={currentParams} />
      <FitmentSelector facets={data.facets} currentParams={currentParams} />

      <main className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <FiltersSidebar facets={data.facets} currentParams={currentParams} />

        <section className="min-w-0 flex-1">
          <div className="mb-4">
            <h1 className="text-lg font-bold text-gray-900">
              {data.total.toLocaleString('en-US')} Result{data.total === 1 ? '' : 's'}
              {currentParams.q ? (
                <>
                  {' '}
                  for <span className="text-blue-700">&ldquo;{currentParams.q}&rdquo;</span>
                </>
              ) : (
                ' — Used OEM Auto Parts'
              )}
            </h1>
          </div>

          {data.results.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-gray-900">No parts found</p>
              <p className="mt-1 text-sm text-gray-500">
                Try a different keyword or OEM part number, or remove some filters.
              </p>
              <a
                href="/"
                className="mt-4 inline-block rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Clear search &amp; filters
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {data.results.map((item) => (
                <ListingCard key={item.slug} item={item} />
              ))}
            </div>
          )}

          <Pagination page={data.page} totalPages={data.totalPages} currentParams={currentParams} />
        </section>
      </main>
    </div>
  );
}
