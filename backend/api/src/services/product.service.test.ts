import { describe, expect, it, vi } from 'vitest';
import { ProductService } from './product.service.js';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('ProductService', () => {
  it('returns paginated products and categories', async () => {
    const mockProducts = [
      {
        id: 'prod_1',
        title: 'AeroFit Headphones',
        slug: 'aerofit-headphones',
        priceCents: 1299900,
        category: 'Audio',
        stock: 10,
        isActive: true,
      },
    ];

    vi.mocked(prisma.product.count).mockResolvedValueOnce(1);
    vi.mocked(prisma.product.findMany)
      .mockResolvedValueOnce(mockProducts as any)
      .mockResolvedValueOnce([{ category: 'Audio' }] as any);

    const result = await ProductService.getProducts({ page: 1, limit: 10 });

    expect(result.products).toHaveLength(1);
    expect(result.categories).toContain('Audio');
    expect(result.pagination.total).toBe(1);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('throws NotFoundError when product does not exist or is inactive', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValueOnce(null);

    await expect(ProductService.getProductByIdOrSlug('non-existent')).rejects.toThrow(NotFoundError);
  });

  it('retrieves active product by slug', async () => {
    const mockProduct = {
      id: 'prod_1',
      title: 'AeroFit Headphones',
      slug: 'aerofit-headphones',
      priceCents: 1299900,
      category: 'Audio',
      stock: 10,
      isActive: true,
    };

    vi.mocked(prisma.product.findFirst).mockResolvedValueOnce(mockProduct as any);

    const product = await ProductService.getProductByIdOrSlug('aerofit-headphones');
    expect(product.slug).toBe('aerofit-headphones');
  });
});
