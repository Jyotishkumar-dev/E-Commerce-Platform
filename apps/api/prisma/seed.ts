import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);
  const seller = await prisma.user.upsert({
    where: { email: 'seller@smartcommerce.local' },
    update: {},
    create: { email: 'seller@smartcommerce.local', name: 'Demo Seller', passwordHash, role: UserRole.SELLER },
  });
  await prisma.user.upsert({
    where: { email: 'admin@smartcommerce.local' },
    update: {},
    create: { email: 'admin@smartcommerce.local', name: 'Platform Admin', passwordHash, role: UserRole.ADMIN },
  });
  const products = [
    ['AeroFit Headphones', 'Spatial audio headphones with a 40-hour battery.', 12999, 'Audio', 18],
    ['Form Desk Lamp', 'Adjustable LED desk lamp with warm-to-cool light.', 4999, 'Home', 24],
    ['Everyday Carry Pack', 'Weatherproof 20L backpack made for work and weekends.', 7499, 'Travel', 12],
    ['Studio Mechanical Keys', 'Tactile compact keyboard with hot-swappable switches.', 8999, 'Workspace', 9],
  ] as const;
  for (const [title, description, priceCents, category, stock] of products) {
    await prisma.product.upsert({
      where: { id: `seed-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` },
      update: {},
      create: { id: `seed-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, sellerId: seller.id, title, description, priceCents, category, stock },
    });
  }
}

main().finally(() => prisma.$disconnect());
