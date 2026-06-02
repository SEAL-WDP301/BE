import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsInt, IsUrl } from 'class-validator';
import { Season, EventStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: Season })
  @IsEnum(Season)
  season: Season;

  @ApiProperty()
  @IsInt()
  year: number;

  @ApiPropertyOptional({ enum: EventStatus, default: EventStatus.draft })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  registrationDeadline?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  githubOrgUrl?: string;
}
