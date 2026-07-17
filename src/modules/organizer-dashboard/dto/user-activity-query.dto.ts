import { OmitType } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { OrganizerDashboardQueryDto } from "./organizer-dashboard-query.dto";

export enum ActivityPeriod {
  DAY = "24h",
  WEEK = "7d",
  MONTH = "30d",
}

export class UserActivityQueryDto extends OmitType(OrganizerDashboardQueryDto, [
  "season",
  "year",
  "limit",
] as const) {
  @IsOptional()
  @IsEnum(ActivityPeriod)
  period?: ActivityPeriod;
}
