# Corevix Banking API

## 📖 Overview

Corevix is a robust, highly scalable banking backend API built with ASP.NET Core. The application is designed to handle complex financial operations, leveraging modern architectural patterns such as CQRS, the Outbox Pattern, and Multi-Tenancy. It utilizes a microservices-ready infrastructure stack relying on PostgreSQL, MongoDB, and Redis to ensure performance, reliability, and comprehensive audit tracking.

---

## 🛠️ Technology Stack & Infrastructure

### Application Layer

* **Framework:** ASP.NET Core (Minimal APIs)
* **CQRS & Messaging:** MediatR
* **Validation:** FluentValidation
* **Real-time Communication:** SignalR
* **Logging:** Serilog
* **Background Jobs:** Hangfire

### Data & Infrastructure Layer

* **Primary Relational Database:** PostgreSQL 17
* **Audit Logging Database:** MongoDB 8.0
* **Distributed Cache:** Redis 7.4
* **ORM:** Entity Framework Core (Npgsql)
* **Containerization:** Docker & Docker Compose

---

## 🏗️ Architecture & Design Patterns

The Corevix API is built using enterprise-grade design patterns:

* **CQRS (Command Query Responsibility Segregation):** Mediated via MediatR to decouple read and write operations.
* **Behavior Pipelines:** The application uses MediatR pipeline behaviors for cross-cutting concerns:
* `ValidationBehavior`
* `TransactionLimitBehavior`
* `FraudDetectionBehavior`
* `IdempotencyBehavior`


* **Outbox Pattern:** Ensures reliable message delivery and eventual consistency across distributed systems. Handled by a background `OutboxProcessor`.
* **Multi-Tenancy:** Implemented using an `ITenantProvider` and a custom `TenantAndAuditSaveChangesInterceptor` within EF Core to isolate tenant data.
* **Security:** Built-in JWT authentication combined with strict global HTTP security headers to prevent XSS, sniffing, and framing attacks.

---

## 📋 Prerequisites

Ensure you have the following installed on your local development machine:

* [.NET SDK](https://dotnet.microsoft.com/download) (Compatible with the latest ASP.NET Core version)
* [Docker Desktop](https://www.docker.com/products/docker-desktop)
* Git

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/ewceniza9009/corevix.git
cd corevix

```

### 2. Start the Infrastructure Services

The project relies on PostgreSQL, MongoDB, and Redis. Spin these up using the provided Docker Compose file.

```bash
docker-compose up -d

```

**Exposed Infrastructure Ports:**

* **PostgreSQL:** `31735` (mapped to internal `5432`)
* **MongoDB:** `31717` (mapped to internal `27017`)
* **Redis:** `31779` (mapped to internal `6379`)

### 3. Application Configuration

The application requires specific environment variables or configuration values in your `appsettings.json` or `secrets.json`. Ensure the following keys are present:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=31735;Database=corevix_db;Username=postgres;Password=postgres"
  },
  "MongoDb": {
    "ConnectionString": "mongodb://root:example@localhost:31717",
    "DatabaseName": "corevix_auditing"
  },
  "Redis": {
    "ConnectionString": "localhost:31779"
  },
  "Cors": {
    "AllowedOrigins": [
      "http://localhost:4200",
      "https://your-frontend-domain.com"
    ]
  },
  "Jwt": {
    "SecretKey": "YOUR_SUPER_SECRET_KEY_HERE",
    "Issuer": "CorevixBanking",
    "Audience": "CorevixPortals"
  }
}

```

### 4. Run the Application

Database migrations and seed configurations run dynamically on host startup via `DbInitializer.InitializeAsync`.

```bash
cd Api
dotnet build
dotnet run

```

---

## 📡 API Capabilities & Endpoints

The system relies on Minimal APIs mapped in the `Program.cs` file. The API exposes the following domain modules:

* `/health` - Service health checks.
* `CustomerEndpoints` - Customer onboarding and management.
* `AccountEndpoints` - Bank account creation, retrieval, and status updates.
* `TransactionEndpoints` - Deposits, withdrawals, and transfers.
* `ComplianceEndpoints` - Regulatory and compliance screening (KYC/AML).
* `AuthEndpoints` - JWT issuance and user authentication.

### Real-Time Notifications

The application leverages SignalR to push real-time banking updates to the client portals.

* **Endpoint:** `/hubs/notifications`

---

## ⚙️ Background Processing (Hangfire)

Corevix utilizes Hangfire backed by PostgreSQL for scheduling and executing recurring background tasks. The Hangfire dashboard is accessible locally to monitor job execution.

* **Dashboard URL:** `https://localhost:<port>/hangfire`

**Registered Jobs:**

* **`OutboxMessageProcessor`:** Scans the database for pending domain events and processes them every 5 seconds.
* **`InterestCalculationProcessor`:** Accrues and calculates daily interest across all eligible accounts. Runs daily.

---

## 🛡️ Security Configuration

### HTTP Headers

A custom global middleware automatically injects strict security headers into every HTTP response:

* `X-Frame-Options: DENY`
* `X-Content-Type-Options: nosniff`
* `X-XSS-Protection: 1; mode=block`
* `Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';`
* `Referrer-Policy: strict-origin-when-cross-origin`

### Authentication

JWT Bearer authentication is strictly enforced. It validates:

* Issuer signing keys.
* Audience and Issuer matches.
* Token expiration (lifetime validation with zero clock skew).
