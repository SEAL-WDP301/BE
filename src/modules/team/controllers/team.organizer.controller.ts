import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { TeamOrganizerService } from "../services/team.organizer.service";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "@modules/auth/guards/jwt-auth.guard";
import { OrganizerUpdateTeamDto } from "../dto/organizer-update-team.dto";

@ApiTags("Organizer/Teams")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
@Controller("organizer/teams")
export class TeamOrganizerController {
  constructor(private readonly teamOrganizerService: TeamOrganizerService) {}

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
}
