import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';

// Config namespaces
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';

// Logger config
import { createWinstonConfig } from './logger/winston.config';

// Middleware
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { HealthModule } from './modules/health/health.module';
import { RedisModule } from './modules/redis/redis.module';

// Entities
import { UserEntity } from './modules/user/entities/user.entity';

/**
 * AppModule — root module that wires everything together.
 *
 * Module loading order:
 * 1. ConfigModule (global) → available everywhere without import
 * 2. WinstonModule (global) → replaces default NestJS logger
 * 3. TypeOrmModule (global) → PostgreSQL connection
 * 4. RedisModule (global) → ioredis connection
 * 5. Feature Modules: Auth, User, Health
 *
 * Middleware is applied at module level via configure().
 * NestJS Lifecycle: [Middleware] → Guard → Interceptor → Pipe → Handler
 */
import { Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
      cache: true,
    }),

    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createWinstonConfig(configService),
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [UserEntity],
        synchronize: configService.get<boolean>('database.synchronize'),
        logging: configService.get<boolean>('database.logging'),
        autoLoadEntities: true,
        ssl: configService.get<boolean>('database.ssl')
          ? { rejectUnauthorized: false }
          : undefined,
        // Connection pool settings
        extra: {
          max: 10,           // Maximum pool size
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        },
      }),
    }),

    RedisModule,

    AuthModule,
    UserModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
    private readonly dataSource: DataSource,
  ) {
    if (this.dataSource.isInitialized) {
      this.logger.log('info', 'Database connected successfully', { context: 'Database' });
    }
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
