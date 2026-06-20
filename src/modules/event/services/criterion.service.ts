import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventStatus } from "@prisma/client";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CreateRubricDto } from "../dto/create-rubric.dto";

@Injectable()
export class CriterionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    eventId: number,
    roundId?: number,
    trackId?: number,
  ) {
    await this.assertEventExists(eventId);

    return this.prisma.criterion.findMany({
      where: {
        round: { eventId },
        ...(roundId !== undefined && { roundId }),
        ...(trackId !== undefined && { trackId }),
      },
      include: {
        round: true,
        track: true,
      },
      orderBy: [{ roundId: "asc" }, { id: "asc" }],
    });
  }

  async create(eventId: number, userId: number, dto: CreateRubricDto) {
    await this.assertEventDraft(eventId);
    await this.assertRoundBelongsToEvent(dto.roundId, eventId);

    if (dto.trackId != null) {
      await this.assertTrackBelongsToEvent(dto.trackId, eventId);
    }

    return this.prisma.criterion.create({
      data: {
        name: dto.name,
        description: dto.description,
        maxScore: dto.maxScore,
        weight: dto.weight,
        roundId: dto.roundId,
        trackId: dto.trackId ?? null,
        createdById: userId,
      },
      include: {
        round: true,
        track: true,
      },
    });
  }

  async update(eventId: number, rubricId: number, dto: CreateRubricDto) {
    await this.assertEventDraft(eventId);
    const existing = await this.findRubricInEvent(eventId, rubricId);

    if (dto.roundId !== existing.roundId) {
      await this.assertRoundBelongsToEvent(dto.roundId, eventId);
    }

    if (dto.trackId != null) {
      await this.assertTrackBelongsToEvent(dto.trackId, eventId);
    }

    return this.prisma.criterion.update({
      where: { id: rubricId },
      data: {
        name: dto.name,
        description: dto.description,
        maxScore: dto.maxScore,
        weight: dto.weight,
        roundId: dto.roundId,
        trackId: dto.trackId ?? null,
      },
      include: {
        round: true,
        track: true,
      },
    });
  }

  async remove(eventId: number, rubricId: number) {
    await this.assertEventDraft(eventId);
    await this.findRubricInEvent(eventId, rubricId);

    const scoreCount = await this.prisma.score.count({
      where: { criterionId: rubricId },
    });

    if (scoreCount > 0) {
      throw new BadRequestException(
        "Cannot delete a criterion that already has scores",
      );
    }

    await this.prisma.criterion.delete({ where: { id: rubricId } });
  }

  private async assertEventExists(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }
  }

  private async assertEventDraft(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    if (event.status !== EventStatus.draft) {
      throw new BadRequestException(
        "Only draft events can be edited. Please change the status to draft first.",
      );
    }
  }

  private async assertRoundBelongsToEvent(roundId: number, eventId: number) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
      select: { id: true, eventId: true },
    });

    if (!round || round.eventId !== eventId) {
      throw new BadRequestException("Round does not belong to this event");
    }
  }

  private async assertTrackBelongsToEvent(trackId: number, eventId: number) {
    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, eventId: true },
    });

    if (!track || track.eventId !== eventId) {
      throw new BadRequestException("Track does not belong to this event");
    }
  }

  private async findRubricInEvent(eventId: number, rubricId: number) {
    const rubric = await this.prisma.criterion.findFirst({
      where: {
        id: rubricId,
        round: { eventId },
      },
    });

    if (!rubric) {
      throw new NotFoundException("Criterion not found in this event");
    }

    return rubric;
  }
}
