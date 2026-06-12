import { Module } from "@nestjs/common";
import { TeamStudentService } from "./services/team.student.service";
import { TeamOrganizerService } from "./services/team.organizer.service";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { StorageModule } from "../storage/storage.module";
import { TeamStudentController } from "./controllers/team.student.controller";
import { TeamOrganizerController } from "./controllers/team.organizer.controller";

@Module({
  imports: [PrismaModule, MailModule, StorageModule],
  controllers: [TeamStudentController, TeamOrganizerController],
  providers: [TeamStudentService, TeamOrganizerService],
  exports: [TeamStudentService, TeamOrganizerService],
})
export class TeamModule {}
