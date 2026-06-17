import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateRubricDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxScore?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weight?: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  roundId: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @IsOptional()
  trackId?: number;
}
