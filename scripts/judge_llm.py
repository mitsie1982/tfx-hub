#!/usr/bin/env python3
import json, re, sys
action=json.load(open(sys.argv[1],'r',encoding='utf-8'))
contract=json.load(open(sys.argv[2],'r',encoding='utf-8'))
caps=[c['name'] for c in contract.get('capabilities',[])]
if action.get('capability') not in caps:
  print(json.dumps({'ok':False,'reason':'capability not in contract'})); sys.exit(0)
deny=[r'ssn',r'credit card',r'private key']
txt=json.dumps(action)
for p in deny:
  if re.search(p,txt,re.I):
    print(json.dumps({'ok':False,'reason':'sensitive pattern detected'})); sys.exit(0)
print(json.dumps({'ok':True,'reason':'static checks passed'}))
