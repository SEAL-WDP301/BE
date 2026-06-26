/**
 * Inspect DB for test accounts, events, rounds, teams, judge assignments.
 * Usage: node scripts/inspect-db-test-data.mjs
 */
import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.development") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
    orderBy: { id: "asc" },
    take: 50,
  });

  const events = await prisma.event.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      season: true,
      year: true,
      rounds: {
        select: {
          id: true,
          roundNumber: true,
          name: true,
          status: true,
          submissionType: true,
          submissionDeadline: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { roundNumber: "asc" },
      },
      tracks: { select: { id: true, name: true } },
      _count: { select: { teams: true } },
    },
    orderBy: { id: "desc" },
    take: 15,
  });

  const judgeAssignments = await prisma.judgeAssignment.findMany({
    include: {
      judge: { select: { id: true, email: true, name: true, role: true } },
      round: {
        select: {
          id: true,
          name: true,
          roundNumber: true,
          status: true,
          eventId: true,
          event: { select: { id: true, name: true } },
        },
      },
      track: { select: { id: true, name: true } },
    },
    orderBy: { id: "desc" },
    take: 20,
  });

  const teams = await prisma.team.findMany({
    where: { status: { in: ["approved", "pending"] } },
    select: {
      id: true,
      name: true,
      status: true,
      githubRepoUrl: true,
      eventId: true,
      event: { select: { name: true } },
      leader: { select: { email: true, name: true } },
      _count: { select: { members: true, submissions: true } },
    },
    orderBy: { id: "desc" },
    take: 20,
  });

  const submissions = await prisma.submission.findMany({
    select: {
      id: true,
      teamId: true,
      roundId: true,
      status: true,
      githubUrl: true,
      submittedAt: true,
      team: { select: { name: true, eventId: true } },
      round: { select: { name: true, roundNumber: true, status: true } },
    },
    orderBy: { id: "desc" },
    take: 25,
  });

  console.log(JSON.stringify({ users, events, judgeAssignments, teams, submissions }, null, 2));
}

main()
  .catch((err) => {
    console.error("DB inspect failed:", err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
