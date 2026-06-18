import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  NotificationType,
  RoundResultStatus,
  RoundStatus,
  SubmissionStatus,
  TeamStatus,
} from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../../database/prisma/prisma.service";
import { computeSubmissionFinalScore } from "../../../common/utils/scoring.util";
import { PublishRoundResultsDto } from "../dto/publish-round-results.dto";

export interface RankedTeamEntry {
  rank: number;
  teamId: number;
  teamName: string;
  trackId: number;
  trackName: string;
  submissionId: number | null;
  finalScore: number | null;
  judgesScored: number;
  status: RoundResultStatus;
}

@Injectable()
export class RoundRankingService {
  private readonly logger = new Logger(RoundRankingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getRoundRankings(
    eventId: number,
    roundId: number,
    trackId?: number,
  ) {
    const round = await this.assertRoundInEvent(eventId, roundId);

    const tracks = await this.prisma.track.findMany({
      where: {
        eventId,
        ...(trackId !== undefined && { id: trackId }),
      },
      orderBy: { id: "asc" },
    });

    const rankingsByTrack = await Promise.all(
      tracks.map(async (track) => ({
        track: { id: track.id, name: track.name },
        entries: await this.buildTrackRanking(roundId, track.id),
      })),
    );

    return {
      round: {
        id: round.id,
        name: round.name,
        roundNumber: round.roundNumber,
        status: round.status,
      },
      tracks: rankingsByTrack,
    };
  }

  async publishRoundResults(
    eventId: number,
    roundId: number,
    dto: PublishRoundResultsDto,
  ) {
    const round = await this.assertRoundInEvent(eventId, roundId);

    if (round.status !== RoundStatus.closed) {
      throw new BadRequestException(
        "Round must be closed before results can be published",
      );
    }

    const topNPerTrack = dto.topNPerTrack ?? 3;
    const tracks = await this.prisma.track.findMany({
      where: { eventId },
      orderBy: { id: "asc" },
    });

    const nextRound = await this.prisma.round.findFirst({
      where: { eventId, roundNumber: round.roundNumber + 1 },
    });

    const summary: Array<{
      trackId: number;
      trackName: string;
      advancedTeamIds: number[];
      eliminatedTeamIds: number[];
    }> = [];

    await this.prisma.$transaction(async (tx) => {
      for (const track of tracks) {
        const entries = await this.buildTrackRanking(roundId, track.id);
        const competingEntries = entries.filter(
          (entry) => entry.finalScore !== null,
        );

        const advancedIds = competingEntries
          .slice(0, topNPerTrack)
          .map((entry) => entry.teamId);
        const eliminatedIds = competingEntries
          .slice(topNPerTrack)
          .map((entry) => entry.teamId);

        for (const entry of entries) {
          const isAdvanced = advancedIds.includes(entry.teamId);
          const isEliminated = eliminatedIds.includes(entry.teamId);
          const status = isAdvanced
            ? RoundResultStatus.advanced
            : isEliminated
              ? RoundResultStatus.eliminated
              : RoundResultStatus.competing;

          await tx.teamRound.upsert({
            where: {
              teamId_roundId: { teamId: entry.teamId, roundId },
            },
            create: {
              teamId: entry.teamId,
              roundId,
              status,
              score: entry.finalScore,
            },
            update: {
              status,
              score: entry.finalScore,
            },
          });

          if (isAdvanced && nextRound) {
            await tx.teamRound.upsert({
              where: {
                teamId_roundId: { teamId: entry.teamId, roundId: nextRound.id },
              },
              create: {
                teamId: entry.teamId,
                roundId: nextRound.id,
                status: RoundResultStatus.competing,
              },
              update: {},
            });
          }
        }

        summary.push({
          trackId: track.id,
          trackName: track.name,
          advancedTeamIds: advancedIds,
          eliminatedTeamIds: eliminatedIds,
        });
      }

      await tx.round.update({
        where: { id: roundId },
        data: { status: RoundStatus.results_published },
      });
    });

    await this.notifyRoundResults(eventId, round.name, summary);

    return {
      roundId,
      status: RoundStatus.results_published,
      topNPerTrack,
      nextRoundId: nextRound?.id ?? null,
      summary,
      rankings: await this.getRoundRankings(eventId, roundId),
    };
  }

  private async buildTrackRanking(
    roundId: number,
    trackId: number,
  ): Promise<RankedTeamEntry[]> {
    const rubrics = await this.getApplicableCriteria(roundId, trackId);

    const submissions = await this.prisma.submission.findMany({
      where: {
        roundId,
        status: { not: SubmissionStatus.disqualified },
        team: {
          trackId,
          status: TeamStatus.approved,
        },
      },
      include: {
        team: { include: { track: true } },
        scores: true,
      },
    });

    const entries = submissions.map((submission) => {
      const judgeScores = submission.scores.map((score) => ({
        judgeId: score.judgeId,
        criterionId: score.criterionId,
        scoreValue: score.scoreValue,
      }));

      const judgesScored = new Set(submission.scores.map((s) => s.judgeId)).size;
      const finalScore = computeSubmissionFinalScore(rubrics, judgeScores);

      return {
        teamId: submission.teamId,
        teamName: submission.team.name,
        trackId: submission.team.trackId,
        trackName: submission.team.track.name,
        submissionId: submission.id,
        finalScore,
        judgesScored,
        status: RoundResultStatus.competing,
        rank: 0,
      };
    });

    entries.sort((a, b) => {
      if (a.finalScore === null && b.finalScore === null) return 0;
      if (a.finalScore === null) return 1;
      if (b.finalScore === null) return -1;
      return b.finalScore - a.finalScore;
    });

    return entries.map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));
  }

  private async getApplicableCriteria(roundId: number, trackId: number) {
    return this.prisma.criterion.findMany({
      where: {
        roundId,
        OR: [{ trackId: null }, { trackId }],
      },
      orderBy: { id: "asc" },
    });
  }

  private async assertRoundInEvent(eventId: number, roundId: number) {
    const round = await this.prisma.round.findUnique({
      where: { id: roundId },
    });

    if (!round || round.eventId !== eventId) {
      throw new NotFoundException("Round not found in this event");
    }

    return round;
  }

  private async notifyRoundResults(
    eventId: number,
    roundName: string,
    summary: Array<{
      trackId: number;
      trackName: string;
      advancedTeamIds: number[];
      eliminatedTeamIds: number[];
    }>,
  ) {
    for (const trackSummary of summary) {
      const advancedTeams = await this.prisma.team.findMany({
        where: { id: { in: trackSummary.advancedTeamIds } },
        include: {
          leader: true,
          members: { include: { user: true } },
        },
      });

      const eliminatedTeams = await this.prisma.team.findMany({
        where: { id: { in: trackSummary.eliminatedTeamIds } },
        include: {
          leader: true,
          members: { include: { user: true } },
        },
      });

      for (const team of advancedTeams) {
        await this.notifyTeam(
          team,
          eventId,
          NotificationType.round_result,
          `Advanced from ${roundName}`,
          `Congratulations! Team "${team.name}" advanced from ${roundName} in ${trackSummary.trackName}.`,
        );
      }

      for (const team of eliminatedTeams) {
        await this.notifyTeam(
          team,
          eventId,
          NotificationType.round_result,
          `Round result: ${roundName}`,
          `Team "${team.name}" did not advance from ${roundName} in ${trackSummary.trackName}.`,
        );
      }
    }
  }

  private async notifyTeam(
    team: {
      id: number;
      eventId: number;
      name: string;
      leader: { id: number; email: string };
      members: Array<{ user: { id: number; email: string } }>;
    },
    eventId: number,
    type: NotificationType,
    title: string,
    content: string,
  ) {
    const userIds = new Set<number>([
      team.leader.id,
      ...team.members.map((member) => member.user.id),
    ]);

    const notifications = Array.from(userIds).map((userId) => ({
      userId,
      eventId,
      type,
      title,
      content,
      isEmailSent: true,
    }));

    if (notifications.length === 0) return;

    await this.prisma.notification.createMany({ data: notifications });

    for (const notification of notifications) {
      this.eventEmitter.emit(
        `notification.user.${notification.userId}`,
        notification,
      );
    }

    this.logger.log(
      `[MOCK MAIL] Round result notification for team ${team.name}: ${title}`,
    );
  }
}
