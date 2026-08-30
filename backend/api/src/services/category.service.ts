import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';

export class CategoryService {
  static async getCategories() {
    return prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getCategoryBySlug(slug: string) {
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    if (!category || !category.isActive) {
      throw new NotFoundError('Category not found.');
    }

    return category;
  }

  static async createCategory(input: { name: string; slug?: string; description?: string; imageUrl?: string }) {
    const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictError('A category with that name or slug already exists.');
    }

    return prisma.category.create({
      data: {
        ...input,
        slug,
      },
    });
  }
}
