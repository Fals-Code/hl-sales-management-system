import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = process.env.APP_USERNAME ?? "owner";
  const existing = await prisma.user.findUnique({ where: { username } });

  if (existing) {
    console.log(`Initial user '${username}' already exists; production seed skipped.`);
    return;
  }

  const password = process.env.APP_PASSWORD;
  const ownerPin = process.env.OWNER_PIN;
  if (!password || !ownerPin) {
    throw new Error("APP_PASSWORD and OWNER_PIN must be set before the first production start.");
  }

  const [passwordHash, ownerPinHash] = await Promise.all([
    bcrypt.hash(password, 12),
    bcrypt.hash(ownerPin, 12)
  ]);

  await prisma.user.create({
    data: { username, passwordHash, ownerPinHash }
  });
  console.log(`Initial user '${username}' created.`);
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
