import { buildHref, type QueryParams } from '@/lib/url';

export function Pagination({
  page,
  totalPages,
  currentParams,
}: {
  page: number;
  totalPages: number;
  currentParams: QueryParams;
}) {
  if (totalPages <= 1) return null;

  // Page window: 1 … (page-2 … page+2) … totalPages
  const pages = new Set<number>([1, totalPages]);
  for (let p = page - 2; p <= page + 2; p++) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  const items: (number | '…')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) items.push('…');
    items.push(p);
    prev = p;
  }

  const linkClass =
    'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50';

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1" aria-label="Pagination">
      {page > 1 && (
        <a href={buildHref('/', currentParams, { page: String(page - 1) })} className={linkClass}>
          ← Prev
        </a>
      )}

      {items.map((item, i) =>
        item === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 py-2 text-sm text-gray-400">
            …
          </span>
        ) : (
          <a
            key={item}
            href={buildHref('/', currentParams, {
              // Keep page 1 canonical: no ?page= param
              page: item === 1 ? undefined : String(item),
            })}
            aria-current={item === page ? 'page' : undefined}
            className={
              item === page
                ? 'rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-bold text-white'
                : linkClass
            }
          >
            {item}
          </a>
        ),
      )}

      {page < totalPages && (
        <a href={buildHref('/', currentParams, { page: String(page + 1) })} className={linkClass}>
          Next →
        </a>
      )}
    </nav>
  );
}
