import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestContext, createUser, resetDb, TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestContext("auth-test");
});

beforeEach(async () => {
  if (ctx) await resetDb(ctx.db);
});
afterAll(async () => {
  if (ctx) await ctx.db.$disconnect();
});

describe("authentication and Owner PIN", () => {
  it("logs in, stores hashed session token, reads session, and logs out", async () => {
    const user = await createUser(ctx.db);
    const session = await ctx.auth.login("owner", "secret");
    expect(session.userId).toBe(user.id);
    expect(await ctx.auth.getUserBySession(session.token)).toMatchObject({ id: user.id });
    expect(await ctx.db.session.findFirst({ where: { tokenHash: session.token } })).toBeNull();
    await ctx.auth.logout(session.token);
    expect(await ctx.auth.getUserBySession(session.token)).toBeNull();
  });

  it("rejects wrong password and wrong Owner PIN", async () => {
    const user = await createUser(ctx.db);
    await expect(ctx.auth.login("owner", "wrong")).rejects.toThrow("Invalid username or password");
    await expect(ctx.auth.validateOwnerPin(user.id, "000000")).rejects.toThrow("Invalid Owner PIN");
  });

  it("requires an authorization reason for sensitive actions", async () => {
    const user = await createUser(ctx.db);
    await expect(ctx.auth.authorizeOwner({ userId: user.id, ownerPin: "123456", type: "VOID_BON", reason: "" })).rejects.toThrow("reason");
  });
});
