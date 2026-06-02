import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { UserModule } from '@modules/user/user.module';
import { RedisModule } from '@modules/redis/redis.module';
import { MailModule } from '@modules/mail/mail.module';

/**
 * AuthModule — encapsulates authentication concerns.
 *
 * Exports: JwtAuthGuard (used in UserModule and other protected modules)
 *
 * Note: JwtModule is configured without a secret here because each signAsync/verify
 * call in AuthService explicitly passes the secret from ConfigService.
 * This allows using different secrets for access vs refresh tokens.
 */
@Module({
  imports: [
    UserModule,
    RedisModule,
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    JwtAuthGuard,
    GoogleOAuthGuard
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule { }
