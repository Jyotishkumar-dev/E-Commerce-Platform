import { Router } from 'express';
import { AddressController } from '../controllers/address.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validate.js';
import { createAddressSchema, updateAddressSchema } from '../validators/address.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', AddressController.getAddresses);
router.post('/', validateBody(createAddressSchema), AddressController.createAddress);
router.patch('/:addressId', validateBody(updateAddressSchema), AddressController.updateAddress);
router.delete('/:addressId', AddressController.deleteAddress);

export { router as addressRouter };
