import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";
import { TeamStatus, NotificationType } from "@prisma/client";
import { MailService } from "@modules/mail/mail.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { OrganizerUpdateTeamDto } from "@modules/team/dto/organizer-update-team.dto";

@Injectable()
export class EventOrganizerService {
  private readonly logger = new Logger(EventOrganizerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly eventEmitter: EventEmitter2,
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
      include: {
        tracks: {
          include: { _count: { select: { teams: true } } }
        },
        rounds: {
          include: { _count: { select: { submissions: true } } }
        }
      },
    });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async updateEvent(id: number, dto: UpdateEventDto) {
    await this.getEventById(id); // Check existence
    const { tracks, rounds, ...eventData } = dto;

    const tracksUpdate = tracks ? {
      deleteMany: { id: { notIn: tracks.filter(t => t.id).map(t => t.id!) } },
      create: tracks.filter(t => !t.id).map(t => ({
        name: t.name,
        description: t.description,
        maxTeams: t.maxTeams,
        maxMembersPerTeam: t.maxMembersPerTeam,
      })),
      update: tracks.filter(t => t.id).map(t => ({
        where: { id: t.id },
        data: {
          name: t.name,
          description: t.description,
          maxTeams: t.maxTeams,
          maxMembersPerTeam: t.maxMembersPerTeam,
        },
      })),
    } : undefined;

    const roundsUpdate = rounds ? {
      deleteMany: { id: { notIn: rounds.filter(r => r.id).map(r => r.id!) } },
      create: rounds.filter(r => !r.id).map(r => ({
        roundNumber: r.roundNumber,
        name: r.name,
        submissionType: r.submissionType,
        submissionDeadline: r.submissionDeadline,
      })),
      update: rounds.filter(r => r.id).map(r => ({
        where: { id: r.id },
        data: {
          roundNumber: r.roundNumber,
          name: r.name,
          submissionType: r.submissionType,
          submissionDeadline: r.submissionDeadline,
        },
      })),
    } : undefined;

    return this.prisma.event.update({
      where: { id },
      data: {
        ...eventData,
        ...(tracksUpdate && { tracks: tracksUpdate }),
        ...(roundsUpdate && { rounds: roundsUpdate }),
      },
      include: { tracks: true, rounds: true },
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

    await this.notifyEntireTeam(
      team,
      NotificationType.team_assigned,
      `Team Status Updated: ${dto.status}`,
      `Your team "${team.name}" status has been updated to ${dto.status}. ${dto.reason ? `Reason: ${dto.reason}` : ""}`,
    );

    return updated;
  }

  /**
   * Helper: Gửi thông báo cho toàn bộ thành viên trong đội (bao gồm Leader)
   */
  async notifyEntireTeam(
    team: any,
    type: NotificationType,
    title: string,
    content: string,
  ) {
    const emailsToNotify = Array.from(
      new Set([
        team.leader.email,
        ...team.members.map((m: any) => m.user.email),
      ]),
    );

    const notifications = emailsToNotify
      .map((email) => {
        const user =
          email === team.leader.email
            ? team.leader
            : team.members.find((m: any) => m.user.email === email)?.user;
        if (user) {
          return {
            userId: user.id,
            eventId: team.eventId,
            type,
            title,
            content,
            isEmailSent: true,
          };
        }
        return null;
      })
      .filter(Boolean) as any[];

    if (notifications.length > 0) {
      await this.prisma.notification.createMany({ data: notifications });
      notifications.forEach((notif) => {
        this.eventEmitter.emit(`notification.user.${notif.userId}`, notif);
      });
    }

    emailsToNotify.forEach((email) => {
      this.logger.log(`[MOCK MAIL] Sending email to ${email}: ${title}`);
    });
  }
}
