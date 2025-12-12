#!/bin/bash

# Script to set up test databases in PostgreSQL test container

set -e

echo "🚀 Setting up test databases..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
until docker exec postgres-test pg_isready -U postgres > /dev/null 2>&1; do
  echo "   PostgreSQL is not ready yet, waiting..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Create test databases
echo "📦 Creating test databases..."

docker exec postgres-test psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='userdb_test'" | grep -q 1 || \
  docker exec postgres-test psql -U postgres -c "CREATE DATABASE userdb_test;"

docker exec postgres-test psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='orderdb_test'" | grep -q 1 || \
  docker exec postgres-test psql -U postgres -c "CREATE DATABASE orderdb_test;"

echo "✅ Test databases created successfully!"
echo ""
echo "📋 Test databases:"
echo "   - userdb_test"
echo "   - orderdb_test"
echo ""
echo "🔌 Connection details:"
echo "   Host: localhost"
echo "   Port: 5435"
echo "   Username: postgres"
echo "   Password: postgres"
echo ""
echo "✨ Ready to run integration tests!"
