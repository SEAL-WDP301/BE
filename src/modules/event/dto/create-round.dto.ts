import { IsString, IsNotEmpty, IsEnum, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionType } from '@prisma/client';

export class CreateRoundDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  roundNumber: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  submissionType: SubmissionType;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  submissionDeadline?: string;
}
