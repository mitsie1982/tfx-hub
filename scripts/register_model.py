# scripts/register_model.py
"""
Register and version a model in MLflow Model Registry.
Usage: python scripts/register_model.py <model_path> <model_name>
"""
import sys

import mlflow
import mlflow.tensorflow

MODEL_PATH = sys.argv[1] if len(sys.argv) > 1 else "./model"
MODEL_NAME = sys.argv[2] if len(sys.argv) > 2 else "tfx_model"

with mlflow.start_run(run_name="manual_register"):
    mlflow.tensorflow.log_model(
        tf_saved_model_dir=MODEL_PATH,
        artifact_path="model",
        registered_model_name=MODEL_NAME,
    )
    print(f"Model registered: {MODEL_NAME}")
