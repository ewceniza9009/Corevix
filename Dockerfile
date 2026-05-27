FROM ubuntu:22.04

# Avoid prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies, Postgres, Redis
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    lsb-release \
    sudo \
    postgresql \
    postgresql-contrib \
    redis-server \
    && rm -rf /var/lib/apt/lists/*

# Install MongoDB keys and repository, then install MongoDB
RUN curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg \
    && echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update && apt-get install -y mongodb-org \
    && rm -rf /var/lib/apt/lists/*

# Create data and log directories
RUN mkdir -p /data/db /var/run/postgresql /var/run/redis /var/lib/postgresql/data && \
    chown -R mongodb:mongodb /data/db && \
    chown -R postgres:postgres /var/run/postgresql /var/lib/postgresql/data

# Copy start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Expose Postgres, MongoDB, and Redis ports
EXPOSE 5432 27017 6379

CMD ["/start.sh"]
