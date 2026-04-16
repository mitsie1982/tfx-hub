#!/usr/bin/env bash
set -euo pipefail
INPUT="${1:-}"
OUTPUT="${2:-tfdv-output}"
BASELINE_SCHEMA="${3:-}"
mkdir -p "$OUTPUT"

python - <<PY
import sys
import tensorflow_data_validation as tfdv
stats = tfdv.generate_statistics_from_tfrecord(data_location="${INPUT}")
schema = tfdv.infer_schema(stats)
tfdv.write_stats_text(stats, f"{OUTPUT}/stats.pbtxt")
tfdv.write_schema_text(schema, f"{OUTPUT}/schema.pbtxt")

exit_code = 0
if "${BASELINE_SCHEMA}":
    baseline_schema = tfdv.load_schema_text("${BASELINE_SCHEMA}")
    anomalies = tfdv.validate_statistics(stats, baseline_schema)
    tfdv.write_anomalies_text(anomalies, f"{OUTPUT}/anomalies.pbtxt")
    if anomalies.anomaly_info:
        print("Schema drift detected! See anomalies.pbtxt.")
        exit_code = 1
    else:
        print("No schema drift detected.")
else:
    print("No baseline schema provided; skipping drift detection.")

print("TFDV done")
sys.exit(exit_code)
PY
