**BANKING SYSTEM PROJECT PLAN**  
**Solo Developer | .NET 9 + MediatR CQRS + Ionic Angular**  
**Project Name: Corevix**

---

### TECH STACK

| Layer             | Technology                                   |
| ----------------- | -------------------------------------------- |
| Backend           | .NET 9, C#                                   |
| Architecture      | Modular Monolith + CQRS + MediatR            |
| API               | REST + Minimal APIs                          |
| Validation        | FluentValidation                             |
| Relational DB     | PostgreSQL                                   |
| Document DB       | MongoDB                                      |
| Cache             | Redis (Upstash)                              |
| ORM               | Entity Framework Core                        |
| Mongo Driver      | MongoDB.Driver                               |
| Frontend          | Ionic Angular (single codebase)              |
| State Management  | TanStack Query                               |
| Tables            | TanStack Table                               |
| Local Development | Docker Compose                               |
| Deployment        | Neon, MongoDB Atlas, Upstash, Render, Vercel |

---

### PROJECT FOLDER STRUCTURE

```
BankingSystem/
├── Api/
│   ├── Program.cs
│   ├── Endpoints/
│   ├── Middleware/
│   └── OpenAPI/
├── WebApps/
│   ├── BpiCorporatePortal/      (Bank staff and managers)
│   └── BpiClientPortal/         (Retail customers)
├── MobileApps/
│   └── BpiMobileBanking/        (Cross-platform mobile app)
├── Backend/
│   ├── Core/                    (Entities, Value Objects, Domain Events)
│   ├── Application/             (Commands, Queries, Handlers, DTOs, Behaviors)
│   ├── Infrastructure/          (Repositories, Services, Cache, Notifications)
│   ├── Persistence/             (DbContexts, Migrations, Outbox)
│   └── Tests/                   (Unit, Integration, E2E)
├── Common/                      (Shared utilities and extensions)
├── docker-compose.yml
└── .github/workflows/           (CI/CD pipelines)
```

---

### DEVELOPMENT WORKFLOW

| Step | Command                                         | Purpose                          |
| ---- | ----------------------------------------------- | -------------------------------- |
| 1    | `docker-compose up -d`                          | Start PostgreSQL, MongoDB, Redis |
| 2    | `dotnet watch run --project Api`                | Start backend with hot reload    |
| 3    | `cd WebApps/BpiClientPortal && ng serve`        | Start client web portal          |
| 4    | `cd WebApps/BpiCorporatePortal && ng serve`     | Start corporate web portal       |
| 5    | `cd MobileApps/BpiMobileBanking && ionic serve` | Start mobile app                 |
| 6    | Code → Save → Auto-reload                       | Daily development loop           |
| 7    | `dotnet test`                                   | Run all tests                    |
| 8    | `git add . && git commit -m "message"`          | Commit changes                   |
| 9    | `git push origin main`                          | Push to GitHub                   |

---

### PHASES AND MILESTONES

| Phase | Duration    | Milestone                      | Deliverable                                |
| ----- | ----------- | ------------------------------ | ------------------------------------------ |
| 0     | Week 1      | Project setup and foundation   | Full local environment + security baseline |
| 1     | Weeks 2-3   | CQRS Foundation & Core Domain  | MediatR pipeline + basic entities          |
| 2     | Weeks 4-6   | Core Banking Features          | Account opening, transfers, inquiries      |
| 3     | Weeks 7-8   | Authentication & User Portals  | JWT + MFA + both web portals               |
| 4     | Weeks 9-10  | Mobile App & Advanced Features | Biometrics, QR, notifications, loans       |
| 5     | Weeks 11-13 | Deployment & Hardening         | Live deployment + load & security tests    |

---

### GRANULAR TASKS PER PHASE

#### Phase 0: Planning & Environment Setup (Week 1)

- Install Docker, .NET 9 SDK, Node.js, Ionic CLI, Angular CLI
- Create docker-compose.yml with PostgreSQL, MongoDB, Redis
- Create solution file and complete folder structure
- Create all three frontend applications (two Angular + one Ionic)
- Configure HTTPS, CORS, security headers, and basic threat model
- Verify all applications run locally and connect to backend
- Define core banking entities based on BPI and Metrobank products (Savings, Checking, Time Deposits, Loans)

#### Phase 1: CQRS Foundation (Weeks 2-3)

- Install NuGet packages: MediatR, FluentValidation, EF Core, MongoDB.Driver, StackExchange.Redis, Polly, Serilog, Hangfire
- Create Core layer entities: Customer (with KYC fields), Account, Transaction, LedgerEntry, Domain Events
- Implement Application layer with Commands, Queries, and Handlers
- Create MediatR Behaviors: Validation, Transactional Unit of Work, Logging, Audit, Idempotency
- Implement Outbox Pattern for reliable event processing
- Test first command end-to-end through Swagger UI

#### Phase 2: Core Banking Features (Weeks 4-6)

**Account Management** (inspired by BPI SaveUp and Metrobank eSavings):

- OpenSavingsAccountCommand with e-KYC data fields (ID upload, selfie reference)
- GetAccountDetailsQuery and GetBalanceQuery
- Account types support: Savings, Checking, Time Deposit
- Background job for daily interest calculation
- Account settings (transaction limits, alerts, favorites)

**Transfers & Transactions** (similar to BPI Express Send and Metrobank transfers):

- TransferCommand supporting intra-bank and external transfers with idempotency key
- QR Code payment generation and scanning
- Bill payment module with common billers
- Double-entry ledger entries in PostgreSQL for all transactions
- Transaction history with filtering and export

**Technical Requirements**:

- Redis caching for balances with proper invalidation
- PostgreSQL migrations and indexes
- MongoDB for audit logs and event storage
- Integration tests using Testcontainers

#### Phase 3: Authentication & Portals (Weeks 7-8)

- Implement JWT authentication with refresh tokens
- TOTP MFA and biometric support preparation
- Role and policy-based authorization (Customer, Staff, Approver)
- **Corporate Portal Features**: Staff dashboard, transaction monitoring, approval workflows, reports
- **Client Portal Features**: Personalized dashboard, account overview, transfer history, spending insights, loan/investment summary
- Connect both portals to backend APIs

#### Phase 4: Mobile Application & Advanced Features (Weeks 9-10)

- Add Capacitor to Ionic project for native builds
- Implement biometric authentication (FaceID / TouchID)
- QR code scanner for payments
- Push notifications using Firebase
- Card management (lock/unlock debit cards)
- Basic loan application and status tracking
- Time Deposit and basic investment views
- Transaction alerts and spending notifications

#### Phase 5: Deployment & System Hardening (Weeks 11-13)

- Deploy PostgreSQL to Neon (free tier)
- Deploy MongoDB to Atlas (free tier)
- Deploy Redis to Upstash (free tier)
- Deploy .NET API to Render (free tier)
- Deploy web and mobile frontends to Vercel
- Configure GitHub Actions for CI/CD
- Perform load testing with k6
- Conduct security scanning with OWASP ZAP
- Implement rate limiting, encryption, and comprehensive audit logging

---

### DAILY DEVELOPMENT SCHEDULE

| Time          | Activity                               |
| ------------- | -------------------------------------- |
| 08:00 - 08:30 | Start databases, backend and frontends |
| 08:30 - 12:00 | Core feature development               |
| 12:00 - 13:00 | Break                                  |
| 13:00 - 15:00 | Write and run tests                    |
| 15:00 - 16:30 | Additional features or refactoring     |
| 16:30 - 17:00 | Run full test suite, commit and push   |

---

### DEPLOYMENT TARGETS (FREE TIER)

| Service       | Purpose                   | Free Tier Limits    |
| ------------- | ------------------------- | ------------------- |
| Neon          | PostgreSQL                | 1 GB storage        |
| MongoDB Atlas | Document database         | 512 MB storage      |
| Upstash       | Redis Cache               | 10,000 commands/day |
| Render        | .NET 9 Backend            | 750 hours/month     |
| Vercel        | Angular + Ionic Frontends | 100 GB bandwidth    |
| GitHub        | Source control + CI/CD    | Private repos       |

---

### SUCCESS CRITERIA

| Metric                   | Target                       |
| ------------------------ | ---------------------------- |
| Transfer processing time | Under 1.5 seconds (p95)      |
| Idempotency              | 100% duplicate prevention    |
| Test coverage            | Greater than 85%             |
| Local build time         | Under 30 seconds             |
| Deployment time          | Under 5 minutes              |
| Security                 | Zero critical OWASP findings |
| Audit logging            | Complete transaction trail   |

This document serves as the official project execution plan for the BPI Digital Banking System. All development activities shall follow the defined phases, folder structure, and technical standards.
