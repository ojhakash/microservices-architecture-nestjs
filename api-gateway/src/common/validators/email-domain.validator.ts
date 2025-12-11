import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that an email belongs to an allowed domain.
 * Can be configured with a list of allowed domains.
 */
export function IsEmailDomain(
  allowedDomains: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isEmailDomain',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [allowedDomains],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          const emailParts = value.split('@');
          if (emailParts.length !== 2) {
            return false;
          }

          const domain = emailParts[1].toLowerCase();
          const allowed = args.constraints[0] as string[];

          return allowed.some(
            (allowedDomain) => domain === allowedDomain.toLowerCase(),
          );
        },
        defaultMessage(args: ValidationArguments) {
          const allowed = args.constraints[0] as string[];
          return `Email must be from one of the following domains: ${allowed.join(', ')}`;
        },
      },
    });
  };
}
