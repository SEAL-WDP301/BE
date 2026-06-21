import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { WinstonModule } from "nest-winston";

// Config namespaces
import appConfig from "./config/app.config";
import databaseConfig from "./config/database.config";
import jwtConfig from "./config/jwt.config";
import redisConfig from "./config/redis.config";

// Logger config
import { createWinstonConfig } from "./logger/winston.config";

// Middleware
import { RequestLoggerMiddleware } from "./common/middleware/request-logger.middleware";

// Core Database Module
import { PrismaModule } from "./database/prisma/prisma.module";

// Feature Modules
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { HealthModule } from "./modules/health/health.module";
import { RedisModule } from "./modules/redis/redis.module";
import { MailModule } from "./modules/mail/mail.module";
import { EventModule } from "./modules/event/event.module";
import { RubricModule } from "./modules/rubric/rubric.module";
import { TeamModule } from "./modules/team/team.module";
import { StorageModule } from "./modules/storage/storage.module";
import { StakeholderModule } from "./modules/stakeholder/stakeholder.module";
import { FeedbackModule } from "./modules/feedback/feedback.module";

import { EventEmitterModule } from "@nestjs/event-emitter";
import { Inject } from "@nestjs/common";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { Logger } from "winston";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || "development"}`, ".env"],
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
      cache: true,
    }),

    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createWinstonConfig(configService),
    }),

    PrismaModule,
    EventEmitterModule.forRoot(),
    RedisModule,
    MailModule,
    AuthModule,
    UserModule,
    HealthModule,
    EventModule,
    RubricModule,
    TeamModule,
    StorageModule,
    StakeholderModule,
    FeedbackModule,
  ],
})
export class AppModule implements NestModule {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes("*");
  }
}
