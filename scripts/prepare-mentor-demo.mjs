import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: ".env.development" });
const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.DEMO_MENTOR_EMAIL || "mentorF@gmail.com";
const DEMO_PASSWORD = process.env.DEMO_MENTOR_PASSWORD || "MentorDemo@123";

const assignment = await prisma.mentorAssignment.findFirst({
  where: {
    mentor: { email: DEMO_EMAIL },
    team: { eventId: Number(process.env.DEMO_EVENT_ID || 9) },
  },
  include: {
    mentor: true,
    team: { include: { event: true } },
  },
});

if (!assignment) {
  throw new Error(`No mentor assignment found for ${DEMO_EMAIL} on event 9`);
}

const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
await prisma.user.update({
  where: { email: assignment.mentor.email },
  data: { passwordHash: hash, role: "stakeholder", isActive: true },
});

console.log(
  JSON.stringify(
    {
      email: assignment.mentor.email,
      password: DEMO_PASSWORD,
      name: assignment.mentor.name,
      eventId: assignment.team.eventId,
      eventName: assignment.team.event.name,
      teamId: assignment.team.id,
      teamName: assignment.team.name,
      loginPortal: "/mentor",
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
