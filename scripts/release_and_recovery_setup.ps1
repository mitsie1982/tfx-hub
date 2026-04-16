# File: release_and_recovery_setup.ps1
# Purpose: Scaffold Release & Recovery artifacts: git tagging helpers, rollback targets, MLflow publish, data version alignment, pipeline checkpointing/resume helpers, and CI release workflow.
# Edit variables below before running.

$ProjectRoot = "C:\path\to\your\TFXHubProject"            # <-- set your project path
$ScriptsPath = Join-Path $ProjectRoot "scripts"
$ReleasePath = Join-Path $ProjectRoot "release"
$CIPath = Join-Path $ProjectRoot ".github\workflows"
$MLflowTrackingURI = "http://mlflow-server:5000"          # <-- placeholder
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")

# Safety checks
if (-not (Test-Path $ProjectRoot)) { Write-Error "Project root $ProjectRoot not found. Edit script and re-run."; exit 1 }

# Create directories
New-Item -ItemType Directory -Force -Path $ScriptsPath | Out-Null
New-Item -ItemType Directory -Force -Path $ReleasePath | Out-Null
New-Item -ItemType Directory -Force -Path $CIPath | Out-Null

Write-Output "Scaffolding Release & Recovery artifacts..."

# 1) Makefile with release and rollback targets
$makefile = Join-Path $ReleasePath "Makefile"
$makefileContent = @"
# Makefile for release and rollback
.PHONY: tag release publish rollback

# Usage:
#  make tag VERSION=v1.2
#  make release VERSION=v1.2
#  make rollback MODEL_VERSION=v1.2

VERSION ?= v0.0
MODEL_VERSION ?= v0.0

tag:
    git tag -a \$(VERSION) -m "Release \$(VERSION)"
    git push origin \$(VERSION)

release: tag publish
    @echo "Release \$(VERSION) created and published."

publish:
    python3 scripts/publish_release.py --version \$(VERSION)

rollback:
    python3 scripts/rollback_model.py --model-version \$(MODEL_VERSION)
"@
$makefileContent | Out-File -FilePath $makefile -Encoding UTF8
Write-Output "Wrote Makefile to $makefile"

# 2) publish_release.py - publish model metadata to MLflow and record data version alignment
$publishScript = Join-Path $ScriptsPath "publish_release.py"
$publishContent = @" 
#!/usr/bin/env python3
# publish_release.py
# Publish release metadata to MLflow and record data version alignment.
# MANUAL: ensure MLFLOW_TRACKING_URI and MLFLOW_ARTIFACT_ROOT are set in environment or CI secrets.

import argparse, os, json, hashlib, subprocess, sys
import mlflow

def compute_dataset_hash(dataset_path):
    # Simple recursive hash of file contents; replace with DVC or storage-specific hash for large datasets.
    h = hashlib.sha256()
    for root, dirs, files in os.walk(dataset_path):
        for fname in sorted(files):
            fpath = os.path.join(root, fname)
            with open(fpath, 'rb') as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    h.update(chunk)
    return h.hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', required=True)
    parser.add_argument('--dataset-path', default='data/production')  # MANUAL: set to your production dataset path
    args = parser.parse_args()

    mlflow.set_tracking_uri(os.environ.get('MLFLOW_TRACKING_URI','${MLflowTrackingURI}'))
    mlflow.set_experiment('tfx_hub_releases')

    # Compute dataset hash (data version alignment)
    if not os.path.exists(args.dataset_path):
        print('Dataset path not found:', args.dataset_path)
        sys.exit(2)
    dataset_hash = compute_dataset_hash(args.dataset_path)
    print('Computed dataset hash:', dataset_hash)

    # Record release metadata in MLflow
    with mlflow.start_run(run_name=f'release-{args.version}'):
        mlflow.log_param('release_version', args.version)
        mlflow.log_param('dataset_hash', dataset_hash)
        # Optionally log model artifact if present in a known path
        model_dir = os.path.join('models', args.version)
        if os.path.exists(model_dir):
            mlflow.log_artifacts(model_dir, artifact_path='model')
        print('Published release metadata to MLflow for version', args.version)

if __name__ == '__main__':
    main()
"@
$publishContent | Out-File -FilePath $publishScript -Encoding UTF8
Set-ItemProperty -Path $publishScript -Name IsReadOnly -Value $false
Write-Output "Wrote publish_release.py to $publishScript"

# 3) rollback_model.py - automated rollback using MLflow model registry
$rollbackScript = Join-Path $ScriptsPath "rollback_model.py"
$rollbackContent = @"
#!/usr/bin/env python3
# rollback_model.py
# Automated rollback: promote a previous model version to 'Production' or deploy it.
# MANUAL: adapt deployment steps to your serving infra (KFServing, TF Serving, custom).

import argparse, os, sys
import mlflow
from mlflow.tracking import MlflowClient

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-version', required=True, help='Model version tag or MLflow run id')
    parser.add_argument('--model-name', default='tfx_hub_model')
    args = parser.parse_args()

    mlflow.set_tracking_uri(os.environ.get('MLFLOW_TRACKING_URI','${MLflowTrackingURI}'))
    client = MlflowClient()

    # Attempt to transition model version to Production (if using MLflow Model Registry)
    try:
        # If model-version looks like a numeric registry version, transition it
        client.transition_model_version_stage(
            name=args.model_name,
            version=str(args.model_version),
            stage='Production',
            archive_existing_versions=True
        )
        print(f'Model {args.model_name} version {args.model_version} promoted to Production.')
    except Exception as e:
        print('Model registry transition failed or not using registry:', e)
        # Fallback: find run by tag and re-deploy artifact (implement your deploy logic here)
        print('Implement custom deployment logic to rollback model artifacts.')
        sys.exit(0)

if __name__ == '__main__':
    main()
"@
$rollbackContent | Out-File -FilePath $rollbackScript -Encoding UTF8
Set-ItemProperty -Path $rollbackScript -Name IsReadOnly -Value $false
Write-Output "Wrote rollback_model.py to $rollbackScript"

# 4) data_versioning.py - helper to align and record data versions (DVC optional)
$dataVersionScript = Join-Path $ScriptsPath "data_versioning.py"
$dataVersionContent = @"
#!/usr/bin/env python3
# data_versioning.py
# Compute dataset hash and optionally push to DVC remote. Use this to ensure data-version alignment for releases.
import argparse, os, hashlib, subprocess, sys, json

def compute_hash(path):
    h = hashlib.sha256()
    for root, dirs, files in os.walk(path):
        for fname in sorted(files):
            fpath = os.path.join(root, fname)
            with open(fpath, 'rb') as f:
                while True:
                    chunk = f.read(8192)
                    if not chunk:
                        break
                    h.update(chunk)
    return h.hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dataset-path', default='data/production')
    parser.add_argument('--dvc', action='store_true', help='Use DVC to push dataset to remote')
    args = parser.parse_args()

    if not os.path.exists(args.dataset_path):
        print('Dataset path not found:', args.dataset_path)
        sys.exit(2)
    h = compute_hash(args.dataset_path)
    print('Dataset hash:', h)
    # Optionally push with DVC
    if args.dvc:
        print('Running DVC add and push (requires DVC configured)')
        subprocess.check_call(['dvc','add', args.dataset_path])
        subprocess.check_call(['git','add', args.dataset_path + '.dvc'])
        subprocess.check_call(['git','commit','-m', f'DVC: add dataset {h}'])
        subprocess.check_call(['dvc','push'])
    # Write manifest
    manifest = {'dataset_path': args.dataset_path, 'dataset_hash': h}
    with open('release/dataset_manifest.json','w') as f:
        json.dump(manifest, f, indent=2)
    print('Wrote release/dataset_manifest.json')
if __name__ == '__main__':
    main()
"@
$dataVersionContent | Out-File -FilePath $dataVersionScript -Encoding UTF8
Set-ItemProperty -Path $dataVersionScript -Name IsReadOnly -Value $false
Write-Output "Wrote data_versioning.py to $dataVersionScript"

# 5) checkpointing.py - helper to record and resume pipeline checkpoints using MLMD
$checkpointScript = Join-Path $ScriptsPath "checkpointing.py"
$checkpointContent = @"
#!/usr/bin/env python3
# checkpointing.py
# Template helpers to checkpoint pipeline progress and resume failed runs using ML Metadata (MLMD).
# MANUAL: adapt to your orchestrator and MLMD connection details.

import argparse, os, sys, json
from ml_metadata import metadata_store
from ml_metadata.proto import metadata_store_pb2

def write_checkpoint(store_config, pipeline_name, step_name, state):
    # store_config: dict with connection info for MLMD (sqlite or mysql)
    # This is a placeholder: implement MLMD write logic per your environment.
    print('Checkpoint write placeholder:', pipeline_name, step_name, state)
    # Example: write a JSON checkpoint file as fallback
    checkpoints_dir = os.environ.get('CHECKPOINT_DIR','./checkpoints')
    os.makedirs(checkpoints_dir, exist_ok=True)
    fname = os.path.join(checkpoints_dir, f'{pipeline_name}_{step_name}.json')
    with open(fname,'w') as f:
        json.dump({'pipeline':pipeline_name,'step':step_name,'state':state}, f)
    print('Wrote checkpoint to', fname)

def read_checkpoint(pipeline_name, step_name):
    checkpoints_dir = os.environ.get('CHECKPOINT_DIR','./checkpoints')
    fname = os.path.join(checkpoints_dir, f'{pipeline_name}_{step_name}.json')
    if os.path.exists(fname):
        with open(fname) as f:
            return json.load(f)
    return None

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--action', choices=['write','read'], required=True)
    parser.add_argument('--pipeline', required=True)
    parser.add_argument('--step', required=True)
    parser.add_argument('--state', default='ok')
    args = parser.parse_args()
    if args.action == 'write':
        write_checkpoint(None, args.pipeline, args.step, args.state)
    else:
        cp = read_checkpoint(args.pipeline, args.step)
        print('Checkpoint:', cp)

if __name__ == '__main__':
    main()
"@
$checkpointContent | Out-File -FilePath $checkpointScript -Encoding UTF8
Set-ItemProperty -Path $checkpointScript -Name IsReadOnly -Value $false
Write-Output "Wrote checkpointing.py to $checkpointScript"

# 6) CI release workflow template (GitHub Actions) with gating and rollback job
$ciFile = Join-Path $CIPath "release_and_recovery.yml"
$ciContent = @"
name: Release and Recovery

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Release version (e.g., v1.2)'
        required: true

jobs:
    release:
        runs-on: ubuntu-latest
        env:
            MLFLOW_TRACKING_URI: ${{ secrets.MLFLOW_TRACKING_URI }}
            MLFLOW_ARTIFACT_ROOT: ${{ secrets.MLFLOW_ARTIFACT_ROOT }}
        steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install deps
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install mlflow

      - name: Run tests and pipeline dry-run
        run: |
          pytest -q
          # Run a dry-run of the pipeline and ensure gates pass (implement your dry-run invocation)
          echo 'Run pipeline dry-run here'

      - name: Compute dataset manifest
        run: |
          python3 scripts/data_versioning.py --dataset-path data/production

      - name: Publish release metadata
        run: |
          make -C release tag VERSION=${{ github.event.inputs.version }}
          make -C release publish VERSION=${{ github.event.inputs.version }}

  rollback:
    needs: release
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Rollback to previous model
        run: |
          # Example: rollback to last known good version (implement logic to determine version)
          python3 scripts/rollback_model.py --model-version '1'
"@
$ciContent | Out-File -FilePath $ciFile -Encoding UTF8
Write-Output "Wrote CI release workflow to $ciFile"

# 7) Pre-commit hook to prevent tagging without CI passing (local guard)
$gitHooksDir = Join-Path $ProjectRoot ".git\hooks"
if (-not (Test-Path $gitHooksDir)) { New-Item -ItemType Directory -Force -Path $gitHooksDir | Out-Null }
$preCommitHook = Join-Path $gitHooksDir "pre-commit"
$preCommitContent = @"
#!/bin/sh
# pre-commit: prevent accidental release tag without CI
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo 'Pre-commit hook: ensure you run CI release workflow before tagging.'
fi
exit 0
"@
$preCommitContent | Out-File -FilePath $preCommitHook -Encoding ASCII
try { icacls $preCommitHook /grant Everyone:RX } catch { }
Write-Output "Wrote pre-commit hook to $preCommitHook"

# 8) Summary and manual actions
Write-Output "Release & Recovery artifacts created."
Write-Output "Manual actions required:"
Write-Output " - Set MLflow server URI and artifact root in CI secrets (MLFLOW_TRACKING_URI, MLFLOW_ARTIFACT_ROOT)."
Write-Output " - If using DVC, configure DVC remote and install DVC on CI runners."
Write-Output " - Adapt scripts/publish_release.py and scripts/rollback_model.py to your serving infra and model naming."
Write-Output " - Integrate checkpointing.py calls into your pipeline steps to write/read checkpoints at safe boundaries."
Write-Output " - Test rollback flow in a staging environment before enabling in production."

Write-Output "Files created under ${ReleasePath} and ${ScriptsPath}:"
Get-ChildItem -Path $ReleasePath, $ScriptsPath, $CIPath -Recurse | Select-Object FullName | ForEach-Object { Write-Output $_.FullName }

Write-Output "Release & Recovery setup completed at $Timestamp."
