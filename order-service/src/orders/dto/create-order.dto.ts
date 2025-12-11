import { IsString, IsNotEmpty, IsArray, ValidateNested, IsNumber, IsPositive, Min, Max, ArrayMinSize, ArrayMaxSize, MaxLength, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsValidProductId } from '../../common/validators/product-id-format.validator';

class OrderItemDto {
  @IsString({ message: 'Product ID must be a string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  @MaxLength(100, { message: 'Product ID cannot exceed 100 characters' })
  @IsValidProductId({ message: 'Product ID must start with "product-" followed by alphanumeric characters and hyphens' })
  @Transform(({ value }) => value?.trim())
  productId: string;

  @IsNumber({}, { message: 'Quantity must be a number' })
  @IsNotEmpty({ message: 'Quantity is required' })
  @IsPositive({ message: 'Quantity must be a positive number' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(9999, { message: 'Quantity cannot exceed 9999' })
  @Type(() => Number)
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price must be a number with at most 2 decimal places' })
  @IsNotEmpty({ message: 'Price is required' })
  @IsPositive({ message: 'Price must be a positive number' })
  @Min(0.01, { message: 'Price must be at least 0.01' })
  @Max(999999.99, { message: 'Price cannot exceed 999999.99' })
  @Type(() => Number)
  price: number;
}

export class CreateOrderDto {
  @IsString({ message: 'User ID must be a string' })
  @IsNotEmpty({ message: 'User ID is required' })
  @MaxLength(36, { message: 'User ID cannot exceed 36 characters' })
  @IsUUID('4', { message: 'User ID must be a valid UUID' })
  @Transform(({ value }) => value?.trim())
  userId: string;

  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'Order must have at least one item' })
  @ArrayMaxSize(100, { message: 'Order cannot have more than 100 items' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

