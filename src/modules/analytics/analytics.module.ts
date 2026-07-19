import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { AnalyticsOrganizerController } from "./controllers/analytics.organizer.controller";
import { AnalyticsOrganizerRepository } from "./repositories/analytics.organizer.repository";
import { AnalyticsOrganizerService } from "./services/analytics.organizer.service";
import { OrganizerEventAccessService } from "./services/organizer-event-access.service";

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsOrganizerController],
  providers: [
    AnalyticsOrganizerService,
    AnalyticsOrganizerRepository,
    OrganizerEventAccessService,
  ],
  exports: [OrganizerEventAccessService],
})
export class AnalyticsModule {}
