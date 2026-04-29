#!/usr/bin/env python3
import json, os, hmac, hashlib, sys
LOG='out/action_audit.log'; HMAC_SECRET=os.environ.get('AUDIT_HMAC_SECRET','audit-dev-secret')
if not os.path.exists(LOG): print('No audit log'); sys.exit(1)
ok=True
for l in open(LOG,'r',encoding='utf-8'):
  rec=json.loads(l); raw=json.dumps(rec['entry'], sort_keys=True)
  sig=hmac.new(HMAC_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
  if sig!=rec['hmac']: print('Tamper detected', rec['entry']); ok=False
if ok: print('All audit entries verified'); sys.exit(0)
sys.exit(2)
