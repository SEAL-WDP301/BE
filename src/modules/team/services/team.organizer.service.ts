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

  async getTeamsByEvent(
    eventId: number,
    trackId?: number,
    roundId?: number,
    hasMentor?: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
  ) {
    const where: any = {
      eventId,
      ...(trackId && { trackId }),
      ...(roundId && {
        teamRounds: {
          some: { roundId },
        },
      }),
      ...(hasMentor === "true" && { mentorAssignments: { some: {} } }),
      ...(hasMentor === "false" && { mentorAssignments: { none: {} } }),
      ...(status && status !== "all" && { status }),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { leader: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [teams, total] = await Promise.all([
      this.prisma.team.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          track: true,
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              studentProfile: true,
            },
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
          mentorAssignments: {
            include: {
              mentor: {
                select: { id: true, name: true, email: true, avatarUrl: true },
              },
            },
          },
          teamRounds: { include: { round: true } },
        },
      }),
      this.prisma.team.count({ where }),
    ]);

    return {
      data: teams,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getTeamsByTrack(eventId: number, trackId: number) {
    return this.prisma.team.findMany({
      where: {
        eventId,
        trackId,
      },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            studentProfile: true,
          },
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

    if (
      (dto.status === TeamStatus.rejected ||
        dto.status === TeamStatus.disqualified) &&
      !dto.reason
    ) {
      throw new BadRequestException(
        "Reason is required for rejected or disqualified status",
      );
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        status: dto.status,
        eliminationReason:
          dto.status === TeamStatus.rejected ||
          dto.status === TeamStatus.disqualified
            ? dto.reason
            : null,
      },
    });

    if (dto.status === TeamStatus.approved) {
      // Check if there is an open round that requires github
      const openGithubRound = await this.prisma.round.findFirst({
        where: {
          eventId: team.eventId,
          status: "open",
          submissionType: "github_link",
        },
      });

      if (openGithubRound) {
        const githubResult =
          await this.teamGithubService.provisionRepositoryForTeam(
            teamId,
            openGithubRound.id,
          );

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

  async bulkDeleteTeams(teamIds: number[]) {
    return this.prisma.team.deleteMany({
      where: {
        id: {
          in: teamIds,
        },
      },
    });
  }

  async bulkUpdateTeamsStatus(
    teamIds: number[],
    status: TeamStatus,
    reason?: string,
    adminId?: number,
  ) {
    const results = [];
    for (const teamId of teamIds) {
      try {
        const res = await this.updateTeamStatus(
          teamId,
          { status, reason },
          adminId || 0,
        );
        results.push(res);
      } catch (err) {
        this.logger.error(`Failed to update status for team ${teamId}`, err);
      }
    }
    return results;
  }
}
