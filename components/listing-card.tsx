import Image from 'next/image';
import { buildEpnUrl } from '@/lib/ebay-epn';
import { formatPrice } from '@/lib/format';
import type { SearchResultItem } from '@/lib/types';

/** Horizontal eBay-style list-view result card. */
export function ListingCard({ item }: { item: SearchResultItem }) {
  const image = item.images[0];
  const isActive = item.status === 'ACTIVE';
  const epnUrl = isActive ? buildEpnUrl(item.ebayUrl, item.yard.slug) : null;
  const location = [item.yard.city, item.yard.state].filter(Boolean).join(', ');

  return (
    <article className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <a
        href={`/itm/${item.slug}`}
        className="relative block h-32 w-32 shrink-0 overflow-hidden rounded-md bg-gray-100 sm:w-40"
      >
        {image ? (
          <Image
            src={image}
            alt={item.fixedTitle}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 128px, 160px"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-xs text-gray-400">
            No image
          </span>
        )}
      </a>

      <div className="flex min-w-0 flex-1 flex-col">
        <a
          href={`/itm/${item.slug}`}
          className="line-clamp-2 text-base font-medium text-blue-700 hover:underline"
        >
          {item.fixedTitle}
        </a>

        {item.oemPartNumber && (
          <span className="mt-1 inline-flex w-fit items-center rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700">
            OEM # {item.oemPartNumber}
          </span>
        )}

        <span className="mt-1 text-sm text-gray-600">{item.condition ?? 'Used'}</span>

        <span className="mt-1 truncate text-sm text-gray-600">
          <span className="font-medium text-green-700">✓ Verified Yard</span>
          {' · '}
          {item.yard.name}
          {location ? ` — ${location}` : ''}
        </span>
      </div>

      <div className="flex w-28 shrink-0 flex-col items-end justify-between gap-3 text-right sm:w-48">
        <span className="text-lg font-bold text-gray-900 sm:text-xl">
          {formatPrice(item.price)}
        </span>
        {epnUrl ? (
          <a
            href={epnUrl}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="rounded-full bg-blue-600 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-blue-700 sm:px-5 sm:text-sm"
          >
            Buy It Now on eBay
          </a>
        ) : (
          <span className="rounded-full bg-gray-300 px-3 py-2 text-center text-xs font-semibold text-white sm:px-5 sm:text-sm">
            Sold
          </span>
        )}
      </div>
    </article>
  );
}
