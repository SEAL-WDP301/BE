// Sentry must be initialized before importing the NestJS application.
import "./instrument";

import * as Sentry from "@sentry/nestjs";
import { bootstrap } from "./bootstrap";

/**
 * main.ts — Application entry point.
 * Delegates all setup to bootstrap() for separation of concerns and testability.
 */
bootstrap().catch(async (error) => {
  Sentry.captureException(error);
  await Sentry.flush(2000);

  console.error("❌ Failed to start SEAL API:", error);
  process.exit(1);
});
