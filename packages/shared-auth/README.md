# @tfx/shared-auth

Shared authentication utilities and tenant middleware.

## Exports
- signToken(payload, opts)
- verifyToken(token, opts)
- tenantMiddleware(opts)  // Express middleware
- roleMiddleware(requiredRoles)

## Tests
- Unit: node tests/shared-auth/unit/run_unit_tests.cjs
- Integration: node tests/shared-auth/integration/run_integration_test.js
