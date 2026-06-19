import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./api-base-url";

describe("resolveApiBaseUrl", () => {
  it("keeps localhost when the frontend also uses localhost", () => {
    expect(resolveApiBaseUrl("http://localhost:3000", { hostname: "localhost" }))
      .toBe("http://localhost:3000");
  });

  it("uses 127.0.0.1 when the frontend is opened through 127.0.0.1", () => {
    expect(resolveApiBaseUrl("http://localhost:3000", { hostname: "127.0.0.1" }))
      .toBe("http://127.0.0.1:3000");
  });

  it("uses the LAN hostname when the frontend is opened from another device", () => {
    expect(resolveApiBaseUrl("http://localhost:3000", { hostname: "192.168.100.15" }))
      .toBe("http://192.168.100.15:3000");
  });

  it("does not rewrite a non-local API hostname", () => {
    expect(resolveApiBaseUrl("https://api.example.com", { hostname: "localhost" }))
      .toBe("https://api.example.com");
  });
});
