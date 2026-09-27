const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@vapepos.com' } });
  if (existing) {
    console.log('Admin user already exists!');
    console.log('Email: admin@vapepos.com');
    return;
  }
  const hash = await bcrypt.hash('Admin123!', 12);
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@vapepos.com',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
    }
  });
  console.log('Admin user created!');
  console.log('Email: admin@vapepos.com');
  console.log('Password: Admin123!');
  console.log('Role: SUPER_ADMIN');
}

main()
  .catch(console.error)
  .finally(async () => { await prisma.$disconnect(); });
