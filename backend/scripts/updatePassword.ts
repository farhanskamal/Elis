import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function updatePassword() {
    console.log('🔑 Updating admin password...');

    const newPassword = await bcrypt.hash('3di$onL', 12);

    await prisma.user.update({
        where: { email: 'admin@school.edu' },
        data: { password: newPassword }
    });

    console.log('✅ Password updated successfully!');
    console.log('New credentials: admin@school.edu / 3di$onL');
}

updatePassword()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
