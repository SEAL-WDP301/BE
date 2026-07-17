import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { OrganizerDashboardModule } from "../organizer-dashboard/organizer-dashboard.module";
import { OrganizerNotificationsController } from "./organizer-notifications.controller";
import { OrganizerNotificationsService } from "./organizer-notifications.service";

@Module({
  imports: [PrismaModule, MailModule, OrganizerDashboardModule],
  controllers: [OrganizerNotificationsController],
  providers: [OrganizerNotificationsService],
})
export class OrganizerNotificationsModule {}
