#!/bin/bash
# E2E manual acceptance test for job accept concurrency (QA)
# Prerequisites: server running at http://localhost:3000, job exists in 'offered' status with version 1
# Requires: jq

set -e

JOB_ID="replace-with-job-id"
API_URL="http://localhost:3000/api/jobs/$JOB_ID/accept"

# Accept with contractor 1
RESPONSE1=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"contractorId":"c1","version":1}')
BODY1=$(echo "$RESPONSE1" | head -n-1)
CODE1=$(echo "$RESPONSE1" | tail -n1)

# Accept with contractor 2
RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"contractorId":"c2","version":1}')
BODY2=$(echo "$RESPONSE2" | head -n-1)
CODE2=$(echo "$RESPONSE2" | tail -n1)

echo "Contractor 1 Accept Response: $CODE1"
echo "$BODY1" | jq . || echo "$BODY1"
echo

echo "Contractor 2 Accept Response: $CODE2"
echo "$BODY2" | jq . || echo "$BODY2"
echo

# Check results
if [[ "$CODE1" == "200" && "$CODE2" == "409" ]]; then
  echo "[PASS] Contractor 1 succeeded, Contractor 2 conflicted."
elif [[ "$CODE1" == "409" && "$CODE2" == "200" ]]; then
  echo "[PASS] Contractor 2 succeeded, Contractor 1 conflicted."
else
  echo "[FAIL] Unexpected status codes: $CODE1, $CODE2"
  exit 1
fi

# Assert JSON fields
if [[ "$CODE1" == "200" ]]; then
  OK1=$(echo "$BODY1" | jq -r .ok)
  if [[ "$OK1" != "true" ]]; then
    echo "[FAIL] Contractor 1: ok field not true"
    exit 1
  fi
fi
if [[ "$CODE2" == "200" ]]; then
  OK2=$(echo "$BODY2" | jq -r .ok)
  if [[ "$OK2" != "true" ]]; then
    echo "[FAIL] Contractor 2: ok field not true"
    exit 1
  fi
fi
if [[ "$CODE1" == "409" ]]; then
  ERROR1=$(echo "$BODY1" | jq -r .error)
  if [[ "$ERROR1" == "null" || -z "$ERROR1" ]]; then
    echo "[FAIL] Contractor 1: error field missing on conflict"
    exit 1
  fi
fi
if [[ "$CODE2" == "409" ]]; then
  ERROR2=$(echo "$BODY2" | jq -r .error)
  if [[ "$ERROR2" == "null" || -z "$ERROR2" ]]; then
    echo "[FAIL] Contractor 2: error field missing on conflict"
    exit 1
  fi
fi

echo "[SUCCESS] E2E concurrency test passed."
