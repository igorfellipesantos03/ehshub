import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // A senha inicial vem do ambiente: escrita aqui, vazaria junto com o repositório.
  const senhaInicial = process.env.SEED_ADMIN_PASSWORD;
  if (!senhaInicial) throw new Error('Defina SEED_ADMIN_PASSWORD para rodar o seed.');
  const hashedPassword = await bcrypt.hash(senhaInicial, 8);

  const admin = await prisma.user.upsert({
    where: { email: 'igor.fellipe@conasa.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      name: 'Igor Fellipe',
      status: 'APPROVED',
    },
    create: {
      email: 'igor.fellipe@conasa.com',
      name: 'Igor Fellipe',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'APPROVED',
    },
  });

  console.log('Seed executado com sucesso:', admin);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
