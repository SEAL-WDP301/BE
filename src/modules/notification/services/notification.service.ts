import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Observable, fromEvent } from "rxjs";
import { map } from "rxjs/operators";

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get notifications for the given user.
   */
  async getUserNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /**
   * Stream real-time notifications via SSE.
   */
  streamNotifications(userId: number): Observable<MessageEvent> {
    // Lắng nghe các event nội bộ có dạng 'notification.user.<userId>'
    return fromEvent(this.eventEmitter, `notification.user.${userId}`).pipe(
      map(
        (payload: any) =>
          ({
            data: payload,
          }) as MessageEvent,
      ),
    );
  }

  /**
   * Mark a single notification as read.
   */
  async markNotificationAsRead(userId: number, notificationId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException("Notification not found");
    }
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllNotificationsAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Delete a single notification.
   */
  async deleteNotification(userId: number, notificationId: number) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.userId !== userId) {
      throw new NotFoundException("Notification not found");
    }
    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * Delete all notifications for a user.
   */
  async deleteAllNotifications(userId: number) {
    return this.prisma.notification.deleteMany({
      where: { userId },
    });
  }
}
