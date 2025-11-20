#!/bin/bash
set -e

DB_USER="${DB_USER:-admin}"
DB_HOST="${DB_HOST:-nayarta-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-postgres}"
PGPASSWORD="${POSTGRES_PASSWORD:-${DB_PASSWORD}}"

echo "=== Starting database restoration ==="
echo "Connecting to: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# Wait for PostgreSQL to be ready
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; do
    echo "Waiting for PostgreSQL to be ready..."
    sleep 2
done

# Restore global objects (roles, tablespaces, etc.)
if [ -f /dumps/globals.sql ]; then
    echo "Restoring globals..."
    PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /dumps/globals.sql || echo "Warning: Some globals may already exist"
fi

# Create databases if they don't exist
PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<-EOSQL
    SELECT 'CREATE DATABASE analytics_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'analytics_db')\gexec
    SELECT 'CREATE DATABASE schedulerdb' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'schedulerdb')\gexec
    SELECT 'CREATE DATABASE vms_development' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vms_development')\gexec
EOSQL

# Restore database dumps
# # if [ -f /dumps/analytics_db.dump ]; then
# #     echo "Restoring analytics_db..."
# #     pg_restore -U "$DB_USER" -d analytics_db --no-owner --no-acl --if-exists -c /dumps/analytics_db.dump 2>/dev/null || echo "Restore completed with some warnings (normal)"
# # fi

if [ -f /dumps/schedulerdb.dump ]; then
    echo "Restoring schedulerdb..."
    PGPASSWORD="$PGPASSWORD" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d schedulerdb --no-owner --no-acl --if-exists -c /dumps/schedulerdb.dump 2>/dev/null || echo "Restore completed with some warnings (normal)"
fi

if [ -f /dumps/vms_development.dump ]; then
    echo "Restoring vms_development..."
    PGPASSWORD="$PGPASSWORD" pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d vms_development --no-owner --no-acl --if-exists -c /dumps/vms_development.dump 2>/dev/null || echo "Restore completed with some warnings (normal)"
fi

echo "=== Database restoration completed! ==="