# Architecture Overview

High-level system architecture for TFX Hub.

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                   End Users                         │
│          (Contractors, Homeowners)                  │
└────────────┬────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────────┐   ┌───▼──────────┐
│ Mobile App │   │  Web Client  │
│ (RN iOS/   │   │  (React/     │
│  Android)  │   │   Vue.js)    │
└───┬────────┘   └───┬──────────┘
    │                │
    └────────┬───────┘
             │ HTTP/HTTPS
    ┌────────▼────────────────────────────┐
    │      Backend API Gateway             │
    │  (Express.js / Node.js)              │
    │  - Authentication (JWT)              │
    │  - Routing & Validation              │
    │  - Rate Limiting                     │
    └────────┬──────────────────┬──────────┘
             │                  │
    ┌────────▼──────────┐  ┌───▼──────────────┐
    │  Business Logic   │  │ Authentication   │
    │  (@tfx/shared-*)  │  │ Service          │
    │  - User logic     │  │ (JWT middleware) │
    │  - Orders         │  │                  │
    │  - Payments       │  │                  │
    └────────┬──────────┘  └──────────────────┘
             │
    ┌────────▼───────────────────────┐
    │      PostgreSQL Database       │
    │  - Users/Contractors           │
    │  - Orders/Payments             │
    │  - Audit Logs                  │
    └────────────────────────────────┘
```

## Components

### 1. Client Layer

**Mobile App** (React Native)
- iOS & Android native apps
- Built with React Native + Expo (or managed)
- Location services
- Push notifications
- Offline support

**Web Client** (Frontend)
- React or Vue.js application
- Responsive design
- Progressive Web App (PWA)

### 2. API Layer

**Express.js Backend**
- RESTful API endpoints
- JWT authentication
- Request validation
- Rate limiting
- CORS handling
- Error handling

### 3. Business Logic Layer

**Shared Packages** (pnpm Workspaces)
- `@tfx/shared-auth` — Authentication & authorization
- `@tfx/shared-logging` — Structured logging
- `@tfx/shared-logic` — Core business logic
- `@tfx/shared-ui` — Reusable UI components

### 4. Data Layer

**PostgreSQL Database**
- Relational data model
- User management
- Transaction data
- Audit logs
- Full-text search indexes

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Mobile** | React Native | 0.72+ |
| **Web** | React / Vue | 18+ |
| **Backend** | Node.js / Express | 18+ / 5.x |
| **Auth** | JWT / jsonwebtoken | 9.x |
| **Database** | PostgreSQL | 12+ |
| **Package Mgr** | pnpm | 10+ |
| **Testing** | Jest / Detox / Appium | Latest |
| **Logging** | Winston / Bunyan | Custom |
| **Monitoring** | Prometheus / Grafana | Latest |

## Data Flow

### User Registration Flow
```
1. User fills form in app
2. Form validation (client-side)
3. POST /api/auth/register
4. Backend validates input
5. Hash password
6. Insert into database
7. Send confirmation email
8. Return JWT token
9. App stores token in secure storage
10. App navigates to home screen
```

### Order Creation Flow
```
1. Contractor searches for jobs
2. User clicks "Apply for job"
3. POST /api/orders/:id/apply
4. Backend validates contractor status
5. Backend checks qualifications
6. Insert application into database
7. Notify job poster
8. Return confirmation
9. App shows "Applied" status
```

## Security Architecture

- **Transport**: HTTPS/TLS for all API communication
- **Authentication**: JWT tokens with secure expiration
- **Authorization**: Role-based access control (RBAC)
- **Secrets**: Environment variables, never hardcoded
- **Database**: Parameterized queries (prevent SQL injection)
- **Logging**: Never log sensitive data (PII, passwords)
- **CORS**: Whitelist specific origins
- **Rate Limiting**: Prevent API abuse

## Scalability Considerations

**Current State**:
- Monolithic API
- Single PostgreSQL instance
- Suitable for <10k users

**Future State**:
- Microservices (Auth, Orders, Payments)
- Database replication (read replicas)
- Redis caching layer
- Message queue (RabbitMQ / Kafka)
- CDN for static assets
- Horizontal scaling (load balancer)

## Deployment Architecture

### Development
```
Dev Machine
├── Node.js + pnpm
├── Local PostgreSQL
├── Metro (React Native bundler)
└── Jest (local tests)
```

### Staging
```
Docker Container (Ubuntu)
├── Node.js + Express
├── PostgreSQL (managed)
├── Nginx (reverse proxy)
└── Health checks
```

### Production
```
Kubernetes Cluster (AWS/GCP/Azure)
├── Deployment: 3 replicas
├── Service: Load balanced
├── Persistent Volume: Database backups
├── ConfigMap: Environment variables
├── Secret: Credentials
└── Ingress: HTTPS routing
```

## CI/CD Pipeline

```
Git Push
  ↓
GitHub Actions Triggered
  ├── Run Linter (ESLint)
  ├── Run Unit Tests (Jest)
  ├── Run Integration Tests
  ├── Scan for Secrets
  ├── Check Dependencies (audit)
  └── Build Docker image
  ↓
On PR Approval:
  ├── Merge to main
  ├── Deploy to staging
  └── Run smoke tests
  ↓
On Release Tag:
  ├── Build production image
  ├── Run full regression tests
  ├── Deploy to production
  ├── Health checks
  └── Rollback on failure
```

## Performance Targets

- **API Response Time**: <200ms (p95)
- **Mobile App Startup**: <3s
- **Database Query Time**: <100ms (p95)
- **Uptime**: 99.9% (SLA)

## Monitoring & Observability

- **Logging**: Structured JSON logs (ELK stack)
- **Metrics**: Prometheus with Grafana dashboards
- **Tracing**: Distributed tracing (Jaeger)
- **Alerts**: PagerDuty / Datadog
- **APM**: New Relic / Datadog APM

## Design Principles

1. **Security First** — Validate all inputs, never trust clients
2. **Fail Gracefully** — Comprehensive error handling
3. **Observable** — Structured logging everywhere
4. **Testable** — Modular code with high test coverage
5. **Scalable** — Stateless services, can add replicas
6. **Maintainable** — Clear code structure and documentation

---

See more details in [Database Schema](./database.md) and [Security](./security.md).
