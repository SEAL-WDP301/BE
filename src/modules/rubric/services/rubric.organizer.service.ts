import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CreateRubricDto } from "../dto/create-rubric.dto";
import { UpdateRubricDto } from "../dto/update-rubric.dto";

@Injectable()
export class RubricOrganizerService {
  constructor(private readonly prisma: PrismaService) {}

  async getRubricsByEvent(eventId: number, roundId?: number, trackId?: number) {
    await this.ensureEventExists(eventId);

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
    const nextTrackId =
      dto.trackId === undefined ? (existing.trackId ?? undefined) : dto.trackId;

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

  private async ensureEventExists(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException("Event not found");
    }
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

  private async validateRubricScope(
    eventId: number,
    roundId: number,
    trackId?: number,
  ) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
    });
    if (!round || round.eventId !== eventId) {
      throw new BadRequestException("Round does not belong to this event");
    }

    if (trackId) {
      const track = await this.prisma.track.findUnique({
        where: { id: trackId },
      });
      if (!track || track.eventId !== eventId) {
        throw new BadRequestException("Track does not belong to this event");
      }
    }
  }
}
