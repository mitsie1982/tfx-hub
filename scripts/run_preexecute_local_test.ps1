<#
scripts/run_preexecute_local_test.ps1
Runs the preExecute integration flow locally and prints a concise pass/fail summary.
Assumes helper scripts exist: scripts/no_before_action.py, scripts/approve_action.py,
scripts/audited_runner.sh, scripts/audit_verify.py. Requires Python3 and bash available.
Usage:
  pwsh ./scripts/run_preexecute_local_test.ps1
  pwsh ./scripts/run_preexecute_local_test.ps1 -Verbose
#>

param([switch]$Verbose)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Log($msg) { $ts = (Get-Date).ToString('s'); "$ts`t$msg" | Tee-Object -FilePath scripts/run_preexecute_local_test.log -Append }
function RunCmd($cmd, $check=$false) {
  Log "RUN: $cmd"
  $proc = Start-Process -FilePath pwsh -ArgumentList "-NoProfile","-Command",$cmd -NoNewWindow -PassThru -Wait -ErrorAction SilentlyContinue
  $rc = $proc.ExitCode
  Log "EXIT CODE: $rc"
  if ($check -and $rc -ne 0) { throw "Command failed: $cmd (exit $rc)" }
  return $rc
}

try {
    Remove-Item -Force -ErrorAction SilentlyContinue scripts/run_preexecute_local_test.log
    Log "Starting local preExecute integration test"

    # 1) Ensure demo contract exists
    if (-not (Test-Path demo/contract.json)) {
        $contract = @{
            name = "example-http-api"
            version = "0.1.0"
            capabilities = @(@{
                name = "read_customer"; type = "external"; allowed_inputs = @{ customer_id = "string" }; allowed_outputs = @{ customer_profile = "object" }; risk = "low"
            })
        }
        $contract | ConvertTo-Json -Depth 6 | Out-File -FilePath demo/contract.json -Encoding ascii
        Log "Wrote demo/contract.json"
    }

    # 2) Create high-risk action (approved: false)
    $action = @{
        agent_id = "local-ci-agent"
        name = "export_customer_profile"
        capability = "read_customer"
        type = "external"
        risk = "high"
        inputs = @{ customer_id = "CUST-LOCAL-001" }
        approved = $false
        timestamp = (Get-Date).ToString("o")
    }
        $action | ConvertTo-Json -Depth 6 | Out-File -FilePath demo/action.json -Encoding ascii
    Log "Wrote demo/action.json (approved: false)"

    # 3) Run gate: expect pending (exit code 5 is used by the gate stub)
        Log "Running gate: python scripts/no_before_action.py demo/action.json demo/contract.json"
        $rc = & python scripts/no_before_action.py demo/action.json demo/contract.json
    if ($LASTEXITCODE -eq 5) {
        Log "Gate returned PENDING as expected (exit 5)"
    }
    elseif ($LASTEXITCODE -eq 0) {
        Log "Gate allowed action (exit 0) — unexpected but continuing"
    }
    else {
        throw "Gate returned unexpected exit code $LASTEXITCODE"
    }

    # 4) Approve pending action
    if (-not (Test-Path out/pending_action.json)) {
        throw "Pending action file not found: out/pending_action.json"
    }
    Log "Approving pending action"
        & python scripts/approve_action.py --action out/pending_action.json
    if ($LASTEXITCODE -ne 0) {
        throw "approve_action.py failed (exit $LASTEXITCODE)"
    }


    param([switch]$Verbose)

    Set-StrictMode -Version Latest
    $ErrorActionPreference = 'Stop'

    function Log($msg) {
            $ts = (Get-Date).ToString('s')
            "$ts`t$msg" | Tee-Object -FilePath scripts/run_preexecute_local_test.log -Append
    }

    function RunCmd($cmd, $check=$false) {
            Log "RUN: $cmd"
            $proc = Start-Process -FilePath pwsh -ArgumentList "-NoProfile","-Command",$cmd -NoNewWindow -PassThru -Wait -ErrorAction SilentlyContinue
            $rc = $proc.ExitCode
            Log "EXIT CODE: $rc"
            if ($check -and $rc -ne 0) { throw "Command failed: $cmd (exit $rc)" }
            return $rc
    }

    try {
            Remove-Item -Force -ErrorAction SilentlyContinue scripts/run_preexecute_local_test.log
            Log "Starting local preExecute integration test"

            # 1) Ensure demo contract exists
            if (-not (Test-Path demo/contract.json)) {
                    $contract = @{
                            name = "example-http-api"
                            version = "0.1.0"
                            capabilities = @(@{
                                    name = "read_customer"; type = "external"; allowed_inputs = @{ customer_id = "string" }; allowed_outputs = @{ customer_profile = "object" }; risk = "low"
                            })
                    }
                    $contract | ConvertTo-Json -Depth 6 | Out-File -FilePath demo/contract.json -Encoding utf8
                    Log "Wrote demo/contract.json"
            }

            # 2) Create high-risk action (approved: false)
            $action = @{
                    agent_id = "local-ci-agent"
                    name = "export_customer_profile"
                    capability = "read_customer"
                    type = "external"
                    risk = "high"
                    inputs = @{ customer_id = "CUST-LOCAL-001" }
                    approved = $false
                    timestamp = (Get-Date).ToString("o")
            }
            $action | ConvertTo-Json -Depth 6 | Out-File -FilePath demo/action.json -Encoding utf8
            Log "Wrote demo/action.json (approved: false)"

            # 3) Run gate: expect pending (exit code 5 is used by the gate stub)
            Log "Running gate: python3 scripts/no_before_action.py demo/action.json demo/contract.json"
            $rc = & python3 scripts/no_before_action.py demo/action.json demo/contract.json
            if ($LASTEXITCODE -eq 5) {
                    Log "Gate returned PENDING as expected (exit 5)"
            } elseif ($LASTEXITCODE -eq 0) {
                    Log "Gate allowed action (exit 0) — unexpected but continuing"
            } else {
                    throw "Gate returned unexpected exit code $LASTEXITCODE"
            }

            # 4) Approve pending action
            if (-not (Test-Path out/pending_action.json)) {
                    throw "Pending action file not found: out/pending_action.json"
            }
            Log "Approving pending action"
            & python3 scripts/approve_action.py --action out/pending_action.json
            if ($LASTEXITCODE -ne 0) {
                    throw "approve_action.py failed (exit $LASTEXITCODE)"
            }

            # 5) Re-run gate to confirm allow
            Log "Re-running gate to confirm allow"
        & python scripts/no_before_action.py demo/action.json demo/contract.json
            if ($LASTEXITCODE -ne 0) {
                    throw "Gate did not allow action after approval (exit $LASTEXITCODE)"
            }
            Log "Gate allowed action after approval"

            # 6) Run audited runner
            Log "Running audited runner (bash scripts/audited_runner.sh)"
            & bash ./scripts/audited_runner.sh
            if ($LASTEXITCODE -ne 0) {
                    throw "audited_runner.sh failed (exit $LASTEXITCODE)"
            }
            Log "Audited runner executed successfully"

            # 7) Verify audit trail
        Log "Verifying audit trail (python scripts/audit_verify.py)"
        & python scripts/audit_verify.py
            if ($LASTEXITCODE -ne 0) {
                    throw "audit_verify.py failed (exit $LASTEXITCODE)"
            }
            Log "Audit verification succeeded"

            Write-Host ""
            Write-Host "=== PREEXECUTE LOCAL TEST: PASS ==="
            Write-Host "Log: scripts/run_preexecute_local_test.log"
            exit 0
    }
    catch {
            Write-Host "FAILED"
            exit 1
    }
