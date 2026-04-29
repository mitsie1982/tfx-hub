#!/usr/bin/env python3
# scripts/trace_utils.py
import time, json, uuid, os
def start_trace(name):
    t = {'trace_id': str(uuid.uuid4()), 'name': name, 'start': time.time()}
    return t
def end_trace(t, extra=None):
    t['end'] = time.time()
    t['duration_ms'] = int((t['end'] - t['start'])*1000)
    if extra:
        t['extra'] = extra
    os.makedirs('out', exist_ok=True)
    with open('out/traces.log','a',encoding='utf-8') as fh:
        fh.write(json.dumps(t) + '\\n')
    return t
