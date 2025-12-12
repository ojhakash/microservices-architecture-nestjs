export const createMockKafkaService = () => ({
  emit: jest.fn().mockResolvedValue(undefined),
  send: jest.fn().mockResolvedValue(undefined),
  onModuleInit: jest.fn(),
  onModuleDestroy: jest.fn(),
});
