import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, IsPositive, Min, Max, ArrayMinSize, ArrayMaxSize, MaxLength, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsValidProductId } from '../../common/validators';

class OrderItemDto {
  @ApiProperty({ example: 'product-123', maxLength: 100 })
  @IsString({ message: 'Product ID must be a string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  @MaxLength(100, { message: 'Product ID cannot exceed 100 characters' })
  @IsValidProductId({ message: 'Product ID must start with "product-" followed by alphanumeric characters and hyphens' })
  @Transform(({ value }) => value?.trim())
  productId: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 9999 })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @IsNotEmpty({ message: 'Quantity is required' })
  @IsPositive({ message: 'Quantity must be a positive number' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(9999, { message: 'Quantity cannot exceed 9999' })
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 29.99, minimum: 0.01, maximum: 999999.99 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price must be a number with at most 2 decimal places' })
  @IsNotEmpty({ message: 'Price is required' })
  @IsPositive({ message: 'Price must be a positive number' })
  @Min(0.01, { message: 'Price must be at least 0.01' })
  @Max(999999.99, { message: 'Price cannot exceed 999999.99' })
  @Type(() => Number)
  price: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'user-123', maxLength: 36 })
  @IsString({ message: 'User ID must be a string' })
  @IsNotEmpty({ message: 'User ID is required' })
  @MaxLength(36, { message: 'User ID cannot exceed 36 characters' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  @Transform(({ value }) => value?.trim())
  userId: string;

  @ApiProperty({ type: [OrderItemDto], minItems: 1, maxItems: 100 })
  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'Order must have at least one item' })
  @ArrayMaxSize(100, { message: 'Order cannot have more than 100 items' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

