import { useCallback, useEffect, useState } from 'react';

export interface CatalogFilterState {
  search: string;
  category: string;
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
  sort: 'newest' | 'price_asc' | 'price_desc' | 'title_asc';
  page: number;
}

export function useCatalogParams() {
  const parseParams = useCallback((): CatalogFilterState => {
    const searchParams = new URLSearchParams(window.location.search);
    const minP = searchParams.get('minPrice');
    const maxP = searchParams.get('maxPrice');
    const sortVal = searchParams.get('sort');

    return {
      search: searchParams.get('search') ?? '',
      category: searchParams.get('category') ?? 'All',
      minPrice: minP ? Number(minP) : undefined,
      maxPrice: maxP ? Number(maxP) : undefined,
      inStock: searchParams.get('inStock') === 'true',
      sort: (['newest', 'price_asc', 'price_desc', 'title_asc'].includes(sortVal ?? '')
        ? sortVal
        : 'newest') as CatalogFilterState['sort'],
      page: Number(searchParams.get('page') ?? '1') || 1,
    };
  }, []);

  const [filters, setFilters] = useState<CatalogFilterState>(parseParams);

  // Sync state when browser back/forward buttons are clicked
  useEffect(() => {
    const handlePopState = () => {
      setFilters(parseParams());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [parseParams]);

  const updateFilters = useCallback((updates: Partial<CatalogFilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...updates };
      const searchParams = new URLSearchParams();

      if (next.search) searchParams.set('search', next.search);
      if (next.category && next.category !== 'All') searchParams.set('category', next.category);
      if (next.minPrice !== undefined) searchParams.set('minPrice', String(next.minPrice));
      if (next.maxPrice !== undefined) searchParams.set('maxPrice', String(next.maxPrice));
      if (next.inStock) searchParams.set('inStock', 'true');
      if (next.sort && next.sort !== 'newest') searchParams.set('sort', next.sort);
      if (next.page && next.page > 1) searchParams.set('page', String(next.page));

      const queryStr = searchParams.toString();
      const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
      window.history.pushState({}, '', newUrl);

      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      category: 'All',
      minPrice: undefined,
      maxPrice: undefined,
      inStock: false,
      sort: 'newest',
      page: 1,
    });
    window.history.pushState({}, '', window.location.pathname);
  }, []);

  return { filters, updateFilters, resetFilters };
}
