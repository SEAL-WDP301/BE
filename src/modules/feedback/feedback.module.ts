import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { MentorFeedbackController } from "./controllers/mentor-feedback.controller";
import { MentorFeedbackService } from "./services/mentor-feedback.service";

@Module({
  imports: [PrismaModule],
  controllers: [MentorFeedbackController],
  providers: [MentorFeedbackService],
  exports: [MentorFeedbackService],
})
export class FeedbackModule {}
