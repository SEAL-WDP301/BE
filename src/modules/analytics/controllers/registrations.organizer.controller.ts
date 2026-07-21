import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RegistrationsOrganizerService } from "../services/registrations.organizer.service";

@ApiTags("Organizer Registrations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
@Controller("organizer/registrations")
export class RegistrationsOrganizerController {
  constructor(private readonly service: RegistrationsOrganizerService) {}

  @Get(":id/answers")
  @ApiOperation({ summary: "Get the submitted answers for a registration" })
  @ApiResponse({ status: 200, description: "Registration answers retrieved" })
  async getAnswers(
    @CurrentUser("id") organizerId: string,
    @Param("id", ParseIntPipe) registrationId: number,
  ) {
    return {
      message: "Registration answers retrieved",
      data: await this.service.getAnswers(Number(organizerId), registrationId),
    };
  }

  @Get(":id/team")
  @ApiOperation({ summary: "Get the team associated with a registration" })
  @ApiResponse({ status: 200, description: "Registration team retrieved" })
  async getTeam(
    @CurrentUser("id") organizerId: string,
    @Param("id", ParseIntPipe) registrationId: number,
  ) {
    return {
      message: "Registration team retrieved",
      data: await this.service.getTeam(Number(organizerId), registrationId),
    };
  }

  @Get(":id/history")
  @ApiOperation({ summary: "Get the lifecycle history for a registration" })
  @ApiResponse({ status: 200, description: "Registration history retrieved" })
  async getHistory(
    @CurrentUser("id") organizerId: string,
    @Param("id", ParseIntPipe) registrationId: number,
  ) {
    return {
      message: "Registration history retrieved",
      data: await this.service.getHistory(Number(organizerId), registrationId),
    };
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get a registration with answers, team and history",
  })
  @ApiResponse({ status: 200, description: "Registration details retrieved" })
  async getRegistration(
    @CurrentUser("id") organizerId: string,
    @Param("id", ParseIntPipe) registrationId: number,
  ) {
    return {
      message: "Registration details retrieved",
      data: await this.service.getRegistration(
        Number(organizerId),
        registrationId,
      ),
    };
  }
}
