#!/usr/bin/env python3
"""
tfma_gate.py

Usage:
  python scripts/tfma_gate.py --tfma-dir <tfma_output_dir> --thresholds '{"accuracy":0.9,"auc":0.85}' 

This script attempts to:
 - Load TFMA eval results using tensorflow_model_analysis if available.
 - Fallback: read a JSON metrics file named tfma_metrics.json in the provided directory.
 - Compare specified metric thresholds (per-metric) and exit with non-zero if any metric fails.

CI integration:
 - Provide thresholds via CLI JSON or environment variable TFMA_THRESHOLDS (JSON).
 - Provide TFMA output directory via --tfma-dir or TFMA_OUTPUT_DIR env var.

Notes:
 - TFMA output formats vary. If you use TFMA's eval_result proto, ensure the script can access it.
 - The fallback expects a JSON file with structure:
   {
     "overall": { "accuracy": 0.92, "auc": 0.88 },
     "slices": { "": { "accuracy": 0.92, "auc": 0.88 } }
   }
"""
import argparse
import json
import os
import sys

def load_thresholds(arg_thresholds):
    env = os.environ.get("TFMA_THRESHOLDS")
    if arg_thresholds:
        try:
            return json.loads(arg_thresholds)
        except Exception as e:
            print("Failed to parse thresholds JSON from arg:", e)
            sys.exit(2)
    if env:
        try:
            return json.loads(env)
        except Exception as e:
            print("Failed to parse TFMA_THRESHOLDS env JSON:", e)
            sys.exit(2)
    print("No thresholds provided. Use --thresholds or TFMA_THRESHOLDS env var.")
    sys.exit(2)

def load_tfma_with_api(tfma_dir):
    try:
        import tensorflow_model_analysis as tfma
    except Exception as e:
        print("tensorflow_model_analysis not available:", e)
        return None
    # Try common TFMA eval result file names
    candidates = [
        os.path.join(tfma_dir, "eval_result"),
        os.path.join(tfma_dir, "eval_result.json"),
        os.path.join(tfma_dir, "tfma_eval_result.json"),
    ]
    for c in candidates:
        if os.path.exists(c):
            try:
                # If it's JSON, load and return
                with open(c, "r") as fh:
                    data = json.load(fh)
                    return data
            except Exception:
                pass
    # Try tfma.load_eval_result on directory
    try:
        eval_result = tfma.load_eval_result(tfma_dir)
        # Convert eval_result to a simple dict of overall metrics
        metrics = {}
        # eval_result.slicing_metrics is a dict-like; extract overall slice
        try:
            overall = eval_result.slicing_metrics.get((), {})
            # overall is a dict of metric name -> value or dict
            for k, v in overall.items():
                # v may be a dict with 'doubleValue' or similar; try to extract numeric
                if isinstance(v, (int, float)):
                    metrics[k] = float(v)
                elif isinstance(v, dict):
                    # try common keys
                    for key in ("doubleValue", "value", "floatValue"):
                        if key in v:
                            metrics[k] = float(v[key])
                            break
                else:
                    # skip complex types
                    pass
            return {"overall": metrics}
        except Exception as e:
            print("Could not extract metrics from tfma eval_result:", e)
            return None
    except Exception as e:
        print("tfma.load_eval_result failed:", e)
        return None

def load_fallback_json(tfma_dir):
    # Look for tfma_metrics.json or tfma_output.json
    candidates = ["tfma_metrics.json", "tfma_output.json", "metrics.json"]
    for c in candidates:
        p = os.path.join(tfma_dir, c)
        if os.path.exists(p):
            with open(p, "r") as fh:
                return json.load(fh)
    # Try to find any JSON file in dir and use it
    for fname in os.listdir(tfma_dir):
        if fname.endswith(".json"):
            try:
                with open(os.path.join(tfma_dir, fname), "r") as fh:
                    return json.load(fh)
            except Exception:
                continue
    return None

def extract_overall_metrics(data):
    # Accept multiple shapes; try common keys
    if not data:
        return {}
    if "overall" in data and isinstance(data["overall"], dict):
        return data["overall"]
    # TFMA sometimes stores metrics under 'metrics' or top-level numeric keys
    for key in ("metrics", "overall_metrics", "eval_metrics"):
        if key in data and isinstance(data[key], dict):
            return data[key]
    # If top-level keys are numeric metrics, filter floats
    numeric = {}
    for k, v in data.items():
        if isinstance(v, (int, float)):
            numeric[k] = float(v)
    if numeric:
        return numeric
    # If nested under slices -> "" or "Overall"
    if "slices" in data and "" in data["slices"]:
        s = data["slices"][""]
        if isinstance(s, dict):
            return {k: float(v) for k, v in s.items() if isinstance(v, (int, float))}
    return {}

def compare_metrics(overall_metrics, thresholds):
    failures = []
    for metric, thresh in thresholds.items():
        if metric not in overall_metrics:
            failures.append((metric, None, thresh, "missing"))
            continue
        val = overall_metrics[metric]
        try:
            valf = float(val)
        except Exception:
            failures.append((metric, val, thresh, "non-numeric"))
            continue
        if valf < float(thresh):
            failures.append((metric, valf, thresh, "below"))
    return failures

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tfma-dir", default=os.environ.get("TFMA_OUTPUT_DIR", "tfma-output"), help="TFMA output directory")
    parser.add_argument("--thresholds", default=None, help='JSON string of thresholds, e.g. '{"accuracy":0.9,"auc":0.85}'')
    args = parser.parse_args()

    thresholds = load_thresholds(args.thresholds)
    tfma_dir = args.tfma_dir
    if not os.path.isdir(tfma_dir):
        print("TFMA output directory not found:", tfma_dir)
        sys.exit(2)

    print("Loading TFMA results from:", tfma_dir)
    data = load_tfma_with_api(tfma_dir)
    if data is None:
        print("TFMA API not usable or no eval_result found; trying fallback JSON files.")
        data = load_fallback_json(tfma_dir)
    if data is None:
        print("No TFMA metrics found in", tfma_dir)
        sys.exit(2)

    overall = extract_overall_metrics(data)
    if not overall:
        print("No overall metrics extracted from TFMA output; please ensure TFMA writes a JSON metrics file or use TFMA API.")
        sys.exit(2)

    print("Overall metrics detected:", overall)
    failures = compare_metrics(overall, thresholds)
    if failures:
        print("TFMA gating FAILED. Details:")
        for metric, val, thresh, reason in failures:
            print(f" - {metric}: value={val} threshold={thresh} reason={reason}")
        sys.exit(3)
    print("TFMA gating PASSED. All metrics meet thresholds.")
    sys.exit(0)

if __name__ == "__main__":
    main()
