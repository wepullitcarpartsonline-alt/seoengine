'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { buildQueryString, type QueryParams } from '@/lib/url';

export function PriceFilter({ currentParams }: { currentParams: QueryParams }) {
  const router = useRouter();
  const [min, setMin] = useState(currentParams.minPrice ?? '');
  const [max, setMax] = useState(currentParams.maxPrice ?? '');

  const active = currentParams.minPrice || currentParams.maxPrice;

  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(
      `/${buildQueryString(currentParams, {
        minPrice: min.trim() || undefined,
        maxPrice: max.trim() || undefined,
        page: undefined,
      })}`,
    );
  };

  return (
    <div className="py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Price Range</h3>
        {active && (
          <a
            href={`/${buildQueryString(currentParams, {
              minPrice: undefined,
              maxPrice: undefined,
              page: undefined,
            })}`}
            className="text-xs text-blue-600 hover:underline"
          >
            Clear
          </a>
        )}
      </div>
      <form onSubmit={apply} className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="1"
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder="Min"
          aria-label="Minimum price"
          className="w-full min-w-0 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <span className="shrink-0 text-gray-400">–</span>
        <input
          type="number"
          min="0"
          step="1"
          value={max}
          onChange={(e) => setMax(e.target.value)}
          placeholder="Max"
          aria-label="Maximum price"
          className="w-full min-w-0 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-gray-800 px-3 py-1.5 text-sm font-semibold text-white hover:bg-black"
        >
          Go
        </button>
      </form>
    </div>
  );
}
