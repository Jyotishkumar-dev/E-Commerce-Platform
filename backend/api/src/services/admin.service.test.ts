import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminService } from './admin.service.js';
import { prisma } from '../lib/prisma.js';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors.js';

vi.mock('../lib/prisma.js', () => {
  const mockPrisma: any = {
    user: { count: vi.fn(), findMany: vi.fn() },
    product: {
      count: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn(), create: vi.fn(), findUnique: vi.fn(),
    },
    order: {
      count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn(), create: vi.fn(), update: vi.fn(),
    },
    category: {
      findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), create: vi.fn(),
    },
    customer: { count: vi.fn(), findMany: vi.fn() },
    coupon: { count: vi.fn(), findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    payment: { findUnique: vi.fn(), update: vi.fn() },
  };
  return { prisma: mockPrisma };
});

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('returns aggregated dashboard metrics', async () => {
      vi.mocked(prisma.user.count).mockResolvedValueOnce(50);
      vi.mocked(prisma.product.count).mockResolvedValueOnce(100);
      vi.mocked(prisma.product.count).mockResolvedValueOnce(20);
      vi.mocked(prisma.product.count).mockResolvedValueOnce(5);
      vi.mocked(prisma.product.count).mockResolvedValueOnce(3);
      vi.mocked(prisma.order.count).mockResolvedValueOnce(200);
      vi.mocked(prisma.order.count).mockResolvedValueOnce(30);
      vi.mocked(prisma.order.count).mockResolvedValueOnce(50);
      vi.mocked(prisma.order.count).mockResolvedValueOnce(40);
      vi.mocked(prisma.order.count).mockResolvedValueOnce(60);
      vi.mocked(prisma.order.count).mockResolvedValueOnce(15);
      vi.mocked(prisma.order.count).mockResolvedValueOnce(5);
      vi.mocked(prisma.order.aggregate).mockResolvedValueOnce({ _sum: { totalCents: 5000000 } } as any);
      vi.mocked(prisma.order.aggregate).mockResolvedValueOnce({ _sum: { totalCents: 4500000 } } as any);
      vi.mocked(prisma.order.findMany).mockResolvedValueOnce([
        { id: 'ord_1', createdAt: new Date(), status: 'DELIVERED', totalCents: 5000, user: { id: 'u1', email: 'a@b.com', name: 'Alice' } },
      ] as any);
      vi.mocked(prisma.product.findMany).mockResolvedValueOnce([
        { id: 'p1', title: 'Low Stock', sku: 'SKU1', stock: 3, category: 'Electronics' },
      ] as any);

      const metrics = await AdminService.getDashboardMetrics();

      expect(metrics.users).toBe(50);
      expect(metrics.products).toBe(120);
      expect(metrics.activeProducts).toBe(100);
      expect(metrics.inactiveProducts).toBe(20);
      expect(metrics.orders).toBe(200);
      expect(metrics.revenuePaidCents).toBe(4500000);
      expect(metrics.averageOrderValueCents).toBe(22500);
      expect(metrics.lowStockItems.length).toBe(1);
      expect(metrics.lowStockItems[0].title).toBe('Low Stock');
    });
  });

  describe('getAllOrders', () => {
    it('returns paginated orders', async () => {
      const mockOrders = [
        { id: 'ord_1', totalCents: 5000, user: { id: 'u1', email: 'a@b.com', name: 'Alice' }, items: [], payment: null },
      ] as any;
      vi.mocked(prisma.order.count).mockResolvedValueOnce(1);
      vi.mocked(prisma.order.findMany).mockResolvedValueOnce(mockOrders);

      const result = await AdminService.getAllOrders({ page: 1, limit: 20 });

      expect(result.orders).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('filters by status', async () => {
      vi.mocked(prisma.order.count).mockResolvedValueOnce(0);
      vi.mocked(prisma.order.findMany).mockResolvedValueOnce([]);

      await AdminService.getAllOrders({ status: 'PENDING' });

      expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PENDING' } }));
    });
  });

  describe('getOrderById', () => {
    it('throws NotFoundError for non-existent order', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      await expect(AdminService.getOrderById('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('returns order when found', async () => {
      const mockOrder = { id: 'ord_1', status: 'PENDING', totalCents: 5000 } as any;
      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder);

      const order = await AdminService.getOrderById('ord_1');
      expect(order).toBe(mockOrder);
    });
  });

  describe('updateOrderStatus', () => {
    it('throws NotFoundError for non-existent order', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      await expect(AdminService.updateOrderStatus('nonexistent', 'CONFIRMED')).rejects.toThrow(NotFoundError);
    });

    it('throws BadRequestError for invalid transition', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue({ id: 'ord_1', status: 'DELIVERED' } as any);

      await expect(AdminService.updateOrderStatus('ord_1', 'PENDING')).rejects.toThrow(BadRequestError);
    });

    it('updates status for valid transition', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({ id: 'ord_1', status: 'PENDING' } as any);
      vi.mocked(prisma.order.update).mockResolvedValue({ id: 'ord_1', status: 'CONFIRMED' } as any);
      vi.mocked(prisma.order.findUnique).mockResolvedValueOnce({ id: 'ord_1', status: 'CONFIRMED', items: [], payment: null } as any);

      const order = await AdminService.updateOrderStatus('ord_1', 'CONFIRMED');
      expect(order.id).toBe('ord_1');
    });
  });

  describe('getAllProducts', () => {
    it('returns paginated products', async () => {
      vi.mocked(prisma.product.count).mockResolvedValue(10);
      vi.mocked(prisma.product.findMany).mockResolvedValue([{ id: 'p1' }] as any);

      const result = await AdminService.getAllProducts({ page: 1, limit: 20 });

      expect(result.products).toHaveLength(1);
      expect(result.pagination.total).toBe(10);
    });
  });

  describe('updateCategory', () => {
    it('throws NotFoundError for non-existent category', async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

      await expect(AdminService.updateCategory('nonexistent', { name: 'New' })).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError for duplicate slug', async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({ id: 'cat_1', slug: 'old' } as any);
      vi.mocked(prisma.category.findUnique).mockResolvedValueOnce({ id: 'cat_2', slug: 'new' } as any);

      await expect(AdminService.updateCategory('cat_1', { slug: 'new' })).rejects.toThrow(ConflictError);
    });

    it('updates category', async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValue({ id: 'cat_1', slug: 'old' } as any);
      vi.mocked(prisma.category.update).mockResolvedValue({ id: 'cat_1', slug: 'old', name: 'Updated' } as any);

      const category = await AdminService.updateCategory('cat_1', { name: 'Updated' });
      expect(category.name).toBe('Updated');
    });
  });

  describe('deleteCategory', () => {
    it('throws NotFoundError for non-existent category', async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

      await expect(AdminService.deleteCategory('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('throws ConflictError when category has products', async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValue({ id: 'cat_1' } as any);
      vi.mocked(prisma.product.count).mockResolvedValue(5);

      await expect(AdminService.deleteCategory('cat_1')).rejects.toThrow(ConflictError);
    });

    it('deletes category when no products', async () => {
      vi.mocked(prisma.category.findUnique).mockResolvedValue({ id: 'cat_1' } as any);
      vi.mocked(prisma.product.count).mockResolvedValue(0);
      vi.mocked(prisma.category.delete).mockResolvedValue({ id: 'cat_1' } as any);

      await AdminService.deleteCategory('cat_1');
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat_1' } });
    });
  });

  describe('getAllCustomers', () => {
    it('returns paginated customers with stats', async () => {
      const mockCustomers = [{ id: 'u1', email: 'a@b.com', name: 'Alice', phone: null, avatarUrl: null, createdAt: new Date() }] as any;
      vi.mocked(prisma.user.count).mockResolvedValue(1);
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockCustomers);
      vi.mocked(prisma.order.groupBy).mockResolvedValue([{ userId: 'u1', _sum: { totalCents: 5000 }, _count: 2 }] as any);

      const result = await AdminService.getAllCustomers();

      expect(result.customers).toHaveLength(1);
      expect(result.customers[0].totalSpent).toBe(5000);
      expect(result.customers[0].orderCount).toBe(2);
    });
  });

  describe('createCoupon', () => {
    it('throws ConflictError for duplicate code', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce({ id: 'c1', code: 'SAVE10' } as any);

      await expect(AdminService.createCoupon({ code: 'SAVE10', type: 'PERCENTAGE', value: 10 })).rejects.toThrow(ConflictError);
    });

    it('throws BadRequestError for invalid percentage', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce(null);

      await expect(AdminService.createCoupon({ code: 'SAVE10', type: 'PERCENTAGE', value: 0 })).rejects.toThrow(BadRequestError);
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce(null);
      await expect(AdminService.createCoupon({ code: 'SAVE10', type: 'PERCENTAGE', value: 101 })).rejects.toThrow(BadRequestError);
    });

    it('throws BadRequestError for invalid fixed value', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce(null);

      await expect(AdminService.createCoupon({ code: 'SAVE10', type: 'FIXED', value: 0 })).rejects.toThrow(BadRequestError);
    });

    it('creates coupon', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValueOnce(null);
      vi.mocked(prisma.coupon.create).mockResolvedValueOnce({ id: 'c1', code: 'SAVE10', type: 'PERCENTAGE', value: 10 } as any);

      const coupon = await AdminService.createCoupon({ code: 'SAVE10', type: 'PERCENTAGE', value: 10 });
      expect(coupon.code).toBe('SAVE10');
    });
  });

  describe('toggleCouponActive', () => {
    it('throws NotFoundError for non-existent coupon', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValue(null);

      await expect(AdminService.toggleCouponActive('nonexistent', false)).rejects.toThrow(NotFoundError);
    });

    it('toggles active status', async () => {
      vi.mocked(prisma.coupon.findUnique).mockResolvedValue({ id: 'c1' } as any);
      vi.mocked(prisma.coupon.update).mockResolvedValue({ id: 'c1', isActive: false } as any);

      const coupon = await AdminService.toggleCouponActive('c1', false);
      expect(coupon.isActive).toBe(false);
    });
  });
});
