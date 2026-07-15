import {
  IsInt,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AwardType } from "@prisma/client";

export class TeamAwardDto {
  @ApiProperty()
  @IsInt()
  teamId: number;

  @ApiPropertyOptional({ enum: AwardType })
  @IsEnum(AwardType)
  @IsOptional()
  award?: AwardType;
}

export class PublishRoundResultsDto {
  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2, 5],
    description: "Array of team IDs that should advance to the next round",
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  advancingTeamIds?: number[];

  @ApiPropertyOptional({
    type: [TeamAwardDto],
    description: "Awards for final round",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamAwardDto)
  @IsOptional()
  awards?: TeamAwardDto[];
}
