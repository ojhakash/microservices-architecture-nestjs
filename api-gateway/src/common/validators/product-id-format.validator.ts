import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that a product ID follows a specific format:
 * - Starts with 'product-'
 * - Followed by alphanumeric characters and hyphens
 * - Total length between 10 and 100 characters
 */
export function IsValidProductId(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidProductId',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          // Product ID format: product-{alphanumeric and hyphens}
          const productIdPattern = /^product-[a-zA-Z0-9-]+$/;
          const isValidFormat = productIdPattern.test(value);
          const isValidLength = value.length >= 10 && value.length <= 100;

          return isValidFormat && isValidLength;
        },
        defaultMessage(args: ValidationArguments) {
          return 'Product ID must start with "product-" followed by alphanumeric characters and hyphens, and be between 10 and 100 characters long';
        },
      },
    });
  };
}
