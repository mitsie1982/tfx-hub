# @tfx/shared-logic

Shared API, auth, request-context, and WhatsApp client helpers used by browser, mobile, and package workspaces.

## Usage

```js
const {
  auth,
  buildAssociationHeaders,
  createSharedLogicClient
} = require('@tfx/shared-logic');

const client = createSharedLogicClient({
  baseURL: 'https://api.example.com',
  getToken: async () => auth.tokenStore.get(),
  context: {
    associationId: 'assoc-001',
    platform: 'android',
    appVersion: '1.0.0'
  }
});

buildAssociationHeaders({ associationId: 'assoc-001' });
```

Use `@tfx/shared-auth` for server-side or browser-host generated bearer tokens. `@tfx/shared-logic` auth helpers are for client token storage and local/demo flows.

## Exports

- `createApiClient`: Base Axios wrapper with bearer-token injection.
- `createSharedLogicClient`: Prewired domain client with admin, professionals, session, and WhatsApp role helpers.
- `createProfessionalsApi`: Standalone professional directory helper factory.
- `createSessionApi`: Session, login, password reset, and WhatsApp subscription helper factory.
- `buildAssociationHeaders`: Request metadata helper for association-aware APIs.
- `auth`: Token signing, verification, and token storage helpers.
- `createWhatsappAssociationApi`, `createWhatsappAdminApi`, `createWhatsappContractorApi`, `createWhatsappCustomerApi`, `createWhatsappProfessionalApi`: Standalone WhatsApp role helper factories.

## Tests

- Unit tests: `pnpm --filter @tfx/shared-logic test`
- Integration test: `pnpm --filter @tfx/shared-logic test:integration`
