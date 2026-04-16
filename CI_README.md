# CI: TFMA Gate and Image Build

This repository includes a GitHub Actions workflow that builds the model image, runs TFDV/TFMA evaluation, executes unit tests for the TFMA gate, and enforces TFMA quality gates before pushing images.

## Files of interest
- `.github/workflows/ci-tfx.yml` — CI workflow (build, TFMA gate, unit tests).
- `scripts/tfma_gate.py` — TFMA gating script (compares metrics to thresholds).
- `tests/test_tfma_gate.py` — pytest unit tests for the gating script.
- `tfma-samples/` — sample TFMA JSON metrics used by unit tests.

## Required repository secrets
Set these in **Settings → Secrets**:

- `GCP_SA_KEY` — GCP service account JSON (used for GCR auth and any GCP operations).
- `GCP_PROJECT_ID` — GCP project id (used in image name).
- `IMAGE_NAME` — image repository name (e.g., `tfx-model`).
- `TFMA_THRESHOLDS` — JSON string of metric thresholds, e.g.:
  ```json
  {"accuracy": 0.90, "auc": 0.85}
  ```
