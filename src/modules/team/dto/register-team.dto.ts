import {
  IsInt,
  IsString,
  IsArray,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  ArrayUnique,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class RegisterTeamDto {
  @ApiProperty()
  @IsInt()
  trackId: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  teamName: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsEmail({}, { each: true })
  @ArrayUnique()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((email: string) => email.trim().toLowerCase())
      : value,
  )
  memberEmails: string[];
}
