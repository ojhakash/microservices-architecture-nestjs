import { IsEmail, IsString, IsOptional, MinLength, MaxLength, IsIn, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsOptional()
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @IsString({ message: 'Name must be a string' })
  @IsOptional()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed' })
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsString({ message: 'Password must be a string' })
  @IsOptional()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  password?: string;

  @IsString({ message: 'Role must be a string' })
  @IsOptional()
  @IsIn(['user', 'admin'], { message: 'Role must be either "user" or "admin"' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  role?: string;
}

