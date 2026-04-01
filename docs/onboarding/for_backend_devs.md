# Onboarding Guide: Backend Developer

Welcome! This guide is tailored for Node.js and API engineers.

## Setup

Follow the [main onboarding guide](./README.md) first, then:

```bash
# Install backend dependencies
pnpm install

# Start local backend server
pnpm --filter @tfx/shared-auth test:integration

# Verify API is running
curl http://localhost:3000/health  # or configured port
```

## Stack

- **Runtime** — Node.js 18+
- **Package Manager** — pnpm (workspaces)
- **Web Framework** — Express 5.x
- **Auth** — JWT (jsonwebtoken)
- **Database** — PostgreSQL (or configured DB)
- **Logging** — Structured JSON via @tfx/shared-logging
- **Testing** — Jest + Supertest (integration tests)
- **API Documentation** — OpenAPI / Swagger (planned)

## File Structure

```
packages/shared-auth/
├── src/
│   ├── index.js            # Main auth middleware
│   ├── services/           # Business logic
│   ├── routes/             # API endpoints
│   ├── middleware/         # Express middleware
│   ├── types/              # TypeScript definitions
│   └── utils/              # Helper functions
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # API integration tests
└── package.json
```

## Common Tasks

### Run Tests
```bash
# Unit tests
pnpm --filter @tfx/shared-auth test

# Integration tests
pnpm --filter @tfx/shared-auth test:integration

# Watch mode
pnpm --filter @tfx/shared-auth test -- --watch

# Coverage report
pnpm --filter @tfx/shared-auth test -- --coverage
```

### Start Development Server
```bash
# Watch mode with auto-reload
pnpm --filter @tfx/shared-auth run dev

# Or with NODE_ENV and debug logging
NODE_ENV=development DEBUG=tfx:* npm start
```

### Debug

```bash
# VSCode debugging
# Add breakpoint, then run:
node --inspect-brk index.js
# Opens chrome://inspect

# Or use VSCode debug launcher (.vscode/launch.json)
# F5 to start debugging

# Log debugging
# Use @tfx/shared-logging:
const logger = require('@tfx/shared-logging')('my-service');
logger.info('Debug message', { key: 'value' });
```

### Database Migrations

```bash
# Run migrations (if using migrations tool)
pnpm run migrate:up

# Rollback
pnpm run migrate:down

# Create new migration
pnpm run migrate:create my_migration
```

## API Development

### Creating Endpoints

```javascript
const express = require('express');
const { authMiddleware } = require('@tfx/shared-auth');
const logger = require('@tfx/shared-logging')('my-service');

const router = express.Router();

// Protected endpoint
router.get('/api/resource/:id', authMiddleware, async (req, res) => {
  try {
    logger.info('Fetching resource', { id: req.params.id, userId: req.user.id });
    // Logic here
    res.json({ id: req.params.id, data: '...' });
  } catch (err) {
    logger.error('Failed to fetch resource', { err: err.message, code: 'ERR_FETCH' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

### Authentication

```javascript
const { signToken, verifyToken } = require('@tfx/shared-auth');

// Sign token
const token = signToken({ userId: 123, role: 'admin' }, { expiresIn: '1h' });

// Verify token in middleware
const verified = verifyToken(token);
console.log(verified); // { userId: 123, role: 'admin', iat: ..., exp: ... }
```

### Logging

```javascript
const logger = require('@tfx/shared-logging')('service-name');

logger.info('User logged in', { userId: 123 });
logger.warn('Rate limit approaching', { userId: 123, remaining: 5 });
logger.error('Database error', { code: 'ECONNREFUSED', detail: '...' });
logger.debug('Detailed trace', { query: '...', result: '...' });

// Start request with correlation ID
const reqLogger = logger.startRequest();
// ...later...
// Logs automatically include requestId for tracing
```

## Performance & Security

### Query Optimization
```javascript
// Bad: N+1 queries
const users = db.query('SELECT * FROM users');
for (const user of users) {
  user.posts = db.query('SELECT * FROM posts WHERE user_id = ?', user.id);
}

// Good: Single query with JOIN
const users = db.query(`
  SELECT u.*, p.* FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
`);
```

### Security Best Practices
- ✅ Use parameterized queries (prevent SQL injection)
- ✅ Validate/sanitize input
- ✅ Enforce HTTPS in production
- ✅ Never log sensitive data
- ✅ Use rate limiting on public APIs
- ✅ Implement CORS properly
- ❌ Never hardcode secrets
- ❌ Never trust client data

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Deployment

### Local
```bash
# Start with env config
NODE_ENV=development npm start
```

### Staging/Production
See [Release Process](../guides/release_process.md) for:
- Docker containerization
- Environment configuration
- Database migrations
- Health checks
- Monitoring and alerting

## Useful Commands

```bash
# Run linter
pnpm --filter @tfx/shared-auth lint

# Format code
pnpm --filter @tfx/shared-auth format

# Check dependencies
pnpm outdated

# Audit for vulnerabilities
pnpm audit

# Generate API docs (if configured)
pnpm run docs:generate
```

## Troubleshooting

### Port already in use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database connection timeout
```bash
# Check connection string
echo $DATABASE_URL

# Verify database is running
psql $DATABASE_URL -c "SELECT 1"

# Check logs
NODE_ENV=development DEBUG=tfx:* npm start
```

### Tests fail intermittently
```bash
# Increase timeout
jest --testTimeout=10000

# Run sequentially (not parallel)
jest --maxWorkers=1

# Check for async issues
# Add done() callback or return Promise
```

## Resources

- [Express.js Docs](https://expressjs.com)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [JWT Auth](https://jwt.io)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [Jest Testing](https://jestjs.io)

---

Happy coding! Questions? Slack #tfx-hub-backend
