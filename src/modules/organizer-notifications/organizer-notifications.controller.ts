import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { Role } from "../../common/enums/role.enum";
import { RolesGuard } from "../../common/guards/roles.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SendDeadlineReminderDto } from "./dto/send-deadline-reminder.dto";
import { OrganizerNotificationsService } from "./organizer-notifications.service";

@ApiTags("Organizer Notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ORGANIZER)
@Controller("organizer/notifications")
export class OrganizerNotificationsController {
  constructor(private readonly service: OrganizerNotificationsService) {}

  @Post("reminders")
  @ApiOperation({ summary: "Send a deadline reminder to a derived audience" })
  @ApiResponse({ status: 201, description: "Reminder created or queued" })
  async sendReminder(
    @CurrentUser("id") organizerId: string,
    @Body() dto: SendDeadlineReminderDto,
  ) {
    return {
      message: "Reminder accepted",
      data: await this.service.sendDeadlineReminder(Number(organizerId), dto),
    };
  }
}
