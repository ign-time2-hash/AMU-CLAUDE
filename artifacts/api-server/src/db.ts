import './load-env.js';
import { PrismaClient } from '@amu/db';

if (!process.env['DATABASE_URL']) {
  throw new Error('DATABASE_URL não definida no .env');
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env['NODE_ENV'] === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.prisma = db;
}