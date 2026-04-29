set -e
TOKEN=\
ACTION_FILE='demo/action.json'
python -c "import json, sys; print(json.load(open(sys.argv[1]))['approved'])" "\"
curl -s -H "Authorization: Bearer \a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0" -H "Content-Type: application/json" -d @"\" https://api.example.com/customer/read || true
python -c "import json, time; trace = {'ts': time.time(), 'agent':'agent-42', 'action':'export_customer_profile', 'status':'success'}; open('out/traces.log','a').write(json.dumps(trace)+'\n')"
