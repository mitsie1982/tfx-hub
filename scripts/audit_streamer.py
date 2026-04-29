#!/usr/bin/env python3
import argparse, json, requests, os, sys
p=argparse.ArgumentParser(); p.add_argument('--file', required=True); p.add_argument('--dest', required=True); args=p.parse_args()
if not os.path.exists(args.file): print('Audit file not found'); sys.exit(2)
for line in open(args.file,'r',encoding='utf-8'):
  rec=json.loads(line)
  try: requests.post(args.dest, json=rec, timeout=5)
  except Exception as e: print('stream error', e)
print('stream complete')
