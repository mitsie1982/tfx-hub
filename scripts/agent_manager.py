#!/usr/bin/env python3
import json, time, hmac, hashlib, os, sys
TOKENS='out/agent_tokens.json'
SECRET=os.environ.get('AGENT_MANAGER_SECRET','dev-secret')
def issue(agent_id, scopes, ttl=300):
  payload={'agent_id':agent_id,'scopes':scopes,'exp':int(time.time())+int(ttl)}
  token=hmac.new(SECRET.encode(), json.dumps(payload).encode(), hashlib.sha256).hexdigest()
  rec={'token':token,'payload':payload}
  data=[]
  if os.path.exists(TOKENS):
    data=json.load(open(TOKENS,'r',encoding='utf-8'))
  data.append(rec)
  open(TOKENS,'w',encoding='utf-8').write(json.dumps(data,indent=2))
  print(token)
def revoke(agent_id):
  if not os.path.exists(TOKENS): return
  data=json.load(open(TOKENS,'r',encoding='utf-8'))
  data=[r for r in data if r['payload'].get('agent_id')!=agent_id]
  open(TOKENS,'w',encoding='utf-8').write(json.dumps(data,indent=2))
if __name__=='__main__':
  if len(sys.argv)<2: print('usage'); sys.exit(2)
  cmd=sys.argv[1]
  if cmd=='issue': issue(sys.argv[2], sys.argv[3].split(','), sys.argv[4] if len(sys.argv)>4 else 300)
  elif cmd=='revoke': revoke(sys.argv[2])
