import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { StakeholderMentorService } from "../services/stakeholder.mentor.service";

@ApiTags("Mentor")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STAKEHOLDER)
@Controller("mentor")
export class StakeholderMentorController {
  constructor(
    private readonly stakeholderMentorService: StakeholderMentorService,
  ) {}

  @Get("teams")
  @ApiOperation({ summary: "Get teams assigned to the current mentor" })
  async getTeams(@CurrentUser("id") mentorId: number) {
    return {
      message: "Mentor teams fetched",
      data: await this.stakeholderMentorService.getTeams(mentorId),
    };
  }

  @Get("teams/:teamId")
  @ApiOperation({ summary: "Get an assigned team by ID" })
  async getTeamById(
    @CurrentUser("id") mentorId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
  ) {
    return {
      message: "Mentor team fetched",
      data: await this.stakeholderMentorService.getTeamById(mentorId, teamId),
    };
  }

  @Get("teams/:teamId/submissions")
  @ApiOperation({ summary: "Get submissions of an assigned team" })
  async getTeamSubmissions(
    @CurrentUser("id") mentorId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
  ) {
    return {
      message: "Team submissions fetched",
      data: await this.stakeholderMentorService.getTeamSubmissions(
        mentorId,
        teamId,
      ),
    };
  }

  @Get("submissions")
  @ApiOperation({ summary: "Get submissions from all assigned teams" })
  async getSubmissions(@CurrentUser("id") mentorId: number) {
    return {
      message: "Mentor submissions fetched",
      data: await this.stakeholderMentorService.getSubmissions(mentorId),
    };
  }

  @Get("submissions/:submissionId")
  @ApiOperation({ summary: "Get an assigned team's submission by ID" })
  async getSubmissionById(
    @CurrentUser("id") mentorId: number,
    @Param("submissionId", ParseIntPipe) submissionId: number,
  ) {
    return {
      message: "Mentor submission fetched",
      data: await this.stakeholderMentorService.getSubmissionById(
        mentorId,
        submissionId,
      ),
    };
  }
}
