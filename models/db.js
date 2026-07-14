import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaBunSqlite } from 'prisma-adapter-bun-sqlite';

const adapter = new PrismaBunSqlite({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});

export const prisma = new PrismaClient({ adapter });
export default prisma;
