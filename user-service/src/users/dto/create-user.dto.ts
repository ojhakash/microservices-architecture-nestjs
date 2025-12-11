import { IsEmail, IsString, IsNotEmpty, IsOptional, MinLength, MaxLength, IsIn, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', maxLength: 255 })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'John Doe', minLength: 2, maxLength: 100 })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: 'password123', minLength: 6, maxLength: 128 })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  password: string;

  @ApiProperty({ example: 'user', required: false, enum: ['user', 'admin'] })
  @IsString({ message: 'Role must be a string' })
  @IsOptional()
  @IsIn(['user', 'admin'], { message: 'Role must be either "user" or "admin"' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  role?: string;
}

