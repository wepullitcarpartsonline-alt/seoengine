'use client';

import { useRouter } from 'next/navigation';
import { buildQueryString, type QueryParams } from '@/lib/url';
import type { FacetValue, SearchFacets } from '@/lib/types';

export function FitmentSelector({
  facets,
  currentParams,
}: {
  facets: SearchFacets;
  currentParams: QueryParams;
}) {
  const router = useRouter();

  const update = (overrides: QueryParams) => {
    router.push(`/${buildQueryString(currentParams, { page: undefined, ...overrides })}`);
  };

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:gap-3">
        <span className="text-sm font-semibold text-gray-700">Fitment:</span>
        <FitmentSelect
          label="year"
          value={currentParams.year ?? ''}
          options={facets.years}
          allLabel="All Years"
          onChange={(v) => update({ year: v || undefined })}
        />
        <FitmentSelect
          label="make"
          value={currentParams.make ?? ''}
          options={facets.makes}
          allLabel="All Makes"
          onChange={(v) => update({ make: v || undefined, model: undefined })}
        />
        <FitmentSelect
          label="model"
          value={currentParams.model ?? ''}
          options={facets.models}
          allLabel="All Models"
          onChange={(v) => update({ model: v || undefined })}
        />
      </div>
    </div>
  );
}

function FitmentSelect({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: string;
  options: FacetValue[];
  allLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={`Select ${label}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="max-w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
    >
      <option value="">{allLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.value} ({option.count})
        </option>
      ))}
    </select>
  );
}
