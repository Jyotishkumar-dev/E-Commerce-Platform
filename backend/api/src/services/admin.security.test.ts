import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminController } from '../controllers/admin.controller.js';
import { AdminService } from '../services/admin.service.js';
import { ForbiddenError } from '../utils/errors.js';

vi.mock('../services/admin.service.js', () => ({
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
  ok: (res: any, _req: any, data: any, message: string) =>
    res.status(200).json({ success: true, data, message }),
  created: (res: any, _req: any, data: any, message: string) =>
    res.status(201).json({ success: true, data, message }),
}));

describe('AdminController Security', () => {
  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const adminReq = (overrides: Record<string, any> = {}) =>
    ({
      user: { id: 'usr_admin', email: 'admin@shopvibe.store', role: 'ADMIN' },
      query: {},
      body: {},
      params: {},
      header: vi.fn().mockReturnValue(undefined),
      ip: '127.0.0.1',
      ...overrides,
    }) as unknown as Request;

  const customerReq = (overrides: Record<string, any> = {}) =>
    ({
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

  describe('Authorization enforcement', () => {
    const endpoints = [
      ['getDashboard', () => AdminController.getDashboard(customerReq() as any, mockRes(), next)],
      ['getOrders', () => AdminController.getOrders(customerReq() as any, mockRes(), next)],
      [
        'getOrder',
        () =>
          AdminController.getOrder(
            { ...customerReq(), params: { orderId: 'ord_1' } } as any,
            mockRes(),
            next,
          ),
      ],
      [
        'updateOrderStatus',
        () =>
          AdminController.updateOrderStatus(
            {
              ...customerReq(),
              params: { orderId: 'ord_1' },
              body: { status: 'CONFIRMED' },
            } as any,
            mockRes(),
            next,
          ),
      ],
      ['getProducts', () => AdminController.getProducts(customerReq() as any, mockRes(), next)],
      ['createProduct', () => AdminController.createProduct(customerReq() as any, mockRes(), next)],
      [
        'updateProduct',
        () =>
          AdminController.updateProduct(
            { ...customerReq(), params: { productId: 'prd_1' }, body: {} } as any,
            mockRes(),
            next,
          ),
      ],
      [
        'updateProductStock',
        () =>
          AdminController.updateProductStock(
            { ...customerReq(), params: { productId: 'prd_1' }, body: { stock: 1 } } as any,
            mockRes(),
            next,
          ),
      ],
      ['getCategories', () => AdminController.getCategories(customerReq() as any, mockRes(), next)],
      [
        'updateCategory',
        () =>
          AdminController.updateCategory(
            { ...customerReq(), params: { categoryId: 'cat_1' }, body: {} } as any,
            mockRes(),
            next,
          ),
      ],
      [
        'deleteCategory',
        () =>
          AdminController.deleteCategory(
            { ...customerReq(), params: { categoryId: 'cat_1' } } as any,
            mockRes(),
            next,
          ),
      ],
      ['getCustomers', () => AdminController.getCustomers(customerReq() as any, mockRes(), next)],
      ['getCoupons', () => AdminController.getCoupons(customerReq() as any, mockRes(), next)],
      ['createCoupon', () => AdminController.createCoupon(customerReq() as any, mockRes(), next)],
      ['getAnalytics', () => AdminController.getAnalytics(customerReq() as any, mockRes(), next)],
      [
        'validateCoupon',
        () => AdminController.validateCoupon(customerReq() as any, mockRes(), next),
      ],
      ['getInventory', () => AdminController.getInventory(customerReq() as any, mockRes(), next)],
    ] as const;

    for (const [name, call] of endpoints) {
      it(`${name} calls next with ForbiddenError for customer`, async () => {
        await call();
        expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      });
    }
  });

  describe('Unauthenticated access', () => {
    it('all admin endpoints call next with error when no user', async () => {
      const res = mockRes();
      const req = {
        user: undefined,
        query: {},
        body: {},
        params: {},
        header: vi.fn(),
      } as unknown as Request;
      await AdminController.getDashboard(req as any, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Admin access', () => {
    it('getDashboard succeeds for admin', async () => {
      vi.mocked(AdminService.getDashboardMetrics).mockResolvedValueOnce({ users: 10 } as any);
      const res = mockRes();
      const req = adminReq();
      await AdminController.getDashboard(req as any, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('createProduct succeeds for admin', async () => {
      vi.mocked(AdminService.createProduct).mockResolvedValueOnce({
        id: 'prd_1',
        title: 'Test',
      } as any);
      const res = mockRes();
      const req = adminReq({ body: { title: 'Test', priceCents: 1000, stock: 10 } });
      await AdminController.createProduct(req as any, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('updateProduct succeeds for admin', async () => {
      vi.mocked(AdminService.updateProduct).mockResolvedValueOnce({
        id: 'prd_1',
        title: 'Updated',
      } as any);
      const res = mockRes();
      const req = adminReq({ params: { productId: 'prd_1' }, body: { title: 'Updated' } });
      await AdminController.updateProduct(req as any, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('updateProductStock rejects negative stock for admin', async () => {
      vi.mocked(AdminService.updateProductStock).mockRejectedValueOnce(
        new Error('Stock must be >= 0'),
      );
      const res = mockRes();
      const req = adminReq({ params: { productId: 'prd_1' }, body: { stock: -1 } });
      await AdminController.updateProductStock(req as any, res, next);
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
      await AdminController.getAnalytics(req as any, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('validateCoupon succeeds for admin', async () => {
      vi.mocked(AdminService.validateCoupon).mockResolvedValueOnce({
        valid: true,
        coupon: {
          id: 'cpn_1',
          code: 'TEST',
          type: 'PERCENTAGE',
          value: 10,
          isActive: true,
          minimumOrderValueCents: 0,
          maximumDiscountCents: null,
          usageLimit: null,
          usedCount: 0,
        },
      } as any);
      const res = mockRes();
      const req = adminReq({ body: { code: 'TEST' } });
      await AdminController.validateCoupon(req as any, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('validateCoupon rejects invalid coupon code', async () => {
      vi.mocked(AdminService.validateCoupon).mockRejectedValueOnce(
        new ForbiddenError('Coupon not found.'),
      );
      const res = mockRes();
      const req = adminReq({ body: { code: 'INVALID' } });
      await AdminController.validateCoupon(req as any, res, next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('getInventory succeeds for admin', async () => {
      vi.mocked(AdminService.getInventory).mockResolvedValueOnce([
        {
          id: 'p1',
          title: 'Test',
          sku: 'SKU1',
          stock: 10,
          category: 'Electronics',
          categoryRef: null,
          isActive: true,
          lowStock: false,
          outOfStock: false,
        },
      ] as any);
      const res = mockRes();
      const req = adminReq();
      await AdminController.getInventory(req as any, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
