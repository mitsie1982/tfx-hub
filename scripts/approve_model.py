# scripts/approve_model.py
"""
Approve (transition) a model version in MLflow Model Registry.
Usage: python scripts/approve_model.py <model_name> <version> <stage>
"""
import sys
from mlflow.tracking import MlflowClient

MODEL_NAME = sys.argv[1] if len(sys.argv) > 1 else "tfx_model"
VERSION = sys.argv[2] if len(sys.argv) > 2 else "1"
STAGE = sys.argv[3] if len(sys.argv) > 3 else "Production"

client = MlflowClient()
client.transition_model_version_stage(
    name=MODEL_NAME,
    version=VERSION,
    stage=STAGE
)
print(f"Model {MODEL_NAME} v{VERSION} transitioned to {STAGE}")
