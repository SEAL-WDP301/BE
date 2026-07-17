import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export enum ReminderAudience {
  TEAMS_NOT_SUBMITTED = "TEAMS_NOT_SUBMITTED",
  REGISTERED_PARTICIPANTS = "REGISTERED_PARTICIPANTS",
  APPROVED_PARTICIPANTS = "APPROVED_PARTICIPANTS",
  TEAM_LEADERS = "TEAM_LEADERS",
  JUDGES = "JUDGES",
}

export enum NotificationChannel {
  IN_APP = "IN_APP",
  EMAIL = "EMAIL",
  PUSH = "PUSH",
}

export class SendDeadlineReminderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  eventId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  roundId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  scheduleId?: number;

  @IsEnum(ReminderAudience)
  audience: ReminderAudience;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
