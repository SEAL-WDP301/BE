import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ["query", "info", "warn", "error"],
    });
  }

  async onModuleInit() {
    this.logger.log("Connecting to Prisma Client...");
    await this.$connect();
    this.logger.log("Prisma Client connected.");
  }

  async onModuleDestroy() {
    this.logger.log("Disconnecting Prisma Client...");
    await this.$disconnect();
    this.logger.log("Prisma Client disconnected.");
  }
}
