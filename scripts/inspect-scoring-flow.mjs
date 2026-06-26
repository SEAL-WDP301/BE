import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.development") });
const prisma = new PrismaClient();
const eventId = Number(process.argv[2] || 9);
const judgeEmail = process.argv[3] || "judgeC@gmail.com";

const judge = await prisma.user.findUnique({ where: { email: judgeEmail } });
if (!judge) throw new Error(`Judge not found: ${judgeEmail}`);

const rounds = await prisma.round.findMany({
  where: { eventId },
  orderBy: { roundNumber: "asc" },
  include: {
    _count: { select: { submissions: true } },
  },
});

const assignments = await prisma.judgeAssignment.findMany({
  where: { judgeId: judge.id, round: { eventId } },
  include: { round: true, track: true },
});

const submissionsByRound = await Promise.all(
  rounds.map(async (round) => {
    const subs = await prisma.submission.findMany({
      where: { roundId: round.id, team: { status: "approved" } },
      include: {
        team: { select: { id: true, name: true, trackId: true, track: { select: { name: true } } } },
        scores: { where: { judgeId: judge.id }, select: { criterionId: true, scoreValue: true } },
        _count: { select: { scores: true } },
      },
      orderBy: { id: "asc" },
    });

    const judgeAssignment = assignments.filter((a) => a.roundId === round.id);

    return {
      roundId: round.id,
      roundNumber: round.roundNumber,
      name: round.name,
      status: round.status,
      submissionDeadline: round.submissionDeadline,
      totalSubmissions: subs.length,
      judgeAssignments: judgeAssignment.map((a) => ({
        track: a.track?.name ?? "all tracks",
      })),
      submissions: subs.map((s) => ({
        id: s.id,
        team: s.team.name,
        track: s.team.track.name,
        judgeScoresCount: s.scores.length,
        totalScoresOnSubmission: s._count.scores,
        status: s.status,
      })),
    };
  }),
);

const rankings = await Promise.all(
  rounds.map(async (r) => {
    const teamRounds = await prisma.teamRound.findMany({
      where: { roundId: r.id },
      include: { team: { select: { name: true } } },
    });
    return {
      roundId: r.id,
      roundName: r.name,
      teamRoundRecords: teamRounds.length,
      sample: teamRounds.slice(0, 3).map((tr) => ({
        team: tr.team.name,
        status: tr.status,
        score: tr.score,
      })),
    };
  }),
);

console.log(
  JSON.stringify(
    {
      eventId,
      judge: { email: judge.email, id: judge.id },
      rounds: submissionsByRound,
      organizerRankings: rankings,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
