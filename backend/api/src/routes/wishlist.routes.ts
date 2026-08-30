import { Router } from 'express';
import { WishlistController } from '../controllers/wishlist.controller.js';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', WishlistController.getWishlist);
router.post('/:productId', WishlistController.addToWishlist);
router.delete('/:productId', WishlistController.removeFromWishlist);

export { router as wishlistRouter };
