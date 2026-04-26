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
mkdir -p "$OUTPUT"
python - <<PY
import sys
import os
import tensorflow_model_analysis as tfma
import tensorflow as tf

# Example: load model and run evaluation (adapt as needed)
model_path = os.environ.get('MODEL', "${MODEL}")
output_path = os.environ.get('OUTPUT', "${OUTPUT}")

# Placeholder: you must provide your own eval config and data
eval_config = tfma.EvalConfig(
  model_specs=[tfma.ModelSpec(signature_name="serving_default")],
  slicing_specs=[tfma.SlicingSpec()],
  metrics_specs=[tfma.MetricsSpec(metrics=[tfma.MetricConfig(class_name="ExampleCount")])]
)

# Example: use TFRecord as eval data (adapt path as needed)
eval_data_path = os.path.join(output_path, "eval.tfrecord")
if not os.path.exists(eval_data_path):
  print(f"Eval data not found: {eval_data_path}")
  sys.exit(1)

eval_result = tfma.run_model_analysis(
  model_location=model_path,
  data_location=eval_data_path,
  eval_config=eval_config,
  output_path=output_path
)

# Check for anomalies (example: fail if ExampleCount < threshold)
metrics_file = os.path.join(output_path, 'metrics', 'metrics.json')
if os.path.exists(metrics_file):
  import json
  with open(metrics_file) as f:
    metrics = json.load(f)
  # Example: check ExampleCount
  example_count = metrics.get('example_count', {}).get('doubleValue', 0)
  if example_count < 1:
    print("TFMA: No examples found! Failing.")
    sys.exit(1)
  print(f"TFMA: ExampleCount = {example_count}")
else:
  print("TFMA: Metrics file not found, cannot validate.")
  sys.exit(1)

print("TFMA evaluation complete.")
PY
