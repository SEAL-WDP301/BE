import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class StakeholderOrganizerService {
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
          include: { team: { include: { track: true } } }
        },
        judgeAssignments: {
          where: { round: { eventId } },
          include: { round: true, track: true }
        }
      }
    });

    return stakeholders;
  }

  async assignJudge(eventId: number, stakeholderId: number, roundId: number, trackIds: number[] | undefined, adminId: number) {
    const round = await this.prisma.round.findUnique({ where: { id: roundId } });
    if (!round || round.eventId !== eventId) throw new BadRequestException("Round does not belong to this event");

    // First, delete existing assignments for this judge in this round
    await this.prisma.judgeAssignment.deleteMany({
      where: { judgeId: stakeholderId, roundId }
    });

    if (round.isTrackSpecific && trackIds && trackIds.length > 0) {
      // Validate tracks
      const tracks = await this.prisma.track.findMany({ where: { id: { in: trackIds } } });
      if (tracks.some(t => t.eventId !== eventId)) {
        throw new BadRequestException("One or more tracks do not belong to this event");
      }

      const data = trackIds.map(trackId => ({
        judgeId: stakeholderId,
        roundId,
        trackId,
        assignedById: adminId,
      }));
      await this.prisma.judgeAssignment.createMany({ data });
      return { message: "Judges assigned to multiple tracks." };
    } else {
      // Create single assignment without track
      return this.prisma.judgeAssignment.create({
        data: {
          judgeId: stakeholderId,
          roundId,
          trackId: null,
          assignedById: adminId,
        },
        include: { judge: { select: { id: true, name: true, email: true } } }
      });
    }
  }

  async unassignJudge(assignmentId: number) {
    return this.prisma.judgeAssignment.delete({ where: { id: assignmentId } });
  }

  async assignMentor(teamId: number, stakeholderId: number, adminId: number) {
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
