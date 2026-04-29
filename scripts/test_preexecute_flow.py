#!/usr/bin/env python3
"""
scripts/test_preexecute_flow.py
Minimal integration test that:
- creates a high-risk action file (approved: false)
- runs the No-Before-Action gate (scripts/no_before_action.py)
- expects a pending outcome (exit code 5)
- approves the action (scripts/approve_action.py)
- runs the audited runner (scripts/audited_runner.sh)
- verifies the audit trail (scripts/audit_verify.py)
Logs progress to scripts/test_preexecute_flow.log and prints concise results.
Usage:
  python3 scripts/test_preexecute_flow.py --verbose
"""

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

LOG = Path("scripts/test_preexecute_flow.log")

def log(msg):
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    line = f"{ts}\t{msg}"
    print(line)
    with LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")

def run(cmd, check=False):
    log(f"RUN: {cmd}")
    try:
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        log(f"EXIT {res.returncode} STDOUT: {res.stdout.strip()} STDERR: {res.stderr.strip()}")
        if check and res.returncode != 0:
            raise RuntimeError(f"Command failed: {cmd} (exit {res.returncode})")
        return res.returncode, res.stdout, res.stderr
    except Exception as e:
        log(f"EXCEPTION: {e}")
        raise

def write_demo_action(path):
    action = {
        "agent_id": "ci-agent-01",
        "name": "export_customer_profile",
        "capability": "read_customer",
        "type": "external",
        "risk": "high",
        "inputs": {"customer_id": "CUST-TEST-001"},
        "approved": False,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(action, indent=2))
    log(f"Wrote demo action to {path}")

def main(verbose=False):
    LOG.parent.mkdir(parents=True, exist_ok=True)
    if LOG.exists():
        LOG.unlink()
    log("Starting preExecute integration test")

    action_path = Path("demo/action.json")
    contract_path = Path("demo/contract.json")

    # Ensure demo contract exists
    if not contract_path.exists():
        contract = {
            "name": "example-http-api",
            "version": "0.1.0",
            "capabilities": [
                {
                    "name": "read_customer",
                    "type": "external",
                    "allowed_inputs": {"customer_id": "string"},
                    "allowed_outputs": {"customer_profile": "object"},
                    "risk": "low"
                }
            ]
        }
        contract_path.write_text(json.dumps(contract, indent=2))
        log(f"Wrote demo contract to {contract_path}")

    # 1) Create high-risk action (approved: false)
    write_demo_action(action_path)

    # 2) Run gate: expect pending (no_before_action.py returns exit code 5 for pending)
    rc, out, err = run(f"python3 scripts/no_before_action.py {action_path} {contract_path}")
    if rc == 5:
        log("Gate returned PENDING as expected")
    elif rc == 0:
        log("Gate unexpectedly allowed the action (exit 0). Test will continue but this is unexpected.")
    else:
        log(f"Gate returned unexpected exit code {rc}. Failing test.")
        sys.exit(2)

    # 3) Approve the pending action
    rc, out, err = run(f"python3 scripts/approve_action.py --action out/pending_action.json", check=True)
    log("Approved pending action")

    # 4) Re-run gate to confirm allow
    rc, out, err = run(f"python3 scripts/no_before_action.py {action_path} {contract_path}")
    if rc == 0:
        log("Gate allowed action after approval")
    else:
        log(f"Gate did not allow action after approval (exit {rc}). Failing test.")
        sys.exit(3)

    # 5) Run audited runner (simulate external execution)
    rc, out, err = run("bash scripts/audited_runner.sh")
    if rc == 0:
        log("Audited runner executed successfully")
    else:
        log(f"Audited runner failed (exit {rc}). Failing test.")
        sys.exit(4)

    # 6) Verify audit trail
    rc, out, err = run("python3 scripts/audit_verify.py")
    if rc == 0:
        log("Audit verification succeeded")
    else:
        log(f"Audit verification failed (exit {rc}). Failing test.")
        sys.exit(5)

    log("PreExecute integration test completed successfully")
    sys.exit(0)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    main(verbose=args.verbose)
