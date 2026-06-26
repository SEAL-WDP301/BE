/**
 * Set a team's GitHub repo to public (fix 404 for users without org access).
 * Usage: node scripts/set-team-repo-public.mjs [teamId]
 */
import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.development") });

const prisma = new PrismaClient();
const teamId = Number(process.argv[2] || 28);
const token = process.env.GITHUB_TOKEN;

const team = await prisma.team.findUnique({ where: { id: teamId } });
if (!team?.githubRepoUrl || !team.githubRepoName) {
  throw new Error(`Team ${teamId} has no GitHub repo assigned`);
}

const org = process.env.GITHUB_ORG;
if (!org || !token) {
  throw new Error("GITHUB_ORG and GITHUB_TOKEN required");
}

const res = await fetch(
  `https://api.github.com/repos/${org}/${team.githubRepoName}`,
  {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ private: false }),
  },
);

if (!res.ok) {
  throw new Error(`GitHub API ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

const repo = await res.json();
console.log(
  JSON.stringify(
    {
      teamId,
      repoName: repo.name,
      htmlUrl: repo.html_url,
      private: repo.private,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
