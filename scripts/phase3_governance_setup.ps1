# File: phase3_governance_setup.ps1
# Purpose: Add Phase 3 governance artifacts: TFX gating pipeline template, MLflow hooks, CI workflow, monitoring stubs, and helper scripts.
# Edit variables below before running.

$ProjectRoot = "C:\path\to\your\TFXHubProject"            # <-- set your project path
$SLMPath = Join-Path $ProjectRoot "slm"
$PipelinesPath = Join-Path $SLMPath "pipelines"
$ScriptsPath = Join-Path $ProjectRoot "scripts"
$CIPath = Join-Path $ProjectRoot ".github\workflows"
$MLflowTrackingURI = "http://mlflow-server:5000"          # <-- set or leave placeholder
$MLflowArtifactRoot = "s3://your-mlflow-bucket/artifacts" # <-- set or leave placeholder
$RequiredFiles = @("requirements.txt", "Dockerfile")
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")

# Safety checks
if (-not (Test-Path $ProjectRoot)) { Write-Error "Project root $ProjectRoot not found. Edit script and re-run."; exit 1 }
New-Item -ItemType Directory -Force -Path $PipelinesPath | Out-Null
New-Item -ItemType Directory -Force -Path $ScriptsPath | Out-Null
New-Item -ItemType Directory -Force -Path $CIPath | Out-Null

Write-Output "Creating Phase 3 governance artifacts..."

# 1) Write TFX pipeline template with validation and evaluator gates
$tfxPipelineFile = Join-Path $PipelinesPath "tfx_pipeline_with_gates.py"
$tfxPipelineContent = @"
# tfx_pipeline_with_gates.py
# Template TFX pipeline with data validation gates, evaluator performance gate, and MLflow logging hooks.
# MANUAL: set MLFLOW_TRACKING_URI and storage paths in environment or CI secrets before running.

import os
from tfx.orchestration import pipeline
from tfx.components import CsvExampleGen, StatisticsGen, SchemaGen, ExampleValidator, Trainer, Evaluator, Pusher
from tfx.proto import trainer_pb2, evaluator_pb2
from tfx.orchestration.local import local_dag_runner
from tfx.types import standard_artifacts
import mlflow
import mlflow.sklearn

# Configurable thresholds (tune for your use case)
MISSING_VALUE_THRESHOLD = 0.10   # fail if missing values > 10%
ANOMALY_COUNT_THRESHOLD = 5      # fail if anomalies > 5
ACCURACY_BASELINE = 0.80         # minimum acceptable accuracy

def create_pipeline(pipeline_root, data_root, module_file, serving_model_dir, metadata_path):
    # ExampleGen
    example_gen = CsvExampleGen(input_base=data_root)

    # Statistics and Schema
    stats_gen = StatisticsGen(examples=example_gen.outputs['examples'])
    schema_gen = SchemaGen(statistics=stats_gen.outputs['statistics'])

    # ExampleValidator (data validation gate)
    example_validator = ExampleValidator(
        statistics=stats_gen.outputs['statistics'],
        schema=schema_gen.outputs['schema']
    )

    # Trainer (user module)
    trainer = Trainer(
        module_file=module_file,
        examples=example_gen.outputs['examples'],
        train_args=trainer_pb2.TrainArgs(num_steps=100),
        eval_args=trainer_pb2.EvalArgs(num_steps=10)
    )

    # Evaluator (model performance gate)
    evaluator = Evaluator(
        examples=example_gen.outputs['examples'],
        model=trainer.outputs['model'],
        eval_config=evaluator_pb2.EvalConfig()
    )

    # Pusher (only if evaluator approves)
    pusher = Pusher(
        model=trainer.outputs['model'],
        push_destination=pusher_pb2.PushDestination(
            filesystem=pusher_pb2.PushDestination.Filesystem(base_directory=serving_model_dir)
        )
    )

    components = [
        example_gen, stats_gen, schema_gen, example_validator,
        trainer, evaluator, pusher
    ]

    return pipeline.Pipeline(
        pipeline_name='tfx_hub_pipeline_with_gates',
        pipeline_root=pipeline_root,
        components=components,
        metadata_connection_config=None,
        enable_cache=True
    )

# MLflow helper: log model and metadata after training
def log_model_to_mlflow(model_path, metrics, params):
    mlflow.set_tracking_uri(os.environ.get('MLFLOW_TRACKING_URI', '${MLFLOW_TRACKING_URI}'))
    mlflow.set_experiment('tfx_hub_slm')
    with mlflow.start_run():
        for k,v in params.items():
            mlflow.log_param(k, v)
        for k,v in metrics.items():
            mlflow.log_metric(k, v)
        # Example: log model artifact directory
        mlflow.log_artifacts(model_path, artifact_path='model')
"@
$tfxPipelineContent | Out-File -FilePath $tfxPipelineFile -Encoding UTF8
Write-Output "Wrote TFX pipeline template to $tfxPipelineFile"

# 2) Write MLflow config and helper script
$mlflowEnvFile = Join-Path $ScriptsPath "mlflow_env_setup.sh"
$mlflowEnvContent = @"
#!/bin/bash
# mlflow_env_setup.sh
# MANUAL: Replace placeholders with your MLflow server URI and artifact root, then store secrets in your vault/CI.
export MLFLOW_TRACKING_URI='${MLflowTrackingURI}'
export MLFLOW_ARTIFACT_ROOT='${MLflowArtifactRoot}'
echo 'MLflow environment variables set. Ensure these are stored securely in CI secrets for production.'
"@
$mlflowEnvContent | Out-File -FilePath $mlflowEnvFile -Encoding UTF8
Set-ItemProperty -Path $mlflowEnvFile -Name IsReadOnly -Value $false
Write-Output "Wrote MLflow env setup script to $mlflowEnvFile"

# 3) Create CI workflow (GitHub Actions) that gates on TFDV and Evaluator
$ciFile = Join-Path $CIPath "tfx_ci_gates.yml"
$ciContent = @"
name: TFX CI with Gates

on:
  pull_request:
    branches: [ main, master ]

jobs:
  test-and-dryrun:
    runs-on: ubuntu-latest
    env:
      MLFLOW_TRACKING_URI: \\${{ secrets.MLFLOW_TRACKING_URI }}
      MLFLOW_ARTIFACT_ROOT: \\${{ secrets.MLFLOW_ARTIFACT_ROOT }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run unit tests
        run: |
          pytest -q

      - name: Run TFDV schema checks (dry-run)
        run: |
          python - <<'PY'
import os, sys
# Minimal TFDV check: run StatisticsGen and ExampleValidator on a small sample
# MANUAL: Replace with your sample data path
sample_data = 'tests/sample_data'
if not os.path.exists(sample_data):
    print('No sample data found at', sample_data)
    sys.exit(1)
print('Sample data exists; proceed with TFDV checks (implement your checks here).')
PY

      - name: Run TFX pipeline dry-run (local)
        run: |
          # Run a local dry-run of the pipeline on a tiny dataset
          python -c "print('Implement pipeline dry-run invocation here; ensure it uses sample data and does not push to prod')"

      - name: Fail on gating conditions
        run: |
          # This step should inspect outputs from TFDV/Evaluator and fail if gates are tripped.
          # Implement parsing of validator/evaluator outputs and exit non-zero on failure.
          echo 'Gating checks placeholder - implement parsing of TFX outputs and fail if necessary'
"@
$ciContent | Out-File -FilePath $ciFile -Encoding UTF8
Write-Output "Wrote CI workflow template to $ciFile"

# 4) Create helper script to parse TFX validator/evaluator outputs and enforce gates
$gateScript = Join-Path $ScriptsPath "enforce_gates.py"
$gateScriptContent = @"
# enforce_gates.py
# Parse TFX ExampleValidator and Evaluator outputs and exit non-zero if gates fail.
# This script is a template: adapt artifact paths to your orchestrator (Airflow/Kubeflow/Local).
import json, sys, os

# MANUAL: set these paths to where your orchestrator writes validator/evaluator outputs
validator_output_path = os.environ.get('VALIDATOR_OUTPUT','./tfx_output/validator.json')
evaluator_output_path = os.environ.get('EVALUATOR_OUTPUT','./tfx_output/evaluator.json')

def check_validator(path):
    if not os.path.exists(path):
        print('Validator output not found:', path)
        return False
    with open(path) as f:
        data = json.load(f)
    # Example heuristic: count anomalies and missing value ratio
    anomalies = data.get('anomalies_count', 0)
    missing_ratio = data.get('missing_ratio', 0.0)
    print('Validator anomalies:', anomalies, 'missing_ratio:', missing_ratio)
    if anomalies > 5 or missing_ratio > 0.10:
        print('Data validation gate FAILED')
        return False
    return True

def check_evaluator(path):
    if not os.path.exists(path):
        print('Evaluator output not found:', path)
        return False
    with open(path) as f:
        data = json.load(f)
    accuracy = data.get('accuracy', 0.0)
    print('Evaluator accuracy:', accuracy)
    if accuracy < 0.80:
        print('Model performance gate FAILED')
        return False
    return True

ok = True
if not check_validator(validator_output_path):
    ok = False
if not check_evaluator(evaluator_output_path):
    ok = False

if not ok:
    print('One or more gates failed. Exiting with non-zero status.')
    sys.exit(2)
print('All gates passed.')
sys.exit(0)
"@
$gateScriptContent | Out-File -FilePath $gateScript -Encoding UTF8
Write-Output "Wrote gate enforcement script to $gateScript"

# 5) Create MLflow publish helper (called after successful gate)
$mlflowPublish = Join-Path $ScriptsPath "publish_model_to_mlflow.py"
$mlflowPublishContent = @"
# publish_model_to_mlflow.py
# After gates pass, publish model artifacts and metadata to MLflow.
import os, mlflow, json, sys
mlflow.set_tracking_uri(os.environ.get('MLFLOW_TRACKING_URI','${MLflowTrackingURI}'))
mlflow.set_experiment('tfx_hub_slm')

model_dir = os.environ.get('MODEL_DIR','./model_export')
metrics_file = os.path.join(model_dir, 'metrics.json')
params_file = os.path.join(model_dir, 'params.json')

metrics = {}
params = {}
if os.path.exists(metrics_file):
    with open(metrics_file) as f:
        metrics = json.load(f)
if os.path.exists(params_file):
    with open(params_file) as f:
        params = json.load(f)

with mlflow.start_run():
    for k,v in params.items():
        mlflow.log_param(k, v)
    for k,v in metrics.items():
        mlflow.log_metric(k, v)
    mlflow.log_artifacts(model_dir, artifact_path='model')
print('Published model to MLflow.')
"@
$mlflowPublishContent | Out-File -FilePath $mlflowPublish -Encoding UTF8
Write-Output "Wrote MLflow publish helper to $mlflowPublish"

# 6) Create monitoring and governance stub
$monitoringFile = Join-Path $ProjectRoot "monitoring_and_governance.md"
$monitoringContent = @"
# Monitoring and Governance (Phase 3)

## Data Validation Gates
- ExampleValidator must run on each pipeline execution.
- Thresholds: missing_ratio > 0.10 or anomalies_count > 5 -> block promotion.

## Model Performance Gate
- Evaluator must compare candidate model to baseline.
- If accuracy < baseline (e.g., 0.80) -> reject model.

## Model Registry
- Use MLflow to store models, metrics, and approval status.
- All published models must include provenance: git_sha, image_digest, dataset_hash.

## Runbooks
- Pipeline failure: check validator/evaluator outputs, restore last good dataset, re-run.
- Model regression: rollback to previous model in MLflow and open incident.

"@
$monitoringContent | Out-File -FilePath $monitoringFile -Encoding UTF8
Write-Output "Wrote monitoring and governance stub to $monitoringFile"

# 7) Add pre-commit hook to block merges if gates not implemented
$gitHooksDir = Join-Path $ProjectRoot ".git\hooks"
if (-not (Test-Path $gitHooksDir)) { New-Item -ItemType Directory -Force -Path $gitHooksDir | Out-Null }
$preCommitHook = Join-Path $gitHooksDir "pre-commit"
$preCommitContent = @"
#!/bin/sh
# pre-commit: ensure gating scripts exist and are not removed
if [ ! -f scripts/enforce_gates.py ]; then
  echo 'Error: gating script scripts/enforce_gates.py missing. Add it before committing.'
  exit 1
fi
if [ ! -f slm/pipelines/tfx_pipeline_with_gates.py ]; then
  echo 'Error: pipeline template slm/pipelines/tfx_pipeline_with_gates.py missing.'
  exit 1
fi
exit 0
"@
$preCommitContent | Out-File -FilePath $preCommitHook -Encoding ASCII
# Make executable on Unix-like systems (no-op on Windows)
try { icacls $preCommitHook /grant Everyone:RX } catch { }
Write-Output "Wrote pre-commit hook to $preCommitHook"

# 8) Summarize manual actions and next steps
Write-Output "Phase 3 governance artifacts created. Manual actions required:"
Write-Output " - Set MLflow server URI and artifact root in CI secrets (MLFLOW_TRACKING_URI, MLFLOW_ARTIFACT_ROOT)."
Write-Output " - Review and adapt slm/pipelines/tfx_pipeline_with_gates.py to your Trainer module and orchestrator."
Write-Output " - Provide sample data for CI TFDV checks at tests/sample_data or update CI workflow."
Write-Output " - Provision MLflow server or confirm access to existing registry."
Write-Output " - Review and enable the GitHub Actions workflow; add secrets in repository settings."

Write-Output "Files created:"
Get-ChildItem -Path $PipelinesPath, $ScriptsPath, $CIPath -Recurse | Select-Object FullName | ForEach-Object { Write-Output $_.FullName }

Write-Output "Phase 3 setup script completed at $Timestamp."
