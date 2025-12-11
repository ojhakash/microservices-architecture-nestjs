import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @ApiProperty({ example: 'john.doe@example.com', required: false, maxLength: 255 })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsOptional()
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiProperty({ example: 'John Doe', required: false, minLength: 2, maxLength: 100 })
  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed' })
  @Transform(({ value }) => value?.trim())
  name?: string;
}

