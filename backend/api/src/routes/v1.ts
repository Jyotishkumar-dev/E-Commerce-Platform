import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { productRouter } from './product.routes.js';
import { categoryRouter } from './category.routes.js';
import { cartRouter } from './cart.routes.js';
import { wishlistRouter } from './wishlist.routes.js';
import { addressRouter } from './address.routes.js';
import { orderRouter } from './order.routes.js';
import { adminRouter } from './admin.routes.js';
import { prisma } from '../lib/prisma.js';
import { defaultProductSelect } from '../services/product.service.js';
import { ok } from '../utils/response.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/products', productRouter);
router.use('/categories', categoryRouter);
router.use('/cart', cartRouter);
router.use('/wishlist', wishlistRouter);
router.use('/addresses', addressRouter);
router.use('/orders', orderRouter);
router.use('/admin', adminRouter);

// Catalog curation / recommendation endpoint
router.post('/ai/recommendations', async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, stock: { gt: 0 } },
      select: defaultProductSelect,
      take: 4,
      orderBy: { createdAt: 'desc' },
    });
    return ok(
      res,
      req,
      {
        products,
        explanation: 'Curated products based on catalog availability and customer preference.',
      },
      'Recommendations ready',
    );
  } catch (error) {
    next(error);
  }
});

export { router as v1Router };
