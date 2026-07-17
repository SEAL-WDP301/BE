import { ForbiddenException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotificationType } from "@prisma/client";
import { PrismaService } from "../../database/prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { OrganizerEventAccessService } from "../organizer-dashboard/organizer-event-access.service";
import {
  NotificationChannel,
  ReminderAudience,
} from "./dto/send-deadline-reminder.dto";
import { OrganizerNotificationsService } from "./organizer-notifications.service";

describe("OrganizerNotificationsService", () => {
  const prisma = {
    event: { findUnique: jest.fn() },
    round: { findFirst: jest.fn() },
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    team: { findMany: jest.fn() },
    studentRegistration: { findMany: jest.fn() },
    teamMember: { findMany: jest.fn() },
    judgeAssignment: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const eventAccess = { ensureEventAccess: jest.fn() };
  const mail = { sendNotificationEmail: jest.fn() };
  const emitter = { emit: jest.fn() };
  const service = new OrganizerNotificationsService(
    prisma as unknown as PrismaService,
    eventAccess as unknown as OrganizerEventAccessService,
    mail as unknown as MailService,
    emitter as unknown as EventEmitter2,
  );

  const baseDto = {
    eventId: 1,
    audience: ReminderAudience.TEAM_LEADERS,
    channels: [NotificationChannel.IN_APP],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.event.findUnique.mockResolvedValue({ id: 1, name: "SEAL" });
    prisma.notification.findFirst.mockResolvedValue(null);
  });

  it("stops immediately when the organizer lacks event access", async () => {
    eventAccess.ensureEventAccess.mockRejectedValue(new ForbiddenException());
    await expect(
      service.sendDeadlineReminder(42, baseDto),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.team.findMany).not.toHaveBeenCalled();
  });

  it("deduplicates recipients before creating notifications", async () => {
    eventAccess.ensureEventAccess.mockResolvedValue(undefined);
    prisma.team.findMany.mockResolvedValue([
      { leader: { id: 7, name: "A", email: "a@example.com" } },
      { leader: { id: 7, name: "A", email: "a@example.com" } },
    ]);
    prisma.$transaction.mockResolvedValue([
      {
        id: 100,
        userId: 7,
        eventId: 1,
        type: NotificationType.deadline_reminder,
      },
    ]);
    const result = await service.sendDeadlineReminder(42, baseDto);
    expect(result.recipientCount).toBe(1);
    expect(emitter.emit).toHaveBeenCalledTimes(1);
  });
});
