import { Module } from "@nestjs/common";
import { EventOrganizerController } from "./controllers/event.organizer.controller";
import { EventStudentController } from "./controllers/event.student.controller";
import { EventPublicController } from "./controllers/event.public.controller";
import { EventOrganizerService } from "./services/event.organizer.service";
import { EventStudentService } from "./services/event.student.service";
import { EventPublicService } from "./services/event.public.service";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [
    EventOrganizerController,
    EventStudentController,
    EventPublicController,
  ],
  providers: [EventOrganizerService, EventStudentService, EventPublicService],
  exports: [EventOrganizerService, EventStudentService, EventPublicService],
})
export class EventModule {}
