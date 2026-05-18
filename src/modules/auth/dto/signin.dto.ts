import { IsEmail, IsString, IsNotEmpty } from 'class-validator';

export class SignInDto {
  /**
   * Registered email address
   * @example 'phamthanhqb2005@gmail.com'
   */
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  /**
   * Account password
   * @example 'StrongPass@123'
   */
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
