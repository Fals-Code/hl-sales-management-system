import { Prisma } from "@prisma/client";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AuthorizationError, BusinessError, ValidationError } from "../../domain/errors";
import { failure } from "../serializers/response";
import { HttpError } from "./httpErrors";

export function errorHandler(error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof HttpError) {
    return reply.status(error.statusCode).send(failure(error.code, error.message, error.fields));
  }
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join(".") || "request", issue.message]));
    return reply.status(400).send(failure("VALIDATION_ERROR", "Request tidak valid.", fields));
  }
  if (error instanceof AuthorizationError) {
    return reply.status(403).send(failure("FORBIDDEN", error.message));
  }
  if (error instanceof ValidationError) {
    return reply.status(400).send(failure("VALIDATION_ERROR", error.message));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return reply.status(404).send(failure("NOT_FOUND", "Data tidak ditemukan."));
    if (error.code === "P2002") return reply.status(409).send(failure("DUPLICATE_VALUE", "Data dengan nilai unik tersebut sudah ada."));
    if (error.code === "P2003") return reply.status(409).send(failure("REFERENCE_CONFLICT", "Data masih digunakan oleh data lain."));
  }
  if (error instanceof BusinessError) {
    const status = businessStatus(error.message);
    const code = status === 401 ? "UNAUTHENTICATED" : status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : "BUSINESS_RULE_REJECTED";
    return reply.status(status).send(failure(code, error.message));
  }
  request.log.error({ err: error }, "Unhandled API error");
  return reply.status(500).send(failure("INTERNAL_SERVER_ERROR", "Server error."));
}

function businessStatus(message: string) {
  const text = message.toLowerCase();
  if (text.includes("invalid username or password")) return 401;
  if (text.includes("not found")) return 404;
  if (text.includes("already") || text.includes("changed state") || text.includes("duplicate") || text.includes("unique")) return 409;
  return 422;
}
