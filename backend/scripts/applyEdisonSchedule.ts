import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⏰ Applying Edison 2023-2024 bell schedule...');
  const edisonPeriods = [
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

  for (const def of edisonPeriods) {
    await prisma.periodDefinition.upsert({
      where: { period: def.period },
      update: def,
      create: def,
    });
  }
  console.log('✅ Edison bell schedule applied to period definitions.');
}

main()
  .catch((e) => {
    console.error('❌ Error applying schedule:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
