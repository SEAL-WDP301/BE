import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { EventStatus } from "@prisma/client";

@Injectable()
export class EventPublicService {
  private readonly logger = new Logger(EventPublicService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAllPublicEvents() {
    return this.prisma.event.findMany({
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
  }

  async getPublicEventById(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        tracks: true,
        rounds: true,
      },
    });

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }
}
