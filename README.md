# Part SEO Engine

Unified, public-facing **eBay Motors–style** auto parts search engine + programmatic SEO
storefront built on top of your existing eBay-synced salvage yard inventory. Every outbound
purchase click routes to the yard's live eBay listing wrapped with your **eBay Partner
Network (EPN)** tracking parameters — no eBay API calls at click time, so affiliate
commissions are collected without violating eBay API terms.

## Stack

- **Frontend:** Next.js (App Router, TypeScript, Tailwind CSS v4), server-side rendered
- **Database:** PostgreSQL — `tsvector` full-text search, GIN index, normalized part-number
  matching via generated columns (no external search server)

## Requirements

- Node.js 18.18+ (or 20+)
- PostgreSQL 12+ (generated columns require ≥ 12)

## 1. Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable                  | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `DATABASE_URL`            | PostgreSQL connection string for this storefront's database             |
| `NEXT_PUBLIC_EPN_CAMP_ID` | Your EPN campaign ID — appended as `campid=` to every outbound eBay link |
| `NEXT_PUBLIC_SITE_URL`    | Public origin (sitemap, canonical tags, JSON-LD). No trailing slash.     |

## 2. Database setup

```powershell
createdb part_seo_engine
psql "postgresql://user:password@localhost:5432/part_seo_engine" -f schema.sql
```

`schema.sql` creates:

- `yards` — one row per OAuth-connected yard (`id`, `name`, `slug`, `city`, `state`,
  `ebay_seller_username`)
- `listings` — one row per synced eBay listing, with two **generated** columns maintained
  by Postgres itself:
  - `clean_part_number` — `oem_part_number` uppercased with spaces/dashes/punctuation stripped
  - `search_vector` — weighted `tsvector` (A: title/part/part-number, B: make/model)
- Indexes: GIN on `search_vector`; B-trees on `clean_part_number` (+ a `text_pattern_ops`
  copy so prefix `LIKE 'ABC%'` queries stay indexed), `(make, model, year)`, `yard_id`
- An `updated_at` trigger (drives sitemap ordering)

## 3. Mapping your existing synced eBay table into `listings`

Your sync only writes the raw fields — **never write `clean_part_number`, `search_vector`
or `updated_at`; they maintain themselves.**

Column mapping (rename the left side to whatever your current table/collection uses):

| Your synced eBay field             | `listings` column    | Notes                                              |
| ---------------------------------- | -------------------- | -------------------------------------------------- |
| eBay item id                       | `ebay_item_id`       | Unique — used for upserts                          |
| owning yard / seller               | `yard_id`            | FK into `yards` (join on `ebay_seller_username`)   |
| standardized title                 | `fixed_title`        | `[Year] [Make] [Model] [Part Name] [Part No] OEM`  |
| —                                  | `slug`               | Generate with the SQL below, or `slugifyPart()` in `lib/ebay-epn.ts` |
| year / make / model                | `year` / `make` / `model` | Parsed from the standardized title            |
| part name                          | `part_name`          |                                                    |
| OEM / manufacturer part number     | `oem_part_number`    | Raw, un-normalized                                 |
| price                              | `price`              | `NUMERIC(10,2)`                                    |
| condition (e.g. "Used")            | `condition`          | Free text                                          |
| eBay item URL                      | `ebay_url`           | The yard's live listing URL                        |
| image URLs                         | `images`             | JSONB array: `["https://i.ebayimg.com/...", ...]`  |
| eBay Item Specifics                | `item_specifics`     | JSONB object: `{"Brand": "Ford", ...}`             |
| eBay fitment/compatibility rows    | `compatibility`      | JSONB array of objects: `[{"year":2019,"make":"Ford","model":"F-150"}]` |
| sold flag                          | `status`             | `'ACTIVE'` or `'SOLD'` (never delete sold rows)    |

### Seed yards

```sql
INSERT INTO yards (name, slug, city, state, ebay_seller_username) VALUES
  ('Smith''s Auto Salvage', 'smiths-auto-salvage', 'Dallas', 'TX', 'smithsautosalvage')
ON CONFLICT (slug) DO NOTHING;
```

### One-time import (source already in Postgres)

```sql
INSERT INTO listings (
  ebay_item_id, yard_id, fixed_title, slug, year, make, model, part_name,
  oem_part_number, price, condition, ebay_url, images, item_specifics,
  compatibility, status
)
SELECT
  e.item_id,
  y.id,
  e.title,
  -- slug: "[slugified-fixed-title]-[ebay-item-id]" (matches slugifyPart in lib/ebay-epn.ts)
  concat(
    regexp_replace(
      regexp_replace(lower(e.title), '[^a-z0-9]+', '-', 'g'),
      '(^-+|-+$)', '', 'g'
    ),
    '-', e.item_id
  ),
  e.year, e.make, e.model, e.part_name,
  e.part_number,
  e.price,
  e.condition,
  e.item_url,
  COALESCE(e.images, '[]'::jsonb),
  COALESCE(e.specifics, '{}'::jsonb),
  COALESCE(e.fitment, '[]'::jsonb),
  CASE WHEN e.is_sold THEN 'SOLD' ELSE 'ACTIVE' END
FROM your_existing_ebay_table e
JOIN yards y ON y.ebay_seller_username = e.seller_username
ON CONFLICT (ebay_item_id) DO NOTHING;
```

> **Source is MongoDB?** (e.g. the existing FastAPI sync): `mongoexport --db <db>
> --collection <listings> --type=json --out listings.json`, load it with a small Node
> script using `pg`, and run the same `INSERT … ON CONFLICT` upsert per document.
> Long term, the cleanest option is to point your sync service's *write* path at this
> Postgres database and upsert on every sync run.

### Ongoing sync (upsert — titles/slugs never change, everything else can)

```sql
INSERT INTO listings (ebay_item_id, yard_id, fixed_title, slug, year, make, model,
                      part_name, oem_part_number, price, condition, ebay_url,
                      images, item_specifics, compatibility, status)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
ON CONFLICT (ebay_item_id) DO UPDATE SET
  price          = EXCLUDED.price,
  condition      = EXCLUDED.condition,
  status         = EXCLUDED.status,
  images         = EXCLUDED.images,
  item_specifics = EXCLUDED.item_specifics,
  compatibility  = EXCLUDED.compatibility,
  ebay_url       = EXCLUDED.ebay_url,
  updated_at     = now();
```

## 4. Run

```powershell
npm install
npm run dev        # http://localhost:3000
# production:
npm run build
npm start
```

## 5. How search ranking works

For a query `q`:

1. **Exact** match on `clean_part_number` (normalized: uppercase, no spaces/dashes)
2. **Prefix** match on `clean_part_number`
3. **Full-text relevance** — `ts_rank` over `search_vector`
   (`websearch_to_tsquery` handles quotes/`OR`/minus operators safely)

Ties break on `updated_at DESC`. The API (`GET /api/search`) and the homepage share the
same `searchListings()` implementation in `lib/search.ts`, and both return dynamic filter
facets (makes, models, years, connected yards) with live counts.

## Notes

- **Sold-item retention:** `/itm/[slug]` never 404s on `SOLD` rows. The page stays
  indexed, shows a "Sold Out at [Yard]" banner, and renders 4 similar ACTIVE parts.
- **Sitemap:** `/sitemap.xml` regenerates hourly, capped at 50,000 URLs (Google's per-file
  limit) ordered by `updated_at DESC`. Shard into a sitemap index if you outgrow it.
- **EPN links:** built by `buildEpnUrl()` in `lib/ebay-epn.ts` with `mkcid`, `mkrid`,
  `siteid`, `campid`, `customid` (yard slug for per-yard reporting), `toolid`, `mkevt`.
  All purchase buttons use `rel="nofollow sponsored noopener"` per Google's link policies.
