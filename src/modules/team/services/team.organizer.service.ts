import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { TeamStatus, NotificationType } from "@prisma/client";
import { MailService } from "../../mail/mail.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { OrganizerUpdateTeamDto } from "../dto/organizer-update-team.dto";
import { TeamGithubService } from "./team-github.service";

@Injectable()
export class TeamOrganizerService {
  private readonly logger = new Logger(TeamOrganizerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly eventEmitter: EventEmitter2,
    private readonly teamGithubService: TeamGithubService,
  ) {}

  async getTeamsByEvent(eventId: number, adminId: number, trackId?: number, roundId?: number, hasMentor?: string) {
    const teams = await this.prisma.team.findMany({
      where: {
        eventId,
        ...(trackId && { trackId }),
        ...(roundId && {
          teamRounds: {
            some: { roundId }
          }
        }),
        ...(hasMentor === "true" && { mentorAssignments: { some: {} } }),
        ...(hasMentor === "false" && { mentorAssignments: { none: {} } }),
      },
      include: {
        track: true,
        leader: { select: { id: true, name: true, email: true, avatarUrl: true, studentProfile: true } },
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true, studentProfile: true } } } },
        mentorAssignments: { include: { mentor: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        teamRounds: { include: { round: true } },
      },
    });

    return Promise.all(teams.map(async (team) => {
      const unreadCount = await this.prisma.teamMessage.count({
        where: {
          teamId: team.id,
          senderId: { not: adminId },
          reads: { none: { userId: adminId } }
        }
      });
      const lastMessage = await this.prisma.teamMessage.findFirst({
        where: { teamId: team.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      });
      return {
        ...team,
        unreadCount,
        lastMessageAt: lastMessage?.createdAt || null
      };
    }));
  }

  async getTeamsByTrack(eventId: number, trackId: number) {
    return this.prisma.team.findMany({
      where: {
        eventId,
        trackId,
      },
      include: {
        leader: {
          select: { id: true, name: true, email: true, avatarUrl: true, studentProfile: true },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
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

    if ((dto.status === TeamStatus.rejected || dto.status === TeamStatus.disqualified) && !dto.reason) {
      throw new BadRequestException("Reason is required for rejected or disqualified status");
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        status: dto.status,
        eliminationReason:
          (dto.status === TeamStatus.rejected || dto.status === TeamStatus.disqualified) ? dto.reason : null,
      },
    });

    if (dto.status === TeamStatus.approved) {
      // Check if there is an open round that requires github
      const openGithubRound = await this.prisma.round.findFirst({
        where: { eventId: team.eventId, status: "open", submissionType: "github_link" }
      });

      if (openGithubRound) {
        const githubResult =
          await this.teamGithubService.provisionRepositoryForTeam(teamId);

        if (githubResult.provisioned && githubResult.repoUrl) {
          await this.notifyEntireTeam(
            team,
            NotificationType.team_assigned,
            "GitHub Repository Ready",
            `Your team repository has been created: ${githubResult.repoUrl}. Push your project code to this repository before the submission deadline.`,
          );
        } else if (githubResult.reason && !githubResult.skipped) {
          this.logger.warn(
            `Team ${teamId} approved but GitHub repo was not created: ${githubResult.reason}`,
          );
        }
      }
    }

    await this.notifyEntireTeam(
      team,
      NotificationType.team_assigned,
      `Team Status Updated: ${dto.status}`,
      `Your team "${team.name}" status has been updated to ${dto.status}. ${dto.reason ? `Reason: ${dto.reason}` : ""}`,
    );

    return this.prisma.team.findUnique({
      where: { id: teamId },
    });
  }

  async notifyEntireTeam(
    team: any,
    type: NotificationType,
    title: string,
    content: string,
  ) {
    const recipients = Array.from(
      new Set([
        team.leader.email,
        ...team.members.map((m: any) => m.user.email),
      ]),
    ).map((email) => {
      const user =
        email === team.leader.email
          ? team.leader
          : team.members.find((m: any) => m.user.email === email)?.user;
      return user ? { email, user } : null;
    }).filter(Boolean) as Array<{ email: string; user: { id: number } }>;

    for (const { email, user } of recipients) {
      const notification = await this.prisma.notification.create({
        data: {
          userId: user.id,
          eventId: team.eventId,
          type,
          title,
          content,
          isEmailSent: false,
        },
      });

      this.eventEmitter.emit(
        `notification.user.${notification.userId}`,
        notification,
      );

      try {
        await this.mailService.sendNotificationEmail(email, title, content);
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { isEmailSent: true },
        });
      } catch (error) {
        this.logger.error(
          `Failed to send team notification email to ${email}`,
          error,
        );
      }
    }
  }

  async bulkDeleteTeams(teamIds: number[]) {
    return this.prisma.team.deleteMany({
      where: {
        id: {
          in: teamIds,
        },
      },
    });
  }
}
