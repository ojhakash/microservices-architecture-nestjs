# NestJS Microservices Demo

A complete microservices demo system built with NestJS, Kafka, and comprehensive observability features. This project demonstrates real-world microservices architecture patterns including event-driven communication, distributed tracing, metrics, and health checks.

## 📋 Table of Contents

- [Architecture](#️-architecture)
- [Technology Stack](#-technology-stack)
- [Services](#-services)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [Testing](#-testing)
- [API Reference](#-api-reference)
- [End-to-End Demo Flow](#-end-to-end-demo-flow)
- [Observability](#-observability)
- [Monitoring Kafka Events](#-monitoring-kafka-events)
- [Project Structure](#-project-structure)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)

## 💻 Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| NestJS | 10.x | Backend framework |
| TypeScript | 5.x | Programming language |
| Kafka | 3.x | Event streaming |
| PostgreSQL | 15.x | Database |
| Docker | 20+ | Containerization |
| Jest | 29.x | Testing framework |
| Pino | 8.x | Logging |
| OpenTelemetry | 1.x | Distributed tracing |
| Prometheus | - | Metrics collection |
| Swagger/OpenAPI | 3.x | API documentation |

## 🏗️ Architecture

```
┌─────────────┐
│ API Gateway │ (Port 3005)
│  (NestJS)   │
└──────┬──────┘
       │ HTTP
       │
       ├──────────────┬──────────────┐
       │              │              │
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│  User    │   │  Order   │   │ Payment  │
│ Service  │   │ Service  │   │ Service  │
│ (3001)   │   │ (3002)   │   │ (3003)   │
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │
     │              │              │
     └──────────────┴──────────────┘
                    │
                    │ Kafka
                    ▼
            ┌──────────────┐
            │    Kafka     │
            │  (Port 9094) │
            └──────────────┘
```

## 📦 Services

### 1. **API Gateway** (Port 3005)
- REST API endpoints
- Forwards requests to backend services
- Adds `X-Request-Id` header
- Swagger documentation at `/api/docs`

### 2. **User Service** (Port 3001)
- CRUD operations for users
- Publishes `user.created` Kafka events
- PostgreSQL database
- Full observability (logging, tracing, metrics, health checks)

### 3. **Order Service** (Port 3002)
- Creates orders for users
- Consumes `user.created` events (auto-creates welcome order)
- Publishes `order.created` Kafka events
- PostgreSQL database
- Full observability

### 4. **Payment Service** (Port 3003)
- Consumes `order.created` events
- Simulates payment processing
- Publishes `payment.completed` events
- Full observability

## 🚀 Quick Start

### Prerequisites

**Required:**
- Node.js 18+ and npm
- Docker 20+ and Docker Compose
- Git

**Recommended:**
- Visual Studio Code or similar IDE
- Postman or curl for API testing

### Step 0: Clone the Repository

```bash
git clone <repository-url>
cd nest-ms
```

### Step 1: Start Infrastructure

```bash
cd infra
docker-compose up -d
```

This starts:
- Kafka + Zookeeper (ports 9094, 2181)
- PostgreSQL for user-service (port 5432)
- PostgreSQL for order-service (port 5433)
- Kafdrop (Kafka UI at http://localhost:9000)

Wait for all services to be healthy (check with `docker-compose ps`).

**Create Kafka topics** (required before starting services):

```bash
docker exec kafka kafka-topics --create --topic user.created --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
docker exec kafka kafka-topics --create --topic order.created --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
docker exec kafka kafka-topics --create --topic payment.completed --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
```

### Step 2: Install Dependencies

```bash
# Install dependencies for each service
cd api-gateway && npm install && cd ..
cd user-service && npm install && cd ..
cd order-service && npm install && cd ..
cd payment-service && npm install && cd ..
```

### Step 3: Start Services

Open 4 terminal windows and run:

**Terminal 1 - API Gateway:**
```bash
cd api-gateway
npm run start:dev
```

**Terminal 2 - User Service:**
```bash
cd user-service
npm run start:dev
```

**Terminal 3 - Order Service:**
```bash
cd order-service
npm run start:dev
```

**Terminal 4 - Payment Service:**
```bash
cd payment-service
npm run start:dev
```

### Step 4: Verify Services

- API Gateway: http://localhost:3005/api/docs
- User Service Health: http://localhost:3001/health/live
- Order Service Health: http://localhost:3002/health/live
- Payment Service Health: http://localhost:3003/health/live
- Kafdrop UI: http://localhost:9000

**Expected Output:**

When all services are running correctly, you should see:

```
✓ API Gateway listening on port 3005
✓ User Service listening on port 3001
✓ Order Service listening on port 3002
✓ Payment Service listening on port 3003
✓ Connected to Kafka broker
✓ Connected to PostgreSQL databases
```

## 🔧 Environment Variables

Each service uses environment variables for configuration. The services work with default values, but you can customize them.

### API Gateway

Create `.env` file in `api-gateway/`:

```env
PORT=3005
NODE_ENV=development

# Service URLs
USER_SERVICE_URL=http://localhost:3001
ORDER_SERVICE_URL=http://localhost:3002

# JWT Configuration (if authentication is enabled)
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=1h

# API Key (for service-to-service auth)
API_KEY=your-api-key-here
```

### User Service

Create `.env` file in `user-service/`:

```env
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=userdb

# Kafka
KAFKA_BROKER=localhost:9094
KAFKA_CLIENT_ID=user-service
KAFKA_CONSUMER_GROUP=user-service-group

# Observability
LOG_LEVEL=info
JAEGER_ENDPOINT=http://localhost:4318/v1/traces
```

### Order Service

Create `.env` file in `order-service/`:

```env
PORT=3002
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=orderdb

# Kafka
KAFKA_BROKER=localhost:9094
KAFKA_CLIENT_ID=order-service
KAFKA_CONSUMER_GROUP=order-service-group

# Observability
LOG_LEVEL=info
JAEGER_ENDPOINT=http://localhost:4318/v1/traces
```

### Payment Service

Create `.env` file in `payment-service/`:

```env
PORT=3003
NODE_ENV=development

# Kafka
KAFKA_BROKER=localhost:9094
KAFKA_CLIENT_ID=payment-service
KAFKA_CONSUMER_GROUP=payment-service-group

# Observability
LOG_LEVEL=info
JAEGER_ENDPOINT=http://localhost:4318/v1/traces
```

**Note:** The services use sensible defaults. You only need to create `.env` files if you want to override the defaults.

## 🧪 Testing

This project includes comprehensive unit and integration tests for all services.

### Running Unit Tests

Unit tests are isolated tests that mock external dependencies (databases, Kafka, HTTP services).

**Run tests for a specific service:**

```bash
# API Gateway
cd api-gateway && npm test

# User Service
cd user-service && npm test

# Order Service
cd order-service && npm test

# Payment Service
cd payment-service && npm test
```

**Run all tests across all services:**

```bash
# From the root directory
for dir in api-gateway user-service order-service payment-service; do
  echo "Testing $dir..."
  (cd $dir && npm test)
done
```

**Run tests with coverage:**

```bash
# For a specific service
cd user-service && npm test -- --coverage

# Coverage report will be in coverage/ directory
# View HTML report: open coverage/lcov-report/index.html
```

**Run tests in watch mode (for development):**

```bash
cd user-service && npm test -- --watch
```

### Running Integration Tests

Integration tests verify that services work correctly with real dependencies (PostgreSQL, Kafka).

**Prerequisites:**

1. Start the test infrastructure:

```bash
cd infra
docker-compose -f docker-compose.test.yml up -d
```

This starts:
- PostgreSQL for user-service tests (port 5434)
- PostgreSQL for order-service tests (port 5435)
- Kafka + Zookeeper for integration tests

2. Create test Kafka topics:

```bash
# Run the setup script
./infra/setup-test-db.sh
```

Or manually:

```bash
docker exec kafka kafka-topics --create --topic user.created --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
docker exec kafka kafka-topics --create --topic order.created --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
docker exec kafka kafka-topics --create --topic payment.completed --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
```

**Run integration tests:**

```bash
# User Service integration tests
cd user-service && npm run test:integration

# Order Service integration tests
cd order-service && npm run test:integration

# Payment Service integration tests
cd payment-service && npm run test:integration
```

**Integration tests with coverage:**

```bash
cd user-service && npm run test:integration -- --coverage
```

**Clean up test infrastructure:**

```bash
cd infra
docker-compose -f docker-compose.test.yml down -v
```

### Test Structure

Each service has the following test organization:

```
service-name/
├── src/
│   ├── module/
│   │   ├── module.controller.spec.ts    # Unit tests for controllers
│   │   ├── module.service.spec.ts       # Unit tests for services
│   │   └── consumers/*.spec.ts          # Unit tests for Kafka consumers
│   └── observability/
│       └── health.controller.spec.ts    # Health check tests
├── test/
│   ├── integration/
│   │   ├── module.integration.spec.ts   # Integration tests
│   │   └── kafka.integration.spec.ts    # Kafka integration tests
│   └── setup/
│       └── test-setup.ts                # Test utilities
├── jest.config.js                       # Unit test configuration
└── jest.integration.config.js           # Integration test configuration
```

### What's Being Tested

#### API Gateway (154 tests)
- **Controllers**: HTTP request handling, forwarding to services
- **Auth Guards**: JWT authentication, API key validation, role-based access
- **Validators**: Email domain, password strength, product ID format
- **Middleware**: Request ID generation and propagation
- **Decorators**: Current user extraction
- **Strategies**: JWT strategy, API key strategy

#### User Service (54 tests)
- **User Controller**: CRUD operations, request validation
- **User Service**: Business logic, database operations
- **Health Checks**: Liveness and readiness probes
- **Integration Tests**: Database operations, Kafka event publishing

#### Order Service (65 tests)
- **Order Controller**: Order creation, retrieval
- **Order Service**: Order processing, validation
- **Kafka Consumers**: User created event handling
- **Validators**: Product ID format validation
- **Health Checks**: Service health monitoring
- **Integration Tests**: Order workflows, Kafka event flows

#### Payment Service (32 tests)
- **Payment Service**: Payment processing logic
- **Kafka Consumers**: Order created event handling
- **Health Checks**: Service availability
- **Integration Tests**: Payment workflows, event handling

### Test Coverage

Run coverage reports to see detailed test coverage:

```bash
# Generate coverage for all services
cd api-gateway && npm test -- --coverage && cd ..
cd user-service && npm test -- --coverage && cd ..
cd order-service && npm test -- --coverage && cd ..
cd payment-service && npm test -- --coverage && cd ..
```

Coverage reports are generated in `coverage/lcov-report/index.html` for each service.

### Continuous Testing

**Watch mode for TDD:**

```bash
# Automatically re-run tests when files change
cd user-service && npm test -- --watch
```

**Test specific files:**

```bash
# Run tests matching a pattern
npm test -- users.service.spec.ts

# Run tests with a specific name
npm test -- --testNamePattern="should create user"
```

### Debugging Tests

**Run tests with debug output:**

```bash
# Set log level for more details
npm test -- --verbose

# Run a single test file
npm test -- path/to/test.spec.ts
```

**Debug in VS Code:**

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "--watchAll=false"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### CI/CD Integration

Example GitHub Actions workflow:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd api-gateway && npm ci
          cd ../user-service && npm ci
          cd ../order-service && npm ci
          cd ../payment-service && npm ci

      - name: Run unit tests
        run: |
          cd api-gateway && npm test -- --coverage
          cd ../user-service && npm test -- --coverage
          cd ../order-service && npm test -- --coverage
          cd ../payment-service && npm test -- --coverage
```

## 📚 API Reference

All API endpoints are accessible through the API Gateway at `http://localhost:3005`.

### Users API

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/users` | Create a new user | `{ email, name, password, role? }` |
| GET | `/api/users` | Get all users | - |
| GET | `/api/users/:id` | Get user by ID | - |
| PUT | `/api/users/:id` | Update user | `{ email?, name?, password? }` |
| DELETE | `/api/users/:id` | Delete user | - |

### Orders API

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/orders` | Create a new order | `{ userId, items: [{ productId, quantity, price }] }` |
| GET | `/api/orders` | Get all orders | - |
| GET | `/api/orders/:id` | Get order by ID | - |

### Authentication API (if enabled)

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/auth/register` | Register new user | `{ email, password, name, role? }` |
| POST | `/api/auth/login` | Login user | `{ email, password }` |

### Health Check Endpoints

| Service | Endpoint | Description |
|---------|----------|-------------|
| API Gateway | `http://localhost:3005/health/live` | Liveness probe |
| User Service | `http://localhost:3001/health/live` | Liveness probe |
| Order Service | `http://localhost:3002/health/live` | Liveness probe |
| Payment Service | `http://localhost:3003/health/live` | Liveness probe |

### Data Validation Rules

**User Email:**
- Must be valid email format
- Maximum 255 characters

**Product ID:**
- Must start with `product-`
- Followed by alphanumeric characters and hyphens
- Example: `product-123`, `product-abc-def`

**Quantity:**
- Minimum: 1
- Maximum: 9999

**Price:**
- Minimum: 0.01
- Maximum: 999999.99
- Maximum 2 decimal places

**Swagger Documentation:**

Interactive API documentation is available at:
- **API Gateway Swagger UI**: http://localhost:3005/api/docs

## 🧪 End-to-End Demo Flow

### 1. Create a User

```bash
curl -X POST http://localhost:3005/api/users \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: demo-request-123" \
  -d '{
    "email": "john.doe@example.com",
    "name": "John Doe",
    "password": "SecurePass123!"
  }'
```

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**What happens:**
1. API Gateway receives request, adds `X-Request-Id`
2. Forwards to User Service
3. User Service creates user in database
4. User Service publishes `user.created` event to Kafka
5. Order Service consumes `user.created` → creates welcome order → publishes `order.created`
6. Payment Service consumes `order.created` → processes payment → publishes `payment.completed`

### 2. View All Users

```bash
curl http://localhost:3005/api/users
```

**Expected Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### 3. Get User by ID

```bash
curl http://localhost:3005/api/users/550e8400-e29b-41d4-a716-446655440000
```

### 4. Create an Order Manually

```bash
curl -X POST http://localhost:3005/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: demo-order-456" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {
        "productId": "product-123",
        "quantity": 2,
        "price": 29.99
      }
    ]
  }'
```

**Expected Response:**
```json
{
  "id": "order-uuid-here",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "productId": "product-123",
      "quantity": 2,
      "price": 29.99
    }
  ],
  "totalAmount": 59.98,
  "status": "pending",
  "createdAt": "2024-01-15T10:35:00.000Z"
}
```

**What happens:**
1. API Gateway forwards to Order Service
2. Order Service creates order
3. Publishes `order.created` event
4. Payment Service processes payment
5. Publishes `payment.completed` event

### 5. Verify Event Flow

Check Kafdrop UI (http://localhost:9000) to see the events:

1. Navigate to `user.created` topic → View messages
2. Navigate to `order.created` topic → View messages
3. Navigate to `payment.completed` topic → View messages

You should see the complete event chain from user creation to payment completion.

### 6. Quick Demo Script

For a quick automated demo, you can use this script:

```bash
#!/bin/bash
# demo-quick.sh

echo "🚀 Starting NestJS Microservices Demo..."
echo ""

# Create a user
echo "1️⃣  Creating user..."
USER_RESPONSE=$(curl -s -X POST http://localhost:3005/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@example.com",
    "name": "Demo User",
    "password": "SecurePass123!"
  }')

USER_ID=$(echo $USER_RESPONSE | jq -r '.id')
echo "✓ User created with ID: $USER_ID"
echo ""

# Wait for async events to process
echo "⏳ Waiting for welcome order to be created (5 seconds)..."
sleep 5

# Get all orders
echo "2️⃣  Fetching orders..."
curl -s http://localhost:3005/api/orders | jq '.'
echo ""

# Create a manual order
echo "3️⃣  Creating manual order..."
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3005/api/orders \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"items\": [
      {
        \"productId\": \"product-demo-123\",
        \"quantity\": 3,
        \"price\": 19.99
      }
    ]
  }")

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.id')
echo "✓ Order created with ID: $ORDER_ID"
echo ""

# Show final state
echo "4️⃣  Final state:"
echo "Users: http://localhost:3005/api/users"
echo "Orders: http://localhost:3005/api/orders"
echo "Kafdrop: http://localhost:9000"
echo ""

echo "✅ Demo completed! Check Kafdrop to see the event flow."
```

Make it executable and run:
```bash
chmod +x demo-quick.sh
./demo-quick.sh
```

## 📊 Observability

### Logging
Each service uses **Pino** for structured logging with:
- `requestId`: Request tracking ID
- `traceId`: Distributed trace ID
- `spanId`: Span ID for tracing
- Context-aware logging

### Tracing
**OpenTelemetry** is configured in each service:
- Auto-instruments HTTP and Kafka
- Exports traces to Jaeger via OTLP
- Visualize distributed traces across all services

#### Setting up Jaeger

```bash
cd infra
docker compose up -d jaeger
```

**Access Jaeger UI:** http://localhost:16686

**View traces:**
1. Select a service (e.g., `user-service`)
2. Click "Find Traces"
3. Click a trace to see the full request timeline across services

### Metrics
Each service exposes Prometheus metrics at `/metrics`:
- HTTP request metrics
- Kafka consumer/producer metrics
- System metrics

#### Setting up Prometheus & Grafana

Start the monitoring stack:
```bash
cd infra
docker-compose up -d prometheus grafana
```

**Access URLs:**
| Service | URL | Credentials |
|---------|-----|-------------|
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3010 | admin / admin |

**Configure Grafana:**
1. Login to Grafana at http://localhost:3010
2. Go to **Connections** → **Data Sources** → **Add data source**
3. Select **Prometheus**, set URL: `http://prometheus:9090`
4. Click **Save & Test**

**Create a Dashboard with Service Filter:**
1. Create new dashboard → Add visualization
2. Go to **Dashboard Settings** → **Variables** → **Add variable**
3. Set: Name=`Service`, Type=Query, Label=`job`, Metric=`up`
4. Use queries like: `process_resident_memory_bytes{job="$Service"}`

**Useful Queries:**
```promql
# Memory usage
process_resident_memory_bytes{job="$Service"}

# CPU usage  
rate(process_cpu_seconds_total{job="$Service"}[1m]) * 100

# Event loop lag
nodejs_eventloop_lag_seconds{job="$Service"}
```

### Health Checks
Each service provides:
- `/health/live` - Liveness probe
- `/health/ready` - Readiness probe

## 🔍 Monitoring Kafka Events

### Using Kafdrop
1. Open http://localhost:9000
2. View topics: `user.created`, `order.created`, `payment.completed`
3. Inspect messages and consumer groups

### Using Kafka CLI

```bash
# List topics
docker exec -it kafka kafka-topics --bootstrap-server localhost:9094 --list

# Consume messages from a topic
docker exec -it kafka kafka-console-consumer \
  --bootstrap-server localhost:9094 \
  --topic user.created \
  --from-beginning
```

## 📁 Project Structure

```
nest-ms/
├── api-gateway/          # API Gateway service
│   ├── src/
│   │   ├── users/       # User endpoints
│   │   ├── orders/      # Order endpoints
│   │   └── common/      # Middleware, etc.
│   └── package.json
├── user-service/         # User service
│   ├── src/
│   │   ├── users/       # User CRUD
│   │   ├── kafka/       # Kafka producer
│   │   └── observability/
│   └── package.json
├── order-service/        # Order service
│   ├── src/
│   │   ├── orders/      # Order CRUD + consumer
│   │   ├── kafka/       # Kafka producer
│   │   └── observability/
│   └── package.json
├── payment-service/     # Payment service
│   ├── src/
│   │   ├── payments/    # Payment consumer
│   │   ├── kafka/       # Kafka producer
│   │   └── observability/
│   └── package.json
├── shared/              # Shared code
│   ├── events/          # Event interfaces
│   └── kafka/           # Kafka utilities
└── infra/
    └── docker-compose.yml
```

## 🔌 Kafka Topics

| Topic | Publisher | Consumer | Description |
|-------|-----------|----------|-------------|
| `user.created` | user-service | order-service | User creation event |
| `order.created` | order-service | payment-service | Order creation event |
| `payment.completed` | payment-service | - | Payment completion event |

## 🐳 Docker Commands

```bash
# Start infrastructure
cd infra && docker-compose up -d

# Stop infrastructure
cd infra && docker-compose down

# View logs
cd infra && docker-compose logs -f kafka

# Clean volumes (removes data)
cd infra && docker-compose down -v
```

## 🚀 Production Considerations

This is a **demo/learning project**. For production:

1. **Security**: Add authentication/authorization (JWT, OAuth2)
2. **Database**: Use migrations instead of `synchronize: true`
3. **Kafka**: Configure replication factor > 1
4. **Tracing**: Export to Jaeger/Zipkin instead of console
5. **Metrics**: Use Prometheus + Grafana
6. **Logging**: Centralized logging (ELK stack)
7. **Configuration**: Use ConfigModule with environment variables
8. **Error Handling**: Global exception filters
9. **Rate Limiting**: Add rate limiting to API Gateway
10. **Kubernetes**: Add K8s manifests (deployments, services, ingress)

## 📚 Learning Points

This demo demonstrates:

1. **Microservices Communication**
   - HTTP for synchronous requests
   - Kafka for asynchronous event-driven communication

2. **Event-Driven Architecture**
   - Event sourcing patterns
   - Event choreography

3. **Observability**
   - Distributed tracing
   - Structured logging
   - Metrics collection

4. **Service Independence**
   - Each service has its own database
   - Services communicate via events

5. **API Gateway Pattern**
   - Single entry point
   - Request routing
   - Request ID propagation

## 🐛 Troubleshooting

### Kafka Connection Issues
- Ensure Kafka is running: `docker ps | grep kafka`
- Check Kafka logs: `docker logs kafka`
- Verify broker address: `localhost:9094`

### "Unknown topic or partition" Error
Topics may not exist yet. Create them manually:
```bash
docker exec kafka kafka-topics --create --topic user.created --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
docker exec kafka kafka-topics --create --topic order.created --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
```

### Database Connection Issues
- Check PostgreSQL is running: `docker ps | grep postgres`
- Verify connection strings in service configs
- Check database names match (userdb, orderdb)

### Port Conflicts
- Change ports in `docker-compose.yml` or service configs
- Update `PORT` environment variables

### Service Won't Start
**Check logs:**
```bash
# For Docker services
docker logs kafka
docker logs postgres-user
docker logs postgres-order

# For Node services (check terminal output)
# Look for connection errors or missing dependencies
```

**Common fixes:**
- Ensure all Docker containers are running: `docker ps`
- Verify ports aren't in use: `lsof -i :3001`
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

## ❓ FAQ

### General Questions

**Q: What is this project for?**
A: This is a learning/demo project showcasing microservices architecture patterns with NestJS, Kafka, and observability features. It's meant for educational purposes.

**Q: Can I use this in production?**
A: No, this is a demo project. See [Production Considerations](#-production-considerations) for what needs to be added for production use.

**Q: What does each service do?**
A:
- **API Gateway**: Single entry point, routes requests to backend services
- **User Service**: Manages users, publishes user events
- **Order Service**: Manages orders, listens to user events
- **Payment Service**: Processes payments, listens to order events

### Setup Questions

**Q: Do I need to create .env files?**
A: No, services work with sensible defaults. Only create .env files if you need to override defaults.

**Q: Why do I need to create Kafka topics manually?**
A: Topics should be created before services start to ensure proper configuration (partitions, replication). In production, this is typically done via infrastructure-as-code.

**Q: Can I run this without Docker?**
A: You'd need to install and run Kafka, ZooKeeper, and PostgreSQL manually. Docker is recommended for easier setup.

**Q: How do I stop all services?**
A:
- Stop Node services: `Ctrl+C` in each terminal
- Stop Docker services: `cd infra && docker-compose down`

### Development Questions

**Q: How do I add a new microservice?**
A:
1. Copy an existing service folder
2. Update package.json (name, description)
3. Change port in main.ts
4. Update docker-compose.yml if it needs a database
5. Add endpoints to API Gateway
6. Add Kafka topics if needed

**Q: How do I debug a service?**
A:
- Use VS Code's debugger with the launch configuration
- Add breakpoints in your IDE
- Use `console.log()` or the Logger service
- Check service logs for errors

**Q: How can I see what data is in the databases?**
A:
```bash
# Connect to user-service database
docker exec -it postgres-user psql -U postgres -d userdb

# List tables
\dt

# Query users
SELECT * FROM users;

# Exit
\q
```

**Q: How do I reset all data?**
A:
```bash
# Stop and remove all containers and volumes
cd infra
docker-compose down -v

# Restart infrastructure
docker-compose up -d

# Recreate Kafka topics (see Quick Start)
```

### Testing Questions

**Q: Do I need to run integration tests?**
A: No, unit tests are sufficient for most development. Run integration tests when you want to verify real infrastructure interactions.

**Q: Why are some tests failing?**
A: Make sure you've installed all dependencies (`npm install`) and that the test databases are not running (integration tests use different ports).

**Q: How do I run a single test file?**
A:
```bash
npm test -- path/to/test.spec.ts
```

### Kafka Questions

**Q: How do I see Kafka messages?**
A: Use Kafdrop UI at http://localhost:9000 or Kafka CLI commands (see [Monitoring Kafka Events](#-monitoring-kafka-events))

**Q: What if Kafka consumers aren't receiving messages?**
A:
- Check consumer group is running: Kafdrop → Consumers
- Verify topics exist: `docker exec kafka kafka-topics --list --bootstrap-server localhost:9094`
- Check service logs for connection errors
- Restart the consuming service

**Q: Can I add more Kafka topics?**
A: Yes, create them with:
```bash
docker exec kafka kafka-topics --create --topic your-topic-name \
  --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1
```

### Observability Questions

**Q: How do I view traces?**
A: Start Jaeger (`cd infra && docker-compose up -d jaeger`) and visit http://localhost:16686

**Q: Where are the logs?**
A: Logs appear in the terminal where each service is running. Services use structured JSON logging via Pino.

**Q: Can I export metrics to Prometheus?**
A: Yes, each service exposes metrics at `/metrics`. Set up Prometheus as described in [Observability](#-observability).

### Error Messages

**Q: "ECONNREFUSED" error**
A: A service can't connect to its dependency (Kafka, PostgreSQL). Ensure Docker containers are running.

**Q: "Topic not found" error**
A: Create Kafka topics manually (see Step 1 in Quick Start).

**Q: "Port already in use" error**
A: Another process is using that port. Either stop it or change the port in the service's configuration.

**Q: "Cannot find module" error**
A: Run `npm install` in the affected service directory.

## 📝 License

MIT

## 🤝 Contributing

This is a learning project. Feel free to fork and experiment!

