import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import { ConfigService } from '@nestjs/config';

/**
 * Winston Logger Configuration
 *
 * 2 Transports:
 * 1. Console → nestLike format with colors and timestamp (human-readable)
 * 2. File    → JSON format at logs/app.log (machine-readable, structured)
 *
 * Used with WinstonModule.forRootAsync() in AppModule.
 */
export const createWinstonConfig = (configService: ConfigService) => {
  const isProduction = configService.get<string>('app.nodeEnv') === 'production';

  return {
    /**
     * Log level: debug in dev, warn in prod.
     * Levels: error > warn > info > http > verbose > debug > silly
     */
    level: isProduction ? 'warn' : 'debug',

    transports: [
      // ─────────────────────────────────────────
      // Transport 1: Console (human-friendly)
      // Format: nestLike → colored, timestamped, context-aware
      // ─────────────────────────────────────────
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('SEAL', {
            colors: true,
            prettyPrint: true,
            processId: true,
            appName: true,
          }),
        ),
      }),

      // ─────────────────────────────────────────
      // Transport 2: File (machine-readable JSON)
      // Format: JSON with level, timestamp, context, stack trace
      // Destination: logs/app.log
      // ─────────────────────────────────────────
      new winston.transports.File({
        filename: 'logs/app.log',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        ),
        // Rotate manually or use winston-daily-rotate-file for production
        maxsize: 20 * 1024 * 1024, // 20 MB
        maxFiles: 5,
      }),
    ],

    // Catch uncaught exceptions and unhandled rejections
    exceptionHandlers: [
      new winston.transports.File({ filename: 'logs/exceptions.log' }),
    ],
    rejectionHandlers: [
      new winston.transports.File({ filename: 'logs/rejections.log' }),
    ],
  };
};
