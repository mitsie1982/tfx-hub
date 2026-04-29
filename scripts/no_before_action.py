#!/usr/bin/env python3
import json, subprocess, time, os, sys, hmac, hashlib
LOG='out/action_audit.log'; HMAC_SECRET=os.environ.get('AUDIT_HMAC_SECRET','audit-dev-secret')
def opa_eval(obj):
  try:
    p = subprocess.run(['opa','eval','-i','-','data.governance.deny'], input=json.dumps(obj).encode(), capture_output=True)
    out = p.stdout.decode().strip()
    if out and 'true' in out: return False, out
    return True, ''
  except FileNotFoundError:
    if obj.get('action',{}).get('type')=='external' and not obj.get('action',{}).get('approved',False):
      return False, 'external action not approved'
    return True, ''
def log_entry(entry):
  os.makedirs('out', exist_ok=True)
  raw = json.dumps(entry, sort_keys=True)
  sig = hmac.new(HMAC_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()
  record = {'entry': entry, 'hmac': sig}
  with open(LOG,'a',encoding='utf-8') as fh: fh.write(json.dumps(record)+'\n')
if __name__=='__main__':
  if len(sys.argv)<3: print('usage'); sys.exit(2)
  action=json.load(open(sys.argv[1],'r',encoding='utf-8')); contract=json.load(open(sys.argv[2],'r',encoding='utf-8'))
  ok,reason=opa_eval({'action':action,'contract':contract})
  if not ok: log_entry({'ts':time.time(),'action':action,'verdict':'DENY','reason':reason}); print('Denied by policy:',reason); sys.exit(3)
  log_entry({'ts':time.time(),'action':action,'verdict':'ALLOW','reason':'passed checks'}); print('Action allowed and logged.')
