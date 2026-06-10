import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
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
import { JwtAuthGuard } from "@modules/auth/guards/jwt-auth.guard";


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

  @Delete(":id")
  @ApiOperation({ summary: "Delete an event" })
  async deleteEvent(@Param("id", ParseIntPipe) id: number) {
    await this.eventOrganizerService.deleteEvent(id);
    return { message: "Event deleted successfully" };
  }

}
