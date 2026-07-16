// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
// eslint-disable-next-line prettier/prettier
import * as Sentry from "@sentry/nestjs"

Sentry.init({
  dsn: "https://12dcd9ebab9329008d094f7abc2f6250@o4511743872663552.ingest.de.sentry.io/4511743879086160",
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
  // eslint-disable-next-line prettier/prettier
});