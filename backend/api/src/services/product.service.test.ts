import { describe, expect, it, vi } from 'vitest';
import { ProductService } from './product.service.js';
import { prisma } from '../lib/prisma.js';

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    category: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe('ProductService', () => {
  describe('getProducts', () => {
    it('returns paginated products', async () => {
      const mockProducts = [{ id: 'prod_1', title: 'Test' }];
      vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts);
      vi.mocked(prisma.product.count).mockResolvedValue(1);
      vi.mocked(prisma.category.findMany).mockResolvedValue([]);

      const result = await ProductService.getProducts({ page: 1, limit: 20 });

      expect(result.products).toHaveLength(1);
      expect(result.products[0].title).toBe('Test');
    });

    it('filters by category', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      vi.mocked(prisma.product.count).mockResolvedValue(0);
      vi.mocked(prisma.category.findMany).mockResolvedValue([]);

      await ProductService.getProducts({ category: 'Audio', page: 1, limit: 20 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.anything(),
        }),
      }));
    });

    it('filters by inStock', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      vi.mocked(prisma.product.count).mockResolvedValue(0);
      vi.mocked(prisma.category.findMany).mockResolvedValue([]);

      await ProductService.getProducts({ inStock: true, page: 1, limit: 20 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          stock: expect.objectContaining({ gt: 0 }),
        }),
      }));
    });

    it('searches by keyword', async () => {
      vi.mocked(prisma.product.findMany).mockResolvedValue([]);
      vi.mocked(prisma.product.count).mockResolvedValue(0);
      vi.mocked(prisma.category.findMany).mockResolvedValue([]);

      await ProductService.getProducts({ search: 'headphones', page: 1, limit: 20 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.anything(),
        }),
      }));
    });
  });
});
