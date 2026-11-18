export type SearchResultItem = {
  id: number;
  ebayItemId: string;
  slug: string;
  fixedTitle: string;
  year: number | null;
  make: string | null;
  model: string | null;
  partName: string | null;
  oemPartNumber: string | null;
  price: number | null;
  condition: string | null;
  ebayUrl: string;
  images: string[];
  status: 'ACTIVE' | 'SOLD';
  updatedAt: string;
  yard: {
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
  };
};

export type FacetValue = {
  value: string;
  count: number;
};

export type YardFacetValue = {
  value: string;
  label: string;
  city: string | null;
  state: string | null;
  count: number;
};

export type SearchFacets = {
  makes: FacetValue[];
  models: FacetValue[];
  years: FacetValue[];
  yards: YardFacetValue[];
};

export type SearchParams = {
  q?: string;
  year?: string;
  make?: string;
  model?: string;
  yard?: string;
  minPrice?: string;
  maxPrice?: string;
  page?: string;
};

export type SearchResponse = {
  results: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: SearchFacets;
};
