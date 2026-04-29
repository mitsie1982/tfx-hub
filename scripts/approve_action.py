#!/usr/bin/env python3
# scripts/approve_action.py
import json, sys, os
if __name__=='__main__':
  import argparse
  p=argparse.ArgumentParser()
  p.add_argument('--action', required=True)
  args=p.parse_args()
  path=args.action
  if not os.path.exists(path):
    print('Action file not found:', path); sys.exit(2)
  a=json.load(open(path,'r',encoding='utf-8'))
  a['approved']=True
  open(path,'w',encoding='utf-8').write(json.dumps(a, indent=2))
  print('Action approved:', path)
