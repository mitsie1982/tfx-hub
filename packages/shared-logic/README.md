# @tfx/shared-logic

Shared API, auth, and request-context helpers used by mobile and client apps.

## Usage

```js
const {
  auth,
  buildAssociationHeaders,
  createSharedLogicClient
} = require('@tfx/shared-logic');

const client = createSharedLogicClient({
  baseURL: 'https://api.example.com',
  getToken: async () => auth.signToken({ sub: 'user-123', associationId: 'assoc-001' }),
  context: {
    associationId: 'assoc-001',
    platform: 'android',
    appVersion: '1.0.0'
  }
});

buildAssociationHeaders({ associationId: 'assoc-001' });
```

## Exports

- `createApiClient`: Base Axios wrapper with bearer-token injection.
- `createSharedLogicClient`: Prewired domain client with `professionals` helpers.
- `createProfessionalsApi`: Standalone professional directory helper factory.
- `buildAssociationHeaders`: Request metadata helper for association-aware APIs.
- `auth`: Token signing, verification, and token storage helpers.

## Tests

- Unit tests: `pnpm --filter @tfx/shared-logic test`
- Integration test: `pnpm --filter @tfx/shared-logic test:integration`
