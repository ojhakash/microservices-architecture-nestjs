import { faker } from '@faker-js/faker';
import { Order } from '../../src/orders/entities/order.entity';

export const createMockOrder = (overrides?: Partial<Order>): Order => {
  const items = [
    {
      productId: faker.string.alphanumeric(8),
      price: Number(faker.commerce.price()),
      quantity: faker.number.int({ min: 1, max: 5 }),
    },
  ];

  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    items,
    totalAmount,
    createdAt: new Date(),
    ...overrides,
  } as Order;
};

export const createMockWelcomeOrder = (userId: string): Order => {
  return {
    id: faker.string.uuid(),
    userId,
    items: [
      {
        productId: 'WELCOME-001',
        price: 100,
        quantity: 1,
      },
    ],
    totalAmount: 100,
    createdAt: new Date(),
  } as Order;
};
