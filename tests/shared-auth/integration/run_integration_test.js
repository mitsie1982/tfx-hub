/*
 tests/shared-auth/integration/run_integration_test.js
 Starts the integration server and validates tenant and role enforcement.
*/
const child = require('child_process');
const path = require('path');
const { signToken } = require('../../../packages/shared-auth/src');

const serverPath = path.join(__dirname, 'server.js');
const proc = child.spawn(process.execPath, [serverPath], { stdio: ['ignore', 'pipe', 'pipe'] });

proc.stdout.on('data', d => process.stdout.write(d));
proc.stderr.on('data', d => process.stderr.write(d));

async function get(url, token) {
  const headers = token ? { Authorization: 'Bearer ' + token } : {};
  const response = await fetch(url, { headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  return { status: response.status, data };
}

function stopServer() {
  return new Promise((resolve) => {
    if (proc.killed || proc.exitCode !== null) {
      resolve();
      return;
    }
    proc.once('exit', () => resolve());
    proc.kill();
  });
}

function fail(message, code = 2) {
  console.error(message);
  return code;
}

setTimeout(async () => {
  let code = 0;
  try {
    // 1) Missing token -> 401
    {
      const r = await get('http://localhost:5010/protected');
      if (r.status !== 401) {
        code = fail(`Unexpected status for missing token ${r.status}`);
        return;
      }
    }

    // 2) Token without associationId -> 403
    const tokenNoAssoc = signToken({ sub: 'u1', role: 'member' }, { expiresIn: '1h' });
    {
      const r = await get('http://localhost:5010/protected', tokenNoAssoc);
      if (r.status !== 403) {
        code = fail(`Unexpected status for token without associationId ${r.status}`);
        return;
      }
    }

    // 3) Member token -> protected OK, admin forbidden
    const tokenMember = signToken({ sub: 'u2', associationId: 'assoc-int', role: 'member' }, { expiresIn: '1h' });
    const r1 = await get('http://localhost:5010/protected', tokenMember);
    if (r1.status !== 200) {
      code = fail('Expected 200 for member protected');
      return;
    }
    {
      const r = await get('http://localhost:5010/admin', tokenMember);
      if (r.status !== 403) {
        code = fail(`Unexpected status for member to admin ${r.status}`);
        return;
      }
    }

    // 4) Admin token -> admin OK
    const tokenAdmin = signToken({ sub: 'u3', associationId: 'assoc-int', role: 'admin' }, { expiresIn: '1h' });
    const r2 = await get('http://localhost:5010/admin', tokenAdmin);
    if (r2.status !== 200) {
      code = fail('Expected 200 for admin access');
      return;
    }

    console.log('Integration tests passed');
  } catch (e) {
    code = fail(`Integration test error ${e && e.message}`);
  } finally {
    await stopServer();
    process.exitCode = code;
  }
}, 800);
