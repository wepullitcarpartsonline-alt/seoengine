import type { MetadataRoute } from 'next';
import { query } from '@/lib/db';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

// Google allows 50,000 URLs per sitemap. Shard into sitemap indexes beyond that.
const MAX_URLS = 50_000;

// Regenerate at most once per hour.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const homepage: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  try {
    const rows = await query<{ slug: string; updated_at: string }>(
      `SELECT slug, updated_at
         FROM listings
        ORDER BY updated_at DESC
        LIMIT $1`,
      [MAX_URLS],
    );

    const listingEntries: MetadataRoute.Sitemap = rows.map((row) => ({
      url: `${SITE_URL}/itm/${row.slug}`,
      lastModified: new Date(row.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...homepage, ...listingEntries];
  } catch (error) {
    // Never break the sitemap route — fall back to the homepage entry only.
    console.error('Sitemap generation error:', error);
    return homepage;
  }
}
