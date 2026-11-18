import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getListingBySlug, getSimilarListings } from '@/lib/listings';
import { buildEpnUrl } from '@/lib/ebay-epn';
import { conditionToSchemaOrg, formatPrice } from '@/lib/format';
import { SiteHeader } from '@/components/site-header';
import { Gallery } from '@/components/gallery';
import { SimilarParts } from '@/components/similar-parts';

export const dynamic = 'force-dynamic';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

const COMPAT_STANDARD_COLUMNS = ['year', 'make', 'model', 'trim', 'engine'];

interface ItemPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) return { title: 'Part Not Found' };

  return {
    // Exact fixed_title as the page <title> (absolute = no template suffix).
    title: { absolute: listing.fixedTitle },
    description: buildDescription(listing),
    alternates: { canonical: `${SITE_URL}/itm/${listing.slug}` },
    openGraph: {
      title: listing.fixedTitle,
      description: buildDescription(listing),
      url: `${SITE_URL}/itm/${listing.slug}`,
      type: 'website',
      images: listing.images.slice(0, 4).map((url) => ({ url })),
    },
  };
}

function buildDescription(listing: {
  fixedTitle: string;
  price: number | null;
  yard: { name: string; city: string | null; state: string | null };
}): string {
  const location = [listing.yard.city, listing.yard.state].filter(Boolean).join(', ');
  return [
    `${listing.fixedTitle} for sale`,
    listing.price !== null ? ` at ${formatPrice(listing.price)}` : '',
    ` from ${listing.yard.name}`,
    location ? ` in ${location}` : '',
    '. Verified salvage yard listing — Buy It Now on eBay.',
  ].join('');
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing) notFound();

  const isSold = listing.status === 'SOLD';
  // Sold-item retention: keep the page live and cross-sell similar ACTIVE parts.
  const similar = isSold ? await getSimilarListings(listing, 4) : [];

  const pageUrl = `${SITE_URL}/itm/${listing.slug}`;
  const epnUrl = buildEpnUrl(listing.ebayUrl, listing.yard.slug);
  const location = [listing.yard.city, listing.yard.state].filter(Boolean).join(', ');
  const description = buildDescription(listing);

  // Product + Offer structured data (Google rich-result eligible).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.fixedTitle,
    url: pageUrl,
    image: listing.images,
    description,
    mpn: listing.oemPartNumber ?? undefined,
    brand: listing.make ? { '@type': 'Brand', name: listing.make } : undefined,
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'USD',
      price: listing.price ?? undefined,
      availability: isSold ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      itemCondition: conditionToSchemaOrg(listing.condition),
      seller: { '@type': 'Organization', name: listing.yard.name },
    },
  };

  // Item specifics: fitment-derived rows first, then synced eBay specifics
  // (skipping keys already shown, case-insensitive).
  const baseSpecifics: [string, string][] = [];
  if (listing.year) baseSpecifics.push(['Year', String(listing.year)]);
  if (listing.make) baseSpecifics.push(['Make', listing.make]);
  if (listing.model) baseSpecifics.push(['Model', listing.model]);
  if (listing.partName) baseSpecifics.push(['Part', listing.partName]);
  if (listing.oemPartNumber) baseSpecifics.push(['OEM Part Number', listing.oemPartNumber]);
  if (listing.condition) baseSpecifics.push(['Condition', listing.condition]);

  const seenKeys = new Set(baseSpecifics.map(([key]) => key.toLowerCase()));
  const specifics: [string, string][] = [
    ...baseSpecifics,
    ...listing.itemSpecifics.filter(([key]) => !seenKeys.has(key.toLowerCase())),
  ];

  // Compatibility table: standard columns (plus any extras) that have at least
  // one non-empty value across entries.
  const extraColumns = [
    ...new Set(listing.compatibility.flatMap((entry) => Object.keys(entry))),
  ].filter((key) => !COMPAT_STANDARD_COLUMNS.includes(key));
  const compatColumns = [...COMPAT_STANDARD_COLUMNS, ...extraColumns].filter((col) =>
    listing.compatibility.some(
      (entry) => entry[col] !== null && entry[col] !== undefined && String(entry[col]).trim() !== '',
    ),
  );

  return (
    <div className="min-h-screen">
      <SiteHeader currentParams={{}} />

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Google: Product + Offer JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />

        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-gray-500" aria-label="Breadcrumb">
          <a href="/" className="hover:text-blue-600 hover:underline">
            Home
          </a>
          {listing.make && (
            <>
              {' / '}
              <a
                href={`/?make=${encodeURIComponent(listing.make)}`}
                className="hover:text-blue-600 hover:underline"
              >
                {listing.make}
              </a>
            </>
          )}
          {listing.model && (
            <>
              {' / '}
              <a
                href={`/?make=${encodeURIComponent(listing.make ?? '')}&model=${encodeURIComponent(
                  listing.model,
                )}`}
                className="hover:text-blue-600 hover:underline"
              >
                {listing.model}
              </a>
            </>
          )}
          {' / '}
          <span className="text-gray-700">{listing.partName ?? 'Part'}</span>
        </nav>

        {/* Sold-item retention banner */}
        {isSold && (
          <div
            className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900"
            role="alert"
          >
            <p className="font-bold">Sold Out at {listing.yard.name}</p>
            <p className="mt-0.5 text-sm">
              This part has been sold — but similar active parts from other verified yards are
              listed below.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Photo gallery (left) */}
          <Gallery images={listing.images} title={listing.fixedTitle} />

          {/* Buy Box (right) */}
          <div className="self-start rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold leading-snug text-gray-900">{listing.fixedTitle}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {listing.oemPartNumber && (
                <span className="inline-flex items-center rounded bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-700">
                  OEM # {listing.oemPartNumber}
                </span>
              )}
              {listing.condition && (
                <span className="inline-flex items-center rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {listing.condition}
                </span>
              )}
            </div>

            <div className="mt-5 border-t border-gray-100 pt-5">
              <span className="text-3xl font-extrabold text-gray-900">
                {formatPrice(listing.price)}
              </span>
            </div>

            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="flex items-center gap-1.5 text-sm font-bold text-green-800">
                <span aria-hidden="true">✓</span> Verified Yard Source
              </p>
              <p className="mt-1 text-sm text-green-900">
                {listing.yard.name}
                {location ? ` — ${location}` : ''}
              </p>
              {listing.yard.ebaySellerUsername && (
                <p className="mt-0.5 text-xs text-green-700">
                  eBay seller: {listing.yard.ebaySellerUsername}
                </p>
              )}
            </div>

            {isSold ? (
              <button
                type="button"
                disabled
                className="mt-6 w-full cursor-not-allowed rounded-full bg-gray-300 px-6 py-3.5 text-base font-bold text-white"
              >
                Sold Out
              </button>
            ) : (
              <a
                href={epnUrl}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="mt-6 block w-full rounded-full bg-blue-600 px-6 py-3.5 text-center text-base font-bold text-white hover:bg-blue-700"
              >
                Buy It Now on eBay
              </a>
            )}
            <p className="mt-3 text-center text-xs text-gray-400">
              You will be redirected to the seller&apos;s live eBay listing to complete your
              purchase.
            </p>
          </div>
        </div>

        {/* Item Specifics + Vehicle Compatibility */}
        <section className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Item Specifics</h2>
            {specifics.length > 0 ? (
              <dl className="mt-4 divide-y divide-gray-100">
                {specifics.map(([key, value]) => (
                  <div key={key} className="grid grid-cols-2 gap-4 py-2.5">
                    <dt className="text-sm font-medium text-gray-500">{key}</dt>
                    <dd className="text-sm text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-gray-500">No additional item specifics provided.</p>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Vehicle Compatibility</h2>
            {compatColumns.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-max border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {compatColumns.map((col) => (
                        <th key={col} className="px-3 py-2 font-semibold text-gray-600">
                          {col.charAt(0).toUpperCase() + col.slice(1)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {listing.compatibility.map((entry, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        {compatColumns.map((col) => (
                          <td key={col} className="px-3 py-2 text-gray-900">
                            {entry[col] !== null && entry[col] !== undefined
                              ? String(entry[col])
                              : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                Compatibility data not available — please confirm fitment on the eBay listing
                before purchasing.
              </p>
            )}
          </div>
        </section>

        {/* Sold-item retention: similar ACTIVE parts from connected yards */}
        <SimilarParts items={similar} />
      </main>
    </div>
  );
}
