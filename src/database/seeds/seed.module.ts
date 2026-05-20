import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from '../../config/app.config';
import databaseConfig from '../../config/database.config';
import { UserEntity } from '../../modules/user/entities/user.entity';
import { RoleEntity } from '../../modules/user/entities/role.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
      load: [appConfig, databaseConfig],
      cache: true,
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
        entities: [UserEntity, RoleEntity],
        synchronize: false, // Ensure false during seeding to avoid dropping/recreating tables
        ssl: configService.get<boolean>('database.ssl')
          ? { rejectUnauthorized: false }
          : undefined,
      }),
    }),

    TypeOrmModule.forFeature([UserEntity, RoleEntity]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
