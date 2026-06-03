import { IsEnum, IsString, IsOptional, ValidateIf } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TeamStatus } from "@prisma/client";

export class OrganizerUpdateTeamDto {
  @ApiProperty({ enum: TeamStatus })
  @IsEnum(TeamStatus)
  status: TeamStatus;

  @ApiPropertyOptional()
  @ValidateIf((o) => o.status === TeamStatus.eliminated)
  @IsString()
  @IsOptional()
  reason?: string;
}
