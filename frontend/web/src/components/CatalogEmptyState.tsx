export function CatalogEmptyState({
  searchTerm,
  category,
  onReset,
}: {
  searchTerm?: string;
  category?: string;
  onReset: () => void;
}) {
  return (
    <div className="catalog-empty-state" role="status">
      <div className="catalog-empty-icon">🔍</div>
      <h3>No products matched your criteria</h3>
      <p>
        {searchTerm ? (
          <>
            We couldn't find anything matching <strong>"{searchTerm}"</strong>
            {category && category !== 'All' ? ` in ${category}` : ''}.
          </>
        ) : (
          'No available products currently meet your selected price or filter criteria.'
        )}
      </p>
      <div className="catalog-empty-actions">
        <button type="button" className="primary" onClick={onReset}>
          Reset All Filters
        </button>
      </div>
    </div>
  );
}
