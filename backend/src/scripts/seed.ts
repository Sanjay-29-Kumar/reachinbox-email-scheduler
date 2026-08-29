import prisma from '../lib/prisma';

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'testuser@example.com' },
    update: {},
    create: {
      email: 'testuser@example.com',
      name: 'Test User',
    },
  });

  await prisma.sender.upsert({
    where: { id: 'test-sender-id' },
    update: {},
    create: {
      id: 'test-sender-id',
      userId: user.id,
      email: 'senderA@example.com',
      name: 'Sender A',
    },
  });

  await prisma.sender.upsert({
    where: { id: 'sender-B-id' },
    update: {},
    create: {
      id: 'sender-B-id',
      userId: user.id,
      email: 'senderB@example.com',
      name: 'Sender B',
    },
  });

  console.log('Seeded Sender A and Sender B successfully');
}

main().finally(async () => {
  await prisma.$disconnect();
});
