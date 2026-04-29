const {
  auth,
  buildAssociationHeaders,
  createSharedLogicClient
} = require('@tfx/shared-logic');

async function main() {
  const context = {
    associationId: 'assoc-demo',
    userId: 'demo-user',
    platform: 'android',
    appVersion: '1.0.0'
  };

  const token = auth.signToken({ sub: context.userId, associationId: context.associationId }, { expiresIn: '30m' });
  const client = createSharedLogicClient({
    baseURL: 'http://localhost:5005',
    getToken: async () => token,
    context
  });

  console.log('Shared-logic consumer demo ready');
  console.log('Header preview:', buildAssociationHeaders(context));
  console.log('Professionals API available:', typeof client.professionals.listProfessionals === 'function');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
