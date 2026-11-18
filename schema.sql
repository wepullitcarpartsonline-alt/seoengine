-- ============================================================================
-- Part SEO Engine — PostgreSQL schema
-- Unified, public-facing auto parts search across all eBay-OAuth-connected
-- salvage yards. Full-text search via tsvector + GIN, normalized part-number
-- matching via a generated clean_part_number column.
--
-- Apply with:  psql "$DATABASE_URL" -f schema.sql
-- Safe to re-run (idempotent).
-- ============================================================================

-- Status enum (no CREATE TYPE IF NOT EXISTS in Postgres, so guard it)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'listing_status') THEN
    CREATE TYPE listing_status AS ENUM ('ACTIVE', 'SOLD');
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- yards — one row per OAuth-connected salvage yard / eBay seller
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS yards (
  id                  BIGSERIAL PRIMARY KEY,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL,
  city                TEXT,
  state               TEXT,
  ebay_seller_username TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS yards_slug_key ON yards (slug);

-- ----------------------------------------------------------------------------
-- listings — one row per synced live eBay listing (across ALL yards)
--
-- clean_part_number and search_vector are GENERATED columns: your sync only
-- writes the raw fields, Postgres maintains the search indexes for you.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS listings (
  id               BIGSERIAL PRIMARY KEY,
  ebay_item_id     TEXT NOT NULL,
  yard_id          BIGINT NOT NULL REFERENCES yards (id) ON DELETE CASCADE,

  -- Standardized title: "[Year] [Make] [Model] [Part Name] [Part Number] OEM"
  fixed_title      TEXT NOT NULL,
  -- "[slugified-fixed-title]-[ebay-item-id]"  (see slugifyPart in lib/ebay-epn.ts)
  slug             TEXT NOT NULL,

  year             INTEGER,
  make             TEXT,
  model            TEXT,
  part_name        TEXT,
  oem_part_number  TEXT,

  -- Normalized part number: uppercase, spaces/dashes/punctuation stripped.
  -- "1234 567-890" -> "1234567" for exact / prefix matching.
  clean_part_number TEXT GENERATED ALWAYS AS (
    NULLIF(
      upper(regexp_replace(COALESCE(oem_part_number, ''), '[^A-Za-z0-9]', '', 'g')),
      ''
    )
  ) STORED,

  price            NUMERIC(10, 2),
  condition        TEXT,
  ebay_url         TEXT NOT NULL,

  images           JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ["https://i.ebayimg.com/...", ...]
  item_specifics   JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {"Brand": "Ford", "Placement": "Front", ...}
  compatibility    JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{"year": 2018, "make": "Ford", "model": "F-150", ...}, ...]

  status           listing_status NOT NULL DEFAULT 'ACTIVE',

  -- Weighted full-text vector:
  --   A: fixed_title, part_name, normalized part number (simple config = no stemming)
  --   B: make, model
  search_vector    tsvector GENERATED ALWAYS AS (
      setweight(to_tsvector('english', COALESCE(fixed_title, '')), 'A')
    || setweight(to_tsvector('english', COALESCE(part_name, '')), 'A')
    || setweight(
         to_tsvector('simple', upper(regexp_replace(COALESCE(oem_part_number, ''), '[^A-Za-z0-9]', '', 'g'))),
         'A'
       )
    || setweight(to_tsvector('english', COALESCE(make, '')), 'B')
    || setweight(to_tsvector('english', COALESCE(model, '')), 'B')
  ) STORED,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Identity / lookup
CREATE UNIQUE INDEX IF NOT EXISTS listings_ebay_item_id_key ON listings (ebay_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS listings_slug_key        ON listings (slug);

-- Full-text search
CREATE INDEX IF NOT EXISTS listings_search_vector_idx ON listings USING GIN (search_vector);

-- Part-number matching: plain B-tree for exact match,
-- text_pattern_ops B-tree so `LIKE 'ABC%'` prefix queries also use an index.
CREATE INDEX IF NOT EXISTS listings_clean_part_number_idx        ON listings (clean_part_number);
CREATE INDEX IF NOT EXISTS listings_clean_part_number_prefix_idx ON listings (clean_part_number text_pattern_ops);

-- Fitment + tenant filters
CREATE INDEX IF NOT EXISTS listings_make_model_year_idx ON listings (make, model, year);
CREATE INDEX IF NOT EXISTS listings_yard_id_idx         ON listings (yard_id);

-- Default browse ordering + sitemap generation
CREATE INDEX IF NOT EXISTS listings_status_updated_idx ON listings (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS listings_updated_at_idx     ON listings (updated_at DESC);

-- ----------------------------------------------------------------------------
-- Keep updated_at fresh on every UPDATE (drives sitemap + "updated_at DESC")
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS listings_set_updated_at ON listings;
CREATE TRIGGER listings_set_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS yards_set_updated_at ON yards;
CREATE TRIGGER yards_set_updated_at
  BEFORE UPDATE ON yards
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
