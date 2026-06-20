import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { JudgeController } from "./controllers/judge.controller";
import { JudgeService } from "./services/judge.service";

@Module({
  imports: [PrismaModule],
  controllers: [JudgeController],
  providers: [JudgeService],
  exports: [JudgeService],
})
export class JudgeModule {}
