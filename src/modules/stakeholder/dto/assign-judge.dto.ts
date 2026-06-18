import { IsInt, IsNotEmpty, IsOptional, IsArray } from "class-validator";
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

  @ApiPropertyOptional({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  trackIds?: number[];
}
