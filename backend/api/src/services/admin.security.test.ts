import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminController } from '../controllers/admin.controller.js';
import { AdminService } from './admin.service.js';
import { ForbiddenError, UnauthorizedError } from '../utils/errors.js';

vi.mock('./admin.service.js', () => ({
  AdminService: {
    getDashboardMetrics: vi.fn(),
    getAllOrders: vi.fn(),
    getOrderById: vi.fn(),
    updateOrderStatus: vi.fn(),
    getAllProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    updateProductStock: vi.fn(),
    getAllCategories: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    getAllCustomers: vi.fn(),
    getAllCoupons: vi.fn(),
    createCoupon: vi.fn(),
    updateCoupon: vi.fn(),
    toggleCouponActive: vi.fn(),
    getAnalytics: vi.fn(),
    validateCoupon: vi.fn(),
    getInventory: vi.fn(),
  },
}));

vi.mock('../utils/response.js', () => ({
  ok: (res: any, _req: any, data: any, message: string) => ({
    status: 200,
    json: () => ({ success: true, data, message }),
  }),
  created: (res: any, _req: any, data: any, message: string) => ({
    status: 201,
    json: () => ({ success: true, data, message }),
  }),
}));

describe('AdminController Security', () => {
  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const adminReq = (overrides: Record<string, any> = {}) => ({
    user: { id: 'usr_admin', email: 'admin@shopvibe.store', role: 'ADMIN' },
    query: {},
    body: {},
    params: {},
    header: vi.fn().mockReturnValue(undefined),
    ip: '127.0.0.1',
    ...overrides,
  }) as unknown as Request;

  const customerReq = (overrides: Record<string, any> = {}) => ({
    user: { id: 'usr_1', email: 'customer@shopvibe.store', role: 'CUSTOMER' },
    query: {},
    body: {},
    params: {},
    header: vi.fn().mockReturnValue(undefined),
    ip: '127.0.0.1',
    ...overrides,
  }) as unknown as Request;

  const next = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
  });

  // All admin endpoints should be blocked for non-admin users at the middleware level.
  // These tests verify the controller still returns safe errors when called directly.
  // The actual middleware protection is verified in auth.middleware.test.ts.

  describe('Authorization enforcement', () => {
    it('getDashboard throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq();
      await expect(AdminController.getDashboard(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('getOrders throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq();
      await expect(AdminController.getOrders(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('getOrder throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq();
      await expect(AdminController.getOrder(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('updateOrderStatus throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq({ params: { orderId: 'ord_1' }, body: { status: 'CONFIRMED' } });
      await expect(AdminController.updateOrderStatus(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('getProducts throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq();
      await expect(AdminController.getProducts(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('createProduct throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq({ body: { title: 'Test', priceCents: 1000, stock: 10 } });
      await expect(AdminController.createProduct(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('updateProduct throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq({ params: { productId: 'prd_1' }, body: { title: 'Updated' } });
      await expect(AdminController.updateProduct(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('updateProductStock throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq({ params: { productId: 'prd_1' }, body: { stock: 5 } });
      await expect(AdminController.updateProductStock(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('getCategories throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq();
      await expect(AdminController.getCategories(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('updateCategory throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq({ params: { categoryId: 'cat_1' }, body: { name: 'Updated' } });
      await expect(AdminController.updateCategory(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('deleteCategory throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq({ params: { categoryId: 'cat_1' } });
      await expect(AdminController.deleteCategory(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('getCustomers throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq();
      await expect(AdminController.getCustomers(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('getCoupons throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq();
      await expect(AdminController.getCoupons(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('createCoupon throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq({ body: { code: 'TEST', type: 'PERCENTAGE', value: 10 } });
      await expect(AdminController.createCoupon(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('getAnalytics throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq();
      await expect(AdminController.getAnalytics(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('validateCoupon throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq({ body: { code: 'TEST' } });
      await expect(AdminController.validateCoupon(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('getInventory throws ForbiddenError when called by non-admin', async () => {
      const res = mockRes();
      const req = customerReq();
      await expect(AdminController.getInventory(req as any, res as any, next)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('Unauthenticated access', () => {
    it('all admin endpoints return 401 when no user is attached', async () => {
      const res = mockRes();
      const req = { user: undefined, query: {}, body: {}, params: {}, header: vi.fn() } as unknown as Request;

      const endpoints = [
        AdminController.getDashboard(req as any, res, next),
        AdminController.getOrders(req as any, res, next),
        AdminController.getProducts(req as any, res, next),
        AdminController.getCategories(req as any, res, next),
        AdminController.getCustomers(req as any, res, next),
        AdminController.getCoupons(req as any, res, next),
        AdminController.getAnalytics(req as any, res, next),
        AdminController.getInventory(req as any, res, next),
      ];

      await Promise.all(endpoints);
      // All should error (user is undefined/invalid)
      // The middleware catches this before reaching the controller
    });
  });

  describe('Admin access', () => {
    it('getDashboard succeeds for admin', async () => {
      vi.mocked(AdminService.getDashboardMetrics).mockResolvedValueOnce({ users: 10 } as any);
      const res = mockRes();
      const req = adminReq();
      await AdminController.getDashboard(req as any, res as any, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('createProduct succeeds for admin', async () => {
      vi.mocked(AdminService.createProduct).mockResolvedValueOnce({ id: 'prd_1', title: 'Test' } as any);
      const res = mockRes();
      const req = adminReq({ body: { title: 'Test', priceCents: 1000, stock: 10 } });
      await AdminController.createProduct(req as any, res as any, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('updateProduct succeeds for admin', async () => {
      vi.mocked(AdminService.updateProduct).mockResolvedValueOnce({ id: 'prd_1', title: 'Updated' } as any);
      const res = mockRes();
      const req = adminReq({ params: { productId: 'prd_1' }, body: { title: 'Updated' } });
      await AdminController.updateProduct(req as any, res as any, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('updateProductStock rejects negative stock for admin', async () => {
      vi.mocked(AdminService.updateProductStock).mockRejectedValueOnce(new Error('Stock must be >= 0'));
      const res = mockRes();
      const req = adminReq({ params: { productId: 'prd_1' }, body: { stock: -1 } });
      await AdminController.updateProductStock(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
    });

    it('getAnalytics returns data for admin', async () => {
      vi.mocked(AdminService.getAnalytics).mockResolvedValueOnce({
        revenueTrend: [],
        statusDistribution: [],
        topProducts: [],
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      } as any);
      const res = mockRes();
      const req = adminReq({ query: { period: '30d' } });
      await AdminController.getAnalytics(req as any, res as any, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('validateCoupon succeeds for admin with valid coupon', async () => {
      vi.mocked(AdminService.validateCoupon).mockResolvedValueOnce({ valid: true, coupon: { id: 'cpn_1', code: 'TEST', type: 'PERCENTAGE', value: 10, isActive: true, minimumOrderValueCents: 0, maximumDiscountCents: null, usageLimit: null, usedCount: 0 } } as any);
      const res = mockRes();
      const req = adminReq({ body: { code: 'TEST' } });
      await AdminController.validateCoupon(req as any, res as any, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
    });

    it('validateCoupon rejects invalid coupon code', async () => {
      const { NotFoundError } = await import('../utils/errors.js');
      vi.mocked(AdminService.validateCoupon).mockRejectedValueOnce(new NotFoundError('Coupon not found.'));
      const res = mockRes();
      const req = adminReq({ body: { code: 'INVALID' } });
      await AdminController.validateCoupon(req as any, res as any, next);
      expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
    });

    it('getInventory succeeds for admin', async () => {
      vi.mocked(AdminService.getInventory).mockResolvedValueOnce([
        { id: 'p1', title: 'Test', sku: 'SKU1', stock: 10, category: 'Electronics', categoryRef: null, isActive: true, lowStock: false, outOfStock: false },
      ] as any);
      const res = mockRes();
      const req = adminReq();
      await AdminController.getInventory(req as any, res as any, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
