import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * GoogleOAuthGuard — initiates Google OAuth2 redirect and handles callback.
 *
 * NestJS Lifecycle position: Guard layer.
 * Flow: Middleware → [GoogleOAuthGuard] → GoogleStrategy.validate() → Handler
 *
 * Usage:
 * @UseGuards(GoogleOAuthGuard)
 * @Get('google')
 * googleLogin() {}  // Redirects to Google
 *
 * @UseGuards(GoogleOAuthGuard)
 * @Get('google/callback')
 * googleCallback() {}  // Handles redirect back from Google
 */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {}
