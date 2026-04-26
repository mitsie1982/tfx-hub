# scripts/precommit_tfdv.py
"""
Pre-commit hook: Enforce TFDV data validation before commit.
Blocks commit if TFDV detects schema anomalies or data drift.
"""
import os
import sys

import tensorflow_data_validation as tfdv


def main():
    data_dir = os.environ.get("TFDV_DATA_DIR", "data")
    schema_path = os.environ.get("TFDV_SCHEMA", "data/schema.pbtxt")
    csv_files = [
        os.path.join(data_dir, f) for f in os.listdir(data_dir) if f.endswith(".csv")
    ]
    if not csv_files or not os.path.exists(schema_path):
        print("[TFDV] Skipping: No CSV data or schema found.")
        return 0
    stats = tfdv.generate_statistics_from_csv(data_location=csv_files)
    schema = tfdv.load_schema_text(schema_path)
    anomalies = tfdv.validate_statistics(statistics=stats, schema=schema)
    if anomalies.anomaly_info:
        print("[TFDV] Data validation failed. Anomalies detected:")
        print(anomalies)
        return 1
    print("[TFDV] Data validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
