import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Sse,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { NotificationService } from "../services/notification.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";

@ApiTags("Notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users/notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: "Get current user notifications" })
  @ApiResponse({
    status: 200,
    description: "Notifications retrieved successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized — missing or invalid token",
  })
  async getNotifications(@CurrentUser("id") userId: string) {
    const notifications = await this.notificationService.getUserNotifications(
      Number(userId),
    );
    return {
      message: "Notifications retrieved successfully",
      data: notifications,
    };
  }

  @Sse("stream")
  @ApiOperation({ summary: "Stream user notifications (SSE)" })
  @ApiResponse({ status: 200, description: "Stream established" })
  streamNotifications(@CurrentUser("id") userId: string) {
    return this.notificationService.streamNotifications(Number(userId));
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  @ApiResponse({ status: 200, description: "All notifications marked as read" })
  async markAllNotificationsAsRead(@CurrentUser("id") userId: string) {
    await this.notificationService.markAllNotificationsAsRead(Number(userId));
    return {
      message: "All notifications marked as read",
    };
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a notification as read" })
  @ApiResponse({ status: 200, description: "Notification marked as read" })
  async markNotificationAsRead(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    await this.notificationService.markNotificationAsRead(
      Number(userId),
      Number(id),
    );
    return {
      message: "Notification marked as read",
    };
  }

  @Delete("all")
  @ApiOperation({ summary: "Delete all notifications" })
  @ApiResponse({ status: 200, description: "All notifications deleted" })
  async deleteAllNotifications(@CurrentUser("id") userId: string) {
    await this.notificationService.deleteAllNotifications(Number(userId));
    return {
      message: "All notifications deleted",
    };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a notification" })
  @ApiResponse({ status: 200, description: "Notification deleted" })
  async deleteNotification(
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
  ) {
    await this.notificationService.deleteNotification(
      Number(userId),
      Number(id),
    );
    return {
      message: "Notification deleted",
    };
  }
}
