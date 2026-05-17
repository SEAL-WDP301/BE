import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { UserModule } from '../user/user.module';

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
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Register JwtModule without default secret — secrets are passed per-call
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,

    // Passport strategies (registered as 'jwt' and 'google' with PassportModule)
    JwtStrategy,
    GoogleStrategy,

    // Guards exported for use in other modules
    JwtAuthGuard,
    GoogleOAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
