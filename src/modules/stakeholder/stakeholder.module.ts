import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { StakeholderOrganizerController } from "./controllers/stakeholder.organizer.controller";
import { StakeholderOrganizerService } from "./services/stakeholder.organizer.service";

@Module({
  imports: [PrismaModule],
  controllers: [StakeholderOrganizerController],
  providers: [StakeholderOrganizerService],
  exports: [StakeholderOrganizerService],
})
export class StakeholderModule {}
