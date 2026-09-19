import multer from 'multer';
import { BadRequestError } from '../utils/errors.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_IMAGES_PER_PRODUCT = 5;

export const imageFileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new BadRequestError(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
  cb(null, true);
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_IMAGES_PER_PRODUCT,
  },
});

export const uploadSingleImage = upload.single('image');
export const uploadMultipleImages = upload.array('images', MAX_IMAGES_PER_PRODUCT);

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, MAX_IMAGES_PER_PRODUCT };