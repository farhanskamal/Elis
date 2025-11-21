import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create librarian user
  const librarianPassword = await bcrypt.hash('3di$onL', 12);
  const librarian = await prisma.user.upsert({
    where: { email: 'admin@school.edu' },
    update: {},
    create: {
      name: 'Edison ADMIN',
      email: 'admin@school.edu',
      password: librarianPassword,
      role: 'LIBRARIAN',
      profilePicture: 'https://pbs.twimg.com/profile_images/1436328729282764801/-bKoMQfK_400x400.jpg',
      backgroundColor: '#f3f4f6'
    }
  });

  // Create period definitions (Edison Mon/Tue/Thu/Fri schedule)
  const periodDefinitions = [
    { period: 0, duration: 45, startTime: '07:00', endTime: '07:45' },
    { period: 1, duration: 46, startTime: '08:00', endTime: '08:46' },
    { period: 2, duration: 46, startTime: '08:49', endTime: '09:35' },
    { period: 3, duration: 46, startTime: '09:38', endTime: '10:24' },
    { period: 4, duration: 46, startTime: '10:27', endTime: '11:13' },
    { period: 5, duration: 46, startTime: '11:16', endTime: '12:02' },
    { period: 6, duration: 46, startTime: '12:05', endTime: '12:51' },
    { period: 7, duration: 46, startTime: '12:54', endTime: '13:40' },
    { period: 8, duration: 46, startTime: '13:43', endTime: '14:29' },
    { period: 9, duration: 46, startTime: '14:32', endTime: '15:18' },
  ];

  for (const def of periodDefinitions) {
    await prisma.periodDefinition.upsert({
      where: { period: def.period },
      update: def,
      create: def
    });
  }

  // Create sample magazines
  const magazines = [
    { title: 'National Geographic' },
    { title: 'Time Magazine' },
    { title: 'Scientific American' }
  ];

  for (const mag of magazines) {
    await prisma.magazine.upsert({
      where: { title: mag.title },
      update: {},
      create: mag
    });
  }

  // Create sample announcement
  await prisma.announcement.upsert({
    where: { id: 'sample-announcement' },
    update: {},
    create: {
      id: 'sample-announcement',
      title: 'Welcome to Library Monitor Hub!',
      content: 'Thank you for using Library Monitor Hub! We are excited to have our monitors back in the library.',
      authorId: librarian.id,
      authorName: librarian.name
    }
  });

  // Create initial check-in code
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await prisma.checkinCode.create({
    data: {
      code: '28Q620',
      expiresAt
    }
  });

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });