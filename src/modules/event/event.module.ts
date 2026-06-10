import { Module } from "@nestjs/common";
import { EventOrganizerController } from "./controllers/event.organizer.controller";
import { EventPublicController } from "./controllers/event.public.controller";
import { EventOrganizerService } from "./services/event.organizer.service";
import { EventPublicService } from "./services/event.public.service";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [
    EventOrganizerController,
    EventPublicController,
  ],
  providers: [EventOrganizerService, EventPublicService],
  exports: [EventOrganizerService, EventPublicService],
})
export class EventModule {}
