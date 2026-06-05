import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";
import { OrganizerUpdateTeamDto } from "../dto/organizer-update-team.dto";
import { TeamStatus, NotificationType } from "@prisma/client";
import { MailService } from "@modules/mail/mail.service";

@Injectable()
export class EventOrganizerService {
  private readonly logger = new Logger(EventOrganizerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createEvent(userId: number, dto: CreateEventDto) {
    const { tracks, rounds, ...eventData } = dto;
    return this.prisma.event.create({
      data: {
        ...eventData,
        createdById: userId,
        tracks: {
          create: tracks,
        },
        rounds: {
          create: rounds,
        },
      },
      include: {
        tracks: true,
        rounds: true,
      },
    });
  }

  async getAllEvents() {
    return this.prisma.event.findMany({
      include: {
        tracks: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getEventById(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { tracks: true, rounds: true },
    });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async updateEvent(id: number, dto: UpdateEventDto) {
    await this.getEventById(id); // Check existence
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tracks, rounds, ...eventData } = dto;
    return this.prisma.event.update({
      where: { id },
      data: eventData,
    });
  }

  async deleteEvent(id: number) {
    await this.getEventById(id);
    return this.prisma.event.delete({ where: { id } });
  }

  async getTeamsByTrack(eventId: number, trackId: number) {
    return this.prisma.team.findMany({
      where: {
        eventId,
        trackId,
      },
      include: {
        leader: {
          select: { id: true, name: true, email: true, studentProfile: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                studentProfile: true,
              },
            },
          },
        },
      },
    });
  }

  async updateTeamStatus(
    teamId: number,
    dto: OrganizerUpdateTeamDto,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    adminId: number,
  ) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        leader: true,
        members: { include: { user: true } },
        event: true,
      },
    });

    if (!team) throw new NotFoundException("Team not found");

    if (dto.status === TeamStatus.eliminated && !dto.reason) {
      throw new BadRequestException("Elimination reason is required");
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        status: dto.status,
        eliminationReason:
          dto.status === TeamStatus.eliminated ? dto.reason : null,
      },
    });

    // Send notifications
    const emailsToNotify = Array.from(
      new Set([team.leader.email, ...team.members.map((m) => m.user.email)]),
    );

    // Create notifications in DB
    const notifications = emailsToNotify
      .map((email) => {
        const user =
          email === team.leader.email
            ? team.leader
            : team.members.find((m) => m.user.email === email)?.user;
        if (user) {
          return {
            userId: user.id,
            eventId: team.eventId,
            type: NotificationType.team_assigned,
            title: `Team Status Updated: ${dto.status}`,
            content: `Your team "${team.name}" status has been updated to ${dto.status}. ${dto.reason ? `Reason: ${dto.reason}` : ""}`,
            isEmailSent: true, // we assume it sends successfully
          };
        }
        return null;
      })
      .filter(Boolean) as any[];

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({ data: notifications });
    }

    // Mock Mail Service
    emailsToNotify.forEach((email) => {
      this.logger.log(
        `[MOCK MAIL] Sending email to ${email} regarding team ${team.name} status change to ${dto.status}`,
      );
      // In a real app, call this.mailService.sendEmail(...)
    });

    return updated;
  }
}
