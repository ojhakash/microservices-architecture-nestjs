// Global setup for integration tests
// This file runs before all integration tests

beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5435';
  process.env.DB_USERNAME = process.env.DB_USERNAME || 'postgres';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
  process.env.DB_NAME = process.env.DB_NAME || 'userdb_test';
});

afterAll(async () => {
  // Cleanup if needed
});
