import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.APP_USERNAME ?? "owner";
  const password = process.env.APP_PASSWORD;
  const ownerPin = process.env.OWNER_PIN;

  if (!password || !ownerPin) {
    throw new Error("APP_PASSWORD and OWNER_PIN must be set before running the seeder.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const ownerPinHash = await bcrypt.hash(ownerPin, 12);

  await prisma.user.upsert({
    where: { username },
    update: { passwordHash, ownerPinHash },
    create: { username, passwordHash, ownerPinHash }
  });
}

void (async () => {
  try {
    await main();
  } catch (error) {
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
