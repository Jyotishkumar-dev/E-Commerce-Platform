import type { Product } from '../lib/api';
import { CatalogEmptyState } from './CatalogEmptyState';
import { CatalogSkeleton } from './CatalogSkeleton';
import { ProductCard } from './ProductCard';

export function ProductGrid({
  products,
  isLoading,
  searchTerm,
  category,
  onSelectProduct,
  onAddToCart,
  onToggleWishlist,
  onResetFilters,
  wishlistedIds = new Set<string>(),
}: {
  products: Product[];
  isLoading: boolean;
  searchTerm?: string;
  category?: string;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (productId: string) => void;
  onToggleWishlist?: (productId: string) => void;
  onResetFilters: () => void;
  wishlistedIds?: Set<string>;
}) {
  if (isLoading) {
    return <CatalogSkeleton count={8} />;
  }

  if (products.length === 0) {
    return (
      <CatalogEmptyState
        searchTerm={searchTerm}
        category={category}
        onReset={onResetFilters}
      />
    );
  }

  return (
    <div className="product-grid" role="region" aria-label="Product Catalog List">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={onSelectProduct}
          onAdd={onAddToCart}
          onToggleWishlist={onToggleWishlist}
          isWishlisted={wishlistedIds.has(product.id)}
        />
      ))}
    </div>
  );
}
