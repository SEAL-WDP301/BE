import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  NotificationType,
  SubmissionStatus,
  TeamMemberStatus,
  TeamStatus,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { OrganizerEventAccessService } from "../organizer-dashboard/organizer-event-access.service";
import {
  NotificationChannel,
  ReminderAudience,
  SendDeadlineReminderDto,
} from "./dto/send-deadline-reminder.dto";

interface ReminderRecipient {
  id: number;
  email: string;
  name: string;
}

@Injectable()
export class OrganizerNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventAccess: OrganizerEventAccessService,
    private readonly mailService: MailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async sendDeadlineReminder(
    organizerId: number,
    dto: SendDeadlineReminderDto,
  ) {
    await this.eventAccess.ensureEventAccess(organizerId, dto.eventId);
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
      select: { id: true, name: true },
    });
    if (!event) {
      throw new NotFoundException({
        errorCode: "EVENT_NOT_FOUND",
        message: "Event not found",
      });
    }

    if (dto.roundId) {
      const round = await this.prisma.round.findFirst({
        where: { id: dto.roundId, eventId: dto.eventId },
        select: { id: true },
      });
      if (!round) {
        throw new NotFoundException({
          errorCode: "ROUND_NOT_FOUND",
          message: "Round does not belong to this event",
        });
      }
    }

    if (dto.scheduleId) {
      throw new NotFoundException({
        errorCode: "SCHEDULE_NOT_FOUND",
        message: "The current schema does not contain a schedule entity",
      });
    }

    const subject = dto.subject ?? `Reminder for ${event.name}`;
    const message =
      dto.message ??
      `A deadline for ${event.name} is approaching. Please review the event schedule and complete the required action.`;

    const recentDuplicate = await this.prisma.notification.findFirst({
      where: {
        eventId: dto.eventId,
        type: NotificationType.deadline_reminder,
        title: subject,
        createdAt: { gte: new Date(Date.now() - 5 * 60_000) },
      },
      select: { id: true },
    });
    if (recentDuplicate) {
      throw new BadRequestException({
        errorCode: "REMINDER_RATE_LIMITED",
        message: "An identical reminder was sent less than five minutes ago",
      });
    }

    const recipients = this.deduplicateRecipients(
      await this.resolveRecipients(dto),
    );
    if (!recipients.length) {
      throw new BadRequestException({
        errorCode: "REMINDER_AUDIENCE_EMPTY",
        message: "No active recipients match the selected audience",
      });
    }

    const notifications = await this.prisma.$transaction(
      recipients.map((recipient) =>
        this.prisma.notification.create({
          data: {
            userId: recipient.id,
            eventId: dto.eventId,
            type: NotificationType.deadline_reminder,
            title: subject,
            content: message,
            isEmailSent: false,
          },
        }),
      ),
    );

    if (
      dto.channels.includes(NotificationChannel.IN_APP) ||
      dto.channels.includes(NotificationChannel.PUSH)
    ) {
      notifications.forEach((notification) => {
        this.eventEmitter.emit(
          `notification.user.${notification.userId}`,
          notification,
        );
      });
    }

    if (dto.channels.includes(NotificationChannel.EMAIL)) {
      void Promise.allSettled(
        recipients.map((recipient) =>
          this.mailService.sendNotificationEmail(
            recipient.email,
            recipient.name,
            subject,
            message,
          ),
        ),
      ).then(async (results) => {
        const successfulUserIds = recipients
          .filter((_, index) => results[index].status === "fulfilled")
          .map(({ id }) => id);
        if (successfulUserIds.length) {
          await this.prisma.notification.updateMany({
            where: {
              id: { in: notifications.map(({ id }) => id) },
              userId: { in: successfulUserIds },
            },
            data: { isEmailSent: true, sentAt: new Date() },
          });
        }
      });
    }

    return {
      notificationId: notifications[0].id,
      recipientCount: recipients.length,
      channels: dto.channels,
      status: dto.channels.includes(NotificationChannel.EMAIL)
        ? "QUEUED"
        : "SENT",
    };
  }

  private async resolveRecipients(
    dto: SendDeadlineReminderDto,
  ): Promise<ReminderRecipient[]> {
    const userSelect = { id: true, email: true, name: true } as const;

    if (dto.audience === ReminderAudience.REGISTERED_PARTICIPANTS) {
      const registrations = await this.prisma.studentRegistration.findMany({
        where: { eventId: dto.eventId, user: { isActive: true } },
        select: { user: { select: userSelect } },
      });
      return registrations.map(({ user }) => user);
    }

    if (dto.audience === ReminderAudience.APPROVED_PARTICIPANTS) {
      const members = await this.prisma.teamMember.findMany({
        where: {
          status: TeamMemberStatus.accepted,
          user: { isActive: true },
          team: { eventId: dto.eventId, status: TeamStatus.approved },
        },
        select: { user: { select: userSelect } },
      });
      return members.map(({ user }) => user);
    }

    if (dto.audience === ReminderAudience.TEAM_LEADERS) {
      const teams = await this.prisma.team.findMany({
        where: {
          eventId: dto.eventId,
          status: { notIn: [TeamStatus.rejected, TeamStatus.disqualified] },
          leader: { isActive: true },
        },
        select: { leader: { select: userSelect } },
      });
      return teams.map(({ leader }) => leader);
    }

    if (dto.audience === ReminderAudience.JUDGES) {
      const assignments = await this.prisma.judgeAssignment.findMany({
        where: {
          round: {
            eventId: dto.eventId,
            ...(dto.roundId ? { id: dto.roundId } : {}),
          },
          judge: { isActive: true },
        },
        select: { judge: { select: userSelect } },
      });
      return assignments.map(({ judge }) => judge);
    }

    if (!dto.roundId) {
      throw new BadRequestException({
        errorCode: "ROUND_NOT_FOUND",
        message: "roundId is required for TEAMS_NOT_SUBMITTED",
      });
    }
    const teams = await this.prisma.team.findMany({
      where: {
        eventId: dto.eventId,
        status: TeamStatus.approved,
        leader: { isActive: true },
        submissions: {
          none: {
            roundId: dto.roundId,
            status: {
              notIn: [
                SubmissionStatus.flagged_violation,
                SubmissionStatus.disqualified,
              ],
            },
          },
        },
      },
      select: { leader: { select: userSelect } },
    });
    return teams.map(({ leader }) => leader);
  }

  private deduplicateRecipients(
    recipients: ReminderRecipient[],
  ): ReminderRecipient[] {
    return [
      ...new Map(
        recipients.map((recipient) => [recipient.id, recipient]),
      ).values(),
    ];
  }
}
