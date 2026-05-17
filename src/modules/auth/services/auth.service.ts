import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { UserService } from '../../user/services/user.service';
import { SignUpDto } from '../dto/signup.dto';
import { SignInDto } from '../dto/signin.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { hashPassword, comparePassword } from '../../../common/utils/hash.util';
import { MESSAGES } from '../../../common/constants/messages.constant';
import { APP_CONSTANTS } from '../../../common/constants/app.constant';
import { Provider } from '../../../common/enums/provider.enum';
import { UserEntity } from '../../user/entities/user.entity';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

/**
 * AuthService — handles all authentication business logic.
 *
 * Responsibilities:
 * - User registration (signup) with bcrypt password hashing
 * - User login (signin) with credential verification
 * - JWT access token generation (short-lived, returned in response JSON)
 * - JWT refresh token generation (long-lived, stored as HttpOnly cookie)
 * - Token refresh flow
 * - Logout (clears cookie + nullifies hashed refresh token in DB)
 * - Google OAuth2 user find-or-create
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: Logger,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // SIGNUP
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Register a new local user.
   * @throws ConflictException if email already exists
   */
  async signup(dto: SignUpDto, res: Response) {
    const existingUser = await this.userService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException(MESSAGES.USER_ALREADY_EXISTS);
    }

    const hashedPass = await hashPassword(dto.password);

    const user = await this.userService.createUser({
      email: dto.email,
      password: hashedPass,
      fullName: dto.fullName,
      provider: Provider.LOCAL,
    });

    this.logger.log('info', `New user registered: ${user.email}`, {
      context: 'AuthService',
      userId: user.id,
    });

    const tokens = await this.generateTokens(user);
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      message: MESSAGES.SIGNUP_SUCCESS,
      data: {
        accessToken: tokens.accessToken,
        user: this.sanitizeUser(user),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SIGNIN
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Authenticate user with email and password.
   * @throws UnauthorizedException on invalid credentials
   */
  async signin(dto: SignInDto, res: Response) {
    // findByEmail with password field (normally excluded via select: false)
    const user = await this.userService.findByEmailWithPassword(dto.email);

    if (!user || !user.password) {
      throw new UnauthorizedException(MESSAGES.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await comparePassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(MESSAGES.INVALID_CREDENTIALS);
    }

    const tokens = await this.generateTokens(user);
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      message: MESSAGES.SIGNIN_SUCCESS,
      data: {
        accessToken: tokens.accessToken,
        user: this.sanitizeUser(user),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Exchange a valid refresh token (from HttpOnly cookie) for new tokens.
   * @throws UnauthorizedException if cookie missing or token invalid
   */
  async refreshTokens(refreshToken: string, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException(MESSAGES.UNAUTHORIZED);
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const user = await this.userService.findByIdWithRefreshToken(payload.sub);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException(MESSAGES.UNAUTHORIZED);
    }

    // Verify hashed refresh token matches stored hash
    const isRefreshTokenValid = await comparePassword(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const tokens = await this.generateTokens(user);
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      message: MESSAGES.TOKEN_REFRESHED,
      data: { accessToken: tokens.accessToken },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Logout user: clear refresh token cookie and nullify stored hash in DB.
   */
  async logout(userId: string, res: Response) {
    await this.userService.updateRefreshToken(userId, null);
    this.clearRefreshTokenCookie(res);

    return { message: MESSAGES.LOGOUT_SUCCESS, data: null };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GOOGLE OAUTH
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Handle Google OAuth2 callback.
   * Find existing user by googleId/email, or auto-create new account.
   */
  async googleLogin(googleUser: any, res: Response) {
    let user = await this.userService.findByEmail(googleUser.email);

    if (!user) {
      // Auto-create account for new Google users
      user = await this.userService.createUser({
        email: googleUser.email,
        fullName: googleUser.fullName,
        googleId: googleUser.googleId,
        provider: Provider.GOOGLE,
        password: null,
      });

      this.logger.log('info', `New Google user created: ${user.email}`, {
        context: 'AuthService',
        userId: user.id,
      });
    }

    const tokens = await this.generateTokens(user);
    await this.userService.updateRefreshToken(user.id, tokens.refreshToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);

    // Redirect to frontend with access token in query param
    // (Alternative: use URL fragment #token=... for better security)
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    return res.redirect(
      `${frontendUrl}/auth/callback?token=${tokens.accessToken}`,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generate both access token and refresh token for a user.
   */
  private async generateTokens(user: UserEntity) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Set refresh token as a secure HttpOnly cookie.
   *
   * Security settings:
   * - httpOnly: true → inaccessible to JavaScript (prevents XSS theft)
   * - secure: true in production → HTTPS only
   * - sameSite: 'strict' → prevents CSRF
   * - path: /api/auth → only sent to auth endpoints
   */
  setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const isProduction = this.configService.get<string>('app.nodeEnv') === 'production';
    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

    // Parse "7d" to ms
    const maxAgeDays = parseInt(expiresIn.replace('d', ''), 10) || 7;

    res.cookie(APP_CONSTANTS.REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: maxAgeDays * 24 * 60 * 60 * 1000, // days to ms
      path: '/',
    });
  }

  /**
   * Clear the refresh token cookie on logout.
   */
  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(APP_CONSTANTS.REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      path: '/',
    });
  }

  /**
   * Remove sensitive fields from user object before returning to client.
   */
  private sanitizeUser(user: UserEntity) {
    const { hashedRefreshToken: _hrt, password: _pw, ...safeUser } = user as any;
    return safeUser;
  }
}
