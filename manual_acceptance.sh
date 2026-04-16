#!/bin/bash
# E2E manual acceptance test for job accept concurrency
# Prerequisites: server running at http://localhost:3000, job exists in 'offered' status with version 1

JOB_ID="demo-job-1"

# Accept with contractor 1
RESPONSE1=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/jobs/$JOB_ID/accept \
  -H "Content-Type: application/json" \
  -d '{"contractorId":"c1","version":1}')
BODY1=$(echo "$RESPONSE1" | head -n-1)
CODE1=$(echo "$RESPONSE1" | tail -n1)

echo "Contractor 1 Accept Response: $CODE1"
echo "$BODY1"

# Accept with contractor 2 (should conflict)
RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/jobs/$JOB_ID/accept \
  -H "Content-Type: application/json" \
  -d '{"contractorId":"c2","version":1}')
BODY2=$(echo "$RESPONSE2" | head -n-1)
CODE2=$(echo "$RESPONSE2" | tail -n1)

echo "Contractor 2 Accept Response: $CODE2"
echo "$BODY2"

# Expected: One response is 200 with { ok: true, job }, the other is 409 with { error, currentVersion, status }
