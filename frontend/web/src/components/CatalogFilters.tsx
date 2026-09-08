import { useState, type FormEvent } from 'react';
import type { CatalogFilterState } from '../hooks/useCatalogParams';

const PRICE_PRESETS = [
  { label: 'All Prices', min: undefined, max: undefined },
  { label: 'Under ₹3,000', min: undefined, max: 300000 },
  { label: '₹3,000 – ₹7,000', min: 300000, max: 700000 },
  { label: '₹7,000 – ₹12,000', min: 700000, max: 1200000 },
  { label: 'Above ₹12,000', min: 1200000, max: undefined },
];

export function CatalogFilters({
  categories,
  categoryCounts,
  filters,
  totalResults,
  onUpdateFilters,
  onResetFilters,
}: {
  categories: string[];
  categoryCounts?: Record<string, number>;
  filters: CatalogFilterState;
  totalResults: number;
  onUpdateFilters: (updates: Partial<CatalogFilterState>) => void;
  onResetFilters: () => void;
}) {
  const [searchInput, setSearchInput] = useState(filters.search);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    onUpdateFilters({ search: searchInput.trim(), page: 1 });
  };

  const handleClearSearch = () => {
    setSearchInput('');
    onUpdateFilters({ search: '', page: 1 });
  };

  const currentPricePreset = PRICE_PRESETS.find(
    (p) => p.min === filters.minPrice && p.max === filters.maxPrice,
  ) ?? PRICE_PRESETS[0];

  const hasActiveFilters =
    Boolean(filters.search) ||
    filters.category !== 'All' ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.inStock ||
    filters.sort !== 'newest';

  return (
    <section className="catalog-controls" aria-label="Product Catalog Discovery Controls">
      {/* Category Navigation Bar */}
      <div className="category-nav-bar" role="tablist" aria-label="Category Selection">
        <button
          type="button"
          role="tab"
          aria-selected={filters.category === 'All'}
          className={`category-pill ${filters.category === 'All' ? 'active' : ''}`}
          onClick={() => onUpdateFilters({ category: 'All', page: 1 })}
        >
          All Items {categoryCounts?.All ? `(${categoryCounts.All})` : ''}
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={filters.category === cat}
            className={`category-pill ${filters.category === cat ? 'active' : ''}`}
            onClick={() => onUpdateFilters({ category: cat, page: 1 })}
          >
            {cat} {categoryCounts?.[cat] ? `(${categoryCounts[cat]})` : ''}
          </button>
        ))}
      </div>

      {/* Discovery Tooling Bar: Search, Price Filter, In Stock, Sorting */}
      <div className="discovery-toolbar">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="catalog-search-form" role="search">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search audio, keyboard, lamp, pack, SKU…"
            aria-label="Search products"
            className="catalog-search-input"
          />
          {searchInput && (
            <button
              type="button"
              className="catalog-search-clear"
              onClick={handleClearSearch}
              aria-label="Clear search input"
            >
              ✕
            </button>
          )}
          <button type="submit" className="catalog-search-submit" aria-label="Submit search">
            Search
          </button>
        </form>

        <div className="filter-dropdown-group">
          {/* Price Range Filter */}
          <label className="filter-label">
            <span>Price:</span>
            <select
              value={currentPricePreset.label}
              onChange={(e) => {
                const selected = PRICE_PRESETS.find((p) => p.label === e.target.value);
                if (selected) {
                  onUpdateFilters({
                    minPrice: selected.min,
                    maxPrice: selected.max,
                    page: 1,
                  });
                }
              }}
              className="filter-select"
              aria-label="Filter by price range"
            >
              {PRICE_PRESETS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          {/* Sort Selector */}
          <label className="filter-label">
            <span>Sort by:</span>
            <select
              value={filters.sort}
              onChange={(e) =>
                onUpdateFilters({
                  sort: e.target.value as CatalogFilterState['sort'],
                  page: 1,
                })
              }
              className="filter-select"
              aria-label="Sort product catalog"
            >
              <option value="newest">Newest Additions</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="title_asc">Name: A to Z</option>
            </select>
          </label>

          {/* In Stock Toggle */}
          <label className="in-stock-toggle" title="Show only items currently available in inventory">
            <input
              type="checkbox"
              checked={filters.inStock}
              onChange={(e) => onUpdateFilters({ inStock: e.target.checked, page: 1 })}
            />
            <span>In Stock Only</span>
          </label>
        </div>
      </div>

      {/* Active Filter Chips & Results Count */}
      <div className="active-filters-row">
        <span className="results-count">
          Showing <strong>{totalResults}</strong> {totalResults === 1 ? 'item' : 'items'}
        </span>

        {hasActiveFilters && (
          <div className="active-chips">
            {filters.category !== 'All' && (
              <span className="filter-chip">
                Category: {filters.category}
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ category: 'All' })}
                  aria-label={`Remove category filter ${filters.category}`}
                >
                  ×
                </button>
              </span>
            )}

            {filters.search && (
              <span className="filter-chip">
                "{filters.search}"
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Remove search filter"
                >
                  ×
                </button>
              </span>
            )}

            {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
              <span className="filter-chip">
                {currentPricePreset.label}
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ minPrice: undefined, maxPrice: undefined })}
                  aria-label="Remove price filter"
                >
                  ×
                </button>
              </span>
            )}

            {filters.inStock && (
              <span className="filter-chip">
                In Stock
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ inStock: false })}
                  aria-label="Remove in-stock filter"
                >
                  ×
                </button>
              </span>
            )}

            <button type="button" className="clear-all-filters-btn" onClick={onResetFilters}>
              Reset all
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
