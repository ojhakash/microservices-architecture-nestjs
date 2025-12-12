import { faker } from '@faker-js/faker';
import { User } from '../../src/users/entities/user.entity';

export const createMockUser = (overrides?: Partial<User>): User => {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    name: faker.person.fullName(),
    password: faker.internet.password({ length: 12 }),
    role: 'user',
    createdAt: new Date(),
    ...overrides,
  } as User;
};

export const createMockAdminUser = (overrides?: Partial<User>): User => {
  return createMockUser({
    role: 'admin',
    ...overrides,
  });
};
