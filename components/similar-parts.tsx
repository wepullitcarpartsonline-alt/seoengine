import Image from 'next/image';
import { buildEpnUrl } from '@/lib/ebay-epn';
import { formatPrice } from '@/lib/format';
import type { SearchResultItem } from '@/lib/types';

/** Grid of similar ACTIVE parts — rendered on SOLD item pages for SEO retention. */
export function SimilarParts({ items }: { items: SearchResultItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-gray-900">
        Similar Active Parts From Connected Yards
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const image = item.images[0];
          const location = [item.yard.city, item.yard.state].filter(Boolean).join(', ');

          return (
            <article
              key={item.slug}
              className="flex flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md"
            >
              <a
                href={`/itm/${item.slug}`}
                className="relative block aspect-[4/3] overflow-hidden rounded-md bg-gray-100"
              >
                {image ? (
                  <Image
                    src={image}
                    alt={item.fixedTitle}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-gray-400">
                    No image
                  </span>
                )}
              </a>

              <a
                href={`/itm/${item.slug}`}
                className="mt-2 line-clamp-2 text-sm font-medium text-blue-700 hover:underline"
              >
                {item.fixedTitle}
              </a>

              <span className="mt-1 truncate text-xs text-gray-500">
                ✓ {item.yard.name}
                {location ? ` — ${location}` : ''}
              </span>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-lg font-bold text-gray-900">{formatPrice(item.price)}</span>
                <a
                  href={buildEpnUrl(item.ebayUrl, item.yard.slug)}
                  target="_blank"
                  rel="nofollow sponsored noopener"
                  className="shrink-0 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Buy on eBay
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
