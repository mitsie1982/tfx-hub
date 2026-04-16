#!/usr/bin/env bash
set -euo pipefail

# bootstrap-tfx-automation.sh
# Creates:
#  - GitHub Actions CI for TFDV/TFMA + Docker image build/push
#  - Helm chart for model serving with canary rollout + rollback hooks
#  - Argo/Vertex example manifests for pipeline deployment
#  - Prometheus alert rules and Grafana dashboard template
#
# Usage:
#   chmod +x bootstrap-tfx-automation.sh
#   ./bootstrap-tfx-automation.sh
#
# After running: edit files to set registry, project IDs, credentials, and thresholds.

WORKDIR="$(pwd)"
timestamp() { date +%Y%m%d%H%M%S; }
bak() {
  local f="$1"
  if [ -f "$f" ]; then
    cp -a "$f" "${f}.bak.$(timestamp)"
    echo "Backed up $f -> ${f}.bak.$(timestamp)"
  fi
}

confirm() {
  read -r -p "$1 [Y/n] " ans
  ans="${ans:-Y}"
  case "$ans" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

echo "This script will create CI, deployment, and monitoring templates in: $WORKDIR"
if ! confirm "Continue?"; then
  echo "Aborted."
  exit 0
fi

# Create directories
mkdir -p .github/workflows k8s/helm/orchestrator-model k8s/argo monitoring scripts

# -------------------------
# 1) GitHub Actions CI
# -------------------------
CI_FILE=".github/workflows/ci-tfx.yml"
bak "$CI_FILE"
cat > "$CI_FILE" <<'YAML'
name: TFX CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

env:
  # Set these in repository secrets or override in workflow_dispatch inputs
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  GCR_HOST: gcr.io
  IMAGE_NAME: ${{ secrets.IMAGE_NAME }}
  IMAGE_TAG: ${{ github.sha }}
  TF_ENV: "ci"

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      image: ${{ steps.build-image.outputs.image }}
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
          pip install tfx==1.12.0 tensorflow-data-validation tensorflow-model-analysis google-cloud-storage

      - name: Run TFDV (data validation)
        env:
          BUCKET: ${{ secrets.GCS_BUCKET }}
        run: |
          # run-tfdv.sh should accept dataset path and output path; adapt as needed
          bash scripts/run-tfdv.sh --input gs://${{ secrets.GCS_BUCKET }}/data/train --output tfdv-output || true

      - name: Run TFMA (model analysis)
        run: |
          # run-tfma.sh should accept model path and eval config; adapt as needed
          bash scripts/run-tfma.sh --model-path gs://${{ secrets.GCS_BUCKET }}/models/latest --output tfma-output || true

      - name: Build and push Docker image
        id: build-image
        env:
          GCR_HOST: ${{ env.GCR_HOST }}
          IMAGE_NAME: ${{ env.IMAGE_NAME }}
          IMAGE_TAG: ${{ env.IMAGE_TAG }}
        run: |
          bash scripts/build-and-push.sh "${GCR_HOST}/${PROJECT_ID}/${IMAGE_NAME}:${IMAGE_TAG}"
        # Note: configure GCP auth via secrets (GCP_SA_KEY) and actions/setup-gcloud if needed

  integration-tests:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Run integration tests
        run: |
          # Example: run a lightweight pipeline integration test using the built image
          echo "Running integration tests (placeholder)"
          # Add commands to run pipeline with test dataset and assert outputs
YAML

echo "Wrote $CI_FILE"

# -------------------------
# 2) Helper scripts
# -------------------------
cat > scripts/build-and-push.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
IMAGE="${1:-}"
if [ -z "$IMAGE" ]; then
  echo "Usage: $0 <image:tag>"
  exit 2
fi
echo "Building Docker image $IMAGE"
docker build -t "$IMAGE" .
echo "Pushing $IMAGE"
docker push "$IMAGE"
SH
chmod +x scripts/build-and-push.sh
echo "Wrote scripts/build-and-push.sh"

cat > scripts/run-tfdv.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
# Minimal wrapper: adapt to your TFDV pipeline
while [[ $# -gt 0 ]]; do
  case $1 in
    --input) INPUT="$2"; shift 2;;
    --output) OUTPUT="$2"; shift 2;;
    *) shift;;
  esac
done
echo "Running TFDV on $INPUT -> $OUTPUT"
python - <<PY
import tensorflow_data_validation as tfdv
import sys
input_path = "${INPUT}"
stats = tfdv.generate_statistics_from_tfrecord(data_location=input_path)
schema = tfdv.infer_schema(stats)
tfdv.write_stats_text(stats, "${OUTPUT}/stats.pbtxt")
tfdv.write_schema_text(schema, "${OUTPUT}/schema.pbtxt")
print("TFDV done")
PY
SH
chmod +x scripts/run-tfdv.sh
echo "Wrote scripts/run-tfdv.sh"

cat > scripts/run-tfma.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
# Minimal wrapper: adapt to your TFMA evaluation
while [[ $# -gt 0 ]]; do
  case $1 in
    --model-path) MODEL="$2"; shift 2;;
    --output) OUTPUT="$2"; shift 2;;
    *) shift;;
  esac
done
echo "Running TFMA on $MODEL -> $OUTPUT"
python - <<PY
import tensorflow_model_analysis as tfma
import sys
# Placeholder: adapt to your eval config and data
print("TFMA placeholder - implement evaluation logic here")
PY
SH
chmod +x scripts/run-tfma.sh
echo "Wrote scripts/run-tfma.sh"

# -------------------------
# 3) Helm chart for canary + rollback
# -------------------------
HELM_DIR="k8s/helm/orchestrator-model"
mkdir -p "$HELM_DIR/templates"
bak "$HELM_DIR/Chart.yaml"
cat > "$HELM_DIR/Chart.yaml" <<'YAML'
apiVersion: v2
name: orchestrator-model
description: Model serving chart with canary rollout and rollback hooks
type: application
version: 0.1.0
appVersion: "1.0"
YAML

cat > "$HELM_DIR/values.yaml" <<'YAML'
replicaCount: 2
image:
  repository: gcr.io/PROJECT/IMAGE
  tag: latest
service:
  type: ClusterIP
  port: 80
canary:
  enabled: true
  initialWeight: 10
  stepWeight: 30
  maxWeight: 100
  analysisIntervalSeconds: 60
  rollbackOnError: true
resources: {}
YAML

# Deployment template (uses annotations for Istio/Flagger or K8s service mesh)
cat > "$HELM_DIR/templates/deployment.yaml" <<'YAML'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "orchestrator-model.fullname" . }}
  labels:
    app: {{ include "orchestrator-model.name" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ include "orchestrator-model.name" . }}
  template:
    metadata:
      labels:
        app: {{ include "orchestrator-model.name" . }}
    spec:
      containers:
        - name: model
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          ports:
            - containerPort: 8080
          resources: {{ toYaml .Values.resources | nindent 12 }}
YAML

# Service
cat > "$HELM_DIR/templates/service.yaml" <<'YAML'
apiVersion: v1
kind: Service
metadata:
  name: {{ include "orchestrator-model.fullname" . }}
spec:
  type: {{ .Values.service.type }}
  ports:
    - port: {{ .Values.service.port }}
      targetPort: 8080
  selector:
    app: {{ include "orchestrator-model.name" . }}
YAML

# Canary manifest (example using Flagger CRD)
cat > "$HELM_DIR/templates/canary.yaml" <<'YAML'
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: {{ include "orchestrator-model.fullname" . }}
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "orchestrator-model.fullname" . }}
  service:
    port: {{ .Values.service.port }}
  analysis:
    interval: {{ .Values.canary.analysisIntervalSeconds }}s
    threshold: 5
    maxWeight: {{ .Values.canary.maxWeight }}
    stepWeight: {{ .Values.canary.stepWeight }}
    metrics:
      - name: request-success-rate
        threshold: 99
      - name: request-duration
        threshold: 500
    webhooks:
      - name: rollback
        type: pre-rollout
        url: http://example.com/rollback-hook
YAML

# Notes file for Helm usage
cat > "$HELM_DIR/README.md" <<'MD'
Helm chart for model serving with canary rollout.

Usage:
  helm install my-model ./orchestrator-model --set image.repository=gcr.io/PROJECT/IMAGE --set image.tag=TAG

This chart includes a Flagger Canary manifest. Install Flagger and a service mesh (Istio/Contour/NGINX+Gateway) for canary traffic shifting.
MD
MD

echo "Wrote Helm chart to $HELM_DIR"

# -------------------------
# 4) Argo/Vertex pipeline manifests (examples)
# -------------------------
ARGO_DIR="k8s/argo"
mkdir -p "$ARGO_DIR"
cat > "$ARGO_DIR/pipeline-template.yaml" <<'YAML'
# Example Argo Workflow template to run a TFX pipeline container image
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: tfx-pipeline-
spec:
  entrypoint: tfx-pipeline
  templates:
    - name: tfx-pipeline
      steps:
        - - name: run-pipeline
            template: run-pipeline
    - name: run-pipeline
      container:
        image: gcr.io/PROJECT/IMAGE:TAG
        command: ["/bin/sh", "-c"]
        args: ["python -m my_pipeline.run --pipeline-root gs://BUCKET/pipelines/run-{{workflow.creationTimestamp}}"]
YAML

cat > "$ARGO_DIR/vertex-deploy-example.yaml" <<'YAML'
# Example Vertex AI deployment manifest (conceptual)
# Use gcloud or Terraform to create Vertex Pipelines and endpoints.
# This file is a placeholder showing required fields.
apiVersion: v1
kind: ConfigMap
metadata:
  name: vertex-deploy-example
data:
  note: |
    Use gcloud ai-platform or Vertex Pipelines SDK to submit pipelines.
    Example:
      gcloud ai pipelines run --pipeline-file=compiled_pipeline.json --project=PROJECT_ID --region=REGION
YAML

echo "Wrote Argo/Vertex example manifests to $ARGO_DIR"

# -------------------------
# 5) Monitoring: Prometheus rules + Grafana dashboard
# -------------------------
PROM_RULES="monitoring/prometheus-rules.yml"
bak "$PROM_RULES"
cat > "$PROM_RULES" <<'YAML'
groups:
- name: model-slo.rules
  rules:
  - alert: ModelLatencyHigh
    expr: histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="model-server"}[5m])) by (le)) > 0.5
    for: 5m
    labels:
      severity: page
    annotations:
      summary: "Model 95th percentile latency is high"
      description: "95th percentile latency > 0.5s for 5m"

  - alert: ModelErrorRateHigh
    expr: sum(rate(http_requests_total{job="model-server",status=~"5.."}[5m])) / sum(rate(http_requests_total{job="model-server"}[5m])) > 0.01
    for: 5m
    labels:
      severity: page
    annotations:
      summary: "Model error rate high"
      description: "Error rate > 1% for 5m"

  - alert: DataDriftDetected
    expr: increase(data_drift_events_total{job="data-monitor"}[1h]) > 0
    for: 0m
    labels:
      severity: warning
    annotations:
      summary: "Data drift detected"
      description: "Data drift events detected in the last hour"
YAML

echo "Wrote $PROM_RULES"

GRAFANA_DASH="monitoring/grafana-dashboard.json"
bak "$GRAFANA_DASH"
cat > "$GRAFANA_DASH" <<'JSON'
{
  "annotations": { "list": [] },
  "panels": [
    {
      "type": "graph",
      "title": "Request Throughput",
      "targets": [{ "expr": "sum(rate(http_requests_total{job=\"model-server\"}[1m]))" }]
    },
    {
      "type": "graph",
      "title": "95th Percentile Latency",
      "targets": [{ "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"model-server\"}[5m])) by (le))" }]
    },
    {
      "type": "graph",
      "title": "Error Rate",
      "targets": [{ "expr": "sum(rate(http_requests_total{job=\"model-server\",status=~\"5..\"}[5m])) / sum(rate(http_requests_total{job=\"model-server\"}[5m]))" }]
    },
    {
      "type": "graph",
      "title": "Data Drift Events",
      "targets": [{ "expr": "increase(data_drift_events_total{job=\"data-monitor\"}[1h])" }]
    }
  ],
  "title": "Model SLOs Dashboard",
  "schemaVersion": 16
}
JSON

echo "Wrote Grafana dashboard template to $GRAFANA_DASH"

# -------------------------
# 6) Canary deploy helper script
# -------------------------
cat > scripts/deploy-canary.sh <<'SH'
#!/usr/bin/env bash
set -euo pipefail
# deploy-canary.sh <helm-release> <chart-dir> <image>
RELEASE="${1:-my-model}"
CHART="${2:-k8s/helm/orchestrator-model}"
IMAGE="${3:-gcr.io/PROJECT/IMAGE:TAG}"
echo "Deploying canary: release=$RELEASE chart=$CHART image=$IMAGE"
helm upgrade --install "$RELEASE" "$CHART" --set image.repository="$(echo $IMAGE | cut -d: -f1)" --set image.tag="$(echo $IMAGE | cut -d: -f2)"
echo "If using Flagger, ensure Flagger is installed and configured for your mesh. Flagger will perform the canary analysis and rollout."
SH
chmod +x scripts/deploy-canary.sh
echo "Wrote scripts/deploy-canary.sh"

# -------------------------
# 7) Git ignore additions
# -------------------------
GITIGNORE=".gitignore"
if [ -f "$GITIGNORE" ]; then
  if ! grep -q "^.logs" "$GITIGNORE"; then
    echo ".logs" >> "$GITIGNORE"
    echo "Appended .logs to $GITIGNORE"
  fi
else
  cat > "$GITIGNORE" <<'TXT'
node_modules
.logs
*.bak.*
TXT
  echo "Created $GITIGNORE"
fi

# -------------------------
# 8) Final notes file
# -------------------------
cat > TFX_AUTOMATION_README.md <<'MD'
TFX Automation Bootstrap

Files created:
 - .github/workflows/ci-tfx.yml
 - scripts/{build-and-push.sh,run-tfdv.sh,run-tfma.sh,deploy-canary.sh}
 - k8s/helm/orchestrator-model (Helm chart with canary manifest)
 - k8s/argo (example Argo/Vertex manifests)
 - monitoring/{prometheus-rules.yml,grafana-dashboard.json}
 - .gitignore updated to ignore .logs

Action items (must complete before use):
 - Set repository secrets: GCP_PROJECT_ID, GCS_BUCKET, IMAGE_NAME, GCP_SA_KEY (or configure cloud auth)
 - Edit .github/workflows/ci-tfx.yml to match your TFX versions and pipeline entrypoints
 - Configure Docker registry and authentication for build-and-push.sh
 - Install Flagger and a service mesh (Istio/Contour/NGINX+Gateway) if you want automated canary rollouts
 - Import Grafana dashboard JSON into your Grafana instance and add Prometheus as a data source
 - Tune Prometheus alert thresholds to match your SLOs

Security:
 - Store credentials in GitHub Secrets or your CI secret store
 - Do not commit service account keys to the repo

MD

echo "Wrote TFX_AUTOMATION_README.md"

echo
echo "Bootstrap complete. Review and adapt the generated files before running CI or deploying."
echo "Key next steps:"
echo " - Configure secrets and registry values"
echo " - Validate TFDV/TFMA scripts against your data and model"
echo " - Install Flagger and a service mesh for canary rollouts, or adapt the Helm chart to your deployment method"
echo " - Import Grafana dashboard and load Prometheus rules into your monitoring stack"
