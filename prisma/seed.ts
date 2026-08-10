import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Seed Categories ─────────────────────────────────────────────────────
  const categories = [
    { name: 'Technology', slug: 'technology', iconName: 'Cpu', color: '#7c3aed', description: 'Cutting-edge tech and software projects' },
    { name: 'Art & Creative', slug: 'art-creative', iconName: 'Palette', color: '#f59e0b', description: 'Creative arts, design, and cultural projects' },
    { name: 'Health', slug: 'health', iconName: 'Activity', color: '#10b981', description: 'Healthcare and wellness initiatives' },
    { name: 'Community', slug: 'community', iconName: 'Users', color: '#06b6d4', description: 'Community-driven social impact projects' },
    { name: 'Environment', slug: 'environment', iconName: 'Leaf', color: '#34d399', description: 'Sustainability and environmental projects' },
    { name: 'Education', slug: 'education', iconName: 'Globe', color: '#8b5cf6', description: 'Learning, training, and educational initiatives' },
    { name: 'Music', slug: 'music', iconName: 'Music', color: '#ec4899', description: 'Music production and events' },
    { name: 'Games', slug: 'games', iconName: 'Gamepad', color: '#f97316', description: 'Game development and esports' },
    { name: 'Food', slug: 'food', iconName: 'Utensils', color: '#eab308', description: 'Food, beverages, and culinary projects' },
    { name: 'Sports', slug: 'sports', iconName: 'Trophy', color: '#14b8a6', description: 'Sports, fitness, and athletic endeavors' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: cat,
      create: cat,
    });
  }

  console.log(`✅ Seeded ${categories.length} categories`);

  // ─── Seed Admin User ─────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { uid: 'admin-seed-uid' },
    update: {},
    create: {
      uid: 'admin-seed-uid',
      name: 'FundForge Admin',
      email: 'admin@fundforge.io',
      role: 'admin',
      credits: 9999,
    },
  });

  console.log(`✅ Admin user ready: ${adminUser.email}`);
  console.log('');
  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
