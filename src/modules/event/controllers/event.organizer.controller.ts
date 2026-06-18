import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { EventOrganizerService } from "../services/event.organizer.service";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";
import { UpdateEventStatusDto } from "../dto/update-event-status.dto";
import { UpdateRoundStatusDto } from "../dto/update-round-status.dto";

import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";

@ApiTags("Organizer/Events")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER, Role.ADMIN)
@Controller("organizer/events")
export class EventOrganizerController {
  constructor(private readonly eventOrganizerService: EventOrganizerService) {}

  @Post()
  @ApiOperation({ summary: "Create a new event" })
  async createEvent(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateEventDto,
  ) {
    const event = await this.eventOrganizerService.createEvent(
      Number(userId),
      dto,
    );
    return { message: "Event created successfully", data: event };
  }

  @Get()
  @ApiOperation({ summary: "Get all events" })
  async getAllEvents() {
    const events = await this.eventOrganizerService.getAllEvents();
    return { message: "Events fetched", data: events };
  }

  @Put(":id")
  @ApiOperation({ summary: "Update an event" })
  async updateEvent(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateEventDto,
  ) {
    const event = await this.eventOrganizerService.updateEvent(id, dto);
    return { message: "Event updated successfully", data: event };
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update event status" })
  async updateEventStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateEventStatusDto,
  ) {
    const event = await this.eventOrganizerService.updateEventStatus(
      id,
      dto.status,
    );
    return { message: "Event status updated successfully", data: event };
  }

  @Patch(":id/rounds/:roundId/status")
  @ApiOperation({ summary: "Update round status" })
  async updateRoundStatus(
    @Param("id", ParseIntPipe) eventId: number,
    @Param("roundId", ParseIntPipe) roundId: number,
    @Body() dto: UpdateRoundStatusDto,
  ) {
    const round = await this.eventOrganizerService.updateRoundStatus(
      eventId,
      roundId,
      dto.status,
    );
    return { message: "Round status updated successfully", data: round };
  }

  @Get(":id/submissions")
  @ApiOperation({ summary: "Get all submissions for an event" })
  async getSubmissionsByEvent(
    @Param("id", ParseIntPipe) eventId: number,
    @Query("trackId") trackId?: string,
    @Query("roundId") roundId?: string,
  ) {
    const submissions = await this.eventOrganizerService.getSubmissionsByEvent(
      eventId,
      trackId ? Number(trackId) : undefined,
      roundId ? Number(roundId) : undefined,
    );
    return { message: "Submissions fetched", data: submissions };
  }



  @Delete(":id")
  @ApiOperation({ summary: "Delete an event" })
  async deleteEvent(@Param("id", ParseIntPipe) id: number) {
    await this.eventOrganizerService.deleteEvent(id);
    return { message: "Event deleted successfully" };
  }
}
