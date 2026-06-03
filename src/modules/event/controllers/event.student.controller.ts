import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { EventStudentService } from "../services/event.student.service";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RegisterIndividualDto } from "../dto/register-individual.dto";
import { RegisterTeamDto } from "../dto/register-team.dto";
import { JwtAuthGuard } from "@modules/auth/guards/jwt-auth.guard";

@ApiTags("Student/Events")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller("student/events")
export class EventStudentController {
  constructor(private readonly eventStudentService: EventStudentService) {}

  @Get()
  @ApiOperation({ summary: "Get active events" })
  async getActiveEvents() {
    const events = await this.eventStudentService.getActiveEvents();
    return { message: "Active events fetched", data: events };
  }

  @Get(":id")
  @ApiOperation({ summary: "Get event detail and registration status" })
  async getEventDetail(
    @Param("id", ParseIntPipe) eventId: number,
    @CurrentUser("id") userId: string,
  ) {
    const detail = await this.eventStudentService.getEventDetail(
      eventId,
      Number(userId),
    );
    return { message: "Event detail fetched", data: detail };
  }

  @Post(":id/register/individual")
  @ApiOperation({ summary: "Register individually for an event" })
  async registerIndividual(
    @Param("id", ParseIntPipe) eventId: number,
    @CurrentUser("id") userId: string,
    @Body() dto: RegisterIndividualDto,
  ) {
    const registration = await this.eventStudentService.registerIndividual(
      Number(userId),
      eventId,
      dto,
    );
    return {
      message: "Individual registration successful",
      data: registration,
    };
  }

  @Post(":id/register/team")
  @ApiOperation({ summary: "Register a team for an event" })
  async registerTeam(
    @Param("id", ParseIntPipe) eventId: number,
    @CurrentUser("id") userId: string,
    @Body() dto: RegisterTeamDto,
  ) {
    const team = await this.eventStudentService.registerTeam(
      Number(userId),
      eventId,
      dto,
    );
    return { message: "Team registration successful", data: team };
  }

  @Get("invitations/pending")
  @ApiOperation({ summary: "Get pending team invitations" })
  async getInvitations(@CurrentUser("id") userId: string) {
    const invitations = await this.eventStudentService.getInvitations(
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
    const updated = await this.eventStudentService.respondToInvitation(
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
    const updated = await this.eventStudentService.respondToInvitation(
      Number(userId),
      teamId,
      false,
    );
    return { message: "Invitation rejected", data: updated };
  }
}
