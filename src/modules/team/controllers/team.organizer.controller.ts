import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { TeamOrganizerService } from "../services/team.organizer.service";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { OrganizerUpdateTeamDto } from "../dto/organizer-update-team.dto";
import { AssignMentorDto } from "../dto/assign-mentor.dto";

@ApiTags("Organizer/Teams")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
@Controller("organizer/teams")
export class TeamOrganizerController {
  constructor(private readonly teamOrganizerService: TeamOrganizerService) {}

  @Get("events/:eventId")
  @ApiOperation({ summary: "Get all teams for an event with filters" })
  async getTeamsByEvent(
    @Param("eventId", ParseIntPipe) eventId: number,
    @Query("trackId") trackId?: string,
    @Query("roundId") roundId?: string,
    @Query("hasMentor") hasMentor?: string,
  ) {
    const teams = await this.teamOrganizerService.getTeamsByEvent(
      eventId,
      trackId ? Number(trackId) : undefined,
      roundId ? Number(roundId) : undefined,
      hasMentor,
    );
    return { message: "Teams fetched", data: teams };
  }

  @Get("events/:eventId/tracks/:trackId")
  @ApiOperation({ summary: "Get all teams for a specific track" })
  async getTeamsByTrack(
    @Param("eventId", ParseIntPipe) eventId: number,
    @Param("trackId", ParseIntPipe) trackId: number,
  ) {
    const teams = await this.teamOrganizerService.getTeamsByTrack(
      eventId,
      trackId,
    );
    return { message: "Teams fetched", data: teams };
  }

  @Put(":teamId/status")
  @ApiOperation({ summary: "Approve or eliminate a team" })
  async updateTeamStatus(
    @Param("teamId", ParseIntPipe) teamId: number,
    @CurrentUser("id") adminId: string,
    @Body() dto: OrganizerUpdateTeamDto,
  ) {
    const updated = await this.teamOrganizerService.updateTeamStatus(
      teamId,
      dto,
      Number(adminId),
    );
    return { message: "Team status updated", data: updated };
  }

  @Post(":teamId/mentors")
  @ApiOperation({ summary: "Assign a mentor to a team" })
  async assignMentor(
    @Param("teamId", ParseIntPipe) teamId: number,
    @CurrentUser("id") adminId: string,
    @Body() dto: AssignMentorDto,
  ) {
    const assignment = await this.teamOrganizerService.assignMentor(
      teamId,
      dto.stakeholderId,
      Number(adminId),
    );
    return { message: "Mentor assigned successfully", data: assignment };
  }

  @Delete(":teamId/mentors/:stakeholderId")
  @ApiOperation({ summary: "Unassign a mentor from a team" })
  async unassignMentor(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("stakeholderId", ParseIntPipe) stakeholderId: number,
  ) {
    await this.teamOrganizerService.unassignMentor(teamId, stakeholderId);
    return { message: "Mentor unassigned successfully" };
  }

  @Post("bulk-delete")
  @ApiOperation({ summary: "Bulk delete teams" })
  async bulkDeleteTeams(@Body() dto: { teamIds: number[] }) {
    await this.teamOrganizerService.bulkDeleteTeams(dto.teamIds);
    return { message: "Teams deleted successfully" };
  }
}
