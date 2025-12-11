# NestJS Microservices Demo

A complete microservices demo system built with NestJS, Kafka, and comprehensive observability features. This project demonstrates real-world microservices architecture patterns including event-driven communication, distributed tracing, metrics, and health checks.

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

- Node.js 18+ and npm
- Docker and Docker Compose

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

## 🧪 End-to-End Demo Flow

### 1. Create a User

```bash
curl -X POST http://localhost:3005/api/users \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: demo-request-123" \
  -d '{
    "email": "john.doe@example.com",
    "name": "John Doe"
  }'
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
curl http://localhost:3000/api/users
```

### 3. Get User by ID

```bash
curl http://localhost:3005/api/users/{userId}
```

### 4. Create an Order Manually

```bash
curl -X POST http://localhost:3005/api/orders \
  -H "Content-Type: application/json" \
  -H "X-Request-Id: demo-order-456" \
  -d '{
    "userId": "your-user-id-here",
    "items": [
      {
        "productId": "product-123",
        "quantity": 2,
        "price": 29.99
      }
    ]
  }'
```

**What happens:**
1. API Gateway forwards to Order Service
2. Order Service creates order
3. Publishes `order.created` event
4. Payment Service processes payment
5. Publishes `payment.completed` event

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

## 📝 License

MIT

## 🤝 Contributing

This is a learning project. Feel free to fork and experiment!

