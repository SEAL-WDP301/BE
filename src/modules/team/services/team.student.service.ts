import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { TeamMemberRole, TeamMemberStatus, TeamStatus } from "@prisma/client";
import { MailService } from "../../mail/mail.service";
import { StorageService } from "../../storage/storage.service";
import { RegisterIndividualDto } from "../dto/register-individual.dto";
import { RegisterTeamDto } from "../dto/register-team.dto";
import { SubmitProjectDto } from "../dto/submit-project.dto";

@Injectable()
export class TeamStudentService {
  private readonly logger = new Logger(TeamStudentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly storageService: StorageService,
  ) {}

  async getRegistrationStatus(eventId: number, userId: number) {
    const registration = await this.prisma.studentRegistration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        status: TeamMemberStatus.accepted,
        team: {
          eventId,
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
      include: {
        team: {
          include: {
            track: true,
            members: {
              include: {
                user: {
                  select: {
                    email: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      individualRegistration: registration,
      teamInfo: teamMember
        ? {
            role: teamMember.role,
            status: teamMember.status,
            team: teamMember.team,
          }
        : null,
    };
  }

  async registerIndividual(
    userId: number,
    eventId: number,
    dto: RegisterIndividualDto,
  ) {
    return this.prisma.studentRegistration.upsert({
      where: { userId_eventId: { userId, eventId } },
      update: {
        trackId: dto.trackId,
        hasTeam: false,
        skills: dto.skills,
      },
      create: {
        userId,
        eventId,
        trackId: dto.trackId,
        hasTeam: false,
        skills: dto.skills,
      },
    });
  }

  async registerTeam(userId: number, eventId: number, dto: RegisterTeamDto) {
    const track = await this.prisma.track.findUnique({
      where: { id: dto.trackId },
    });
    if (!track || track.eventId !== eventId) {
      throw new NotFoundException("Track not found for this event");
    }

    const maxMembers = track.maxMembersPerTeam || 4;
    if (dto.memberEmails.length + 1 > maxMembers) {
      throw new BadRequestException(`Maximum members allowed is ${maxMembers}`);
    }

    const members = await this.prisma.user.findMany({
      where: {
        email: { in: dto.memberEmails },
      },
    });

    if (members.length !== dto.memberEmails.length) {
      const foundEmails = members.map((m) => m.email);
      const missingEmails = dto.memberEmails.filter(
        (e) => !foundEmails.includes(e),
      );
      throw new BadRequestException(
        `These emails are not registered in the system: ${missingEmails.join(", ")}`,
      );
    }

    if (members.some((m) => m.id === userId)) {
      throw new BadRequestException("You cannot invite yourself to the team.");
    }

    const memberIds = members.map((m) => m.id);
    const existingMemberships = await this.prisma.teamMember.findMany({
      where: {
        userId: { in: [...memberIds, userId] },
        team: {
          eventId,
          status: {
            notIn: [TeamStatus.rejected, TeamStatus.disqualified],
          },
        },
      },
      include: { user: true },
    });

    if (existingMemberships.length > 0) {
      const conflictingUsers = existingMemberships.map((m) => m.user.email);
      throw new BadRequestException(
        `These users are already in a team for this event: ${conflictingUsers.join(", ")}`,
      );
    }

    const resultTeam = await this.prisma.$transaction(async (prisma) => {
      const team = await prisma.team.create({
        data: {
          name: dto.teamName,
          eventId,
          trackId: dto.trackId,
          leaderId: userId,
          status: TeamStatus.pending,
        },
      });

      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId,
          role: TeamMemberRole.leader,
          status: TeamMemberStatus.accepted,
        },
      });

      if (members.length > 0) {
        await prisma.teamMember.createMany({
          data: members.map((member) => ({
            teamId: team.id,
            userId: member.id,
            role: TeamMemberRole.member,
            status: TeamMemberStatus.pending,
          })),
        });
      }

      await prisma.studentRegistration.upsert({
        where: {
          userId_eventId: {
            userId,
            eventId,
          },
        },
        update: {
          trackId: dto.trackId,
          hasTeam: true,
        },
        create: {
          userId,
          eventId,
          trackId: dto.trackId,
          hasTeam: true,
        },
      });

      return team;
    });

    if (members.length > 0) {
      const leader = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
      });

      Promise.all(
        members.map((member) =>
          this.mailService.sendTeamInvitationEmail(
            member.email,
            dto.teamName,
            event?.name || "Sự kiện",
            track.name,
            leader?.name || "Một người bạn",
          ),
        ),
      ).catch((err) => this.logger.error("Failed to send invitations", err));
    }

    return resultTeam;
  }

  async updateTeamRegistration(
    userId: number,
    eventId: number,
    dto: RegisterTeamDto,
  ) {
    const team = await this.prisma.team.findFirst({
      where: { eventId, leaderId: userId },
      include: { members: { include: { user: true } } },
    });

    if (!team)
      throw new NotFoundException("Team not found or you are not the leader");
    
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (event?.status !== "active") {
      throw new BadRequestException("Team roster is locked because the event is no longer in the active registration phase.");
    }

    const track = await this.prisma.track.findUnique({
      where: { id: dto.trackId },
    });
    if (!track || track.eventId !== eventId)
      throw new NotFoundException("Track not found");
    const maxMembers = track.maxMembersPerTeam || 4;
    if (dto.memberEmails.length + 1 > maxMembers)
      throw new BadRequestException(`Max members allowed is ${maxMembers}`);

    const members = await this.prisma.user.findMany({
      where: { email: { in: dto.memberEmails } },
    });
    if (members.length !== dto.memberEmails.length) {
      const foundEmails = members.map((m) => m.email);
      const missingEmails = dto.memberEmails.filter(
        (e) => !foundEmails.includes(e),
      );
      throw new BadRequestException(
        `These emails are not registered: ${missingEmails.join(", ")}`,
      );
    }

    if (members.some((m) => m.id === userId)) {
      throw new BadRequestException("You cannot invite yourself to the team.");
    }

    const currentMemberEmails = team.members
      .filter((m) => m.role === TeamMemberRole.member)
      .map((m) => m.user.email);
    const emailsToAdd = dto.memberEmails.filter(
      (e) => !currentMemberEmails.includes(e),
    );
    const emailsToRemove = currentMemberEmails.filter(
      (e) => !dto.memberEmails.includes(e),
    );

    const usersToAdd = members.filter((m) => emailsToAdd.includes(m.email));

    if (usersToAdd.length > 0) {
      const memberIds = usersToAdd.map((m) => m.id);
      const existingMemberships = await this.prisma.teamMember.findMany({
        where: { userId: { in: memberIds }, team: { eventId } },
        include: { user: true },
      });
      if (existingMemberships.length > 0) {
        const conflictingUsers = existingMemberships.map((m) => m.user.email);
        throw new BadRequestException(
          `These users are already in a team: ${conflictingUsers.join(", ")}`,
        );
      }
    }

    const resultTeam = await this.prisma.$transaction(async (prisma) => {
      await prisma.team.update({
        where: { id: team.id },
        data: { name: dto.teamName, trackId: dto.trackId },
      });

      await prisma.studentRegistration.update({
        where: { userId_eventId: { userId, eventId } },
        data: { trackId: dto.trackId },
      });

      if (emailsToRemove.length > 0) {
        const usersToRemove = team.members.filter((m) =>
          emailsToRemove.includes(m.user.email),
        );
        await prisma.teamMember.deleteMany({
          where: { id: { in: usersToRemove.map((m) => m.id) } },
        });
      }

      if (usersToAdd.length > 0) {
        await prisma.teamMember.createMany({
          data: usersToAdd.map((member) => ({
            teamId: team.id,
            userId: member.id,
            role: TeamMemberRole.member,
            status: TeamMemberStatus.pending,
          })),
        });
      }

      return prisma.team.findUnique({ where: { id: team.id } });
    });

    if (usersToAdd.length > 0) {
      const leader = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
      });

      Promise.all(
        usersToAdd.map((member) =>
          this.mailService.sendTeamInvitationEmail(
            member.email,
            dto.teamName,
            event?.name || "Sự kiện",
            track.name,
            leader?.name || "Một người bạn",
          ),
        ),
      ).catch((err) => this.logger.error("Failed to send invitations", err));
    }

    return resultTeam;
  }

  async getInvitations(userId: number) {
    return this.prisma.teamMember.findMany({
      where: {
        userId,
        status: TeamMemberStatus.pending,
      },
      include: {
        team: {
          include: {
            event: true,
            track: true,
            leader: { select: { name: true, email: true } },
          },
        },
      },
    });
  }

  async respondToInvitation(userId: number, teamId: number, accept: boolean) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      include: { team: { include: { members: { include: { user: true } } } }, user: true },
    });

    if (!membership || membership.status !== TeamMemberStatus.pending) {
      throw new BadRequestException(
        "Invitation not found or already processed",
      );
    }

    if (accept) {
      const existingAccepted = await this.prisma.teamMember.findFirst({
        where: {
          userId,
          status: TeamMemberStatus.accepted,
          team: {
            eventId: membership.team.eventId,
            status: { notIn: [TeamStatus.rejected, TeamStatus.disqualified] },
          },
        },
      });

      if (existingAccepted) {
        throw new BadRequestException(
          "You are already a member of another team in this event.",
        );
      }
    }

    return this.prisma.$transaction(async (prisma) => {
      if (!accept) {
        const rejected = await prisma.teamMember.update({
          where: { id: membership.id },
          data: { status: TeamMemberStatus.rejected },
        });

        // Notify team leader or entire team
        await prisma.notification.create({
          data: {
            userId: membership.team.members.find(m => m.role === TeamMemberRole.leader)?.userId || membership.team.members[0].userId,
            eventId: membership.team.eventId,
            type: 'team_invite_rejected' as any,
            title: "Invitation Rejected",
            content: `${membership.user.name} has rejected the invitation to join ${membership.team.name}.`,
          }
        });

        return rejected;
      }

      // If accepted
      const updated = await prisma.teamMember.update({
        where: { id: membership.id },
        data: { status: TeamMemberStatus.accepted },
      });

      await prisma.teamMember.updateMany({
        where: {
          userId,
          status: TeamMemberStatus.pending,
          id: { not: membership.id },
          team: { eventId: membership.team.eventId },
        },
        data: { status: TeamMemberStatus.rejected },
      });

      await prisma.studentRegistration.upsert({
        where: { userId_eventId: { userId, eventId: membership.team.eventId } },
        create: {
          userId,
          eventId: membership.team.eventId,
          trackId: membership.team.trackId,
          hasTeam: true,
        },
        update: {
          hasTeam: true,
        },
      });

      // Send Notification to existing members
      const notifyMembers = membership.team.members.filter(m => m.status === TeamMemberStatus.accepted).map((m) => ({
        userId: m.userId,
        eventId: membership.team.eventId,
        type: 'team_invite_accepted' as any,
        title: "New Team Member",
        content: `${membership.user.name} has joined the team!`,
      }));

      // Send Welcome Notification to the user who accepted
      notifyMembers.push({
        userId,
        eventId: membership.team.eventId,
        type: 'team_invite_accepted' as any,
        title: "Welcome to the Team",
        content: `You have successfully joined ${membership.team.name}.`,
      });

      if (notifyMembers.length > 0) {
        await prisma.notification.createMany({
          data: notifyMembers,
        });
      }

      return updated;
    });
  }

  async getWorkspaceOverview(userId: number, eventId: number) {
    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        status: TeamMemberStatus.accepted,
        team: { eventId, status: { notIn: [TeamStatus.rejected, TeamStatus.disqualified] } },
      },
      include: { team: { include: { event: { select: { id: true, name: true } }, track: true } } },
    });

    if (!teamMember) {
      throw new NotFoundException("You don't have an active team for this event");
    }

    const teamId = teamMember.team.id;

    // Lấy rounds của event này
    const rounds = await this.prisma.round.findMany({
      where: { eventId },
      orderBy: { roundNumber: "asc" },
      include: {
        teamRounds: {
          where: { teamId },
        },
      },
    });

    const now = new Date();
    // Vòng đang diễn ra (nếu có)
    const currentActiveRound = rounds.find(
      (r) => r.status === "open" || (r.submissionDeadline && r.submissionDeadline > now)
    );

    // Bài nộp gần nhất nếu có vòng đang diễn ra
    let latestSubmission = null;
    if (currentActiveRound) {
      latestSubmission = await this.prisma.submission.findUnique({
        where: {
          teamId_roundId: {
            teamId,
            roundId: currentActiveRound.id,
          },
        },
      });
    }

    return {
      team: teamMember.team,
      role: teamMember.role,
      rounds,
      currentActiveRound,
      latestSubmission,
    };
  }

  async transferLeadership(userId: number, teamId: number, newLeaderUserId: number) {
    const currentMembership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      include: { team: { include: { members: { include: { user: true } } } }, user: true },
    });

    if (!currentMembership || currentMembership.role !== TeamMemberRole.leader) {
      throw new ForbiddenException("Only the team leader can transfer leadership.");
    }

    const newLeaderMembership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: newLeaderUserId } },
      include: { user: true },
    });

    if (!newLeaderMembership || newLeaderMembership.status !== TeamMemberStatus.accepted) {
      throw new BadRequestException("The designated new leader must be an accepted team member.");
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Demote current leader
      await prisma.teamMember.update({
        where: { id: currentMembership.id },
        data: { role: TeamMemberRole.member },
      });

      // 2. Promote new leader
      const updatedNewLeader = await prisma.teamMember.update({
        where: { id: newLeaderMembership.id },
        data: { role: TeamMemberRole.leader },
      });

      // 3. Update team.leaderId
      await prisma.team.update({
        where: { id: teamId },
        data: { leaderId: newLeaderUserId },
      });

      // 4. Create notifications for all team members
      const notifications = currentMembership.team.members.map((member) => ({
        userId: member.userId,
        eventId: currentMembership.team.eventId,
        type: 'team_leadership_transfer' as any, // Using the new enum
        title: "Team Leadership Transferred",
        content: `${currentMembership.user.name} has transferred team leadership to ${newLeaderMembership.user.name}.`,
      }));

      await prisma.notification.createMany({
        data: notifications,
      });

      return updatedNewLeader;
    });
  }

  async submitProject(userId: number, dto: SubmitProjectDto, file?: Express.Multer.File) {
    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        status: TeamMemberStatus.accepted,
        team: { eventId: dto.eventId, status: { notIn: [TeamStatus.rejected, TeamStatus.disqualified] } },
      },
      include: { team: true },
    });

    if (!teamMember) {
      throw new NotFoundException("You do not belong to an active team in this event");
    }

    if (teamMember.team.leaderId !== userId) {
      throw new ForbiddenException("Only the team leader can submit the project");
    }

    const teamId = teamMember.team.id;

    const round = await this.prisma.round.findUnique({
      where: { id: dto.roundId },
    });

    if (!round || round.eventId !== dto.eventId) {
      throw new BadRequestException("Invalid round");
    }

    if (file && file.size > round.maxFileSizeMb * 1024 * 1024) {
      throw new BadRequestException(`File size exceeds the limit of ${round.maxFileSizeMb}MB`);
    }

    if (round.status !== "open" && (!round.submissionDeadline || round.submissionDeadline < new Date())) {
      throw new BadRequestException("Submission for this round is closed");
    }

    // Check if team is in this round
    const teamRound = await this.prisma.teamRound.findUnique({
      where: { teamId_roundId: { teamId, roundId: dto.roundId } },
    });

    // If there's no team round, it means the team hasn't been advanced to this round
    if (!teamRound && round.roundNumber > 1) {
      throw new BadRequestException("Your team is not competing in this round");
    } else if (!teamRound && round.roundNumber === 1) {
      // Auto create team round for round 1 if it doesn't exist yet
      await this.prisma.teamRound.create({
        data: {
          teamId,
          roundId: dto.roundId,
        },
      });
    }

    const existingSubmission = await this.prisma.submission.findUnique({
      where: { teamId_roundId: { teamId, roundId: dto.roundId } },
    });

    let fileUrl = existingSubmission?.fileUrl;
    let fileKey = existingSubmission?.fileKey;

    if (file) {
      // Delete old file if exists
      if (existingSubmission?.fileKey) {
        await this.storageService.deleteFile(existingSubmission.fileKey);
      }
      const trackPath = (round as any).isTrackSpecific ? `/track-${teamMember.team.trackId}` : "";
      const uploadPath = `submissions/event-${dto.eventId}/round-${dto.roundId}${trackPath}/team-${teamId}`;
      const uploaded = await this.storageService.uploadFile(file, uploadPath);
      fileUrl = uploaded.fileUrl;
      fileKey = uploaded.fileKey;
    }

    if (!fileUrl && !dto.githubUrl) {
      throw new BadRequestException("You must provide either a file or a Github URL");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    let history: any[] = [];
    if (existingSubmission?.history) {
      history = existingSubmission.history as any[];
    }
    history.push({
      action: existingSubmission ? "updated" : "created",
      timestamp: new Date().toISOString(),
      userName: user?.name,
      userEmail: user?.email,
      fileName: file ? file.originalname : null,
    });

    return this.prisma.submission.upsert({
      where: { teamId_roundId: { teamId, roundId: dto.roundId } },
      update: {
        fileUrl,
        fileKey,
        githubUrl: dto.githubUrl,
        description: dto.description,
        history,
        submittedById: userId,
        status: "submitted",
        updatedAt: new Date(),
      },
      create: {
        teamId,
        roundId: dto.roundId,
        fileUrl,
        fileKey,
        githubUrl: dto.githubUrl,
        description: dto.description,
        history,
        submittedById: userId,
        status: "submitted",
      },
    });
  }
}
