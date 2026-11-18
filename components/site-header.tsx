import { SearchBar } from './search-bar';
import type { QueryParams } from '@/lib/url';

export function SiteHeader({ currentParams }: { currentParams: QueryParams }) {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:gap-6">
        <a href="/" className="shrink-0">
          <span className="text-xl font-extrabold tracking-tight text-blue-700">
            Part<span className="text-gray-900">SEO</span>Engine
          </span>
          <span className="hidden text-[11px] text-gray-500 sm:block">
            Used OEM parts from verified yards
          </span>
        </a>
        <div className="min-w-0 flex-1">
          <SearchBar currentParams={currentParams} />
        </div>
      </div>
    </header>
  );
}
