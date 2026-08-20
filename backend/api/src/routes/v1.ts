import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { allowRoles, authenticate } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
import { ok } from '../utils/response.js';

const router = Router();
const authSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().trim().min(2).max(80).optional() });
const productSelect = { id: true, title: true, description: true, priceCents: true, currency: true, category: true, imageUrl: true, stock: true, seller: { select: { name: true } } } as const;

function issueToken(user: { id: string; email: string; role: 'CUSTOMER' | 'SELLER' | 'ADMIN' }) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

function invalid(response: Parameters<typeof ok>[0], message: string) {
  return response.status(422).json({ success: false, statusCode: 422, message });
}

router.post('/auth/register', async (request, response) => {
  const parsed = authSchema.safeParse(request.body);
  if (!parsed.success) return invalid(response, 'Enter a valid email and a password of at least 8 characters.');
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return response.status(409).json({ success: false, message: 'An account with that email already exists.' });
  const user = await prisma.user.create({ data: { email: parsed.data.email, name: parsed.data.name, passwordHash: await bcrypt.hash(parsed.data.password, 12) } });
  return ok(response, request, { user: { id: user.id, email: user.email, name: user.name, role: user.role }, accessToken: issueToken(user) }, 'Account created', 201);
});

router.post('/auth/login', async (request, response) => {
  const parsed = authSchema.pick({ email: true, password: true }).safeParse(request.body);
  if (!parsed.success) return invalid(response, 'Enter your email and password.');
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return response.status(401).json({ success: false, message: 'Incorrect email or password.' });
  return ok(response, request, { user: { id: user.id, email: user.email, name: user.name, role: user.role }, accessToken: issueToken(user) }, 'Signed in');
});

router.get('/products', async (request, response) => {
  const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
  const category = typeof request.query.category === 'string' ? request.query.category : undefined;
  const products = await prisma.product.findMany({
    where: { isActive: true, ...(category ? { category } : {}), ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }] } : {}) },
    select: productSelect,
    orderBy: { createdAt: 'desc' },
  });
  return ok(response, request, { products, categories: [...new Set(products.map((product) => product.category))] }, 'Products fetched');
});

router.get('/products/:productId', async (request, response) => {
  const product = await prisma.product.findFirst({ where: { id: request.params.productId, isActive: true }, select: productSelect });
  if (!product) return response.status(404).json({ success: false, message: 'Product not found.' });
  return ok(response, request, { product });
});

router.get('/cart', authenticate, async (request, response) => {
  const cart = await prisma.cart.findUnique({ where: { userId: request.user!.id }, include: { items: { include: { product: { select: productSelect } } } } });
  return ok(response, request, { cart: cart ?? { items: [] } });
});

router.post('/cart/items', authenticate, async (request, response) => {
  const parsed = z.object({ productId: z.string(), quantity: z.coerce.number().int().min(1).max(20).default(1) }).safeParse(request.body);
  if (!parsed.success) return invalid(response, 'Select a valid product quantity.');
  const product = await prisma.product.findFirst({ where: { id: parsed.data.productId, isActive: true } });
  if (!product || product.stock < parsed.data.quantity) return response.status(409).json({ success: false, message: 'That product is unavailable in the requested quantity.' });
  const cart = await prisma.cart.upsert({ where: { userId: request.user!.id }, update: {}, create: { userId: request.user!.id } });
  await prisma.cartItem.upsert({ where: { cartId_productId: { cartId: cart.id, productId: product.id } }, update: { quantity: { increment: parsed.data.quantity } }, create: { cartId: cart.id, productId: product.id, quantity: parsed.data.quantity } });
  return ok(response, request, null, 'Added to cart', 201);
});

router.patch('/cart/items/:productId', authenticate, async (request, response) => {
  const parsed = z.object({ quantity: z.coerce.number().int().min(0).max(20) }).safeParse(request.body);
  if (!parsed.success) return invalid(response, 'Select a valid quantity.');
  const productId = z.string().min(1).parse(request.params.productId);
  const cart = await prisma.cart.findUnique({ where: { userId: request.user!.id } });
  if (!cart) return response.status(404).json({ success: false, message: 'Cart not found.' });
  if (parsed.data.quantity === 0) await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  else await prisma.cartItem.update({ where: { cartId_productId: { cartId: cart.id, productId } }, data: { quantity: parsed.data.quantity } });
  return ok(response, request, null, 'Cart updated');
});

router.post('/orders', authenticate, async (request, response) => {
  const cart = await prisma.cart.findUnique({ where: { userId: request.user!.id }, include: { items: { include: { product: true } } } });
  if (!cart?.items.length) return response.status(409).json({ success: false, message: 'Your cart is empty.' });
  if (cart.items.some((item) => item.quantity > item.product.stock)) return response.status(409).json({ success: false, message: 'One or more products are out of stock.' });
  const order = await prisma.$transaction(async (tx) => {
    const totalCents = cart.items.reduce((sum, item) => sum + item.product.priceCents * item.quantity, 0);
    const created = await tx.order.create({ data: { userId: request.user!.id, totalCents, status: 'CONFIRMED', items: { create: cart.items.map((item) => ({ productId: item.productId, productTitle: item.product.title, unitPriceCents: item.product.priceCents, quantity: item.quantity })) } }, include: { items: true } });
    await Promise.all(cart.items.map((item) => tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })));
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    return created;
  });
  return ok(response, request, { order }, 'Order placed', 201);
});

router.get('/orders', authenticate, async (request, response) => {
  const orders = await prisma.order.findMany({ where: { userId: request.user!.id }, include: { items: true }, orderBy: { createdAt: 'desc' } });
  return ok(response, request, { orders });
});

router.get('/admin/overview', authenticate, allowRoles('ADMIN'), async (request, response) => {
  const [users, products, orders, revenue] = await Promise.all([prisma.user.count(), prisma.product.count(), prisma.order.count(), prisma.order.aggregate({ _sum: { totalCents: true } })]);
  return ok(response, request, { users, products, orders, revenueCents: revenue._sum.totalCents ?? 0 });
});

router.post('/ai/recommendations', async (request, response) => {
  const products = await prisma.product.findMany({ where: { isActive: true, stock: { gt: 0 } }, select: productSelect, take: 4, orderBy: { createdAt: 'desc' } });
  return ok(response, request, { products, explanation: 'Recommendations are based on catalog relevance and availability. Connect OPENAI_API_KEY or GEMINI_API_KEY to enable personalised ranking.' }, 'Recommendations ready');
});

export { router as v1Router };
