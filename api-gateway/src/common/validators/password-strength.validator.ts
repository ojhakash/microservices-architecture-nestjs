import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that a password meets strength requirements:
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*)
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // Check for at least one uppercase letter
          const hasUpperCase = /[A-Z]/.test(value);
          // Check for at least one lowercase letter
          const hasLowerCase = /[a-z]/.test(value);
          // Check for at least one number
          const hasNumber = /[0-9]/.test(value);
          // Check for at least one special character
          const hasSpecialChar = /[!@#$%^&*]/.test(value);

          return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*)';
        },
      },
    });
  };
}
