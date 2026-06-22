/**
 * Automated full-flow API test (mirrors Postman collection 00–07).
 * Usage: npm run test:flow
 * Requires: BE running, .env.development with DATABASE_URL, Redis on localhost.
 */
import { config } from "dotenv";
import { resolve } from "path";
import Redis from "ioredis";

config({ path: resolve(process.cwd(), ".env.development") });
config({ path: resolve(process.cwd(), ".env") });

const BASE_URL = process.env.BASE_URL || "http://localhost:3000/api";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@admin.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const RUN_ID = Date.now();
const STUDENT_EMAIL = `student.flow.${RUN_ID}@test.com`;
const JUDGE_EMAIL = `judge.flow.${RUN_ID}@test.com`;
const PASSWORD = "TestFlow@123";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
  lazyConnect: true,
});

const state = {};
const results = [];

function log(step, ok, detail = "") {
  const icon = ok ? "PASS" : "FAIL";
  const line = `[${icon}] ${step}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  results.push({ step, ok, detail });
}

async function api(method, path, opts = {}) {
  try {
    return await apiRequest(method, path, opts);
  } catch (err) {
    return {
      status: 0,
      ok: false,
      json: { message: err.message },
    };
  }
}

async function apiRequest(method, path, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, json };
}

async function getOtp(email) {
  await redis.connect().catch(() => null);
  const otp = await redis.get(`auth:otp:${email}`);
  if (!otp) throw new Error(`OTP not found in Redis for ${email}`);
  return otp;
}

async function ensureActiveUser(email, password, fullName) {
  let res = await api("POST", "/auth/signin", {
    body: { email, password },
  });
  if (res.ok && res.json?.data?.accessToken) {
    return res.json.data.accessToken;
  }

  res = await api("POST", "/auth/signup", {
    body: { email, password, fullName },
  });
  if (res.status !== 201 && res.status !== 409) {
    throw new Error(`Signup failed: ${res.status} ${JSON.stringify(res.json)}`);
  }

  const otp = await getOtp(email);
  res = await api("POST", "/auth/verify-otp", { body: { email, otp } });
  if (!res.ok) {
    throw new Error(`Verify OTP failed: ${res.status} ${JSON.stringify(res.json)}`);
  }

  res = await api("POST", "/auth/signin", { body: { email, password } });
  if (!res.ok || !res.json?.data?.accessToken) {
    throw new Error(`Signin failed: ${res.status} ${JSON.stringify(res.json)}`);
  }
  return res.json.data.accessToken;
}

async function run() {
  console.log(`\nSEAL Full Flow Test — ${BASE_URL}\n`);

  // 00 Health
  let res = await api("GET", "/health");
  log("00 Health", res.ok, `status ${res.status}`);
  if (!res.ok) {
    const hint =
      res.status === 0
        ? "BE is not running or unreachable. Chạy: npm run start:dev (cần .env.development + DATABASE_URL)"
        : JSON.stringify(res.json);
    throw new Error(hint);
  }

  // 01 Auth
  res = await api("POST", "/auth/signin", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  log("01 Signin Admin", res.ok && res.json?.data?.accessToken);
  if (!res.ok) throw new Error(JSON.stringify(res.json));
  state.organizerToken = res.json.data.accessToken;

  try {
    state.studentToken = await ensureActiveUser(
      STUDENT_EMAIL,
      PASSWORD,
      "Flow Test Student",
    );
    log("01 Student ready", true, STUDENT_EMAIL);
  } catch (e) {
    log("01 Student ready", false, e.message);
    throw e;
  }

  try {
    state.judgeToken = await ensureActiveUser(
      JUDGE_EMAIL,
      PASSWORD,
      "Flow Test Judge",
    );
    log("01 Judge signup/signin", true, JUDGE_EMAIL);
  } catch (e) {
    log("01 Judge signup/signin", false, e.message);
    throw e;
  }

  res = await api("GET", "/users", { token: state.organizerToken });
  const judgeUser = res.json?.data?.find((u) => u.email === JUDGE_EMAIL);
  log("01 Find judge user", !!judgeUser);
  if (!judgeUser) throw new Error("Judge user not found");
  state.stakeholderId = judgeUser.id;

  res = await api("PATCH", `/users/${state.stakeholderId}`, {
    token: state.organizerToken,
    body: { role: "stakeholder" },
  });
  log("01 Promote stakeholder", res.ok);

  res = await api("POST", "/auth/signin", {
    body: { email: JUDGE_EMAIL, password: PASSWORD },
  });
  state.judgeToken = res.json?.data?.accessToken;
  log("01 Judge token refresh", !!state.judgeToken);

  // 02 Event
  res = await api("POST", "/organizer/events", {
    token: state.organizerToken,
    body: {
      name: `SEAL Flow Test ${RUN_ID}`,
      description: "Event created from automated flow test",
      season: "Spring",
      year: 2026,
      status: "draft",
      githubOrgUrl: "https://github.com/HACKATHON-WDP",
      tracks: [
        {
          name: "Web Development",
          description: "Web track",
          maxTeams: 20,
          maxMembersPerTeam: 5,
        },
      ],
      rounds: [
        {
          roundNumber: 1,
          name: "Qualifier",
          submissionType: "github_link",
          maxFileSizeMb: 20,
          isTrackSpecific: true,
        },
        {
          roundNumber: 2,
          name: "Final",
          submissionType: "github_link",
          maxFileSizeMb: 20,
          isTrackSpecific: true,
        },
      ],
    },
  });
  log("02 Create event", res.status === 201, `status ${res.status}`);
  if (res.status !== 201) throw new Error(JSON.stringify(res.json));
  state.eventId = res.json.data.id;
  state.trackId = res.json.data.tracks[0].id;
  state.roundId = res.json.data.rounds[0].id;
  state.round2Id = res.json.data.rounds[1].id;

  // 03 Rubrics (must be while event is still draft)
  res = await api("POST", `/organizer/events/${state.eventId}/rubrics`, {
    token: state.organizerToken,
    body: {
      name: "Technical Implementation",
      description: "Code quality",
      maxScore: 10,
      weight: 1,
      roundId: state.roundId,
    },
  });
  log("03 Create rubric 1", res.status === 201);
  state.rubricId = res.json?.data?.id;

  res = await api("POST", `/organizer/events/${state.eventId}/rubrics`, {
    token: state.organizerToken,
    body: {
      name: "Innovation",
      description: "Creativity",
      maxScore: 10,
      weight: 0.8,
      roundId: state.roundId,
    },
  });
  log("03 Create rubric 2", res.status === 201);

  res = await api(
    "GET",
    `/organizer/events/${state.eventId}/rubrics?roundId=${state.roundId}`,
    { token: state.organizerToken },
  );
  log("03 Get rubrics", res.ok && res.json?.data?.length >= 2);

  res = await api("PATCH", `/organizer/events/${state.eventId}/status`, {
    token: state.organizerToken,
    body: { status: "active" },
  });
  log("02 Activate event", res.ok);

  // 04 Teams & judge
  res = await api("POST", `/organizer/events/${state.eventId}/judges`, {
    token: state.organizerToken,
    body: {
      stakeholderId: state.stakeholderId,
      roundId: state.roundId,
      trackId: state.trackId,
    },
  });
  log("04 Assign judge", res.status === 201);

  res = await api(
    "PATCH",
    `/organizer/events/${state.eventId}/rounds/${state.roundId}/status`,
    { token: state.organizerToken, body: { status: "open" } },
  );
  log("04 Open round", res.ok);

  res = await api("POST", `/student/teams/register/team/${state.eventId}`, {
    token: state.studentToken,
    body: {
      trackId: state.trackId,
      teamName: `Flow Warriors ${RUN_ID}`,
      memberEmails: [],
    },
  });
  log("04 Register team", res.ok);
  state.teamId = res.json?.data?.id;

  res = await api("PUT", `/organizer/teams/${state.teamId}/status`, {
    token: state.organizerToken,
    body: { status: "approved" },
  });
  log("04 Approve team", res.ok);

  const approvedTeam = res.json?.data;
  log(
    "04 GitHub repo on approve",
    !!approvedTeam?.githubRepoUrl,
    approvedTeam?.githubRepoUrl || "no repo (check GITHUB_TOKEN in .env.development)",
  );

  state.githubRepoUrl = approvedTeam?.githubRepoUrl;

  // 05 Submission (github_link round uses assigned team repo)
  res = await api("POST", "/student/teams/my-team/submissions", {
    token: state.studentToken,
    body: {
      eventId: state.eventId,
      roundId: state.roundId,
      ...(state.githubRepoUrl ? { githubUrl: state.githubRepoUrl } : {}),
      description: "Flow test submission",
    },
  });
  log("05 Submit project", res.ok);
  state.submissionId = res.json?.data?.id;

  // Judge cannot score while round is still open for submissions
  if (state.submissionId) {
    const rubricRes = await api("GET", `/judge/submissions/${state.submissionId}`, {
      token: state.judgeToken,
    });
    const earlyRubrics = rubricRes.json?.data?.rubrics || [];
    if (earlyRubrics.length > 0) {
      res = await api("PUT", `/judge/submissions/${state.submissionId}/scores`, {
        token: state.judgeToken,
        body: {
          scores: [
            {
              criterionId: earlyRubrics[0].id,
              scoreValue: 7,
              comment: "Should fail while round open",
            },
          ],
        },
      });
      log("05 Judge blocked while round open", res.status === 400);
    }
  }

  // 06 Judge scoring (after round closed — students can no longer edit submissions)
  res = await api(
    "PATCH",
    `/organizer/events/${state.eventId}/rounds/${state.roundId}/status`,
    { token: state.organizerToken, body: { status: "closed" } },
  );
  log("06 Close round for judging", res.ok);

  res = await api("GET", "/judge/events", { token: state.judgeToken });
  log("06 Judge events", res.ok && res.json?.data?.length >= 1);

  res = await api("GET", `/judge/rounds/${state.roundId}/submissions`, {
    token: state.judgeToken,
  });
  log("06 Round submissions", res.ok && res.json?.data?.length >= 1);

  res = await api("GET", `/judge/submissions/${state.submissionId}`, {
    token: state.judgeToken,
  });
  const rubrics = res.json?.data?.rubrics || [];
  const githubUrl = res.json?.data?.githubUrl;
  log("06 Submission detail", res.ok && rubrics.length >= 2);
  log(
    "06 Submission github link",
    !!githubUrl,
    githubUrl || "missing githubUrl",
  );
  log(
    "06 Submission uses team repo",
    !githubUrl || githubUrl === state.githubRepoUrl,
    githubUrl || "n/a",
  );

  const scores = rubrics.map((r, i) => ({
    criterionId: r.id,
    scoreValue: 8 + i * 0.5,
    comment: `Score for ${r.name}`,
  }));

  if (scores.length > 1) {
    res = await api("PUT", `/judge/submissions/${state.submissionId}/scores`, {
      token: state.judgeToken,
      body: { scores: [scores[0]] },
    });
    const partialStatus = res.json?.data?.scoringStatus;
    log(
      "06 Partial score status",
      res.ok && partialStatus === "in_review",
      `scoringStatus=${partialStatus}`,
    );
  }

  res = await api("PUT", `/judge/submissions/${state.submissionId}/scores`, {
    token: state.judgeToken,
    body: { scores },
  });
  const scoringStatus = res.json?.data?.scoringStatus;
  log(
    "06 Submit all scores",
    res.ok && scoringStatus === "completed",
    `scoringStatus=${scoringStatus}`,
  );

  // 07 Rankings & publish
  res = await api(
    "GET",
    `/organizer/events/${state.eventId}/rounds/${state.roundId}/rankings`,
    { token: state.organizerToken },
  );
  log("07 Get rankings", res.ok && Array.isArray(res.json?.data?.tracks));

  res = await api(
    "POST",
    `/organizer/events/${state.eventId}/rounds/${state.roundId}/publish-results`,
    { token: state.organizerToken, body: { topNPerTrack: 1 } },
  );
  log(
    "07 Publish results",
    res.ok && res.json?.data?.status === "results_published",
    `status=${res.json?.data?.status}`,
  );

  res = await api(
    "PATCH",
    `/organizer/events/${state.eventId}/rounds/${state.round2Id}/status`,
    { token: state.organizerToken, body: { status: "open" } },
  );
  log("07 Open round 2", res.ok, `round2Id=${state.round2Id}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- Summary: ${results.length - failed.length}/${results.length} passed ---`);
  if (failed.length) {
    console.log("\nFailed steps:");
    failed.forEach((f) => console.log(`  - ${f.step}: ${f.detail}`));
    process.exit(1);
  }
  console.log("\nAll steps passed.\n");
}

run()
  .catch((err) => {
    console.error("\nFlow test aborted:", err.message || err);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await redis.quit();
    } catch {
      /* ignore */
    }
  });
