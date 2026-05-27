import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
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
import { UpdateUserDto } from '../dto/update-user.dto';

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
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid token',
  })
  async getProfile(@CurrentUser('id') userId: string) {
    const user = await this.userService.getProfile(Number(userId));
    return {
      message: MESSAGES.PROFILE_FETCHED,
      data: user,
    };
  }

  /**
   * PUT /users/profile/student
   * Updates the authenticated student's profile.
   */
  @Put('profile/student')
  @ApiOperation({ summary: 'Update current student profile' })
  @ApiResponse({
    status: 200,
    description: 'Student profile updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid student profile payload' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — missing or invalid token',
  })
  async updateStudentProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.userService.updateStudentProfile(
      Number(userId),
      dto,
    );
    return {
      message: MESSAGES.PROFILE_UPDATED,
      data: user,
    };
  }
}
