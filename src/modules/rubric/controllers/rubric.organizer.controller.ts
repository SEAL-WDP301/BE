import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { Roles } from "../../../common/decorators/roles.decorator";
import { Role } from "../../../common/enums/role.enum";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreateRubricDto } from "../dto/create-rubric.dto";
import { UpdateRubricDto } from "../dto/update-rubric.dto";
import { RubricOrganizerService } from "../services/rubric.organizer.service";

@ApiTags("Organizer/Rubrics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
@Controller("organizer/events/:id/rubrics")
export class RubricOrganizerController {
  constructor(
    private readonly rubricOrganizerService: RubricOrganizerService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get rubrics for an event" })
  async getRubricsByEvent(
    @Param("id", ParseIntPipe) eventId: number,
    @Query("roundId") roundId?: string,
    @Query("trackId") trackId?: string,
  ) {
    const rubrics = await this.rubricOrganizerService.getRubricsByEvent(
      eventId,
      roundId ? Number(roundId) : undefined,
      trackId ? Number(trackId) : undefined,
    );
    return { message: "Rubrics fetched", data: rubrics };
  }

  @Post()
  @ApiOperation({ summary: "Create a rubric criterion" })
  async createRubric(
    @Param("id", ParseIntPipe) eventId: number,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateRubricDto,
  ) {
    const rubric = await this.rubricOrganizerService.createRubric(
      eventId,
      Number(userId),
      dto,
    );
    return { message: "Rubric created successfully", data: rubric };
  }

  @Put(":rubricId")
  @ApiOperation({ summary: "Update a rubric criterion" })
  async updateRubric(
    @Param("id", ParseIntPipe) eventId: number,
    @Param("rubricId", ParseIntPipe) rubricId: number,
    @Body() dto: UpdateRubricDto,
  ) {
    const rubric = await this.rubricOrganizerService.updateRubric(
      eventId,
      rubricId,
      dto,
    );
    return { message: "Rubric updated successfully", data: rubric };
  }

  @Delete(":rubricId")
  @ApiOperation({ summary: "Delete a rubric criterion" })
  async deleteRubric(
    @Param("id", ParseIntPipe) eventId: number,
    @Param("rubricId", ParseIntPipe) rubricId: number,
  ) {
    await this.rubricOrganizerService.deleteRubric(eventId, rubricId);
    return { message: "Rubric deleted successfully" };
  }
}
