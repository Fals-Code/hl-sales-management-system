import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./api-base-url";

describe("resolveApiBaseUrl", () => {
  it("keeps localhost when the frontend also uses localhost", () => {
    expect(resolveApiBaseUrl("http://localhost:3000", {
      hostname: "localhost",
      origin: "http://localhost:5173"
    })).toBe("http://localhost:3000");
  });

  it("uses 127.0.0.1 when the frontend is opened through 127.0.0.1", () => {
    expect(resolveApiBaseUrl("http://localhost:3000", {
      hostname: "127.0.0.1",
      origin: "http://127.0.0.1:5173"
    })).toBe("http://127.0.0.1:3000");
  });

  it("uses the LAN hostname when the frontend is opened from another device", () => {
    expect(resolveApiBaseUrl("http://localhost:3000", {
      hostname: "192.168.100.15",
      origin: "http://192.168.100.15:5173"
    })).toBe("http://192.168.100.15:3000");
  });

  it("does not rewrite a non-local API hostname", () => {
    expect(resolveApiBaseUrl("https://api.example.com", {
      hostname: "localhost",
      origin: "http://localhost:5173"
    })).toBe("https://api.example.com");
  });

  it("uses the browser origin for a same-service production deployment", () => {
    const location = {
      hostname: "hl-sales-management-app.onrender.com",
      origin: "https://hl-sales-management-app.onrender.com"
    };

    expect(resolveApiBaseUrl("/", location)).toBe(location.origin);
    expect(resolveApiBaseUrl("./", location)).toBe(location.origin);
  });
});
