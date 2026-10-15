import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Usuários cadastrados:', users.map(u => ({ id: u.id, email: u.email })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
