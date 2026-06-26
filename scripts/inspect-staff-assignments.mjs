import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.development") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();
const eventId = Number(process.argv[2] || 9);

const judges = await prisma.judgeAssignment.findMany({
  where: { round: { eventId } },
  include: {
    judge: { select: { id: true, email: true, name: true, role: true, passwordHash: true } },
    round: { select: { id: true, name: true, roundNumber: true, status: true } },
    track: { select: { id: true, name: true } },
  },
  orderBy: { id: "asc" },
});

const mentors = await prisma.mentorAssignment.findMany({
  where: { team: { eventId } },
  include: {
    mentor: { select: { id: true, email: true, name: true, role: true, passwordHash: true } },
    team: { select: { id: true, name: true } },
  },
  orderBy: { id: "asc" },
});

const stakeholders = await prisma.user.findMany({
  where: { role: "stakeholder" },
  select: { id: true, email: true, name: true, passwordHash: true },
  orderBy: { id: "asc" },
});

const conflicts = stakeholders
  .filter((s) => {
    const isJudge = judges.some((j) => j.judgeId === s.id);
    const isMentor = mentors.some((m) => m.mentorId === s.id);
    return isJudge && isMentor;
  })
  .map((s) => s.email);

const event = await prisma.event.findUnique({
  where: { id: eventId },
  select: { id: true, name: true, status: true },
});

console.log(
  JSON.stringify(
    {
      event,
      judgeCount: judges.length,
      mentorCount: mentors.length,
      conflicts,
      judges: judges.map((j) => ({
        email: j.judge.email,
        name: j.judge.name,
        hasPassword: Boolean(j.judge.passwordHash),
        round: j.round.name,
        roundId: j.round.id,
        roundStatus: j.round.status,
        track: j.track?.name ?? "all tracks",
      })),
      mentors: mentors.map((m) => ({
        email: m.mentor.email,
        name: m.mentor.name,
        hasPassword: Boolean(m.mentor.passwordHash),
        team: m.team.name,
        teamId: m.team.id,
      })),
      allStakeholders: stakeholders.map((s) => ({
        email: s.email,
        name: s.name,
        hasPassword: Boolean(s.passwordHash),
      })),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
