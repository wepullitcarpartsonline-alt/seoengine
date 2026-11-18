'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { buildQueryString, type QueryParams } from '@/lib/url';

export function SearchBar({ currentParams }: { currentParams: QueryParams }) {
  const router = useRouter();
  const [q, setQ] = useState(currentParams.q ?? '');

  // Keep the input in sync when the URL changes (e.g. back button, facet click).
  useEffect(() => {
    setQ(currentParams.q ?? '');
  }, [currentParams.q]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = q.trim();
    router.push(`/${buildQueryString(currentParams, { q: value || undefined, page: undefined })}`);
  };

  return (
    <form onSubmit={onSubmit} className="flex w-full min-w-0" role="search">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by keyword or OEM part number…"
        aria-label="Search parts"
        className="w-full min-w-0 rounded-l-full border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-r-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:px-7"
      >
        Search
      </button>
    </form>
  );
}
