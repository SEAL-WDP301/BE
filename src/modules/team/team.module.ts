import { Module } from "@nestjs/common";
import { TeamStudentService } from "./services/team.student.service";
import { TeamOrganizerService } from "./services/team.organizer.service";
import { TeamGithubService } from "./services/team-github.service";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { MailModule } from "../mail/mail.module";
import { StorageModule } from "../storage/storage.module";
import { GithubModule } from "../github/github.module";
import { TeamStudentController } from "./controllers/team.student.controller";
import { TeamOrganizerController } from "./controllers/team.organizer.controller";
import { TeamMentorController } from "./controllers/team.mentor.controller";
import { TeamMentorService } from "./services/team.mentor.service";

@Module({
  imports: [PrismaModule, MailModule, StorageModule, GithubModule],
  controllers: [TeamStudentController, TeamOrganizerController, TeamMentorController],
  providers: [TeamStudentService, TeamOrganizerService, TeamMentorService, TeamGithubService],
  exports: [TeamStudentService, TeamOrganizerService, TeamMentorService, TeamGithubService],
})
export class TeamModule {}
