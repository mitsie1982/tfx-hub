# API Reference

Comprehensive API documentation for TFX Hub backend.

## Base URL

```
Development:  http://localhost:3000
Staging:      https://staging-api.tfxhub.com
Production:   https://api.tfxhub.com
```

The workspace implementation now includes a real Express API server package at `packages/api-server` that exposes the documented auth and contractor flows.

## Authentication

All API endpoints (except `/auth/login`, `/auth/register`, `/auth/password-reset/request`, and `/auth/password-reset/confirm`) require a JWT token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" https://api.tfxhub.com/user
```

### Getting a Token

```bash
curl -X POST https://api.tfxhub.com/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"user@example.com\", \"password\": \"password123\"}"

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "contractor"
  }
}
```

Token expiration: 24 hours (configurable)

## Error Responses

All errors follow this format:

```json
{
  "error": "UnauthorizedError",
  "code": "AUTH_INVALID_TOKEN",
  "message": "Invalid or expired token",
  "status": 401,
  "requestId": "req_abc123xyz"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation failed) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate, etc.) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Endpoints

### Authentication

#### POST /auth/register
Create a new user account.

**Request:**
```json
{
  "email": "contractor@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Smith",
  "role": "contractor"  // or "homeowner"
}
```

**Response:**
```json
{
  "id": "user_123",
  "email": "contractor@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "contractor@example.com",
  "password": "securePassword123"
}
```

#### POST /auth/password-reset/request
Create a password reset token for an account email.

**Request:**
```json
{
  "email": "contractor@example.com"
}
```

**Response:**
```json
{
  "ok": true,
  "expiresAt": "2026-04-02T15:30:00.000Z",
  "delivery": {
    "channel": "email"
  }
}
```

When SMTP is not configured, local development falls back to a logger-based delivery mode and includes `resetToken` in the response for testing.

For a local end-to-end SMTP check without third-party credentials, run Mailpit on `1025/8025` and execute `pnpm run smoke:api:smtp:local`. In that mode the API should report `delivery.channel: "email"`, omit `resetToken` from the response, and deliver the message into Mailpit. On Windows, `pnpm run smoke:api:smtp:local:auto` wraps the whole flow by starting Mailpit, waiting for readiness, running the smoke script, and cleaning up automatically.

#### POST /auth/password-reset/confirm
Confirm a password reset with the issued token.

**Request:**
```json
{
  "token": "reset-123",
  "password": "newSecurePassword123"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "contractor@example.com",
    "role": "contractor"
  }
}
```

### Users

#### GET /user
Get current user profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "user_123",
  "email": "contractor@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "role": "contractor",
  "createdAt": "2026-01-15T10:30:00Z"
}
```

### Contractor

#### GET /contractor/profile
Get the current contractor profile resolved from the authenticated session.

**Response:**
```json
{
  "item": {
    "professionalId": "pro-003",
    "name": "Theuns Fraser",
    "trade": "general contractor",
    "tier": "TRUSTED",
    "rating": 4.9,
    "completedJobs": 128,
    "activeQuotes": 7,
    "responseTime": "8 min"
  }
}
```

#### GET /contractor/history
List persisted contractor lead activity.

**Response:**
```json
{
  "items": [
    {
      "id": "quote-123",
      "jobId": "job-001",
      "type": "quote",
      "summary": "Quote R12,500 · 3 days",
      "status": "sent",
      "createdAt": "2026-04-02T10:00:00Z",
      "source": "live"
    }
  ]
}
```

#### POST /contractor/quotes
Persist a contractor quote event for a job.

**Request:**
```json
{
  "jobId": "job-001",
  "amount": "R12,500",
  "timeline": "3 days",
  "note": "Includes material and labour"
}
```

#### POST /contractor/messages
Persist a contractor-to-homeowner message for a job.

**Request:**
```json
{
  "jobId": "job-001",
  "body": "I can inspect this tomorrow morning."
}
```

### Contractor WhatsApp

#### POST /whatsapp/contractor/messages
Send an inbound WhatsApp-style contractor message into the backend chat flow. This route is unauthenticated and uses `phoneNumber` as the contractor identity handle for the chat session.

**Request:**
```json
{
  "phoneNumber": "+27710000001",
  "message": "Hi"
}
```

**Response:**
```json
{
  "reply": "Welcome back, Theuns.\n\nYou have 2 open leads and 7 active quotes.",
  "options": ["1", "2", "3", "4", "5", "6"],
  "session": {
    "phoneNumber": "+27710000001",
    "linked": true,
    "screen": "menu",
    "userId": "user-contractor-001",
    "activeJobId": null,
    "lastLeadIds": []
  }
}
```

Implemented WhatsApp contractor flows now include:
- phone-linked contractor recognition
- linking an existing contractor account by email
- registering a new contractor account in chat
- profile summary
- lead inbox and lead detail
- express interest
- guided quote submission
- guided homeowner messaging
- recent activity history

#### GET /whatsapp/contractor/session/:phoneNumber
Get the current contractor WhatsApp chat session summary for a phone number.

**Response:**
```json
{
  "item": {
    "phoneNumber": "+27710000001",
    "linked": true,
    "screen": "menu",
    "userId": "user-contractor-001",
    "activeJobId": null,
    "lastLeadIds": []
  }
}
```

#### GET /webhooks/meta/whatsapp
Meta webhook verification endpoint. Returns the `hub.challenge` value when `hub.verify_token` matches `WHATSAPP_WEBHOOK_TOKEN`.

#### POST /webhooks/meta/whatsapp
Meta inbound WhatsApp webhook endpoint. Parses incoming WhatsApp messages, routes them through the contractor chat engine, and sends the generated reply through the Meta send API when outbound credentials are configured.

If outbound credentials are not configured, replies are logged locally instead of sent.

Reply rendering rules:

- 1 to 3 options are rendered as interactive reply buttons
- 4 to 10 options are rendered as an interactive list
- no options are rendered as plain text

#### PUT /user
Update current user profile.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "id": "user_123",
  "email": "contractor@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Orders (Jobs)

#### GET /orders
List all available jobs.

**Query Parameters:**
```
?status=open     // open, in-progress, completed, cancelled
?trade=plumbing  // Filter by trade
?location=10001  // Filter by postal code
?page=1          // Pagination
&limit=20        // Results per page
```

**Response:**
```json
{
  "data": [
    {
      "id": "order_456",
      "title": "Emergency Plumbing",
      "description": "Leaky pipe in kitchen",
      "trade": "plumbing",
      "status": "open",
      "budget": 500,
      "location": {
        "postal": "10001",
        "address": "123 Main St, NY"
      },
      "createdAt": "2026-03-20T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

#### POST /orders
Create a new job (homeowners only).

**Request:**
```json
{
  "title": "Roof Repair Needed",
  "description": "Section of roof needs repair",
  "trade": "roofing",
  "budget": 2000,
  "location": {
    "postal": "90210",
    "address": "456 Oak Ave, LA"
  }
}
```

**Response:**
```json
{
  "id": "order_789",
  "status": "open",
  "createdAt": "2026-04-01T10:00:00Z"
}
```

#### GET /orders/:id
Get specific job details.

**Response:**
```json
{
  "id": "order_456",
  "title": "Emergency Plumbing",
  "description": "Leaky pipe in kitchen",
  "status": "open",
  "budget": 500,
  "homeownerId": "user_homeowner_1",
  "contractor": null,  // Null if no contractor assigned
  "applications": [
    {
      "id": "app_1",
      "contractorId": "user_contractor_1",
      "contractorName": "John Smith",
      "rating": 4.8,
      "message": "I can help with this today"
    }
  ]
}
```

### Payments (Planned)

Endpoints for payments will be documented as they're implemented.

## Rate Limiting

- **Unauthenticated** — 60 requests/minute
- **Authenticated** — 300 requests/minute
- **Premium** — 1000 requests/minute

Headers returned:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1617259200
```

## Pagination

List endpoints support pagination:

```bash
curl "https://api.tfxhub.com/orders?page=2&limit=20"
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Webhooks

Webhooks are sent for important events (planned feature):

- `order.created`
- `order.assigned`
- `order.completed`
- `payment.completed`

## SDK/Libraries

### JavaScript/TypeScript
```javascript
import { TFXHubClient } from '@tfxhub/sdk-js';

const client = new TFXHubClient({
  apiKey: 'your_token_here'
});

const user = await client.user.get();
const orders = await client.orders.list({ status: 'open' });
```

## Testing

### cURL Examples

```bash
# Register
curl -X POST https://api.tfxhub.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","firstName":"Test","role":"contractor"}'

# Login
curl -X POST https://api.tfxhub.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Get user
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.tfxhub.com/user

# List orders
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.tfxhub.com/orders?status=open"
```

## OpenAPI/Swagger

Full OpenAPI specification available at:
```
https://api.tfxhub.com/docs/openapi.json
```

Interactive Swagger UI:
```
https://api.tfxhub.com/docs
```

---

For integration examples and SDK documentation, see [Integration Guide](./guides/integration.md).

Last Updated: 2026-04-01
