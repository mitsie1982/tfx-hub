#!/usr/bin/env python3
"""
TFMA gating script

Usage:
  python scripts/tfma_gate.py --tfma-dir <dir> --thresholds '{"accuracy":0.9,"auc":0.85}'

Behavior:
 - Loads a JSON metrics file from the TFMA output directory (tfma_metrics.json or any .json)
 - Extracts overall metrics and compares them to thresholds
 - Exits 0 if all metrics meet or exceed thresholds; non-zero otherwise
"""
import argparse
import json
import os
import sys

def load_metrics(tfma_dir):
    # Look for common filenames
    candidates = ["tfma_metrics.json", "tfma_output.json", "metrics.json", "tfma_metrics_overall.json"]
    for c in candidates:
        p = os.path.join(tfma_dir, c)
        if os.path.exists(p):
            with open(p, "r") as fh:
                return json.load(fh)
    # fallback: first JSON file in directory
    for fname in os.listdir(tfma_dir):
        if fname.endswith(".json"):
            try:
                with open(os.path.join(tfma_dir, fname), "r") as fh:
                    return json.load(fh)
            except Exception:
                continue
    return None

def extract_overall(metrics_json):
    # Accept multiple shapes; prefer metrics_json["overall"]
    if not metrics_json:
        return {}
    if isinstance(metrics_json, dict):
        if "overall" in metrics_json and isinstance(metrics_json["overall"], dict):
            return metrics_json["overall"]
        # sometimes top-level numeric keys
        numeric = {k: v for k, v in metrics_json.items() if isinstance(v, (int, float))}
        if numeric:
            return numeric
        # nested under "metrics" or "eval_metrics"
        for key in ("metrics", "eval_metrics"):
            if key in metrics_json and isinstance(metrics_json[key], dict):
                return metrics_json[key]
    return {}

def compare(overall, thresholds):
    failures = []
    for metric, thresh in thresholds.items():
        if metric not in overall:
            failures.append((metric, None, thresh, "missing"))
            continue
        try:
            val = float(overall[metric])
        except Exception:
            failures.append((metric, overall[metric], thresh, "non-numeric"))
            continue
        if val < float(thresh):
            failures.append((metric, val, thresh, "below"))
    return failures

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tfma-dir", default=os.environ.get("TFMA_OUTPUT_DIR", "tfma-output"))
    parser.add_argument("--thresholds", default=os.environ.get("TFMA_THRESHOLDS", None),
                        help="JSON string of thresholds, e.g. '{\"accuracy\":0.9,\"auc\":0.85}'")
    args = parser.parse_args()

    if not args.thresholds:
        print("No thresholds provided. Set --thresholds or TFMA_THRESHOLDS env var.")
        sys.exit(2)
    try:
        thresholds = json.loads(args.thresholds)
    except Exception as e:
        print("Failed to parse thresholds JSON:", e)
        sys.exit(2)

    tfma_dir = args.tfma_dir
    if not os.path.isdir(tfma_dir):
        print("TFMA output directory not found:", tfma_dir)
        sys.exit(2)

    metrics_json = load_metrics(tfma_dir)
    if metrics_json is None:
        print("No TFMA JSON metrics found in", tfma_dir)
        sys.exit(2)

    overall = extract_overall(metrics_json)
    if not overall:
        print("No overall metrics extracted; ensure TFMA writes a JSON metrics file with 'overall' or numeric keys.")
        sys.exit(2)

    failures = compare(overall, thresholds)
    if failures:
        print("TFMA gating FAILED. Details:")
        for metric, val, thresh, reason in failures:
            print(f" - {metric}: value={val} threshold={thresh} reason={reason}")
        sys.exit(3)
    print("TFMA gating PASSED. All metrics meet thresholds.")
    sys.exit(0)

if __name__ == "__main__":
    main()
