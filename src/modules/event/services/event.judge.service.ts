import { Injectable } from "@nestjs/common";
import { RoundStatus } from "@prisma/client";
import { PrismaService } from "../../../database/prisma/prisma.service";

@Injectable()
export class EventJudgeService {
  constructor(private readonly prisma: PrismaService) {}

  async getAssignedEvents(judgeId: number) {
    const assignments = await this.prisma.judgeAssignment.findMany({
      where: { judgeId },
      include: {
        round: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                season: true,
                year: true,
                status: true,
              },
            },
          },
        },
        track: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ round: { eventId: "desc" } }, { round: { roundNumber: "asc" } }],
    });

    const eventsMap = new Map<
      number,
      {
        id: number;
        name: string;
        season: string;
        year: number;
        status: string;
        rounds: Array<{
          assignmentId: number;
          roundId: number;
          roundNumber: number;
          roundName: string;
          roundStatus: RoundStatus;
          trackId: number | null;
          trackName: string | null;
        }>;
      }
    >();

    for (const assignment of assignments) {
      const event = assignment.round.event;
      if (!eventsMap.has(event.id)) {
        eventsMap.set(event.id, {
          id: event.id,
          name: event.name,
          season: event.season,
          year: event.year,
          status: event.status,
          rounds: [],
        });
      }

      eventsMap.get(event.id)!.rounds.push({
        assignmentId: assignment.id,
        roundId: assignment.roundId,
        roundNumber: assignment.round.roundNumber,
        roundName: assignment.round.name,
        roundStatus: assignment.round.status,
        trackId: assignment.trackId,
        trackName: assignment.track?.name ?? null,
      });
    }

    return Array.from(eventsMap.values());
  }
}
