import { Module } from "@nestjs/common";
import { SubmissionJudgeController } from "./controllers/submission.judge.controller";
import { SubmissionJudgeService } from "./services/submission.judge.service";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { SubmissionStudentController } from "./controllers/submission.student.controller";
import { SubmissionStudentService } from "./services/submission.student.service";
import { StorageModule } from "../../core/storage/storage.module";

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [SubmissionJudgeController, SubmissionStudentController],
  providers: [SubmissionJudgeService, SubmissionStudentService],
  exports: [SubmissionJudgeService, SubmissionStudentService],
})
export class SubmissionModule {}
