/**
 * Database Seed Script
 *
 * Creates a test tenant for development.
 * Run with: npx tsx prisma/seed.ts
 */

import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...\n');

  // Create test tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'Demo Support Portal',
      status: 'ACTIVE',
      plan: 'PRO',

      // Create related configs
      features: {
        create: {
          articlesEnabled: true,
          servicesEnabled: true,
          ticketsEnabled: true,
          discordLoginEnabled: true,
          tipsEnabled: false,
        },
      },
      branding: {
        create: {
          primaryColor: '#5865F2', // Discord blue
          logoUrl: null,
          faviconUrl: null,
          customDomain: null,
        },
      },
    },
    include: {
      features: true,
      branding: true,
    },
  });

  console.log('Created tenant:');
  console.log(`  ID:     ${tenant.id}`);
  console.log(`  Slug:   ${tenant.slug}`);
  console.log(`  Name:   ${tenant.name}`);
  console.log(`  Status: ${tenant.status}`);
  console.log(`  Plan:   ${tenant.plan}`);
  console.log('');
  console.log('Features:', tenant.features);
  console.log('Branding:', tenant.branding);
  console.log('');
  console.log('Test locally with: http://localhost:3000/support?tenant=demo');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
