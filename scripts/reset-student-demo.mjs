import { config } from "dotenv";
import { resolve } from "path";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.development") });

const prisma = new PrismaClient();

const email = process.env.DEMO_STUDENT_EMAIL || "khanhse182624@fpt.edu.vn";
const password = process.env.DEMO_STUDENT_PASSWORD || "StudentDemo@123";

const hash = await bcrypt.hash(password, 10);

const user = await prisma.user.update({
  where: { email },
  data: { passwordHash: hash, isActive: true, role: "student" },
  select: { id: true, email: true, name: true, role: true },
});

console.log(
  JSON.stringify(
    {
      message: "Student password reset",
      email: user.email,
      password,
      name: user.name,
      loginUrl: "http://localhost:3001/login",
      submissionsUrl:
        "http://localhost:3001/student/events/9/workspace/submissions",
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
