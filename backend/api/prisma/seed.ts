import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  // Seed standard accounts
  const seller = await prisma.user.upsert({
    where: { email: 'seller@shopvibe.store' },
    update: {},
    create: {
      email: 'seller@shopvibe.store',
      name: 'Demo Seller',
      phone: '+919876543210',
      passwordHash,
      role: UserRole.SELLER,
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@shopvibe.store' },
    update: {},
    create: {
      email: 'admin@shopvibe.store',
      name: 'Platform Admin',
      phone: '+919876543211',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  // Seed categories
  const categoriesData = [
    {
      name: 'Audio',
      slug: 'audio',
      description: 'Spatial acoustic headphones, lossless studio audio, and compact sound systems.',
    },
    {
      name: 'Workspace',
      slug: 'workspace',
      description: 'Precision mechanical keyboards, monitor arms, desk mats, and ergonomic gear.',
    },
    {
      name: 'Home',
      slug: 'home',
      description: 'Architectural desk lamps, ambient lighting, ceramics, and living essentials.',
    },
    {
      name: 'Travel',
      slug: 'travel',
      description: 'Weatherproof technical packs, transit gear, and modular utility cases.',
    },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: cat,
    });
    categoryMap.set(cat.name, category.id);
  }

  // Seed realistic catalog
  const products = [
    {
      id: 'seed-aerofit-headphones',
      title: 'AeroFit Precision Wireless Headphones',
      slug: 'aerofit-precision-wireless-headphones',
      description: 'Spatial audio headphones with active noise cancellation and 40-hour lossless playback.',
      priceCents: 1299900,
      compareAtPriceCents: 1599900,
      category: 'Audio',
      brand: 'AeroFit Studio',
      sku: 'AUD-AF-001',
      stock: 28,
    },
    {
      id: 'seed-studio-mechanical-keys',
      title: 'Studio Pro Mechanical Keyboard',
      slug: 'studio-pro-mechanical-keyboard',
      description: 'Custom hot-swappable mechanical keyboard with CNC aluminum frame and gasket mount.',
      priceCents: 899900,
      compareAtPriceCents: 1099900,
      category: 'Workspace',
      brand: 'Kinesis Labs',
      sku: 'WKP-KB-002',
      stock: 14,
    },
    {
      id: 'seed-form-desk-lamp',
      title: 'Form Linear Task Lamp',
      slug: 'form-linear-task-lamp',
      description: 'Adjustable dual-axis LED task lamp with warm-to-cool circadian dimming and USB-C pass-through.',
      priceCents: 499900,
      compareAtPriceCents: 649900,
      category: 'Home',
      brand: 'Form Design',
      sku: 'HOM-LP-003',
      stock: 35,
    },
    {
      id: 'seed-everyday-carry-pack',
      title: 'Nomad Everyday Carry Pack 20L',
      slug: 'nomad-everyday-carry-pack-20l',
      description: 'Weatherproof Cordura 20L backpack featuring magnetic Fidlock buckles and dedicated laptop bay.',
      priceCents: 749900,
      compareAtPriceCents: 899900,
      category: 'Travel',
      brand: 'Nomad Gear',
      sku: 'TRV-BP-004',
      stock: 19,
    },
  ];

  for (const item of products) {
    const categoryId = categoryMap.get(item.category);
    await prisma.product.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        slug: item.slug,
        description: item.description,
        priceCents: item.priceCents,
        compareAtPriceCents: item.compareAtPriceCents,
        category: item.category,
        categoryId,
        brand: item.brand,
        sku: item.sku,
        stock: item.stock,
      },
      create: {
        id: item.id,
        sellerId: seller.id,
        title: item.title,
        slug: item.slug,
        description: item.description,
        priceCents: item.priceCents,
        compareAtPriceCents: item.compareAtPriceCents,
        category: item.category,
        categoryId,
        brand: item.brand,
        sku: item.sku,
        stock: item.stock,
      },
    });
  }

  // Seed sample coupon
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: 'PERCENTAGE',
      value: 10,
      minimumOrderValueCents: 100000,
      maximumDiscountCents: 150000,
      usageLimit: 1000,
      isActive: true,
    },
  });
}

main().finally(() => prisma.$disconnect());
