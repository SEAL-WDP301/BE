import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiBody,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { SignUpDto } from '../dto/signup.dto';
import { SignInDto } from '../dto/signin.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleOAuthGuard } from '../guards/google-oauth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { APP_CONSTANTS } from '../../../common/constants/app.constant';

/**
 * AuthController — handles all authentication endpoints.
 *
 * NestJS Lifecycle for each request:
 * Middleware (RequestLogger) → Guard → Interceptor (Transform) → Pipe (Validation) → Handler
 *
 * Endpoints:
 * POST /auth/signup        → Register new user
 * POST /auth/signin        → Login with email/password
 * POST /auth/refresh       → Refresh access token using cookie
 * POST /auth/logout        → Logout (clear cookie)
 * GET  /auth/google        → Initiate Google OAuth2
 * GET  /auth/google/callback → Google OAuth2 callback
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/signup
  // ─────────────────────────────────────────────────────────────────────────────

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: SignUpDto })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  async signup(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.signup(dto, res);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/signin
  // ─────────────────────────────────────────────────────────────────────────────

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: SignInDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Access token returned. Refresh token set as HttpOnly cookie.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signin(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.signin(dto, res);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/refresh
  // ─────────────────────────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token using HttpOnly refresh token cookie',
  })
  @ApiCookieAuth('refresh_token')
  @ApiResponse({ status: 200, description: 'New access token returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Refresh token is extracted from HttpOnly cookie (not request body — security!)
    const refreshToken = req.cookies?.[APP_CONSTANTS.REFRESH_TOKEN_COOKIE];
    return this.authService.refreshTokens(refreshToken, res);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // POST /auth/logout
  // ─────────────────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(userId, res);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /auth/google
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({
    summary: 'Initiate Google OAuth2 login',
    description: 'Redirects browser to Google consent screen. Not for API clients.',
  })
  @ApiResponse({ status: 302, description: 'Redirect to Google consent screen' })
  googleLogin() {
    // Guard handles the redirect — this handler body is never executed
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GET /auth/google/callback
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth2 callback — handled by GoogleStrategy',
    description: 'Google redirects here after user grants permissions.',
  })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with access token' })
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // req.user is populated by GoogleStrategy.validate()
    return this.authService.googleLogin(req.user, res);
  }
}
