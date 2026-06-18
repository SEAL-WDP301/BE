import { Module } from "@nestjs/common";
import { EventOrganizerController } from "./controllers/event.organizer.controller";
import { EventPublicController } from "./controllers/event.public.controller";
import { EventOrganizerService } from "./services/event.organizer.service";
import { EventPublicService } from "./services/event.public.service";
import { CriterionService } from "./services/criterion.service";
import { RoundRankingService } from "./services/round-ranking.service";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [
    EventOrganizerController,
    EventPublicController,
  ],
  providers: [
    EventOrganizerService,
    EventPublicService,
    CriterionService,
    RoundRankingService,
  ],
  exports: [
    EventOrganizerService,
    EventPublicService,
    CriterionService,
    RoundRankingService,
  ],
})
export class EventModule {}
