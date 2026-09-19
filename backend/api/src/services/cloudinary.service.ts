import { v2 as cloudinary, type UploadApiResponse, type UploadApiErrorResponse } from 'cloudinary';
import { env } from '../config/env.js';

const CLOUDINARY_FOLDER = 'shopvibe/products';

if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
  throw new Error('Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
}

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export interface CloudinaryDeleteResult {
  result: string;
}

export function getProductFolder(productId: string): string {
  return `${CLOUDINARY_FOLDER}/${productId}`;
}

export async function uploadImage(
  fileBuffer: Buffer,
  productId: string,
  options?: { publicId?: string; folder?: string }
): Promise<CloudinaryUploadResult> {
  const folder = options?.folder ?? getProductFolder(productId);
  const publicId = options?.publicId ?? `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        overwrite: true,
        invalidate: true,
        transformation: [
          { quality: 'auto:good', fetch_format: 'auto' },
        ],
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        if (error || !result) {
          reject(new Error(error?.message ?? 'Cloudinary upload failed'));
          return;
        }
        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width ?? 0,
          height: result.height ?? 0,
          format: result.format ?? '',
          bytes: result.bytes ?? 0,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
}

export async function deleteImage(publicId: string): Promise<CloudinaryDeleteResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, { invalidate: true }, (error, result) => {
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve({ result: result.result ?? 'not found' });
    });
  });
}

export async function deleteImagesByPrefix(prefix: string): Promise<number> {
  let deletedCount = 0;
  let nextCursor: string | undefined;

  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix,
      max_results: 100,
      next_cursor: nextCursor,
    });

    if (result.resources && result.resources.length > 0) {
      const publicIds = result.resources.map((r: { public_id: string }) => r.public_id);
      const deleteResult = await cloudinary.api.delete_resources(publicIds, { invalidate: true });
      deletedCount += Object.keys(deleteResult.deleted ?? {}).length;
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);

  return deletedCount;
}

export function generateImageUrl(publicId: string, options?: { width?: number; height?: number; quality?: string; format?: string }): string {
  const transformations: Record<string, string | number>[] = [];

  if (options?.width) transformations.push({ width: options.width, crop: 'limit' });
  if (options?.height) transformations.push({ height: options.height, crop: 'limit' });
  if (options?.quality) transformations.push({ quality: options.quality });
  if (options?.format) transformations.push({ fetch_format: options.format });

  return cloudinary.url(publicId, {
    secure: true,
    transformation: transformations.length > 0 ? transformations : undefined,
  });
}

export { cloudinary };