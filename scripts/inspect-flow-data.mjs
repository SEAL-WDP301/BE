import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.development") });
const prisma = new PrismaClient();

const flowEvents = await prisma.event.findMany({
  where: { name: { contains: "SEAL Flow" } },
  include: {
    rounds: { orderBy: { roundNumber: "asc" }, include: { _count: { select: { submissions: true } } } },
  },
  orderBy: { id: "desc" },
  take: 5,
});

const assignments = await prisma.judgeAssignment.findMany({
  include: {
    judge: { select: { email: true, id: true } },
    round: {
      select: {
        id: true,
        name: true,
        status: true,
        roundNumber: true,
        eventId: true,
        event: { select: { name: true } },
      },
    },
  },
  orderBy: { id: "desc" },
  take: 15,
});

const activeEvent = await prisma.event.findFirst({
  where: { status: "active", rounds: { some: { status: "open" } } },
  include: {
    rounds: { orderBy: { roundNumber: "asc" } },
    teams: {
      where: { status: "approved" },
      take: 5,
      select: {
        id: true,
        name: true,
        githubRepoUrl: true,
        leader: { select: { email: true } },
        submissions: { select: { id: true, roundId: true } },
      },
    },
  },
  orderBy: { id: "desc" },
});

console.log(JSON.stringify({ flowEvents, assignments, activeEvent }, null, 2));
await prisma.$disconnect();
