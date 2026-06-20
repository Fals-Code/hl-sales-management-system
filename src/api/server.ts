import { buildApp } from "./app";

const app = await buildApp();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error("PORT or API_PORT must be a valid TCP port.");
}

await app.listen({ port, host: "0.0.0.0" });
