/**
 * Benchmark all major API flows — measure latency and detect hangs.
 * Usage: node scripts/benchmark-flows.mjs
 */

const BASE = process.env.API_BASE || "http://localhost:3000/api";
const TIMEOUT_MS = 15000;
const SLOW_MS = 2000;
const HANG_MS = 8000;

const accounts = [
  { role: "admin", email: "admin@admin.com", password: "admin123" },
  { role: "student", email: "khanhse182624@fpt.edu.vn", password: "Khanh@123" },
  { role: "student2", email: "khanhse182624@fpt.edu.vn", password: "Student@123" },
  { role: "student3", email: "toannangcao3000@gmail.com", password: "Student@123" },
  { role: "judge", email: "judgeC@gmail.com", password: "12345678" },
  { role: "judge2", email: "judge@test.com", password: "Judge@123" },
];

const results = [];

async function timed(label, fn) {
  const start = performance.now();
  try {
    const data = await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS),
      ),
    ]);
    const ms = Math.round(performance.now() - start);
    const status = ms >= HANG_MS ? "HANG" : ms >= SLOW_MS ? "SLOW" : "OK";
    results.push({ label, ms, status, error: null });
    return data;
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    const msg = err.message || String(err);
    results.push({ label, ms, status: msg === "TIMEOUT" ? "TIMEOUT" : "FAIL", error: msg });
    return null;
  }
}

async function request(method, path, { token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body && !formData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: formData ? body : body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }

  if (!res.ok) {
    const msg = json?.message || json?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

async function signIn(email, password) {
  const res = await request("POST", "/auth/signin", {
    body: { email, password },
  });
  return res?.data?.accessToken;
}

async function runPublicFlows() {
  await timed("PUBLIC GET /health", () => request("GET", "/health"));
  const events = await timed("PUBLIC GET /public/events", () =>
    request("GET", "/public/events"),
  );
  const eventId = events?.data?.[0]?.id ?? 22;
  await timed(`PUBLIC GET /public/events/${eventId}`, () =>
    request("GET", `/public/events/${eventId}`),
  );
  return { eventId };
}

async function runAdminFlows(token) {
  await timed("ADMIN GET /users/profile", () =>
    request("GET", "/users/profile", { token }),
  );
  await timed("ADMIN GET /users/notifications", () =>
    request("GET", "/users/notifications", { token }),
  );
  const events = await timed("ADMIN GET /organizer/events", () =>
    request("GET", "/organizer/events", { token }),
  );
  const eventId = events?.data?.[0]?.id ?? 22;
  await timed(`ADMIN GET /organizer/teams/events/${eventId}`, () =>
    request("GET", `/organizer/teams/events/${eventId}`, { token }),
  );

  const eventList = await request("GET", "/organizer/events", { token }).catch(() => null);
  const roundId = eventList?.data?.find((e) => e.id === eventId)?.rounds?.[0]?.id
    ?? eventList?.data?.[0]?.rounds?.[0]?.id;
  if (roundId) {
    await timed(`ADMIN GET rankings event=${eventId} round=${roundId}`, () =>
      request("GET", `/organizer/events/${eventId}/rounds/${roundId}/rankings/detailed`, { token }),
    );
    await timed(`ADMIN GET stakeholders event=${eventId}`, () =>
      request("GET", `/organizer/assignments/events/${eventId}`, { token }),
    );
    await timed(`ADMIN GET submissions event=${eventId} round=${roundId}`, () =>
      request("GET", `/organizer/events/${eventId}/submissions?roundId=${roundId}`, { token }),
    );
    await timed(`ADMIN GET rubrics event=${eventId}`, () =>
      request("GET", `/organizer/events/${eventId}/rubrics`, { token }),
    );
  }
  return { eventId, roundId };
}

async function runStudentFlows(token) {
  await timed("STUDENT GET /users/profile", () =>
    request("GET", "/users/profile", { token }),
  );
  await timed("STUDENT GET /student/teams/my-events", () =>
    request("GET", "/student/teams/my-events", { token }),
  );
  await timed("STUDENT GET /student/teams/status", () =>
    request("GET", "/student/teams/status", { token }),
  );
  await timed("STUDENT GET /student/teams/invitations/pending", () =>
    request("GET", "/student/teams/invitations/pending", { token }),
  );

  const events = await timed("STUDENT GET /student/teams/my-events (workspace pick)", () =>
    request("GET", "/student/teams/my-events", { token }),
  );
  const eventId = events?.data?.[0]?.eventId ?? events?.data?.[0]?.id ?? 23;
  await timed(`STUDENT GET workspace eventId=${eventId}`, () =>
    request("GET", `/student/teams/my-team/workspace?eventId=${eventId}`, { token }),
  );
  await timed(`STUDENT GET mentor-feedback`, () =>
    request("GET", `/student/teams/my-team/feedback?eventId=${eventId}`, { token }),
  );

  const ws = await request("GET", `/student/teams/my-team/workspace?eventId=${eventId}`, { token }).catch(() => null);
  const teamId = ws?.data?.team?.id;
  if (teamId) {
    await timed(`STUDENT GET /chat/teams/${teamId}/messages`, () =>
      request("GET", `/chat/teams/${teamId}/messages`, { token }),
    );
  }
  return { eventId, teamId };
}

async function runJudgeFlows(token) {
  await timed("JUDGE GET /users/profile", () =>
    request("GET", "/users/profile", { token }),
  );
  const events = await timed("JUDGE GET /judge/events", () =>
    request("GET", "/judge/events", { token }),
  );
  const event = events?.data?.[0];
  const roundId = event?.rounds?.[0]?.roundId;
  if (roundId) {
    await timed(`JUDGE GET /judge/rounds/${roundId}/submissions`, () =>
      request("GET", `/judge/rounds/${roundId}/submissions`, { token }),
    );
    const subs = await request("GET", `/judge/rounds/${roundId}/submissions`, { token }).catch(() => null);
    const subId = subs?.data?.[0]?.submissionId ?? subs?.data?.[0]?.id;
    if (subId) {
      await timed(`JUDGE GET /judge/submissions/${subId}`, () =>
        request("GET", `/judge/submissions/${subId}`, { token }),
      );
    }
  }
  return { roundId };
}

async function runMentorFlows(token) {
  await timed("MENTOR GET /users/profile", () =>
    request("GET", "/users/profile", { token }),
  );
  const teams = await timed("MENTOR GET /mentor/teams", () =>
    request("GET", "/mentor/teams", { token }),
  );
  const team = teams?.data?.[0];
  const teamId = team?.id ?? team?.teamId;
  const eventId = team?.event?.id ?? team?.eventId;
  if (eventId) {
    await timed(`MENTOR GET /mentor/events/${eventId}/teams`, () =>
      request("GET", `/mentor/events/${eventId}/teams`, { token }),
    );
  }
  if (teamId) {
    await timed(`MENTOR GET /mentor/teams/${teamId}/submissions`, () =>
      request("GET", `/mentor/teams/${teamId}/submissions`, { token }),
    );
    await timed(`MENTOR GET /mentor/teams/${teamId}/feedbacks`, () =>
      request("GET", `/mentor/teams/${teamId}/feedbacks`, { token }),
    );
    await timed(`MENTOR GET /chat/teams/${teamId}/messages`, () =>
      request("GET", `/chat/teams/${teamId}/messages`, { token }),
    );
  }
}

async function main() {
  console.log(`\n=== SEAL API Benchmark ===`);
  console.log(`Base: ${BASE}`);
  console.log(`Timeout: ${TIMEOUT_MS}ms | Slow: >${SLOW_MS}ms | Hang: >${HANG_MS}ms\n`);

  await runPublicFlows();

  const tokens = {};
  for (const acc of accounts) {
    const token = await timed(`AUTH signin ${acc.email}`, () =>
      signIn(acc.email, acc.password),
    );
    if (token) tokens[acc.role] = { token, email: acc.email };
  }

  if (tokens.admin) await runAdminFlows(tokens.admin.token);
  else console.log("\n[WARN] No admin token — skip organizer flows");

  const studentToken =
    tokens.student?.token ||
    tokens.student2?.token ||
    tokens.student3?.token;
  if (studentToken) await runStudentFlows(studentToken);
  else console.log("\n[WARN] No student token — skip student flows");

  const judgeToken = tokens.judge?.token || tokens.judge2?.token;
  if (judgeToken) {
    await runJudgeFlows(judgeToken);
    await runMentorFlows(judgeToken);
  } else console.log("\n[WARN] No judge/mentor token — skip judge flows");

  // Summary table
  console.log("\n=== RESULTS ===");
  console.log(
    "Status".padEnd(8) +
      "Time".padStart(8) +
      "  " +
      "Endpoint",
  );
  console.log("-".repeat(72));

  let ok = 0,
    slow = 0,
    fail = 0,
    hang = 0,
    timeout = 0;

  for (const r of results) {
    const icon =
      r.status === "OK"
        ? "OK"
        : r.status === "SLOW"
          ? "SLOW"
          : r.status === "HANG"
            ? "HANG"
            : r.status === "TIMEOUT"
              ? "TIMEOUT"
              : "FAIL";
    if (icon === "OK") ok++;
    else if (icon === "SLOW") slow++;
    else if (icon === "HANG" || icon === "TIMEOUT") {
      icon === "TIMEOUT" ? timeout++ : hang++;
    } else fail++;

    const line =
      icon.padEnd(8) +
      `${String(r.ms).padStart(6)}ms  ` +
      r.label +
      (r.error ? ` — ${r.error}` : "");
    console.log(line);
  }

  console.log("-".repeat(72));
  console.log(
    `Total: ${results.length} | OK: ${ok} | SLOW: ${slow} | HANG: ${hang} | TIMEOUT: ${timeout} | FAIL: ${fail}`,
  );

  const p95 = [...results]
    .filter((r) => r.status === "OK" || r.status === "SLOW")
    .map((r) => r.ms)
    .sort((a, b) => a - b);
  if (p95.length) {
    const idx = Math.floor(p95.length * 0.95);
    console.log(`P95 latency (OK+SLOW): ${p95[idx]}ms`);
    console.log(`Max latency: ${p95[p95.length - 1]}ms`);
    console.log(`Avg OK: ${Math.round(p95.reduce((a, b) => a + b, 0) / p95.length)}ms`);
  }

  process.exit(fail + hang + timeout > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
