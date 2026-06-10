import {
  Controller,
  Get,
  Post,
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
import { TeamStudentService } from "../services/team.student.service";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "@modules/auth/guards/jwt-auth.guard";
import { RegisterTeamDto } from "../dto/register-team.dto";
import { RegisterIndividualDto } from "../dto/register-individual.dto";

@ApiTags("Student/Teams")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller("student/teams")
export class TeamStudentController {
  constructor(private readonly teamStudentService: TeamStudentService) {}

  @Get("status/:eventId")
  @ApiOperation({ summary: "Get student registration status for an event" })
  async getRegistrationStatus(
    @Param("eventId", ParseIntPipe) eventId: number,
    @CurrentUser("id") userId: string,
  ) {
    const detail = await this.teamStudentService.getRegistrationStatus(
      eventId,
      Number(userId),
    );
    return { message: "Registration status fetched", data: detail };
  }

  @Post("register/individual/:eventId")
  @ApiOperation({ summary: "Register individually for an event" })
  async registerIndividual(
    @Param("eventId", ParseIntPipe) eventId: number,
    @CurrentUser("id") userId: string,
    @Body() dto: RegisterIndividualDto,
  ) {
    const registration = await this.teamStudentService.registerIndividual(
      Number(userId),
      eventId,
      dto,
    );
    return {
      message: "Individual registration successful",
      data: registration,
    };
  }

  @Post("register/team/:eventId")
  @ApiOperation({ summary: "Register a team for an event" })
  async registerTeam(
    @Param("eventId", ParseIntPipe) eventId: number,
    @CurrentUser("id") userId: string,
    @Body() dto: RegisterTeamDto,
  ) {
    const team = await this.teamStudentService.registerTeam(
      Number(userId),
      eventId,
      dto,
    );
    return { message: "Team registration successful", data: team };
  }

  @Put("register/team/:eventId")
  @ApiOperation({ summary: "Update team registration for an event" })
  async updateTeamRegistration(
    @Param("eventId", ParseIntPipe) eventId: number,
    @CurrentUser("id") userId: string,
    @Body() dto: RegisterTeamDto,
  ) {
    const team = await this.teamStudentService.updateTeamRegistration(
      Number(userId),
      eventId,
      dto,
    );
    return { message: "Team registration updated successfully", data: team };
  }

  @Get("invitations/pending")
  @ApiOperation({ summary: "Get pending team invitations" })
  async getInvitations(@CurrentUser("id") userId: string) {
    const invitations = await this.teamStudentService.getInvitations(
      Number(userId),
    );
    return { message: "Invitations fetched", data: invitations };
  }

  @Post("invitations/:teamId/accept")
  @ApiOperation({ summary: "Accept a team invitation" })
  async acceptInvitation(
    @Param("teamId", ParseIntPipe) teamId: number,
    @CurrentUser("id") userId: string,
  ) {
    const updated = await this.teamStudentService.respondToInvitation(
      Number(userId),
      teamId,
      true,
    );
    return { message: "Invitation accepted", data: updated };
  }

  @Post("invitations/:teamId/reject")
  @ApiOperation({ summary: "Reject a team invitation" })
  async rejectInvitation(
    @Param("teamId", ParseIntPipe) teamId: number,
    @CurrentUser("id") userId: string,
  ) {
    const updated = await this.teamStudentService.respondToInvitation(
      Number(userId),
      teamId,
      false,
    );
    return { message: "Invitation rejected", data: updated };
  }
}
