import { PrismaClient } from '@prisma/client';

// Instância única do cliente Prisma para acesso ao banco de dados
const prisma = new PrismaClient();

export default prisma;
