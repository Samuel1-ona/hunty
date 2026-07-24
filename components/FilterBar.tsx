import React from 'react';

interface FilterBarProps {
  hunts: string[];
  selectedHunt: string | null;
  setHunt: (hunt: string | null) => void;
  dateRange: { start?: string; end?: string };
  setDateRange: (range: { start?: string; end?: string }) => void;
  sort: 'newest' | 'rarest' | 'alphabetical';
  setSort: (sort: 'newest' | 'rarest' | 'alphabetical') => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  hunts,
  selectedHunt,
  setHunt,
  dateRange,
  setDateRange,
  sort,
  setSort,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-4">
      <select
        value={selectedHunt ?? ''}
        onChange={e => setHunt(e.target.value || null)}
        className="border rounded p-2"
      >
        <option value="">All Hunts</option>
        {hunts.map(h => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={dateRange.start ?? ''}
        onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
        className="border rounded p-2"
      />
      <input
        type="date"
        value={dateRange.end ?? ''}
        onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
        className="border rounded p-2"
      />
      <select
        value={sort}
        onChange={e => setSort(e.target.value as 'newest' | 'rarest' | 'alphabetical')}
        className="border rounded p-2"
      >
        <option value="newest">Newest</option>
        <option value="rarest">Rarest</option>
        <option value="alphabetical">Alphabetical</option>
      </select>
    </div>
  );
};
