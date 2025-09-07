import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create librarian user
  const librarianPassword = await bcrypt.hash('password123', 12);
  const librarian = await prisma.user.upsert({
    where: { email: 'admin@school.edu' },
    update: {},
    create: {
      name: 'Dr. Anya Sharma',
      email: 'admin@school.edu',
      password: librarianPassword,
      role: 'LIBRARIAN',
      profilePicture: 'https://picsum.photos/seed/librarian/100/100',
      backgroundColor: '#f3f4f6'
    }
  });

  // Create volunteer users
  const volunteerPassword = await bcrypt.hash('password123', 12);
  const volunteer1 = await prisma.user.upsert({
    where: { email: 'ben@student.school.edu' },
    update: {},
    create: {
      name: 'Ben Carter',
      email: 'ben@student.school.edu',
      password: volunteerPassword,
      role: 'VOLUNTEER',
      profilePicture: 'https://picsum.photos/seed/ben/100/100',
      backgroundColor: '#f3f4f6'
    }
  });

  const volunteer2 = await prisma.user.upsert({
    where: { email: 'chloe@student.school.edu' },
    update: {},
    create: {
      name: 'Chloe Davis',
      email: 'chloe@student.school.edu',
      password: volunteerPassword,
      role: 'VOLUNTEER',
      profilePicture: 'https://picsum.photos/seed/chloe/100/100',
      backgroundColor: '#f3f4f6'
    }
  });

  // Create period definitions
  const periodDefinitions = [
    { period: 1, duration: 50, startTime: '08:00', endTime: '08:50' },
    { period: 2, duration: 50, startTime: '08:55', endTime: '09:45' },
    { period: 3, duration: 50, startTime: '09:50', endTime: '10:40' },
    { period: 4, duration: 50, startTime: '10:45', endTime: '11:35' },
    { period: 5, duration: 50, startTime: '11:40', endTime: '12:30' },
    { period: 6, duration: 50, startTime: '12:35', endTime: '13:25' },
    { period: 7, duration: 50, startTime: '13:30', endTime: '14:20' },
    { period: 8, duration: 50, startTime: '14:25', endTime: '15:15' },
    { period: 9, duration: 50, startTime: '15:20', endTime: '16:10' },
  ];

  for (const def of periodDefinitions) {
    await prisma.periodDefinition.upsert({
      where: { period: def.period },
      update: def,
      create: def
    });
  }

  // Create sample shifts
  const shift1 = await prisma.shift.upsert({
    where: { date_period: { date: '2024-07-29', period: 3 } },
    update: {},
    create: {
      date: '2024-07-29',
      period: 3,
      assignments: {
        create: {
          volunteerId: volunteer1.id
        }
      }
    }
  });

  const shift2 = await prisma.shift.upsert({
    where: { date_period: { date: '2024-07-29', period: 4 } },
    update: {},
    create: {
      date: '2024-07-29',
      period: 4,
      assignments: {
        create: {
          volunteerId: volunteer2.id
        }
      }
    }
  });

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
      title: 'Welcome Back!',
      content: 'Welcome back to a new school year! We are excited to have our volunteers back in the library.',
      authorId: librarian.id,
      authorName: librarian.name
    }
  });

  // Create sample tasks
  const task1 = await prisma.task.create({
    data: {
      title: 'Organize Biography Section',
      description: 'Please organize the biography section (920-929) alphabetically by subject last name.',
      priority: 'MEDIUM',
      dueDate: '2024-08-15',
      assignments: {
        create: [
          { volunteerId: volunteer1.id },
          { volunteerId: volunteer2.id }
        ]
      },
      statuses: {
        create: [
          { volunteerId: volunteer1.id, status: 'PENDING' },
          { volunteerId: volunteer2.id, status: 'PENDING' }
        ]
      }
    }
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Prepare New Book Cart',
      description: 'Get the cart of new books ready for shelving. This includes stamping and adding security tags.',
      priority: 'HIGH',
      dueDate: '2024-08-01',
      assignments: {
        create: {
          volunteerId: volunteer1.id
        }
      },
      statuses: {
        create: {
          volunteerId: volunteer1.id,
          status: 'COMPLETED',
          completedAt: new Date()
        }
      }
    }
  });

  // Create sample volunteer logs
  await prisma.volunteerLog.create({
    data: {
      volunteerId: volunteer1.id,
      volunteerName: volunteer1.name,
      date: '2024-07-22',
      period: 3,
      checkIn: '10:05',
      checkOut: '10:50',
      durationMinutes: 45
    }
  });

  await prisma.volunteerLog.create({
    data: {
      volunteerId: volunteer2.id,
      volunteerName: volunteer2.name,
      date: '2024-07-22',
      period: 4,
      checkIn: '11:00',
      checkOut: '11:45',
      durationMinutes: 45
    }
  });

  // Create initial check-in code
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  
  await prisma.checkinCode.create({
    data: {
      code: '123456',
      expiresAt
    }
  });

  console.log('✅ Database seeded successfully!');
  console.log('📧 Login credentials:');
  console.log('   Librarian: admin@school.edu / password123');
  console.log('   Volunteer: ben@student.school.edu / password123');
  console.log('   Volunteer: chloe@student.school.edu / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });