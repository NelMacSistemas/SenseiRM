import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
try {
  const prisma = new PrismaClient();
  console.log("Success empty constructor!");
} catch(e) {
  console.error("Failed empty constructor!", e.message);
}
