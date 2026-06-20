import { Module } from "@nestjs/common";
import { SubmissionJudgeController } from "./controllers/submission.judge.controller";
import { SubmissionJudgeService } from "./services/submission.judge.service";
import { PrismaModule } from "../../database/prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [SubmissionJudgeController],
  providers: [SubmissionJudgeService],
  exports: [SubmissionJudgeService],
})
export class SubmissionModule {}
