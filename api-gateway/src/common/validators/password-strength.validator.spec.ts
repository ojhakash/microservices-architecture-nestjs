import { validate } from 'class-validator';
import { IsStrongPassword } from './password-strength.validator';

class TestPasswordDto {
  @IsStrongPassword()
  password: string;
}

describe('IsStrongPassword', () => {
  it('should accept strong password with all requirements', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password123!';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should accept password with multiple special characters', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Pass@word#123$';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject password without uppercase letter', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'password123!';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
    expect(errors[0].property).toBe('password');
  });

  it('should reject password without lowercase letter', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'PASSWORD123!';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject password without number', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password!';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject password without special character', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password123';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should accept password with all allowed special characters', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Pass123!@#$%^&*';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject password with only exclamation mark', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password123!';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject password with only @ symbol', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password123@';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject password with only # symbol', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password123#';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject password with only $ symbol', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password123$';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject password with only % symbol', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password123%';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject password with only ^ symbol', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password123^';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject password with only & symbol', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password123&';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject password with only * symbol', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password123*';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should reject password with unsupported special characters', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'Password123?';

    const errors = await validate(dto);

    expect(errors.length).toBe(1); // ? is not in the allowed list
  });

  it('should reject non-string values', async () => {
    const dto = new TestPasswordDto();
    dto.password = 12345 as any;

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject empty string', async () => {
    const dto = new TestPasswordDto();
    dto.password = '';

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject null value', async () => {
    const dto = new TestPasswordDto();
    dto.password = null as any;

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should reject undefined value', async () => {
    const dto = new TestPasswordDto();
    dto.password = undefined as any;

    const errors = await validate(dto);

    expect(errors.length).toBe(1);
  });

  it('should provide helpful error message', async () => {
    const dto = new TestPasswordDto();
    dto.password = 'weak';

    const errors = await validate(dto);

    expect(errors[0].constraints?.isStrongPassword).toContain(
      'Password must contain at least one uppercase letter',
    );
  });
});
