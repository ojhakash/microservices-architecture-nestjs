import { validate } from 'class-validator';
import { IsValidProductId } from './product-id-format.validator';

class TestProductDto {
  @IsValidProductId()
  productId: string;
}

describe('IsValidProductId', () => {
  it('should accept valid product ID', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-abc123';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should accept product ID with hyphens', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-abc-123-xyz';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should accept product ID with uppercase letters', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-ABC123';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should accept product ID with mixed case', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-AbC123';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should accept product ID at minimum length (10 chars)', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-ab'; // 10 characters total

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should accept product ID at maximum length (100 chars)', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-' + 'a'.repeat(92); // 100 characters total

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject product ID without "product-" prefix', async () => {
    const dto = new TestProductDto();
    dto.productId = 'item-abc123';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('productId');
  });

  it('should reject product ID too short (less than 10 chars)', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-a'; // 9 characters total

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject product ID too long (more than 100 chars)', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-' + 'a'.repeat(93); // 101 characters total

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject product ID with special characters', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-abc@123';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject product ID with spaces', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-abc 123';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject product ID with only "product-"', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-'; // 8 characters, too short

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject product ID with underscore', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-abc_123';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject product ID with dot', async () => {
    const dto = new TestProductDto();
    dto.productId = 'product-abc.123';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject non-string values', async () => {
    const dto = new TestProductDto();
    dto.productId = 12345 as any;

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject empty string', async () => {
    const dto = new TestProductDto();
    dto.productId = '';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject null value', async () => {
    const dto = new TestProductDto();
    dto.productId = null as any;

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject undefined value', async () => {
    const dto = new TestProductDto();
    dto.productId = undefined as any;

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should provide helpful error message', async () => {
    const dto = new TestProductDto();
    dto.productId = 'invalid';

    const errors = await validate(dto);

    expect(errors[0].constraints?.isValidProductId).toContain(
      'Product ID must start with "product-"',
    );
  });
});
