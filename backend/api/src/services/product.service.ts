import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';

export interface ProductQueryInput {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'title_asc';
  page?: number;
  limit?: number;
}

export const defaultProductSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  priceCents: true,
  compareAtPriceCents: true,
  currency: true,
  category: true,
  brand: true,
  sku: true,
  imageUrl: true,
  stock: true,
  isActive: true,
  createdAt: true,
  seller: { select: { name: true } },
  categoryRef: { select: { id: true, name: true, slug: true } },
  images: { select: { id: true, url: true, altText: true, sortOrder: true }, orderBy: { sortOrder: 'asc' as const } },
} as const;

export class ProductService {
  static async getProducts(query: ProductQueryInput) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (query.category && query.category !== 'All') {
      where.OR = [
        { category: { equals: query.category, mode: 'insensitive' } },
        { categoryRef: { slug: { equals: query.category.toLowerCase() } } },
      ];
    }

    if (query.search) {
      const term = query.search.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { brand: { contains: term, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.priceCents = {
        ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
      };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (query.sort === 'price_asc') orderBy = { priceCents: 'asc' };
    else if (query.sort === 'price_desc') orderBy = { priceCents: 'desc' };
    else if (query.sort === 'title_asc') orderBy = { title: 'asc' };

    const [total, products, distinctCategories] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        select: defaultProductSelect,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { category: true },
        distinct: ['category'],
      }),
    ]);

    const categories = distinctCategories.map((c) => c.category).filter(Boolean);

    return {
      products,
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async getProductByIdOrSlug(idOrSlug: string) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        isActive: true,
      },
      select: defaultProductSelect,
    });

    if (!product) {
      throw new NotFoundError('Product not found or is currently unavailable.');
    }

    return product;
  }

  static async createProduct(sellerId: string, input: Prisma.ProductUncheckedCreateInput) {
    const slug = input.slug || input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existingSlug = await prisma.product.findUnique({ where: { slug } });
    if (existingSlug) {
      throw new ConflictError('A product with a similar title or slug already exists.');
    }

    return prisma.product.create({
      data: {
        ...input,
        sellerId,
        slug,
      },
      select: defaultProductSelect,
    });
  }

  static async updateProduct(productId: string, input: Prisma.ProductUncheckedUpdateInput) {
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      throw new NotFoundError('Product not found.');
    }

    return prisma.product.update({
      where: { id: productId },
      data: input,
      select: defaultProductSelect,
    });
  }

  static async deleteProduct(productId: string) {
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) {
      throw new NotFoundError('Product not found.');
    }

    return prisma.product.update({
      where: { id: productId },
      data: { isActive: false },
    });
  }
}
