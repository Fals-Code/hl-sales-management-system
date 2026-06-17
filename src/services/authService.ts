import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { AUTHORIZATION_TYPE } from "../domain/constants";
import { AuthorizationError, BusinessError } from "../domain/errors";

export class AuthService {
  constructor(private readonly db: PrismaClient) {}

  async login(username: string, password: string) {
    const user = await this.db.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new BusinessError("Invalid username or password.");
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashSecret(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
    await this.db.session.create({
      data: { tokenHash, userId: user.id, expiresAt }
    });
    return { token, userId: user.id, expiresAt };
  }

  async getUserBySession(token: string) {
    const session = await this.db.session.findUnique({
      where: { tokenHash: hashSecret(token) },
      include: { user: true }
    });
    if (!session || session.expiresAt <= new Date()) return null;
    return session.user;
  }

  async logout(token: string) {
    await this.db.session.deleteMany({ where: { tokenHash: hashSecret(token) } });
  }

  async validateOwnerPin(userId: string, ownerPin: string) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(ownerPin, user.ownerPinHash))) {
      throw new AuthorizationError("Invalid Owner PIN.");
    }
    return true;
  }

  async authorizeOwner(input: {
    userId: string;
    ownerPin: string;
    type: keyof typeof AUTHORIZATION_TYPE;
    reason: string;
    context?: unknown;
  }) {
    await this.validateOwnerPin(input.userId, input.ownerPin);
    if (!input.reason.trim()) throw new AuthorizationError("Authorization reason is required.");
    return this.db.authorizationRecord.create({
      data: {
        userId: input.userId,
        type: input.type,
        reason: input.reason,
        context: input.context ? JSON.stringify(input.context, jsonSafeReplacer) : undefined
      }
    });
  }
}

export function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function jsonSafeReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") return value.toString();
  return value;
}
