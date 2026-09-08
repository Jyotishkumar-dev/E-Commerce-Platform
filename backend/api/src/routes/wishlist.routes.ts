import { Router } from 'express';
import { WishlistController } from '../controllers/wishlist.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { addWishlistItemSchema } from '../validators/wishlist.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', WishlistController.getWishlist);

// Support both REST patterns: POST /items (body { productId }) and POST /:productId
router.post('/items', validateBody(addWishlistItemSchema), WishlistController.addToWishlist);
router.post('/:productId', WishlistController.addToWishlist);

// Support both DELETE /items/:productId and DELETE /:productId
router.delete('/items/:productId', WishlistController.removeFromWishlist);
router.delete('/:productId', WishlistController.removeFromWishlist);

// Move to cart
router.post('/items/:productId/move-to-cart', WishlistController.moveToCart);
router.post('/:productId/move-to-cart', WishlistController.moveToCart);

export { router as wishlistRouter };

