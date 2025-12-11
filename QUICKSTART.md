# Quick Start Guide

Get the microservices demo running in 5 minutes!

## Prerequisites Check

```bash
# Check Node.js version (need 18+)
node --version

# Check Docker
docker --version

# Check Docker Compose
docker-compose --version
```

## Step-by-Step Setup

### 1. Start Infrastructure (2 minutes)

```bash
cd infra
docker-compose up -d
```

Wait for services to be healthy:
```bash
docker-compose ps
```

All services should show "Up" status. This starts:
- ✅ Kafka + Zookeeper
- ✅ PostgreSQL (userdb)
- ✅ PostgreSQL (orderdb)
- ✅ Kafdrop (Kafka UI)
- ✅ Prometheus (metrics)
- ✅ Grafana (visualization)
- ✅ Jaeger (distributed tracing)
- ✅ Elasticsearch + Kibana (log aggregation)

### 2. Create Kafka Topics (30 seconds)

Pre-create the required Kafka topics to avoid "Unknown topic" errors on startup:

```bash
docker exec kafka kafka-topics --create --topic user.created --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
docker exec kafka kafka-topics --create --topic order.created --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
docker exec kafka kafka-topics --create --topic payment.completed --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
```

Verify topics were created:
```bash
docker exec kafka kafka-topics --bootstrap-server localhost:9094 --list
```

### 3. Install Dependencies (2 minutes)

```bash
# From project root
cd api-gateway && npm install && cd ..
cd user-service && npm install && cd ..
cd order-service && npm install && cd ..
cd payment-service && npm install && cd ..
```

### 4. Start Services (1 minute)

Open 4 terminal windows:

**Terminal 1:**
```bash
cd api-gateway
npm run start:dev
```

**Terminal 2:**
```bash
cd user-service
npm run start:dev
```

**Terminal 3:**
```bash
cd order-service
npm run start:dev
```

**Terminal 4:**
```bash
cd payment-service
npm run start:dev
```

### 5. Verify Everything Works

```bash
# Check API Gateway
curl http://localhost:3005/api/docs

# Check User Service
curl http://localhost:3001/health/live

# Check Order Service
curl http://localhost:3002/health/live

# Check Payment Service
curl http://localhost:3003/health/live

# Check Kafdrop
open http://localhost:9000
```

### 6. Run the Demo

```bash
# From project root
./demo.sh
```

Or manually:

```bash
# Create a user
curl -X POST http://localhost:3005/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User"
  }'
```

Watch the logs in each terminal to see the event flow!

## Troubleshooting

### Port Already in Use

If you get port conflicts:

```bash
# Find what's using the port
lsof -i :3005
lsof -i :9094

# Kill the process or change ports in docker-compose.yml
```

### Kafka Connection Errors

```bash
# Check Kafka is running
docker ps | grep kafka

# Check Kafka logs
docker logs kafka

# Restart Kafka
cd infra
docker-compose restart kafka
```

### "Unknown topic or partition" Error

This happens when Kafka topics don't exist yet. Create them manually:

```bash
docker exec kafka kafka-topics --create --topic user.created --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
docker exec kafka kafka-topics --create --topic order.created --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
docker exec kafka kafka-topics --create --topic payment.completed --bootstrap-server localhost:9094 --partitions 1 --replication-factor 1 --if-not-exists
```

### Database Connection Errors

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs postgres-user
docker logs postgres-order

# Verify connection
docker exec -it postgres-user psql -U postgres -d userdb -c "SELECT 1;"
```

### Prometheus Can't Scrape Metrics (Linux)

On Linux, `host.docker.internal` doesn't work by default. The `prometheus.yml` is pre-configured to use `172.17.0.1` (Docker bridge gateway IP).

If targets still show as DOWN, find your Docker bridge IP:
```bash
ip addr show docker0 | grep inet
```

Then update `infra/prometheus.yml` with the correct IP:
```yaml
- job_name: 'user-service'
  static_configs:
    - targets: ['YOUR_DOCKER_IP:3001']
```

Restart Prometheus after changes:
```bash
docker compose restart prometheus
```

### Service Won't Start

1. Check Node.js version: `node --version` (need 18+)
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check for TypeScript errors: `npm run build`
4. Check logs for specific error messages

## Optional: Metrics Visualization with Prometheus & Grafana

### Start Prometheus & Grafana

```bash
cd infra
docker-compose up -d prometheus grafana
```

Wait for services to start:
```bash
docker-compose ps
```

### Access the UIs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Prometheus** | http://localhost:9090 | - |
| **Grafana** | http://localhost:3010 | admin / admin |

### Configure Grafana Data Source

1. Open http://localhost:3010 and login (`admin` / `admin`)
2. Go to **Connections** → **Data Sources** → **Add data source**
3. Select **Prometheus**
4. Set URL: `http://prometheus:9090`
5. Click **Save & Test**

### Create a Dashboard

1. Go to **Dashboards** → **New** → **New Dashboard**
2. Click **Add visualization**
3. Select your **Prometheus** data source
4. Enter a query (example):
   ```promql
   process_resident_memory_bytes{job="$Service"}
   ```
5. Click **Apply**

### Add Service Filter Variable

1. Go to **Dashboard Settings** (⚙️ icon) → **Variables** → **Add variable**
2. Configure:
   - **Name**: `Service`
   - **Type**: Query
   - **Data source**: Prometheus
   - **Query type**: Label values
   - **Label**: `job`
   - **Metric**: `up`
3. Click **Apply**
4. Update panel queries to use `{job="$Service"}` filter

### Useful PromQL Queries

| Metric | Query |
|--------|-------|
| Memory Usage | `process_resident_memory_bytes{job="$Service"}` |
| CPU Usage | `rate(process_cpu_seconds_total{job="$Service"}[1m]) * 100` |
| Event Loop Lag | `nodejs_eventloop_lag_seconds{job="$Service"}` |
| Active Handles | `nodejs_active_handles_total{job="$Service"}` |

### Verify Prometheus Targets

Visit http://localhost:9090/targets to see all scrape targets and their status.

## Optional: Distributed Tracing with Jaeger

### Start Jaeger

```bash
cd infra
docker compose up -d jaeger
```

### Access Jaeger UI

Open: **http://localhost:16686**

### How It Works

1. Each service sends traces to Jaeger via OTLP (port 4318)
2. Jaeger collects and correlates traces across services
3. You can visualize the full request path through all microservices

### View Traces

1. Open http://localhost:16686
2. Select a service from the dropdown (e.g., `user-service`)
3. Click **Find Traces**
4. Click on a trace to see the full timeline across services

### Test the Trace Flow

```bash
# Create a user - this triggers the full event chain
curl -X POST http://localhost:3005/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "trace-test@example.com", "name": "Trace Test"}'
```

Then check Jaeger to see the trace spanning:
- `user-service` → `order-service` → `payment-service`

## Optional: Log Aggregation with Kibana

### Start Elasticsearch & Kibana

```bash
cd infra
docker-compose up -d elasticsearch kibana filebeat
```

Wait for services to be healthy:
```bash
docker-compose ps
```

Elasticsearch and Kibana may take 30-60 seconds to start. Check health:
```bash
# Check Elasticsearch
curl http://localhost:9200/_cluster/health

# Check Kibana (wait for it to be ready)
curl http://localhost:5601/api/status
```

### Access Kibana UI

Open: **http://localhost:5601**

### Configure Index Pattern

1. Go to **Stack Management** → **Index Patterns** → **Create index pattern**
2. Enter pattern: `microservices-logs-*`
3. Click **Next step**
4. Select **@timestamp** as the time field
5. Click **Create index pattern**

### View Logs in Discover

1. Go to **Discover** in the left sidebar
2. You should see logs from all services
3. Use filters to search:
   - **Service filter**: `service: "user-service"`
   - **Error logs**: `level: "error"`
   - **By trace ID**: `traceId: "your-trace-id"`

### Configure Log Format (Optional)

By default, logs use pretty format in development. To enable JSON output for better Kibana parsing:

Set environment variable when starting services:
```bash
LOG_FORMAT=json npm run start:dev
```

Or set in `.env` file:
```env
LOG_FORMAT=json
NODE_ENV=production
```

### Create Log Dashboards

1. Go to **Dashboard** → **Create Dashboard**
2. Add visualizations:
   - **Logs by Service**: Bar chart grouped by `service` field
   - **Error Rate**: Count of logs where `level: "error"`
   - **Logs Over Time**: Time series of log volume
   - **Top Error Messages**: Table of error messages

### Useful Kibana Queries

| Query | Description |
|-------|-------------|
| `service: "user-service" AND level: "error"` | Errors from user service |
| `traceId: "abc123"` | All logs for a specific trace |
| `requestId: "req-xyz"` | All logs for a specific request |
| `level: "error" OR level: "warn"` | All warnings and errors |
| `message: "user created"` | Search log messages |

### Filebeat Configuration

Filebeat automatically collects logs from Docker containers. Configuration is in `infra/filebeat.yml`.

To restart Filebeat:
```bash
docker-compose restart filebeat
```

Check Filebeat logs:
```bash
docker logs filebeat
```

### Troubleshooting Kibana

**No logs appearing:**
1. Check Filebeat is running: `docker ps | grep filebeat`
2. Check Filebeat logs: `docker logs filebeat`
3. Verify Elasticsearch has indices: `curl http://localhost:9200/_cat/indices`
4. Ensure services are outputting JSON logs (set `LOG_FORMAT=json`)

**Elasticsearch not starting:**
- Check available memory: Elasticsearch needs at least 512MB
- Check logs: `docker logs elasticsearch`
- Increase Docker memory limit if needed

**Kibana not connecting to Elasticsearch:**
- Verify Elasticsearch is healthy: `curl http://localhost:9200/_cluster/health`
- Check Kibana logs: `docker logs kibana`
- Ensure both are on the same Docker network

## Next Steps

1. **Explore Swagger Docs**: http://localhost:3005/api/docs
2. **View Kafka Events**: http://localhost:9000
3. **Check Metrics**: http://localhost:3001/metrics
4. **Visualize Metrics**: http://localhost:3010 (Grafana)
5. **View Traces**: http://localhost:16686 (Jaeger)
6. **View Logs**: http://localhost:5601 (Kibana)
7. **Read Architecture Docs**: See `ARCHITECTURE.md`
8. **Experiment**: Modify services and see how events flow

## Clean Up

```bash
# Stop all services (Ctrl+C in each terminal)

# Stop infrastructure
cd infra
docker-compose down

# Remove volumes (deletes data)
docker-compose down -v
```

## Common Commands

```bash
# View all running containers
docker ps

# View logs
docker logs kafka
docker logs postgres-user

# Restart a service
docker-compose restart kafka

# Stop everything
docker-compose down

# Start everything
docker-compose up -d
```

## What to Watch

When you create a user, watch for:

1. **API Gateway logs**: Request received
2. **User Service logs**: User created, event published
3. **Order Service logs**: Event received, order created, event published
4. **Payment Service logs**: Event received, payment processed, event published
5. **Kafdrop**: See all events in the topics

Enjoy exploring microservices! 🚀

