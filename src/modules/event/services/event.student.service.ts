import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import {
  EventStatus,
  TeamMemberRole,
  TeamMemberStatus,
  TeamStatus,
} from "@prisma/client";
import { RegisterIndividualDto } from "../dto/register-individual.dto";
import { RegisterTeamDto } from "../dto/register-team.dto";
import { MailService } from "../../mail/mail.service";

@Injectable()
export class EventStudentService {
  private readonly logger = new Logger(EventStudentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async getRegistrationStatus(eventId: number, userId: number) {
    // Fetch individual registration
    const registration = await this.prisma.studentRegistration.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    // Fetch team membership
    const teamMember = await this.prisma.teamMember.findFirst({
      where: {
        userId,
        status: TeamMemberStatus.accepted,
        team: {
          eventId,
        },
      },
      include: {
        team: true,
      },
    });

    return {
      registrationStatus: registration ? registration.status : null,
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
    // Check if already registered
    const existing = await this.prisma.studentRegistration.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (existing) {
      throw new BadRequestException(
        "You are already registered for this event",
      );
    }

    return this.prisma.studentRegistration.create({
      data: {
        userId,
        eventId,
        trackId: dto.trackId,
        hasTeam: false,
        skills: dto.skills,
      },
    });
  }

  async registerTeam(userId: number, eventId: number, dto: RegisterTeamDto) {
    // 1. Verify track exists
    const track = await this.prisma.track.findUnique({
      where: { id: dto.trackId },
    });
    if (!track || track.eventId !== eventId) {
      throw new NotFoundException("Track not found for this event");
    }

    // Check if max members limit exists
    const maxMembers = track.maxMembersPerTeam || 4; // default to 4 if not set
    if (dto.memberEmails.length + 1 > maxMembers) {
      // +1 for leader
      throw new BadRequestException(`Maximum members allowed is ${maxMembers}`);
    }

    // 2. Validate all member emails exist in the system (Requirement A)
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

    // Check if any member is already in a team for this event
    const memberIds = members.map((m) => m.id);
    const existingMemberships = await this.prisma.teamMember.findMany({
      where: {
        userId: { in: [...memberIds, userId] },
        team: { eventId },
      },
      include: { user: true },
    });

    if (existingMemberships.length > 0) {
      const conflictingUsers = existingMemberships.map((m) => m.user.email);
      throw new BadRequestException(
        `These users are already in a team for this event: ${conflictingUsers.join(", ")}`,
      );
    }

    // Transaction to create team, leader, and pending members
    const resultTeam = await this.prisma.$transaction(async (prisma) => {
      // Create team
      const team = await prisma.team.create({
        data: {
          name: dto.teamName,
          eventId,
          trackId: dto.trackId,
          leaderId: userId,
          status: TeamStatus.pending,
        },
      });

      // Add leader as accepted
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId,
          role: TeamMemberRole.leader,
          status: TeamMemberStatus.accepted,
        },
      });

      // Add members as pending
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

      // Automatically create a StudentRegistration for the leader to mark them as registered
      await prisma.studentRegistration.create({
        data: {
          userId,
          eventId,
          trackId: dto.trackId,
          hasTeam: true,
        },
      });

      return team;
    });

    // Send emails after transaction successfully completes
    if (members.length > 0) {
      const leader = await this.prisma.user.findUnique({ where: { id: userId } });
      const event = await this.prisma.event.findUnique({ where: { id: eventId } });
      
      Promise.all(
        members.map((member) =>
          this.mailService.sendTeamInvitationEmail(
            member.email,
            dto.teamName,
            event?.name || "Sự kiện",
            track.name,
            leader?.name || "Một người bạn",
          )
        )
      ).catch((err) => this.logger.error("Failed to send invitations", err));
    }

    return resultTeam;
  }

  async updateTeamRegistration(userId: number, eventId: number, dto: RegisterTeamDto) {
    const team = await this.prisma.team.findFirst({
      where: { eventId, leaderId: userId },
      include: { members: { include: { user: true } } },
    });

    if (!team) throw new NotFoundException("Team not found or you are not the leader");
    if (team.status !== TeamStatus.pending) throw new BadRequestException("Only pending teams can be updated");

    // 1. Verify track
    const track = await this.prisma.track.findUnique({ where: { id: dto.trackId } });
    if (!track || track.eventId !== eventId) throw new NotFoundException("Track not found");
    const maxMembers = track.maxMembersPerTeam || 4;
    if (dto.memberEmails.length + 1 > maxMembers) throw new BadRequestException(`Max members allowed is ${maxMembers}`);

    // 2. Validate all member emails
    const members = await this.prisma.user.findMany({ where: { email: { in: dto.memberEmails } } });
    if (members.length !== dto.memberEmails.length) {
      const foundEmails = members.map((m) => m.email);
      const missingEmails = dto.memberEmails.filter((e) => !foundEmails.includes(e));
      throw new BadRequestException(`These emails are not registered: ${missingEmails.join(", ")}`);
    }

    // 3. Find out who to add and who to remove
    const currentMemberEmails = team.members.filter(m => m.role === TeamMemberRole.member).map(m => m.user.email);
    const emailsToAdd = dto.memberEmails.filter(e => !currentMemberEmails.includes(e));
    const emailsToRemove = currentMemberEmails.filter(e => !dto.memberEmails.includes(e));

    const usersToAdd = members.filter(m => emailsToAdd.includes(m.email));
    
    // Check if new members are already in another team
    if (usersToAdd.length > 0) {
      const memberIds = usersToAdd.map(m => m.id);
      const existingMemberships = await this.prisma.teamMember.findMany({
        where: { userId: { in: memberIds }, team: { eventId } },
        include: { user: true },
      });
      if (existingMemberships.length > 0) {
        const conflictingUsers = existingMemberships.map((m) => m.user.email);
        throw new BadRequestException(`These users are already in a team: ${conflictingUsers.join(", ")}`);
      }
    }

    const resultTeam = await this.prisma.$transaction(async (prisma) => {
      // Update team details
      await prisma.team.update({
        where: { id: team.id },
        data: { name: dto.teamName, trackId: dto.trackId },
      });

      // Update leader's track registration
      await prisma.studentRegistration.update({
        where: { userId_eventId: { userId, eventId } },
        data: { trackId: dto.trackId },
      });

      // Remove members
      if (emailsToRemove.length > 0) {
        const usersToRemove = team.members.filter(m => emailsToRemove.includes(m.user.email));
        await prisma.teamMember.deleteMany({
          where: { id: { in: usersToRemove.map(m => m.id) } }
        });
      }

      // Add new members
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

    // Send emails after transaction successfully completes
    if (usersToAdd.length > 0) {
      const leader = await this.prisma.user.findUnique({ where: { id: userId } });
      const event = await this.prisma.event.findUnique({ where: { id: eventId } });
      
      Promise.all(
        usersToAdd.map((member) =>
          this.mailService.sendTeamInvitationEmail(
            member.email,
            dto.teamName,
            event?.name || "Sự kiện",
            track.name,
            leader?.name || "Một người bạn",
          )
        )
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
      include: { team: true },
    });

    if (!membership || membership.status !== TeamMemberStatus.pending) {
      throw new BadRequestException(
        "Invitation not found or already processed",
      );
    }

    if (accept) {
      // Check if user is already in an accepted team for this event
      const existingAccepted = await this.prisma.teamMember.findFirst({
        where: {
          userId,
          status: TeamMemberStatus.accepted,
          team: { eventId: membership.team.eventId },
        },
      });

      if (existingAccepted) {
        throw new BadRequestException("You are already a member of another team in this event.");
      }
    }

    if (!accept) {
      // Reject: Update status to rejected
      return this.prisma.teamMember.update({
        where: { id: membership.id },
        data: { status: TeamMemberStatus.rejected },
      });
    }

    // Accept: Update status and create StudentRegistration
    return this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.teamMember.update({
        where: { id: membership.id },
        data: { status: TeamMemberStatus.accepted },
      });

      // Reject all other pending invitations for this user in this event
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

      return updated;
    });
  }
}
