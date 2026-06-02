import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { EventStatus, TeamMemberRole, TeamMemberStatus, TeamStatus } from '@prisma/client';
import { RegisterIndividualDto } from '../dto/register-individual.dto';
import { RegisterTeamDto } from '../dto/register-team.dto';
import { UpdateTeamRegistrationDto } from '../dto/update-team-registration.dto';

@Injectable()
export class EventStudentService {
  private readonly logger = new Logger(EventStudentService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActiveEvents() {
    return this.prisma.event.findMany({
      where: {
        status: {
          in: [EventStatus.active, EventStatus.ongoing],
        },
      },
      include: {
        tracks: true,
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async getEventDetail(eventId: number, userId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        tracks: true,
      },
    });

    if (!event) throw new NotFoundException('Event not found');

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
        team: {
          eventId,
        },
      },
      include: {
        team: true,
      },
    });

    return {
      event,
      registrationStatus: registration ? registration.status : null,
      individualRegistration: registration,
      teamInfo: teamMember ? {
        role: teamMember.role,
        status: teamMember.status,
        team: teamMember.team,
      } : null,
    };
  }

  async registerIndividual(userId: number, eventId: number, dto: RegisterIndividualDto) {
    // Check if already registered
    const existing = await this.prisma.studentRegistration.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (existing) {
      throw new BadRequestException('You are already registered for this event');
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
    const track = await this.prisma.track.findUnique({ where: { id: dto.trackId } });
    if (!track || track.eventId !== eventId) {
      throw new NotFoundException('Track not found for this event');
    }

    // Check if max members limit exists
    const maxMembers = track.maxMembersPerTeam || 4; // default to 4 if not set
    if (dto.memberEmails.length + 1 > maxMembers) { // +1 for leader
      throw new BadRequestException(`Maximum members allowed is ${maxMembers}`);
    }

    // 2. Validate all member emails exist in the system (Requirement A)
    const members = await this.prisma.user.findMany({
      where: {
        email: { in: dto.memberEmails },
      },
    });

    if (members.length !== dto.memberEmails.length) {
      const foundEmails = members.map(m => m.email);
      const missingEmails = dto.memberEmails.filter(e => !foundEmails.includes(e));
      throw new BadRequestException(`These emails are not registered in the system: ${missingEmails.join(', ')}`);
    }

    // Check if any member is already in a team for this event
    const memberIds = members.map(m => m.id);
    const existingMemberships = await this.prisma.teamMember.findMany({
      where: {
        userId: { in: [...memberIds, userId] },
        team: { eventId },
      },
      include: { user: true },
    });

    if (existingMemberships.length > 0) {
      const conflictingUsers = existingMemberships.map(m => m.user.email);
      throw new BadRequestException(`These users are already in a team for this event: ${conflictingUsers.join(', ')}`);
    }

    // Transaction to create team, leader, and pending members
    return this.prisma.$transaction(async (prisma) => {
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
          data: members.map(member => ({
            teamId: team.id,
            userId: member.id,
            role: TeamMemberRole.member,
            status: TeamMemberStatus.pending,
          })),
        });
        
        // TODO: Trigger email notification to invited members here
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
      throw new BadRequestException('Invitation not found or already processed');
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
