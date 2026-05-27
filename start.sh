#!/bin/bash
set -e

# Start Redis
echo "Starting Redis..."
redis-server --daemonize yes --port 6379 --protected-mode no

# Start MongoDB
echo "Starting MongoDB..."
mongod --fork --logpath /var/log/mongodb.log --dbpath /data/db --bind_ip_all

# Configure PostgreSQL
echo "Configuring PostgreSQL..."
if [ ! -d "/var/lib/postgresql/data/PG_VERSION" ]; then
    echo "Initializing database cluster..."
    sudo -u postgres /usr/lib/postgresql/*/bin/initdb -D /var/lib/postgresql/data
    echo "listen_addresses = '*'" >> /var/lib/postgresql/data/postgresql.conf
    echo "host all all 0.0.0.0/0 md5" >> /var/lib/postgresql/data/pg_hba.conf
    echo "host all all 0.0.0.0/0 trust" >> /var/lib/postgresql/data/pg_hba.conf
fi

# Start PostgreSQL
echo "Starting PostgreSQL..."
sudo -u postgres /usr/lib/postgresql/*/bin/pg_ctl -D /var/lib/postgresql/data -l /var/log/postgresql.log start

# Wait for databases to start up
sleep 3

# Setup default credentials and DBs
echo "Initializing default schemas and users..."
# Check if corevix_db exists, if not create it
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'corevix_db'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE corevix_db;"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

echo "All services (PostgreSQL, MongoDB, Redis) are running inside this single container!"

# Create empty logs if they don't exist to tail them
touch /var/log/mongodb.log /var/log/postgresql.log
tail -f /var/log/mongodb.log /var/log/postgresql.log
