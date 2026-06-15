import { IsInt, IsNotEmpty, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AssignJudgeDto {
  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  stakeholderId: number;

  @ApiProperty()
  @IsInt()
  @IsNotEmpty()
  roundId: number;

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  trackId?: number;
}
