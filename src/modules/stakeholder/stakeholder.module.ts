import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { StakeholderOrganizerController } from "./controllers/stakeholder.organizer.controller";
import { StakeholderMentorController } from "./controllers/stakeholder.mentor.controller";
import { StakeholderOrganizerService } from "./services/stakeholder.organizer.service";
import { StakeholderMentorService } from "./services/stakeholder.mentor.service";

@Module({
  imports: [PrismaModule],
  controllers: [StakeholderOrganizerController, StakeholderMentorController],
  providers: [StakeholderOrganizerService, StakeholderMentorService],
  exports: [StakeholderOrganizerService],
})
export class StakeholderModule {}
