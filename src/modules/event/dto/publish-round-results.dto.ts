import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class PublishRoundResultsDto {
  @ApiPropertyOptional({
    example: 3,
    description: "Number of top teams per track that advance to the next round",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  topNPerTrack?: number;
}
