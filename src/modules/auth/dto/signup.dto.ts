import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * SignUp DTO — validates request body for POST /auth/signup.
 *
 * NestJS Lifecycle: Validated by ValidationPipe (Pipe layer) before reaching handler.
 * Flow: Middleware → Guard → Interceptor → [ValidationPipe] → Handler
 */
export class SignUpDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Valid email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: 'StrongPass@123',
    description: 'Password (min 8, max 32 characters)',
    minLength: 8,
    maxLength: 32,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(32, { message: 'Password must not exceed 32 characters' })
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name (min 2, max 100 characters)',
  })
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(100, { message: 'Full name must not exceed 100 characters' })
  fullName: string;
}
