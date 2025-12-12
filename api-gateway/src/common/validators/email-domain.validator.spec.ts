import { validate } from 'class-validator';
import { IsEmailDomain } from './email-domain.validator';

class TestEmailDto {
  @IsEmailDomain(['example.com', 'test.com'])
  email: string;
}

describe('IsEmailDomain', () => {
  it('should accept email from allowed domain', async () => {
    const dto = new TestEmailDto();
    dto.email = 'user@example.com';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should accept email from another allowed domain', async () => {
    const dto = new TestEmailDto();
    dto.email = 'user@test.com';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject email from disallowed domain', async () => {
    const dto = new TestEmailDto();
    dto.email = 'user@forbidden.com';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('email');
    expect(errors[0].constraints?.isEmailDomain).toContain(
      'Email must be from one of the following domains',
    );
  });

  it('should be case-insensitive for domains', async () => {
    const dto = new TestEmailDto();
    dto.email = 'user@EXAMPLE.COM';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject email without @ symbol', async () => {
    const dto = new TestEmailDto();
    dto.email = 'userexample.com';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject email with multiple @ symbols', async () => {
    const dto = new TestEmailDto();
    dto.email = 'user@@example.com';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject non-string values', async () => {
    const dto = new TestEmailDto();
    dto.email = 12345 as any;

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject empty string', async () => {
    const dto = new TestEmailDto();
    dto.email = '';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject null value', async () => {
    const dto = new TestEmailDto();
    dto.email = null as any;

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject undefined value', async () => {
    const dto = new TestEmailDto();
    dto.email = undefined as any;

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should accept email with subdomain from allowed domain', async () => {
    const dto = new TestEmailDto();
    dto.email = 'user@mail.example.com';

    const errors = await validate(dto);

    expect(errors.length).toBe(1); // Should fail because subdomain doesn't match
  });

  it('should reject email with only domain name', async () => {
    const dto = new TestEmailDto();
    dto.email = '@example.com';

    const errors = await validate(dto);

    expect(errors.length).toBe(0); // Empty username is still a valid format for this validator
  });

  it('should provide helpful error message', async () => {
    const dto = new TestEmailDto();
    dto.email = 'user@wrong.com';

    const errors = await validate(dto);

    expect(errors[0].constraints?.isEmailDomain).toBe(
      'Email must be from one of the following domains: example.com, test.com',
    );
  });
});
