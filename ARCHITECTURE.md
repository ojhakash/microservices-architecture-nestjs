# Architecture Explanation

## Overview

This microservices demo system demonstrates real-world patterns used in production microservices architectures. It showcases event-driven communication, distributed tracing, and comprehensive observability.

## System Components

### 1. API Gateway

**Purpose**: Single entry point for all client requests

**Responsibilities**:
- Routes HTTP requests to appropriate backend services
- Adds `X-Request-Id` header for request tracking
- Provides Swagger documentation
- Acts as a reverse proxy

**Technology**: NestJS with Express

**Key Features**:
- Request ID middleware for tracing
- Swagger/OpenAPI documentation
- HTTP client for service communication

### 2. User Service

**Purpose**: Manages user data and lifecycle

**Responsibilities**:
- CRUD operations for users
- Publishes `user.created` events when a user is created
- Stores user data in PostgreSQL

**Database**: PostgreSQL (userdb)

**Kafka Events**:
- **Publishes**: `user.created`
- **Consumes**: None

**Key Features**:
- TypeORM for database operations
- Kafka producer for event publishing
- Full observability stack

### 3. Order Service

**Purpose**: Manages orders and order lifecycle

**Responsibilities**:
- Creates orders for users
- Automatically creates welcome orders when users are created (event-driven)
- Publishes `order.created` events
- Stores order data in PostgreSQL

**Database**: PostgreSQL (orderdb)

**Kafka Events**:
- **Publishes**: `order.created`
- **Consumes**: `user.created`

**Key Features**:
- Event-driven order creation
- Kafka consumer and producer
- Full observability stack

### 4. Payment Service

**Purpose**: Processes payments for orders

**Responsibilities**:
- Listens for `order.created` events
- Simulates payment processing
- Publishes `payment.completed` events

**Database**: None (stateless service)

**Kafka Events**:
- **Publishes**: `payment.completed`
- **Consumes**: `order.created`

**Key Features**:
- Event-driven payment processing
- Simulated payment logic (90% success rate)
- Full observability stack

## Event Flow

### Scenario: User Creation Flow

```
1. Client → API Gateway
   POST /api/users
   ↓
2. API Gateway → User Service
   POST /users (with X-Request-Id)
   ↓
3. User Service
   - Creates user in database
   - Publishes user.created event to Kafka
   ↓
4. Order Service (Kafka Consumer)
   - Receives user.created event
   - Creates welcome order
   - Publishes order.created event to Kafka
   ↓
5. Payment Service (Kafka Consumer)
   - Receives order.created event
   - Processes payment
   - Publishes payment.completed event to Kafka
```

### Event Choreography

This system uses **event choreography** pattern where:
- Services react to events independently
- No central orchestrator
- Loose coupling between services
- Each service knows what to do when it receives an event

## Communication Patterns

### Synchronous Communication (HTTP)

**Used for**:
- Client → API Gateway → Backend Services
- Request/Response pattern
- Immediate feedback needed

**Advantages**:
- Simple to implement
- Immediate response
- Easy error handling

**Disadvantages**:
- Tight coupling
- Service must be available
- Can create cascading failures

### Asynchronous Communication (Kafka)

**Used for**:
- Service-to-service events
- Event-driven workflows
- Decoupled communication

**Advantages**:
- Loose coupling
- Services can be unavailable temporarily
- Scalable and resilient
- Event replay capability

**Disadvantages**:
- Eventual consistency
- More complex error handling
- Need to handle duplicate events

## Observability Stack

### 1. Logging (Pino)

**Purpose**: Structured logging with context

**Features**:
- Request ID tracking
- Trace ID for distributed tracing
- Span ID for operation tracking
- JSON structured logs
- Pretty printing in development

**Log Levels**:
- `info`: General information
- `error`: Errors and exceptions
- `warn`: Warnings
- `debug`: Debug information

### 2. Tracing (OpenTelemetry)

**Purpose**: Distributed tracing across services

**Features**:
- Auto-instrumentation for HTTP
- Auto-instrumentation for Kafka
- Trace context propagation
- Console exporter (for demo)
- Ready for Jaeger/Zipkin integration

**Trace Flow**:
```
Request → API Gateway → User Service → Kafka → Order Service → Kafka → Payment Service
```

Each service adds spans to the trace, allowing you to see the full request path.

### 3. Metrics (Prometheus)

**Purpose**: Service metrics and monitoring

**Features**:
- HTTP request metrics
- Kafka consumer/producer metrics
- System metrics (CPU, memory)
- Custom business metrics
- Prometheus format export

**Endpoints**: `/metrics` on each service

### 4. Health Checks

**Purpose**: Service health monitoring

**Endpoints**:
- `/health/live`: Liveness probe (is service running?)
- `/health/ready`: Readiness probe (is service ready to accept traffic?)

**Use Cases**:
- Kubernetes liveness/readiness probes
- Load balancer health checks
- Monitoring alerts

## Data Flow

### User Creation Example

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP POST /api/users
       ▼
┌─────────────┐
│API Gateway  │ Adds X-Request-Id
└──────┬──────┘
       │ HTTP POST /users
       ▼
┌─────────────┐
│User Service │
│             │ 1. Save to DB
│             │ 2. Publish user.created
└──────┬──────┘
       │ Kafka: user.created
       ▼
┌─────────────┐
│Order Service│
│             │ 1. Consume user.created
│             │ 2. Create welcome order
│             │ 3. Publish order.created
└──────┬──────┘
       │ Kafka: order.created
       ▼
┌─────────────┐
│Payment      │
│Service      │
│             │ 1. Consume order.created
│             │ 2. Process payment
│             │ 3. Publish payment.completed
└─────────────┘
```

## Database Design

### User Service Database (userdb)

**Table**: `users`
- `id` (UUID, Primary Key)
- `email` (String, Unique)
- `name` (String)
- `createdAt` (Timestamp)

### Order Service Database (orderdb)

**Table**: `orders`
- `id` (UUID, Primary Key)
- `userId` (String, Foreign Key reference)
- `items` (JSONB)
- `totalAmount` (Decimal)
- `createdAt` (Timestamp)

**Note**: Each service has its own database (database per service pattern)

## Kafka Topics

### Topic: `user.created`

**Publisher**: User Service  
**Consumer**: Order Service

**Event Structure**:
```typescript
{
  userId: string;
  email: string;
  name: string;
  createdAt: string;
}
```

**Headers**:
- `requestId`: Request tracking ID
- `traceId`: Distributed trace ID
- `spanId`: Span ID

### Topic: `order.created`

**Publisher**: Order Service  
**Consumer**: Payment Service

**Event Structure**:
```typescript
{
  orderId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  createdAt: string;
}
```

### Topic: `payment.completed`

**Publisher**: Payment Service  
**Consumer**: None (for demo)

**Event Structure**:
```typescript
{
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  status: 'completed' | 'failed';
  completedAt: string;
}
```

## Scalability Considerations

### Horizontal Scaling

Each service can be scaled independently:
- **API Gateway**: Multiple instances behind load balancer
- **User Service**: Multiple instances, shared database
- **Order Service**: Multiple instances, shared database
- **Payment Service**: Stateless, easy to scale

### Database Scaling

- **Read Replicas**: For read-heavy workloads
- **Sharding**: Partition data by user ID or region
- **CQRS**: Separate read/write models

### Kafka Scaling

- **Partitions**: Increase partitions for parallel processing
- **Consumer Groups**: Multiple consumers in same group for load balancing
- **Replication**: Multiple Kafka brokers for high availability

## Resilience Patterns

### Circuit Breaker

Not implemented in demo, but recommended for production:
- Prevents cascading failures
- Fails fast when service is down
- Provides fallback responses

### Retry Logic

Kafka consumers automatically retry failed messages:
- Configurable retry attempts
- Exponential backoff
- Dead letter queue for failed messages

### Idempotency

Services should handle duplicate events:
- Check if operation already performed
- Use unique identifiers
- Database constraints prevent duplicates

## Security Considerations

### Authentication & Authorization

Not implemented in demo, but production should include:
- JWT tokens for authentication
- Role-based access control (RBAC)
- API keys for service-to-service communication

### Network Security

- TLS/SSL for all communications
- VPN or private networks for service communication
- Firewall rules to restrict access

### Data Security

- Encrypt sensitive data at rest
- Encrypt data in transit
- PII (Personally Identifiable Information) handling compliance

## Deployment Architecture

### Local Development

```
┌─────────────────────────────────────┐
│      Docker Compose                 │
│  ┌──────────┐  ┌──────────┐        │
│  │  Kafka   │  │ Postgres │        │
│  └──────────┘  └──────────┘        │
└─────────────────────────────────────┘
         │
         │ Network
         │
┌────────┴────────┐
│  NestJS Services│ (Running locally)
│  - API Gateway  │
│  - User Service │
│  - Order Service│
│  - Payment Svc  │
└─────────────────┘
```

### Kubernetes Deployment (Future)

```
┌─────────────────────────────────────┐
│         Kubernetes Cluster           │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  Kafka   │  │ Postgres │        │
│  │  Stateful│  │ Stateful │        │
│  │   Sets   │  │   Sets   │        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  API     │  │  User    │        │
│  │ Gateway  │  │ Service  │        │
│  │Deployment│  │Deployment│        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │  Order   │  │ Payment  │        │
│  │ Service  │  │ Service  │        │
│  │Deployment│  │Deployment│        │
│  └──────────┘  └──────────┘        │
│                                     │
│  ┌──────────────────────────────┐  │
│  │      Ingress Controller      │  │
│  │    (Nginx / Traefik)         │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Monitoring & Alerting

### Metrics to Monitor

1. **Request Rate**: Requests per second
2. **Error Rate**: Percentage of failed requests
3. **Latency**: P50, P95, P99 response times
4. **Kafka Lag**: Consumer lag behind producer
5. **Database Connections**: Active connections
6. **Memory Usage**: Heap memory usage
7. **CPU Usage**: CPU utilization

### Alerts

- Service down
- High error rate (> 1%)
- High latency (P95 > 1s)
- Kafka consumer lag (> 1000 messages)
- Database connection pool exhaustion

## Best Practices Demonstrated

1. **Database per Service**: Each service has its own database
2. **Event-Driven Architecture**: Services communicate via events
3. **API Gateway Pattern**: Single entry point
4. **Distributed Tracing**: Full request tracing across services
5. **Structured Logging**: JSON logs with context
6. **Health Checks**: Liveness and readiness probes
7. **Metrics Export**: Prometheus format metrics
8. **Request ID Propagation**: Track requests across services
9. **Service Independence**: Services can be deployed independently
10. **Observability First**: Comprehensive monitoring from the start

## Learning Outcomes

After studying this system, you should understand:

1. How microservices communicate synchronously and asynchronously
2. Event-driven architecture patterns
3. Distributed tracing implementation
4. Structured logging best practices
5. Metrics collection and export
6. Health check patterns
7. API Gateway responsibilities
8. Database per service pattern
9. Kafka producer/consumer patterns
10. Service independence and scalability

