/*
 tests/shared-logic/integration/server.js
 Thin wrapper around the real API server package using an in-memory repository.
*/
const { createApp, createMemoryRepository } = require('../../../packages/api-server/src');

const appPromise = (async () => {
  const repository = await createMemoryRepository();
  await repository.initialize();
  const app = createApp({ repository });

  app.get('/ping', (req, res) => res.json({ ok: true }));
  app.get('/protected', require('../../../packages/shared-auth/src').tenantMiddleware(), (req, res) => {
    res.json({ ok: true, payload: req.auth });
  });
  return app;
})();

async function start() {
  const app = await appPromise;
  const port = process.env.PORT || 5005;
  app.listen(port, () => console.log('Integration server listening on', port));
}

if (require.main === module) {
  start();
}

module.exports = appPromise;
