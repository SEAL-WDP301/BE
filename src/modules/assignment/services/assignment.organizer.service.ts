import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class AssignmentOrganizerService {
  constructor(private readonly prisma: PrismaService) {}

  async getStakeholdersByEvent(eventId: number) {
    const stakeholders = await this.prisma.user.findMany({
      where: { role: 'stakeholder' },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        stakeholderProfile: true,
        mentorAssignments: {
          where: { team: { eventId } },
          include: { team: { include: { track: true, teamRounds: true } } }
        },
        judgeAssignments: {
          where: { round: { eventId } },
          include: { round: true, track: true }
        }
      }
    });

    return stakeholders;
  }

  async assignJudges(eventId: number, stakeholderIds: number[], roundId: number, trackIds: number[] | undefined, adminId: number) {
    const round = await this.prisma.round.findUnique({ where: { id: roundId } });
    if (!round || round.eventId !== eventId) throw new BadRequestException("Round does not belong to this event");

    // Check if stakeholder mentors any team in this round
    const mentoredTeamConflict = await this.prisma.mentorAssignment.findFirst({
      where: {
        mentorId: { in: stakeholderIds },
        team: { teamRounds: { some: { roundId } } }
      }
    });
    if (mentoredTeamConflict) {
      throw new BadRequestException("One or more stakeholders cannot be a judge because they are mentoring a team in this round.");
    }

    // First, delete existing assignments for these judges in this round
    await this.prisma.judgeAssignment.deleteMany({
      where: { judgeId: { in: stakeholderIds }, roundId }
    });

    if (round.isTrackSpecific && trackIds && trackIds.length > 0) {
      // Validate tracks
      const tracks = await this.prisma.track.findMany({ where: { id: { in: trackIds } } });
      if (tracks.some(t => t.eventId !== eventId)) {
        throw new BadRequestException("One or more tracks do not belong to this event");
      }

      const data = [];
      for (const stakeholderId of stakeholderIds) {
        for (const trackId of trackIds) {
          data.push({
            judgeId: stakeholderId,
            roundId,
            trackId,
            assignedById: adminId,
          });
        }
      }
      await this.prisma.judgeAssignment.createMany({ data });
      return { message: "Judges assigned to multiple tracks." };
    } else {
      // Create single assignment without track
      const data = stakeholderIds.map(stakeholderId => ({
        judgeId: stakeholderId,
        roundId,
        trackId: null,
        assignedById: adminId,
      }));
      await this.prisma.judgeAssignment.createMany({ data });
      return { message: "Judges assigned successfully." };
    }
  }

  async unassignJudge(assignmentId: number) {
    return this.prisma.judgeAssignment.delete({ where: { id: assignmentId } });
  }

  async assignMentor(teamId: number, stakeholderId: number, adminId: number) {
    const teamRounds = await this.prisma.teamRound.findMany({ where: { teamId } });
    const roundIds = teamRounds.map(tr => tr.roundId);
    
    // Check if team already has a mentor
    const existingMentor = await this.prisma.mentorAssignment.findFirst({ where: { teamId } });
    if (existingMentor) {
      throw new BadRequestException("This team already has a mentor assigned.");
    }
    
    const judgeConflict = await this.prisma.judgeAssignment.findFirst({
      where: { judgeId: stakeholderId, roundId: { in: roundIds } }
    });
    if (judgeConflict) {
      throw new BadRequestException("Stakeholder cannot be a mentor because they are a judge in a round this team participates in.");
    }

    return this.prisma.mentorAssignment.create({
      data: {
        teamId,
        mentorId: stakeholderId,
        assignedById: adminId,
      },
      include: { mentor: { select: { id: true, name: true, email: true } } },
    });
  }

  async unassignMentor(teamId: number, stakeholderId: number) {
    return this.prisma.mentorAssignment.delete({
      where: {
        mentorId_teamId: {
          mentorId: stakeholderId,
          teamId,
        },
      },
    });
  }

  async bulkAssignMentor(stakeholderId: number, teamIds: number[], adminId: number) {
    const teamRounds = await this.prisma.teamRound.findMany({ where: { teamId: { in: teamIds } } });
    const roundIds = teamRounds.map(tr => tr.roundId);
    
    // Check if any of the teams already have a mentor
    const existingMentors = await this.prisma.mentorAssignment.findFirst({ where: { teamId: { in: teamIds } } });
    if (existingMentors) {
      throw new BadRequestException("One or more selected teams already have a mentor assigned.");
    }
    
    const judgeConflict = await this.prisma.judgeAssignment.findFirst({
      where: { judgeId: stakeholderId, roundId: { in: roundIds } }
    });
    if (judgeConflict) {
      throw new BadRequestException("Stakeholder cannot be assigned because they are a judge in a round where one or more selected teams participate.");
    }

    const data = teamIds.map(teamId => ({
      mentorId: stakeholderId,
      teamId,
      assignedById: adminId,
    }));
    
    return this.prisma.mentorAssignment.createMany({
      data,
      skipDuplicates: true,
    });
  }
}
