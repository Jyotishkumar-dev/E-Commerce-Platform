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
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Workspace',
      slug: 'workspace',
      description: 'Precision mechanical keyboards, monitor arms, desk mats, and ergonomic gear.',
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Home',
      slug: 'home',
      description: 'Architectural desk lamps, ambient lighting, ceramics, and living essentials.',
      imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Travel',
      slug: 'travel',
      description: 'Weatherproof technical packs, transit gear, and modular utility cases.',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
    },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description, imageUrl: cat.imageUrl },
      create: cat,
    });
    categoryMap.set(cat.name, category.id);
  }

  // Seed realistic catalog
  const products = [
    // --- Audio ---
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
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      stock: 28,
    },
    {
      id: 'seed-spatial-pod-pro',
      title: 'SonicWave Spatial Earbuds',
      slug: 'sonicwave-spatial-earbuds',
      description: 'True wireless in-ear monitors with adaptive active noise cancellation and wireless charging case.',
      priceCents: 699900,
      compareAtPriceCents: 899900,
      category: 'Audio',
      brand: 'SonicWave Acoustics',
      sku: 'AUD-SW-002',
      imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
      stock: 45,
    },
    {
      id: 'seed-acoustic-speaker',
      title: 'VibeBar Walnut Acoustic Speaker',
      slug: 'vibebar-walnut-acoustic-speaker',
      description: 'Handcrafted natural walnut wireless desktop soundbar featuring dual passive radiators and aptX HD audio.',
      priceCents: 1049900,
      compareAtPriceCents: 1299900,
      category: 'Audio',
      brand: 'Shopvibe Studio',
      sku: 'AUD-VB-003',
      imageUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
      stock: 8,
    },

    // --- Workspace ---
    {
      id: 'seed-studio-mechanical-keys',
      title: 'Studio Pro Mechanical Keyboard',
      slug: 'studio-pro-mechanical-keyboard',
      description: 'Custom hot-swappable mechanical keyboard with CNC aluminum frame, lubricated switches, and gasket mount.',
      priceCents: 899900,
      compareAtPriceCents: 1099900,
      category: 'Workspace',
      brand: 'Kinesis Labs',
      sku: 'WKP-KB-002',
      imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
      stock: 14,
    },
    {
      id: 'seed-ergonomic-mouse',
      title: 'ErgoGlide Precision Wireless Mouse',
      slug: 'ergoglide-precision-wireless-mouse',
      description: 'Contoured ergonomic wireless mouse with silent magnetic scroll wheel and dual-device Bluetooth connectivity.',
      priceCents: 349900,
      compareAtPriceCents: 449900,
      category: 'Workspace',
      brand: 'Kinesis Labs',
      sku: 'WKP-MS-005',
      imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=800&q=80',
      stock: 32,
    },
    {
      id: 'seed-merino-desk-mat',
      title: 'Merino Wool Felt Desk Pad',
      slug: 'merino-wool-felt-desk-pad',
      description: 'Premium 4mm non-slip felt desk organizer mat crafted from natural anti-fray Australian wool fibers.',
      priceCents: 219900,
      compareAtPriceCents: 279900,
      category: 'Workspace',
      brand: 'Shopvibe Studio',
      sku: 'WKP-DP-006',
      imageUrl: 'https://images.unsplash.com/photo-1628191010210-a59de33e5941?auto=format&fit=crop&w=800&q=80',
      stock: 50,
    },

    // --- Home ---
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
      imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
      stock: 35,
    },
    {
      id: 'seed-ceramic-carafe',
      title: 'Terra Stoneware Water Carafe & Tumbler',
      slug: 'terra-stoneware-water-carafe-tumbler',
      description: 'Artisan-thrown matte ceramic bedside carafe set with nesting tumbler and lead-free natural glaze.',
      priceCents: 189900,
      compareAtPriceCents: 249900,
      category: 'Home',
      brand: 'Terra Craft',
      sku: 'HOM-CR-008',
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
      stock: 22,
    },
    {
      id: 'seed-diffuser',
      title: 'Aura Ultrasonic Stone Diffuser',
      slug: 'aura-ultrasonic-stone-diffuser',
      description: 'Minimalist porcelain ultrasonic aroma diffuser with ambient halo glow and 8-hour continuous misting.',
      priceCents: 379900,
      compareAtPriceCents: 499900,
      category: 'Home',
      brand: 'Aura Living',
      sku: 'HOM-DF-009',
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80',
      stock: 15,
    },

    // --- Travel ---
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
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
      stock: 19,
    },
    {
      id: 'seed-tech-folio',
      title: 'Apex Tech Organizer Folio',
      slug: 'apex-tech-organizer-folio',
      description: 'Structured ballistic nylon cable and accessory organizer with elastic loop grid and water-resistant YKK zippers.',
      priceCents: 249900,
      compareAtPriceCents: 329900,
      category: 'Travel',
      brand: 'Nomad Gear',
      sku: 'TRV-FO-011',
      imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
      stock: 40,
    },
    {
      id: 'seed-transit-bottle',
      title: 'Insulated Vacuum Transit Flask 650ml',
      slug: 'insulated-vacuum-transit-flask-650ml',
      description: 'Double-wall 18/8 stainless steel thermal flask with leakproof magnetic cap keeping beverages cold for 24h.',
      priceCents: 169900,
      compareAtPriceCents: 219900,
      category: 'Travel',
      brand: 'Nomad Gear',
      sku: 'TRV-FL-012',
      imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
      stock: 60,
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
        imageUrl: item.imageUrl,
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
        imageUrl: item.imageUrl,
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
