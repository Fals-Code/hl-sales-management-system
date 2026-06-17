import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AuthorizationError, BusinessError, ValidationError } from "../../domain/errors";
import { failure } from "../serializers/response";
import { HttpError } from "./httpErrors";

export function errorHandler(error: FastifyError | Error, _request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof HttpError) {
    return reply.status(error.statusCode).send(failure(error.code, error.message, error.fields));
  }
  if (error instanceof ZodError) {
    const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]));
    return reply.status(400).send(failure("VALIDATION_ERROR", "Request tidak valid.", fields));
  }
  if (error instanceof AuthorizationError) {
    return reply.status(403).send(failure("FORBIDDEN", error.message));
  }
  if (error instanceof ValidationError) {
    return reply.status(400).send(failure("VALIDATION_ERROR", error.message));
  }
  if (error instanceof BusinessError) {
    const status = businessStatus(error.message);
    return reply.status(status).send(failure(status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : "BUSINESS_RULE_REJECTED", error.message));
  }
  return reply.status(500).send(failure("INTERNAL_SERVER_ERROR", "Server error."));
}

function businessStatus(message: string) {
  const text = message.toLowerCase();
  if (text.includes("not found") || text.includes("invalid")) return 404;
  if (text.includes("already") || text.includes("changed state") || text.includes("duplicate")) return 409;
  return 422;
}
