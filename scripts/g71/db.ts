/** scripts/g71/db.ts — G71. PrismaClient de las sondas (entorno ya cargado). */
import './env';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
