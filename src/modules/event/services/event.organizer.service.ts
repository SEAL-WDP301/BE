import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";
import { CreateRubricDto } from "../dto/create-rubric.dto";
import { UpdateRubricDto } from "../dto/update-rubric.dto";
import { EventStatus, RoundStatus } from "@prisma/client";


@Injectable()
export class EventOrganizerService {
  private readonly logger = new Logger(EventOrganizerService.name);

  constructor(
    private readonly prisma: PrismaService,
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
    const event = await this.getEventById(id); // Check existence
    
    if (event.status !== EventStatus.draft) {
      throw new BadRequestException("Only draft events can be edited. Please change the status to draft first.");
    }

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

  async updateEventStatus(id: number, status: EventStatus) {
    await this.getEventById(id);
    return this.prisma.event.update({
      where: { id },
      data: { status },
    });
  }

  async updateRoundStatus(eventId: number, roundId: number, status: RoundStatus) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { rounds: { orderBy: { roundNumber: "asc" } } },
    });
    if (!event) throw new NotFoundException("Event not found");

    const targetRound = event.rounds.find(r => r.id === roundId);
    if (!targetRound) throw new NotFoundException("Round not found in this event");

    if (status === RoundStatus.open) {
      // Check if any other round is open
      const otherOpenRound = event.rounds.find(r => r.id !== roundId && r.status === RoundStatus.open);
      if (otherOpenRound) {
        throw new BadRequestException(`Cannot open this round because Round ${otherOpenRound.roundNumber} is currently open.`);
      }

      // Check previous round status
      const prevRound = event.rounds.find(r => r.roundNumber === targetRound.roundNumber - 1);
      if (prevRound && prevRound.status !== RoundStatus.results_published) {
        throw new BadRequestException(`Cannot open this round because previous Round ${prevRound.roundNumber} has not published results.`);
      }
    }

    return this.prisma.round.update({
      where: { id: roundId },
      data: { status },
    });
  }

  async getRubricsByEvent(eventId: number, roundId?: number, trackId?: number) {
    await this.getEventById(eventId);

    return this.prisma.criterion.findMany({
      where: {
        round: { eventId },
        ...(roundId && { roundId }),
        ...(trackId && { trackId }),
      },
      include: {
        round: true,
        track: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ roundId: "asc" }, { trackId: "asc" }, { id: "asc" }],
    });
  }

  async createRubric(eventId: number, userId: number, dto: CreateRubricDto) {
    await this.validateRubricScope(eventId, dto.roundId, dto.trackId);

    return this.prisma.criterion.create({
      data: {
        name: dto.name,
        description: dto.description,
        maxScore: dto.maxScore ?? 10,
        weight: dto.weight ?? 1,
        roundId: dto.roundId,
        trackId: dto.trackId,
        createdById: userId,
      },
      include: {
        round: true,
        track: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateRubric(eventId: number, rubricId: number, dto: UpdateRubricDto) {
    const existing = await this.getRubricInEvent(eventId, rubricId);
    const nextRoundId = dto.roundId ?? existing.roundId;
    const nextTrackId = dto.trackId === undefined ? existing.trackId ?? undefined : dto.trackId;

    await this.validateRubricScope(eventId, nextRoundId, nextTrackId);

    return this.prisma.criterion.update({
      where: { id: rubricId },
      data: {
        name: dto.name,
        description: dto.description,
        maxScore: dto.maxScore,
        weight: dto.weight,
        roundId: dto.roundId,
        trackId: dto.trackId,
      },
      include: {
        round: true,
        track: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async deleteRubric(eventId: number, rubricId: number) {
    await this.getRubricInEvent(eventId, rubricId);

    return this.prisma.criterion.delete({
      where: { id: rubricId },
    });
  }

  private async getRubricInEvent(eventId: number, rubricId: number) {
    const rubric = await this.prisma.criterion.findFirst({
      where: {
        id: rubricId,
        round: { eventId },
      },
    });

    if (!rubric) {
      throw new NotFoundException("Rubric not found in this event");
    }

    return rubric;
  }

  private async validateRubricScope(eventId: number, roundId: number, trackId?: number) {
    const round = await this.prisma.round.findUnique({ where: { id: roundId } });
    if (!round || round.eventId !== eventId) {
      throw new BadRequestException("Round does not belong to this event");
    }

    if (trackId) {
      const track = await this.prisma.track.findUnique({ where: { id: trackId } });
      if (!track || track.eventId !== eventId) {
        throw new BadRequestException("Track does not belong to this event");
      }
    }
  }

  async getSubmissionsByEvent(eventId: number, trackId?: number, roundId?: number) {
    return this.prisma.submission.findMany({
      where: {
        round: { eventId },
        ...(roundId && { roundId }),
        ...(trackId && { team: { trackId } }),
      },
      include: {
        team: { include: { track: true } },
        round: true,
        submittedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { submittedAt: "desc" },
    });
  }

  async getStaffByEvent(eventId: number) {
    const mentorAssignments = await this.prisma.mentorAssignment.findMany({
      where: { team: { eventId } },
      include: { mentor: { select: { id: true, name: true, email: true } }, team: true }
    });
    
    const judgeAssignments = await this.prisma.judgeAssignment.findMany({
      where: { round: { eventId } },
      include: { judge: { select: { id: true, name: true, email: true } }, round: true, track: true }
    });

    return { mentors: mentorAssignments, judges: judgeAssignments };
  }

  async assignJudge(eventId: number, stakeholderId: number, roundId: number, trackId: number | undefined, adminId: number) {
    const round = await this.prisma.round.findUnique({ where: { id: roundId } });
    if (!round || round.eventId !== eventId) throw new BadRequestException("Round does not belong to this event");

    if (trackId) {
      const track = await this.prisma.track.findUnique({ where: { id: trackId } });
      if (!track || track.eventId !== eventId) throw new BadRequestException("Track does not belong to this event");
    }

    return this.prisma.judgeAssignment.create({
      data: {
        judgeId: stakeholderId,
        roundId,
        trackId,
        assignedById: adminId,
      },
      include: { judge: { select: { id: true, name: true, email: true } } }
    });
  }

  async unassignJudge(assignmentId: number) {
    return this.prisma.judgeAssignment.delete({ where: { id: assignmentId } });
  }

  async deleteEvent(id: number) {
    await this.getEventById(id);
    return this.prisma.event.delete({ where: { id } });
  }

}
