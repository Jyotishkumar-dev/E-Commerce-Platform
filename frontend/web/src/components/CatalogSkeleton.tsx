export function CatalogSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="product-grid" aria-busy="true" aria-label="Loading catalog products">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="product-card skeleton-card">
          <div className="skeleton-image skeleton-pulse" />
          <div className="product-card-body">
            <div className="skeleton-line skeleton-line-sm skeleton-pulse" />
            <div className="skeleton-line skeleton-line-lg skeleton-pulse" />
            <div className="skeleton-line skeleton-line-md skeleton-pulse" />
            <div className="skeleton-btn skeleton-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
