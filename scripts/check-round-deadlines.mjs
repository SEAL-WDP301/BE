import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.development") });
const prisma = new PrismaClient();

const eventId = Number(process.env.DEMO_EVENT_ID || 9);
const now = new Date();

const rounds = await prisma.round.findMany({
  where: { eventId },
  orderBy: { roundNumber: "asc" },
});

const team = await prisma.team.findFirst({
  where: { eventId, name: "SEAL Demo Two Rounds" },
  include: {
    members: { where: { status: "accepted" }, include: { user: { select: { email: true } } } },
    submissions: { include: { round: { select: { roundNumber: true, name: true } } } },
  },
});

console.log(
  JSON.stringify(
    {
      now: now.toISOString(),
      rounds: rounds.map((r) => ({
        id: r.id,
        roundNumber: r.roundNumber,
        name: r.name,
        status: r.status,
        submissionType: r.submissionType,
        submissionDeadline: r.submissionDeadline?.toISOString() ?? null,
        deadlinePassed: r.submissionDeadline ? r.submissionDeadline <= now : false,
        hasDeadline: !!r.submissionDeadline,
      })),
      demoTeam: team
        ? {
            name: team.name,
            leader: team.members.find((m) => m.role === "leader")?.user.email,
            submissions: team.submissions.map((s) => ({
              round: s.round.roundNumber,
              roundName: s.round.name,
            })),
          }
        : null,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
