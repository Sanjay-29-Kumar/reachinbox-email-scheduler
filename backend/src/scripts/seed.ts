import prisma from '../lib/prisma';

async function main() {
  console.log('Seeding initial User and Sender...');

  const user = await prisma.user.upsert({
    where: { email: 'testuser@example.com' },
    update: {},
    create: {
      email: 'testuser@example.com',
      name: 'Test User',
    },
  });

  const sender = await prisma.sender.upsert({
    where: { id: 'test-sender-id' },
    update: {},
    create: {
      id: 'test-sender-id',
      userId: user.id,
      email: 'sender@example.com',
      name: 'Test Sender',
    },
  });

  console.log('Seed successful!');
  console.log(`User ID: ${user.id}`);
  console.log(`Sender ID: ${sender.id}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
