import { IsValidProductId } from './product-id-format.validator';
import { validate } from 'class-validator';

class TestDto {
  @IsValidProductId()
  productId: string;
}

describe('IsValidProductId Validator', () => {
  describe('valid product IDs', () => {
    it('should validate correct product ID format', async () => {
      const dto = new TestDto();
      dto.productId = 'product-12345';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should accept product ID with hyphens', async () => {
      const dto = new TestDto();
      dto.productId = 'product-abc-123-def';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should accept product ID with alphanumeric characters', async () => {
      const dto = new TestDto();
      dto.productId = 'product-ABC123xyz789';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should accept product ID at minimum length (10 characters)', async () => {
      const dto = new TestDto();
      dto.productId = 'product-12'; // exactly 10 characters

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should accept product ID at maximum length (100 characters)', async () => {
      const dto = new TestDto();
      // product- (8 chars) + 92 chars = 100 chars total
      dto.productId = 'product-' + 'a'.repeat(92);

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });

    it('should accept product ID with mixed case', async () => {
      const dto = new TestDto();
      dto.productId = 'product-ABCdef123XYZ';

      const errors = await validate(dto);

      expect(errors.length).toBe(0);
    });
  });

  describe('invalid product IDs', () => {
    it('should reject product ID without "product-" prefix', async () => {
      const dto = new TestDto();
      dto.productId = 'item-12345';

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isValidProductId');
    });

    it('should reject product ID that is too short', async () => {
      const dto = new TestDto();
      dto.productId = 'product-1'; // 9 characters (< 10)

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject product ID that is too long', async () => {
      const dto = new TestDto();
      dto.productId = 'product-' + 'a'.repeat(93); // 101 characters (> 100)

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject product ID with special characters', async () => {
      const dto = new TestDto();
      dto.productId = 'product-abc@123';

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject product ID with spaces', async () => {
      const dto = new TestDto();
      dto.productId = 'product-abc 123';

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject product ID with underscores', async () => {
      const dto = new TestDto();
      dto.productId = 'product-abc_123';

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject non-string values', async () => {
      const dto = new TestDto();
      dto.productId = 12345 as any;

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject null values', async () => {
      const dto = new TestDto();
      dto.productId = null as any;

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject undefined values', async () => {
      const dto = new TestDto();
      dto.productId = undefined as any;

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject empty string', async () => {
      const dto = new TestDto();
      dto.productId = '';

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should reject product ID with only "product-"', async () => {
      const dto = new TestDto();
      dto.productId = 'product-';

      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should provide correct error message', async () => {
      const dto = new TestDto();
      dto.productId = 'invalid';

      const errors = await validate(dto);

      expect(errors[0].constraints?.isValidProductId).toBe(
        'Product ID must start with "product-" followed by alphanumeric characters and hyphens, and be between 10 and 100 characters long',
      );
    });
  });
});
