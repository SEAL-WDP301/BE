import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { EventStatus } from "@prisma/client";

@Injectable()
export class EventPublicService {
  private readonly logger = new Logger(EventPublicService.name);

  constructor(private readonly prisma: PrismaService) {}

  private withImageAlias<T extends { imageUrl?: string | null }>(event: T) {
    return {
      ...event,
      image_url: event.imageUrl ?? null,
    };
  }

  async getAllPublicEvents() {
    const events = await this.prisma.event.findMany({
      where: {
        status: {
          in: [EventStatus.active, EventStatus.ongoing, EventStatus.closed],
        },
      },
      include: {
        tracks: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return events.map((event) => this.withImageAlias(event));
  }

  async getPublicEventById(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        tracks: true,
        rounds: true,
        _count: {
          select: {
            teams: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    const submissionCount = await this.prisma.submission.count({
      where: {
        round: {
          eventId: id,
        },
      },
    });

    return this.withImageAlias({
      ...event,
      _count: {
        teams: event._count.teams,
        submissions: submissionCount,
      },
    });
  }
}
