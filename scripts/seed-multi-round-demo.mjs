/**
 * Seed demo data: 1 team with submissions on BOTH rounds (easy UI testing).
 * Usage:
 *   node scripts/seed-multi-round-demo.mjs
 *   DEMO_STUDENT_EMAIL=you@email.com node scripts/seed-multi-round-demo.mjs
 */
import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.development") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

const DEMO_STUDENT_EMAIL =
  process.env.DEMO_STUDENT_EMAIL || "khanhse182624@fpt.edu.vn";
const EVENT_ID = Number(process.env.DEMO_EVENT_ID || 9);

function parseOrgFromUrl(url) {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname !== "github.com") return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] === "orgs" && segments[1]) return segments[1];
    return segments[0] || null;
  } catch {
    return null;
  }
}

function buildRepoName(event, team) {
  const slug = team.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const base = `seal-${event.year}-${event.season.toLowerCase()}-${slug || "team"}-t${team.id}`;
  return base.slice(0, 100);
}

async function provisionTeamGithubRepo(team, event, track) {
  const token = process.env.GITHUB_TOKEN;
  const org =
    process.env.GITHUB_ORG ||
    parseOrgFromUrl(event.githubOrgUrl) ||
    null;

  if (!token || !org) {
    return {
      repoUrl: null,
      repoName: null,
      warning:
        "GITHUB_TOKEN or org not configured — no real repo created (links would 404)",
    };
  }

  const repoName = buildRepoName(event, team);
  const description = `SEAL ${event.season} ${event.year} — ${team.name} (${track.name})`;
  const privateRepo = process.env.GITHUB_REPO_PRIVATE === "true";
  const autoInit = process.env.GITHUB_REPO_AUTO_INIT !== "false";

  const response = await fetch(`https://api.github.com/orgs/${org}/repos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: repoName,
      description,
      private: privateRepo,
      auto_init: autoInit,
    }),
  });

  if (response.status === 422) {
    const repoUrl = `https://github.com/${org}/${repoName}`;
    return { repoUrl, repoName, warning: "Repo already exists — reusing URL" };
  }

  if (!response.ok) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(`GitHub create repo failed (${response.status}): ${body}`);
  }

  const repo = await response.json();
  return { repoUrl: repo.html_url, repoName: repo.name };
}

async function main() {
  const student = await prisma.user.findUnique({
    where: { email: DEMO_STUDENT_EMAIL },
  });
  if (!student) {
    throw new Error(
      `Student not found: ${DEMO_STUDENT_EMAIL}. Sign up first or set DEMO_STUDENT_EMAIL.`,
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: EVENT_ID },
    include: {
      tracks: { orderBy: { id: "asc" }, take: 1 },
      rounds: { orderBy: { roundNumber: "asc" } },
    },
  });
  if (!event || event.rounds.length < 2) {
    throw new Error(`Event ${EVENT_ID} needs at least 2 rounds.`);
  }

  const [round1, round2] = event.rounds;
  const track = event.tracks[0];
  if (!track) throw new Error("Event has no tracks.");

  const teamName = "SEAL Demo Two Rounds";
  let team = await prisma.team.findFirst({
    where: { eventId: event.id, name: teamName },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        eventId: event.id,
        trackId: track.id,
        name: teamName,
        status: "approved",
        leaderId: student.id,
        members: {
          create: {
            userId: student.id,
            role: "leader",
            status: "accepted",
          },
        },
      },
    });
  } else {
    team = await prisma.team.update({
      where: { id: team.id },
      data: {
        status: "approved",
        leaderId: student.id,
        githubRepoUrl: null,
        githubRepoName: null,
      },
    });

    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: student.id } },
      create: {
        teamId: team.id,
        userId: student.id,
        role: "leader",
        status: "accepted",
      },
      update: { role: "leader", status: "accepted" },
    });
  }

  const github = await provisionTeamGithubRepo(team, event, track);
  if (github.repoUrl) {
    team = await prisma.team.update({
      where: { id: team.id },
      data: {
        githubRepoUrl: github.repoUrl,
        githubRepoName: github.repoName,
      },
    });
  }

  await prisma.studentRegistration.upsert({
    where: { userId_eventId: { userId: student.id, eventId: event.id } },
    create: {
      userId: student.id,
      eventId: event.id,
      trackId: track.id,
      hasTeam: true,
    },
    update: { trackId: track.id, hasTeam: true },
  });

  const now = new Date();
  const futureDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await prisma.round.update({
    where: { id: round1.id },
    data: {
      status: "results_published",
      submissionDeadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.round.update({
    where: { id: round2.id },
    data: {
      status: "open",
      submissionDeadline: futureDeadline,
    },
  });

  await prisma.teamRound.upsert({
    where: { teamId_roundId: { teamId: team.id, roundId: round1.id } },
    create: {
      teamId: team.id,
      roundId: round1.id,
      status: "advanced",
      score: 8.5,
    },
    update: { status: "advanced", score: 8.5 },
  });

  await prisma.teamRound.upsert({
    where: { teamId_roundId: { teamId: team.id, roundId: round2.id } },
    create: {
      teamId: team.id,
      roundId: round2.id,
      status: "competing",
    },
    update: { status: "competing" },
  });

  const submission1 = await prisma.submission.upsert({
    where: { teamId_roundId: { teamId: team.id, roundId: round1.id } },
    create: {
      teamId: team.id,
      roundId: round1.id,
      status: "submitted",
      fileUrl: null,
      fileKey: null,
      description: "Demo submission for Round 1 (Semi-final) — file round, no upload in seed",
      submittedById: student.id,
      submittedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      history: [
        {
          action: "created",
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          userName: student.name,
          fileName: "round1-demo.pdf",
        },
      ],
    },
    update: {
      status: "submitted",
      fileUrl: null,
      fileKey: null,
      description: "Demo submission for Round 1 (Semi-final) — file round, no upload in seed",
      submittedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  const repoUrl = team.githubRepoUrl;
  const submission2 = await prisma.submission.upsert({
    where: { teamId_roundId: { teamId: team.id, roundId: round2.id } },
    create: {
      teamId: team.id,
      roundId: round2.id,
      status: "submitted",
      githubUrl: repoUrl,
      description: "Demo submission for Round 2 (Final)",
      submittedById: student.id,
      submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      history: [
        {
          action: "created",
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          userName: student.name,
        },
      ],
    },
    update: {
      status: "submitted",
      githubUrl: repoUrl,
      description: "Demo submission for Round 2 (Final)",
      submittedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  const workspace = await prisma.submission.findMany({
    where: { teamId: team.id },
    include: { round: { select: { roundNumber: true, name: true } } },
    orderBy: { round: { roundNumber: "asc" } },
  });

  console.log(
    JSON.stringify(
      {
        message: "Multi-round demo ready",
        login: {
          email: DEMO_STUDENT_EMAIL,
          note: "Use your existing password for this account",
        },
        event: { id: event.id, name: event.name },
        team: {
          id: team.id,
          name: team.name,
          githubRepoUrl: team.githubRepoUrl,
          githubRepoName: team.githubRepoName,
        },
        github,
        rounds: [
          {
            id: round1.id,
            number: round1.roundNumber,
            name: round1.name,
            status: "results_published",
            submissionId: submission1.id,
          },
          {
            id: round2.id,
            number: round2.roundNumber,
            name: round2.name,
            status: "open",
            submissionId: submission2.id,
            canResubmit: true,
          },
        ],
        urls: {
          submissions: `http://localhost:3001/student/events/${event.id}/workspace/submissions`,
          workspace: `http://localhost:3001/student/events/${event.id}/workspace`,
        },
        submissionsInDb: workspace.map((s) => ({
          round: s.round.roundNumber,
          roundName: s.round.name,
          id: s.id,
        })),
        featureChecklist: {
          roundSubmissionsApi: "GET /student/teams/my-team/workspace?eventId=...",
          feTabs: "Submission 1 + Submission 2 on submissions page",
          round1Ui: "read-only (closed)",
          round2Ui: "can view + resubmit while open",
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error("Seed failed:", err.message || err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
