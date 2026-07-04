import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";
import { EventStatus, Prisma, RoundStatus } from "@prisma/client";
import { TeamGithubService } from "../../team/services/team-github.service";

@Injectable()
export class EventOrganizerService {
  private readonly logger = new Logger(EventOrganizerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly teamGithubService: TeamGithubService,
  ) {}

  async createEvent(userId: number, dto: CreateEventDto) {
    const { tracks, rounds, ...eventData } = dto;
    const { faq, ...restEventData } = eventData;

    const data: Prisma.EventCreateInput = {
      ...restEventData,
      ...(faq !== undefined && {
        faq: faq as unknown as Prisma.InputJsonValue,
      }),
      createdBy: {
        connect: { id: userId },
      },
      tracks: {
        create: tracks,
      },
      rounds: {
        create: rounds,
      },
    };

    return this.prisma.event.create({
      data,
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
          include: { _count: { select: { teams: true } } },
        },
        rounds: {
          include: { _count: { select: { submissions: true } } },
        },
      },
    });
    if (!event) throw new NotFoundException("Event not found");
    return event;
  }

  async updateEvent(id: number, dto: UpdateEventDto) {
    const event = await this.getEventById(id); // Check existence

    if (event.status !== EventStatus.draft) {
      throw new BadRequestException(
        "Only draft events can be edited. Please change the status to draft first.",
      );
    }

    const { tracks, rounds, ...eventData } = dto;
    const { faq, ...restEventData } = eventData;

    const tracksUpdate = tracks
      ? {
          deleteMany: {
            id: { notIn: tracks.filter((t) => t.id).map((t) => t.id!) },
          },
          create: tracks
            .filter((t) => !t.id)
            .map((t) => ({
              name: t.name,
              description: t.description,
              maxTeams: t.maxTeams,
              maxMembersPerTeam: t.maxMembersPerTeam,
            })),
          update: tracks
            .filter((t) => t.id)
            .map((t) => ({
              where: { id: t.id },
              data: {
                name: t.name,
                description: t.description,
                maxTeams: t.maxTeams,
                maxMembersPerTeam: t.maxMembersPerTeam,
              },
            })),
        }
      : undefined;

    const roundsUpdate = rounds
      ? {
          deleteMany: {
            id: { notIn: rounds.filter((r) => r.id).map((r) => r.id!) },
          },
          create: rounds
            .filter((r) => !r.id)
            .map((r) => ({
              roundNumber: r.roundNumber,
              name: r.name,
              submissionType: r.submissionType,
              submissionDeadline: r.submissionDeadline,
              maxFileSizeMb: r.maxFileSizeMb,
              isTrackSpecific: r.isTrackSpecific,
            })),
          update: rounds
            .filter((r) => r.id)
            .map((r) => ({
              where: { id: r.id },
              data: {
                roundNumber: r.roundNumber,
                name: r.name,
                submissionType: r.submissionType,
                submissionDeadline: r.submissionDeadline,
                maxFileSizeMb: r.maxFileSizeMb,
                isTrackSpecific: r.isTrackSpecific,
              },
            })),
        }
      : undefined;

    const data: Prisma.EventUpdateInput = {
      ...restEventData,
      ...(faq !== undefined && {
        faq: faq as unknown as Prisma.InputJsonValue,
      }),
      ...(tracksUpdate && { tracks: tracksUpdate }),
      ...(roundsUpdate && { rounds: roundsUpdate }),
    };

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data,
      include: { tracks: true, rounds: true },
    });

    // Auto-assign teams to Round 1 if it exists
    const round1 = updatedEvent.rounds.find((r) => r.roundNumber === 1);
    if (round1) {
      // Find all teams for this event that are not yet in round1
      const teams = await this.prisma.team.findMany({
        where: {
          eventId: id,
          teamRounds: {
            none: { roundId: round1.id },
          },
        },
      });
      if (teams.length > 0) {
        await this.prisma.teamRound.createMany({
          data: teams.map((t) => ({
            teamId: t.id,
            roundId: round1.id,
          })),
          skipDuplicates: true,
        });
      }
    }

    return updatedEvent;
  }

  async updateEventStatus(id: number, status: EventStatus) {
    await this.getEventById(id);
    return this.prisma.event.update({
      where: { id },
      data: { status },
    });
  }

  async updateRoundStatus(
    eventId: number,
    roundId: number,
    status: RoundStatus,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { rounds: { orderBy: { roundNumber: "asc" } } },
    });
    if (!event) throw new NotFoundException("Event not found");

    const targetRound = event.rounds.find((r) => r.id === roundId);
    if (!targetRound)
      throw new NotFoundException("Round not found in this event");

    if (status === RoundStatus.open) {
      // Check if any other round is open
      const otherOpenRound = event.rounds.find(
        (r) => r.id !== roundId && r.status === RoundStatus.open,
      );
      if (otherOpenRound) {
        throw new BadRequestException(
          `Cannot open this round because Round ${otherOpenRound.roundNumber} is currently open.`,
        );
      }

      // Check previous round status
      const prevRound = event.rounds.find(
        (r) => r.roundNumber === targetRound.roundNumber - 1,
      );
      if (prevRound && prevRound.status !== RoundStatus.results_published) {
        throw new BadRequestException(
          `Cannot open this round because previous Round ${prevRound.roundNumber} has not published results.`,
        );
      }
    }

    const updatedRound = await this.prisma.round.update({
      where: { id: roundId },
      data: { status },
    });

    if (
      status === RoundStatus.open &&
      targetRound.submissionType === "github_link"
    ) {
      this.teamGithubService.syncRepositoriesForRound(roundId).catch((err) => {
        this.logger.error(
          `Failed to sync github repositories for round ${roundId}`,
          err,
        );
      });
    }

    return updatedRound;
  }

  async getSubmissionsByEvent(
    eventId: number,
    trackId?: number,
    roundId?: number,
  ) {
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

  async deleteEvent(id: number) {
    await this.getEventById(id);
    return this.prisma.event.delete({ where: { id } });
  }
}
