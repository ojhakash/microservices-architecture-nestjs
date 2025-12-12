import { faker } from '@faker-js/faker';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const createMockJwtPayload = (
  overrides?: Partial<JwtPayload>,
): JwtPayload => {
  return {
    userId: faker.string.uuid(),
    email: faker.internet.email(),
    role: 'user',
    ...overrides,
  };
};

export const createMockAdminJwtPayload = (
  overrides?: Partial<JwtPayload>,
): JwtPayload => {
  return createMockJwtPayload({
    role: 'admin',
    ...overrides,
  });
};
