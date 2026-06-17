import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ApiContext } from "../types";
import { reportFilterSchema } from "../schemas/common";
import { send } from "./helpers";

export function registerReportRoutes(app: FastifyInstance, ctx: ApiContext) {
  app.get("/api/v1/reports/customers", async (request, reply) => {
    const filters = toReportFilters(reportFilterSchema.parse(request.query));
    const customers = await ctx.db.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" } });
    return send(reply, await Promise.all(customers.map((customer) => ctx.reports.byCustomer(customer.id, filters))));
  });

  app.get("/api/v1/reports/customers/:id", async (request, reply) => {
    const params = z.object({ id: z.string().min(1) }).parse(request.params);
    return send(reply, await ctx.reports.byCustomer(params.id, toReportFilters(reportFilterSchema.parse(request.query))));
  });

  app.get("/api/v1/reports/lm", async (request, reply) => send(reply, await ctx.reports.lmRecap(toReportFilters(reportFilterSchema.parse(request.query)))));
  app.get("/api/v1/reports/br", async (request, reply) => send(reply, await ctx.reports.brRecap(toReportFilters(reportFilterSchema.parse(request.query)))));
  app.get("/api/v1/reports/overall", async (request, reply) => send(reply, await ctx.reports.overall(toReportFilters(reportFilterSchema.parse(request.query)))));
  app.get("/api/v1/reports/negative-profit", async (request, reply) => send(reply, await ctx.reports.negativeProfitTransactions(toReportFilters(reportFilterSchema.parse(request.query)))));
}

export function toReportFilters(query: z.infer<typeof reportFilterSchema>) {
  return {
    customerId: query.customerId,
    month: query.month,
    year: query.year,
    productType: query.productType,
    status: query.status,
    bonDateFrom: query.transactionDateFrom ? new Date(query.transactionDateFrom) : undefined,
    bonDateTo: query.transactionDateTo ? new Date(query.transactionDateTo) : undefined,
    paidAtFrom: query.paymentDateFrom ? new Date(query.paymentDateFrom) : undefined,
    paidAtTo: query.paymentDateTo ? new Date(query.paymentDateTo) : undefined
  };
}
