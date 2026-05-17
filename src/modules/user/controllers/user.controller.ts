import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { MESSAGES } from '../../../common/constants/messages.constant';

/**
 * UserController — handles user profile endpoints.
 *
 * All routes protected by JwtAuthGuard.
 * NestJS Lifecycle: Middleware → [JwtAuthGuard] → Interceptor → Pipe → Handler
 */
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /users/profile
   * Returns the authenticated user's profile.
   * @CurrentUser() extracts req.user.id set by JwtAuthGuard.
   */
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized — missing or invalid token' })
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.userService.getProfile(userId);
    return {
      message: MESSAGES.PROFILE_FETCHED,
      data: user,
    };
  }
}
