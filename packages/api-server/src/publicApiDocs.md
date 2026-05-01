# TFX Hub Public API Documentation

## Authentication
- All requests require an `x-api-key` header with a valid API key.

## Rate Limiting
- 60 requests per minute per API key.

## Endpoints
- `GET /api/public/user/:userId` — Get public user profile (limited fields)
- `GET /api/public/reputation/:userId` — Get blockchain reputation score

## Example Request
```
curl -H "x-api-key: YOUR_API_KEY" https://yourdomain/api/public/user/user-123
```
