import { Module } from "@nestjs/common";
import { TeamStudentService } from "./services/team.student.service";
import { TeamOrganizerService } from "./services/team.organizer.service";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { StorageModule } from "../storage/storage.module";
import { TeamStudentController } from "./controllers/team.student.controller";
import { TeamOrganizerController } from "./controllers/team.organizer.controller";
import { TeamMentorController } from "./controllers/team.mentor.controller";
import { TeamMentorService } from "./services/team.mentor.service";

@Module({
  imports: [PrismaModule, MailModule, StorageModule],
  controllers: [TeamStudentController, TeamOrganizerController, TeamMentorController],
  providers: [TeamStudentService, TeamOrganizerService, TeamMentorService],
  exports: [TeamStudentService, TeamOrganizerService, TeamMentorService],
})
export class TeamModule {}
