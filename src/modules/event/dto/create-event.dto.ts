import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  IsUrl,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { Season, EventStatus } from "@prisma/client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CreateTrackDto } from "./create-track.dto";
import { CreateRoundDto } from "./create-round.dto";

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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  prize1st?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  prize2nd?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  prize3rd?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  prizeHonorable?: string;

  @ApiProperty({ type: [CreateTrackDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTrackDto)
  tracks: CreateTrackDto[];

  @ApiProperty({ type: [CreateRoundDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateRoundDto)
  rounds: CreateRoundDto[];
}
