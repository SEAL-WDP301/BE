import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { OrganizerDashboardController } from "./organizer-dashboard.controller";
import { OrganizerDashboardRepository } from "./organizer-dashboard.repository";
import { OrganizerDashboardService } from "./organizer-dashboard.service";
import { OrganizerEventAccessService } from "./organizer-event-access.service";

@Module({
  imports: [PrismaModule],
  controllers: [OrganizerDashboardController],
  providers: [
    OrganizerDashboardService,
    OrganizerDashboardRepository,
    OrganizerEventAccessService,
  ],
  exports: [OrganizerEventAccessService],
})
export class OrganizerDashboardModule {}
