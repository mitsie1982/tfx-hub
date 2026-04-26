# scripts/rollback_model.py
"""
Rollback model registry to a previous version.
Usage: python scripts/rollback_model.py <model_name> <version>
"""
import sys

from mlflow.tracking import MlflowClient

MODEL_NAME = sys.argv[1] if len(sys.argv) > 1 else "tfx_model"
VERSION = sys.argv[2] if len(sys.argv) > 2 else "1"

client = MlflowClient()
client.transition_model_version_stage(
    name=MODEL_NAME, version=VERSION, stage="Production"
)
print(f"Rolled back {MODEL_NAME} to version {VERSION} (Production)")
