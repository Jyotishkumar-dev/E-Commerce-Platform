import { z } from 'zod';

// ==========================================
// User & Auth Schemas & Types
// ==========================================

export const UserRoleEnum = z.enum(['CUSTOMER', 'SELLER', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleEnum>;

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  role: UserRoleEnum,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type User = z.infer<typeof userSchema>;

export const registerRequestSchema = z.object({
  email: z.string().email('Please provide a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80).optional(),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email('Please provide a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const authResponseDataSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
});
export type AuthResponseData = z.infer<typeof authResponseDataSchema>;

// ==========================================
// Product Schemas & Types
// ==========================================

export const productSellerSchema = z.object({
  name: z.string().nullable(),
});

export const productSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().nullable(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().default('INR'),
  category: z.string(),
  imageUrl: z.string().nullable(),
  stock: z.number().int().nonnegative(),
  seller: productSellerSchema.optional(),
  isActive: z.boolean().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Product = z.infer<typeof productSchema>;

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

// ==========================================
// Cart & Wishlist Schemas & Types
// ==========================================

export const cartItemSchema = z.object({
  id: z.string(),
  cartId: z.string().optional(),
  productId: z.string().optional(),
  quantity: z.number().int().positive(),
  product: productSchema,
  isAvailable: z.boolean().optional(),
  isOutOfStock: z.boolean().optional(),
  hasSufficientStock: z.boolean().optional(),
  maxAvailable: z.number().int().optional(),
  lineTotalCents: z.number().int().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  id: z.string().optional(),
  userId: z.string().optional(),
  items: z.array(cartItemSchema),
  itemCount: z.number().int().nonnegative().optional(),
  subtotalCents: z.number().int().nonnegative().optional(),
  hasUnavailableItems: z.boolean().optional(),
});
export type Cart = z.infer<typeof cartSchema>;

export const addCartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required.'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.').max(20, 'Maximum 20 units per item.').default(1),
});
export type AddCartItemRequest = z.infer<typeof addCartItemSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative.').max(20, 'Maximum 20 units per item.'),
});
export type UpdateCartItemRequest = z.infer<typeof updateCartItemSchema>;

export const wishlistItemSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  productId: z.string(),
  product: productSchema,
  createdAt: z.string().optional(),
});
export type WishlistItem = z.infer<typeof wishlistItemSchema>;

export const addToWishlistSchema = z.object({
  productId: z.string().min(1, 'Product ID is required.'),
});
export type AddToWishlistRequest = z.infer<typeof addToWishlistSchema>;


// ==========================================
// Address Schemas & Types
// ==========================================

export const addressSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  fullName: z.string(),
  phone: z.string(),
  addressLine1: z.string(),
  addressLine2: z.string().nullable().optional(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string().default('India'),
  isDefault: z.boolean().default(false),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Address = z.infer<typeof addressSchema>;

export const createAddressSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required.').max(100),
  phone: z.string().trim().regex(/^[+]?[0-9]{10,14}$/, 'Please enter a valid 10-digit mobile number.'),
  addressLine1: z.string().trim().min(5, 'Flat / House No., Building, Street is required.').max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2, 'City is required.').max(100),
  state: z.string().trim().min(2, 'State is required.').max(100),
  postalCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit PIN code.'),
  country: z.string().trim().default('India'),
  isDefault: z.boolean().default(false),
});
export type CreateAddressRequest = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createAddressSchema.partial();
export type UpdateAddressRequest = z.infer<typeof updateAddressSchema>;

// ==========================================
// Order Schemas & Types
// ==========================================

export const OrderStatusEnum = z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const PaymentStatusEnum = z.enum(['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED']);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const PaymentProviderEnum = z.enum(['RAZORPAY', 'COD', 'STRIPE']);
export type PaymentProvider = z.infer<typeof PaymentProviderEnum>;

export const orderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  productSkuSnapshot: z.string().nullable().optional(),
  unitPriceCents: z.number().int(),
  quantity: z.number().int().positive(),
  subtotalCents: z.number().int().optional(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: OrderStatusEnum,
  subtotalCents: z.number().int().optional(),
  discountCents: z.number().int().optional(),
  shippingFeeCents: z.number().int().optional(),
  taxCents: z.number().int().optional(),
  totalCents: z.number().int(),
  shippingAddressSnapshot: z.record(z.unknown()).nullable().optional(),
  couponId: z.string().nullable().optional(),
  createdAt: z.string(),
  items: z.array(orderItemSchema),
});
export type Order = z.infer<typeof orderSchema>;


// ==========================================
// Common API & Health Schemas & Types
// ==========================================

export const apiMetaSchema = z.object({
  requestId: z.string().optional(),
  timestamp: z.string(),
});

export const apiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    statusCode: z.number().int().default(200),
    message: z.string(),
    data: dataSchema,
    meta: apiMetaSchema.optional(),
  });

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  statusCode: z.number().int().optional(),
  message: z.string(),
  errors: z.array(z.record(z.unknown())).optional(),
  meta: apiMetaSchema.optional(),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export const healthResponseSchema = z.object({
  success: z.literal(true),
  statusCode: z.literal(200),
  message: z.string(),
  data: z.object({ status: z.literal('ok') }),
  meta: z.object({ requestId: z.string().optional(), timestamp: z.string() }),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
