#!/usr/bin/env bash
# tools/check_tfx_hub_stage.sh
# Run from repo root: bash tools/check_tfx_hub_stage.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

# Helper
exists() { [[ -f "$1" || -d "$1" ]]; }
score_item() { $1 && echo 1 || echo 0; }

# Load optional TF_SERVING_URL
if [[ -f "$ENV_FILE" ]]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs) 2>/dev/null || true
fi

echo "TFX Hub Stage Checker"
echo "Repo root: $REPO_ROOT"
echo

# Define checks
declare -A checks

checks[pipeline_py]="$(exists "${REPO_ROOT}/pipelines/tfx_pipeline.py")"
checks[trainer_module]="$(exists "${REPO_ROOT}/modules/trainer.py")"
checks[evaluator]="$(grep -R \"Evaluator(\" -n pipelines 2>/dev/null || true)"
checks[pusher]="$(grep -R \"Pusher(\" -n pipelines 2>/dev/null || true)"
checks[publish_helper]="$(exists "${REPO_ROOT}/deployments/publish_model.py")"
checks[tfserving_k8s]="$(exists "${REPO_ROOT}/k8s/tfserving-deployment.yaml")"
checks[docker_tfserving]="$(exists "${REPO_ROOT}/deployments/Dockerfile.tfserving")"
checks[docker_compose_demo]="$(exists "${REPO_ROOT}/docker-compose.demo.yml")"
checks[seed_demo]="$(exists "${REPO_ROOT}/seed/seed-demo.ts") || $(exists "${REPO_ROOT}/seed/seed-demo.py") || $(exists "${REPO_ROOT}/src/seed/seed-demo.ts")"
checks[ci_workflow]="$(exists "${REPO_ROOT}/.github/workflows/pipeline-ci.yml") || $(exists "${REPO_ROOT}/ci/workflows/pipeline-ci.yml")"
checks[tests]="$(ls tests 2>/dev/null | wc -l || true)"
checks[readme_tfx]="$(exists "${REPO_ROOT}/README_TFX_HUB.md") || $(exists "${REPO_ROOT}/README_DEMO.md")"
checks[tf_serving_url]="${TF_SERVING_URL:-}"

# Stakeholder checklists (each item is a key from checks)
declare -A stakeholders
stakeholders[Contractors]="pipeline_py trainer_module pusher publish_helper tfserving_k8s docker_tfserving tests readme_tfx"
stakeholders[Customers]="pipeline_py evaluator seed_demo docker_compose_demo readme_tfx tests"
stakeholders[Associations]="ci_workflow tfserving_k8s publish_helper readme_tfx"
stakeholders[Members]="pipeline_py trainer_module evaluator seed_demo readme_tfx"
stakeholders[Demo]="docker_compose_demo seed_demo readme_tfx docker_tfserving"

# Map score to stage
stage_from_score() {
  local s=$1
  if (( s >= 90 )); then echo "Production"; return; fi
  if (( s >= 65 )); then echo "MVP"; return; fi
  if (( s >= 35 )); then echo "Prototype"; return; fi
  echo "Idea"
}

# Evaluate each stakeholder
printf "%-14s | %-10s | %-6s | %s\n" "Stakeholder" "Stage" "Score" "Missing indicators"
printf "%s\n" "--------------------------------------------------------------------------"

for key in "${!stakeholders[@]}"; do
  items=${stakeholders[$key]}
  total=0
  present=0
  missing_list=()
  for item in $items; do
    (( total++ ))
    val="${checks[$item]}"
    if [[ -n "$val" && "$val" != "0" ]]; then
      (( present++ ))
    else
      missing_list+=("$item")
    fi
  done
  # Score as percentage
  score=$(( 100 * present / total ))
  stage=$(stage_from_score $score)
  missing_str=$(IFS=, ; echo "${missing_list[*]}")
  printf "%-14s | %-10s | %3s%%  | %s\n" "$key" "$stage" "$score" "$missing_str"
done

echo
echo "Runtime checks"
if [[ -n "${checks[tf_serving_url]}" ]]; then
  echo "TF_SERVING_URL set to $TF_SERVING_URL - attempting health check..."
  if curl -fsS "${TF_SERVING_URL}/v1/models" >/dev/null 2>&1; then
    echo "TF‑Serving reachable"
  else
    echo "TF‑Serving not reachable at $TF_SERVING_URL"
  fi
else
  echo "TF_SERVING_URL not set in .env — skipping TF‑Serving runtime check"
fi

echo
echo "Next steps: review missing indicators per stakeholder and follow README_TFX_HUB.md runbook."
