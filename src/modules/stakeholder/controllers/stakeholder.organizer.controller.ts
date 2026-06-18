import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { StakeholderOrganizerService } from "../services/stakeholder.organizer.service";
import { AssignJudgeDto } from "../dto/assign-judge.dto";
import { AssignMentorDto } from "../dto/assign-mentor.dto";

@ApiTags("Organizer/Stakeholders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
@Controller("organizer/stakeholders")
export class StakeholderOrganizerController {
  constructor(private readonly stakeholderOrganizerService: StakeholderOrganizerService) {}

  @Get("events/:eventId")
  @ApiOperation({ summary: "Get all stakeholders (mentors, judges) for an event" })
  async getStakeholdersByEvent(@Param("eventId", ParseIntPipe) eventId: number) {
    const stakeholders = await this.stakeholderOrganizerService.getStakeholdersByEvent(eventId);
    return { message: "Stakeholders fetched", data: stakeholders };
  }

  @Post("events/:eventId/judges")
  @ApiOperation({ summary: "Assign a judge to a round/track" })
  async assignJudge(
    @Param("eventId", ParseIntPipe) eventId: number,
    @CurrentUser("id") adminId: string,
    @Body() dto: AssignJudgeDto,
  ) {
    const assignment = await this.stakeholderOrganizerService.assignJudge(
      eventId,
      dto.stakeholderId,
      dto.roundId,
      dto.trackIds,
      Number(adminId),
    );
    return { message: "Judge assigned successfully", data: assignment };
  }

  @Delete("judges/:assignmentId")
  @ApiOperation({ summary: "Unassign a judge" })
  async unassignJudge(@Param("assignmentId", ParseIntPipe) assignmentId: number) {
    await this.stakeholderOrganizerService.unassignJudge(assignmentId);
    return { message: "Judge unassigned successfully" };
  }

  @Post("teams/:teamId/mentors")
  @ApiOperation({ summary: "Assign a mentor to a team" })
  async assignMentor(
    @Param("teamId", ParseIntPipe) teamId: number,
    @CurrentUser("id") adminId: string,
    @Body() dto: AssignMentorDto,
  ) {
    const assignment = await this.stakeholderOrganizerService.assignMentor(
      teamId,
      dto.stakeholderId,
      Number(adminId),
    );
    return { message: "Mentor assigned successfully", data: assignment };
  }

  @Delete("teams/:teamId/mentors/:stakeholderId")
  @ApiOperation({ summary: "Unassign a mentor from a team" })
  async unassignMentor(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("stakeholderId", ParseIntPipe) stakeholderId: number,
  ) {
    await this.stakeholderOrganizerService.unassignMentor(teamId, stakeholderId);
    return { message: "Mentor unassigned successfully" };
  }

  @Post("events/:eventId/mentors/bulk-assign")
  @ApiOperation({ summary: "Bulk assign a mentor to multiple teams" })
  async bulkAssignMentor(
    @Param("eventId", ParseIntPipe) eventId: number,
    @CurrentUser("id") adminId: string,
    @Body() dto: { stakeholderId: number; teamIds: number[] }
  ) {
    const result = await this.stakeholderOrganizerService.bulkAssignMentor(
      dto.stakeholderId,
      dto.teamIds,
      Number(adminId),
    );
    return { message: "Mentor assigned to teams successfully", data: result };
  }
}
