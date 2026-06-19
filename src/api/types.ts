import type { PrismaClient } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthService } from "../services/authService";
import type { BonusService } from "../services/bonusService";
import type { BootstrapService } from "../services/bootstrapService";
import type { CustomerService } from "../services/customerService";
import type { ProductService } from "../services/productService";
import type { ReportingService } from "../services/reportingService";
import type { SettlementService } from "../services/settlementService";
import type { TransactionService } from "../services/transactionService";
import type { VoidService } from "../services/voidService";

export type ApiContext = {
  db: PrismaClient;
  auth: AuthService;
  bootstrap: BootstrapService;
  customers: CustomerService;
  products: ProductService;
  transactions: TransactionService;
  settlements: SettlementService;
  bonus: BonusService;
  reports: ReportingService;
  voids: VoidService;
  cookieName: string;
  cookieOptions: {
    httpOnly: true;
    sameSite: "lax";
    secure: boolean;
    path: "/";
    maxAge: number;
  };
};

export type AuthenticatedRequest = FastifyRequest & { userId: string };
export type RouteHandler = (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
