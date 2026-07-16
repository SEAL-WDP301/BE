"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Sentry = require("@sentry/nestjs");
const profiling_node_1 = require("@sentry/profiling-node");
Sentry.init({
    dsn: "https://12dcd9ebab9329008d094f7abc2f6250@o4511743872663552.ingest.de.sentry.io/4511743879086160",
    integrations: [(0, profiling_node_1.nodeProfilingIntegration)()],
    enableLogs: true,
    tracesSampleRate: 1.0,
    profileSessionSampleRate: 1.0,
    profileLifecycle: "trace",
    dataCollection: {},
});
Sentry.startSpan({
    name: "My Span",
}, () => {
});
//# sourceMappingURL=instrument.js.map