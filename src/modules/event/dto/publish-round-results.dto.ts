import { IsInt, IsArray } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class PublishRoundResultsDto {
  @ApiProperty({
    type: [Number],
    example: [1, 2, 5],
    description: "Array of team IDs that should advance to the next round",
  })
  @IsArray()
  @IsInt({ each: true })
  advancingTeamIds: number[];
}
