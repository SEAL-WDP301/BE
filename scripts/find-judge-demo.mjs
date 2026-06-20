import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '.env.development' });
const prisma = new PrismaClient();

const assignment = await prisma.judgeAssignment.findFirst({
  orderBy: { id: 'desc' },
  include: {
    judge: { select: { id: true, email: true, role: true, name: true } },
    round: {
      select: {
        id: true,
        name: true,
        status: true,
        event: { select: { id: true, name: true, status: true } },
      },
    },
  },
});

if (!assignment) {
  console.log('NO_ASSIGNMENT');
} else {
  console.log(JSON.stringify({
    email: assignment.judge.email,
    role: assignment.judge.role,
    eventId: assignment.round.event.id,
    eventName: assignment.round.event.name,
    roundId: assignment.round.id,
    roundName: assignment.round.name,
    roundStatus: assignment.round.status,
  }, null, 2));
}

await prisma.$disconnect();
