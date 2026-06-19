import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: '.env.development' });
const prisma = new PrismaClient();

const DEMO_EMAIL = 'judge.demo@seal.test';
const DEMO_PASSWORD = 'JudgeDemo@123';

const assignment = await prisma.judgeAssignment.findFirst({
  where: {
    round: {
      status: 'open',
      submissions: { some: { status: { not: 'disqualified' } } },
    },
  },
  orderBy: { id: 'desc' },
  include: {
    judge: true,
    round: { include: { event: true, submissions: { take: 1 } } },
  },
});

let email = DEMO_EMAIL;
let password = DEMO_PASSWORD;
let eventId;
let roundId;

if (assignment) {
  email = assignment.judge.email;
  eventId = assignment.round.eventId;
  roundId = assignment.round.id;
  console.log('Using existing judge:', email);
} else {
  // Fallback: latest assignment + open round 2 if exists
  const latest = await prisma.judgeAssignment.findFirst({
    orderBy: { id: 'desc' },
    include: { round: { include: { event: { include: { rounds: true } } } }, judge: true },
  });
  if (!latest) throw new Error('No judge assignments in DB');

  email = latest.judge.email;
  eventId = latest.round.eventId;
  roundId = latest.round.id;

  const openRound = latest.round.event.rounds.find((r) => r.status === 'open');
  if (openRound) roundId = openRound.id;
  else {
    await prisma.round.update({ where: { id: roundId }, data: { status: 'open' } });
    console.log('Re-opened round for demo:', roundId);
  }
}

const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
await prisma.user.update({
  where: { email },
  data: { passwordHash: hash, role: 'stakeholder', isActive: true },
});

console.log(JSON.stringify({ email, password: DEMO_PASSWORD, eventId, roundId }, null, 2));
await prisma.$disconnect();
