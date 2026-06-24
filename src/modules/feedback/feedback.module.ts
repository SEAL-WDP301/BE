import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { MentorFeedbackController } from "./controllers/feedback.mentor.controller";
import { MentorFeedbackService } from "./services/feedback.mentor.service";
import { FeedbackGateway } from "./gateways/feedback.gateway";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MentorFeedbackController],
  providers: [MentorFeedbackService, FeedbackGateway],
  exports: [MentorFeedbackService, FeedbackGateway],
})
export class FeedbackModule {}
