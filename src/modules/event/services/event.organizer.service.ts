import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { CreateEventDto } from "../dto/create-event.dto";
import { UpdateEventDto } from "../dto/update-event.dto";


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
    await this.getEventById(id); // Check existence
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

  async deleteEvent(id: number) {
    await this.getEventById(id);
    return this.prisma.event.delete({ where: { id } });
  }

}
