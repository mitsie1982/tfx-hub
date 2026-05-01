# Partner Onboarding Guide

## 1. Request API Key
Contact support to receive your unique API key for authentication.

## 2. Review API Documentation
- See [openapi.yaml](./openapi.yaml) for full API spec (import into Postman/Swagger UI).
- See [publicApiDocs.md](./publicApiDocs.md) for usage examples.

## 3. Generate SDK
- Run `generate_sdk.sh` to generate TypeScript/Python SDKs from OpenAPI.
- Or use your preferred OpenAPI tool.

## 4. Test Integration
- Use `/user/{userId}` and `/reputation/{userId}` endpoints with your API key.

## 5. Support
- Contact support for help, rate limit increases, or feature requests.
