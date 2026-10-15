import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // A senha inicial vem do ambiente: escrita aqui, vazaria junto com o repositório.
  const senhaInicial = process.env.SEED_ADMIN_PASSWORD;
  if (!senhaInicial) throw new Error('Defina SEED_ADMIN_PASSWORD para rodar o seed.');
  const hashedPassword = await bcrypt.hash(senhaInicial, 8);

  const user = await prisma.user.upsert({
    where: { email: 'igor.fellipe@conasa.com' },
    update: {
      password: hashedPassword,
      role: 'ADMIN'
    },
    create: {
      email: 'igor.fellipe@conasa.com',
      password: hashedPassword,
      name: 'Igor Fellipe',
      role: 'ADMIN',
    },
  });

  console.log('✅ Usuário ADMIN registrado com sucesso:', {
    id: user.id,
    email: user.email,
    role: user.role
  });
}

main()
  .catch((e) => {
    console.error('❌ Erro ao criar usuário:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
