import { buildHref, type QueryParams } from '@/lib/url';
import type { SearchFacets } from '@/lib/types';
import { PriceFilter } from './price-filter';

const MAX_FACETS_SHOWN = 12;

export function FiltersSidebar({
  facets,
  currentParams,
}: {
  facets: SearchFacets;
  currentParams: QueryParams;
}) {
  return (
    <>
      {/* Mobile: zero-JS collapsible filter panel */}
      <details className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm lg:hidden">
        <summary className="cursor-pointer text-sm font-bold text-gray-900">
          Filter Results
        </summary>
        <FiltersContent facets={facets} currentParams={currentParams} />
      </details>

      {/* Desktop: left sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
          <FiltersContent facets={facets} currentParams={currentParams} />
        </div>
      </aside>
    </>
  );
}

function FiltersContent({
  facets,
  currentParams,
}: {
  facets: SearchFacets;
  currentParams: QueryParams;
}) {
  const hasFilters = ['q', 'year', 'make', 'model', 'yard', 'minPrice', 'maxPrice'].some(
    (key) => currentParams[key],
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-gray-200 py-3">
        <h2 className="text-sm font-bold text-gray-900">Filters</h2>
        {hasFilters && (
          <a href="/" className="text-xs text-blue-600 hover:underline">
            Clear all
          </a>
        )}
      </div>

      <FacetGroup
        title="Connected Yard"
        paramKey="yard"
        values={facets.yards.map((yard) => ({
          value: yard.value,
          count: yard.count,
          label: yard.city
            ? `${yard.label} — ${yard.city}, ${yard.state ?? ''}`
            : yard.label,
        }))}
        currentParams={currentParams}
      />
      <FacetGroup
        title="Make"
        paramKey="make"
        values={facets.makes}
        currentParams={currentParams}
        resetParams={['model']}
      />
      <FacetGroup
        title="Model"
        paramKey="model"
        values={facets.models}
        currentParams={currentParams}
      />
      <FacetGroup
        title="Year"
        paramKey="year"
        values={facets.years}
        currentParams={currentParams}
      />
      <PriceFilter currentParams={currentParams} />
    </>
  );
}

type FacetItem = { value: string; count: number; label?: string };

function FacetGroup({
  title,
  paramKey,
  values,
  currentParams,
  resetParams = [],
}: {
  title: string;
  paramKey: string;
  values: FacetItem[];
  currentParams: QueryParams;
  resetParams?: string[];
}) {
  if (values.length === 0) return null;

  const active = currentParams[paramKey];
  const shown = values.slice(0, MAX_FACETS_SHOWN);

  return (
    <div className="border-b border-gray-200 py-3">
      <h3 className="mb-2 text-sm font-semibold text-gray-900">{title}</h3>
      <ul className="space-y-1.5">
        {shown.map((v) => {
          const isActive = active === v.value;
          const overrides: QueryParams = isActive
            ? { [paramKey]: undefined, page: undefined }
            : {
                [paramKey]: v.value,
                page: undefined,
                ...Object.fromEntries(resetParams.map((key) => [key, undefined])),
              };

          return (
            <li key={v.value}>
              <a
                href={buildHref('/', currentParams, overrides)}
                className={`flex items-center justify-between gap-2 text-sm ${
                  isActive
                    ? 'font-bold text-blue-700'
                    : 'text-gray-600 hover:text-blue-600'
                }`}
              >
                <span className="truncate">{v.label ?? v.value}</span>
                <span className="shrink-0 text-xs text-gray-400">({v.count})</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
