import type { FastifyReply } from "fastify";
import type { ZodSchema } from "zod";
import { success } from "../serializers/response";

export function parseWith<T>(schema: ZodSchema<T>, value: unknown) {
  return schema.parse(value);
}

export function send(reply: FastifyReply, data: unknown, statusCode = 200, meta: Record<string, unknown> = {}) {
  return reply.status(statusCode).send(success(data, meta));
}

export function paginationMeta(total: number, page: number, limit: number) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}
