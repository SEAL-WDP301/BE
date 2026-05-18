import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * UpdateUserDto — partial update payload for user profile.
 * Only allow safe fields to be updated (not email, role, or provider).
 */
export class UpdateUserDto {
  /**
   * Full name of the user
   * @example 'Jane Doe'
   */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;
}
