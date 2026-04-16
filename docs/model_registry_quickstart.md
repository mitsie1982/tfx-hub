# MLflow Model Registry Quickstart for TFX-Hub

## Why MLflow?
- Lightweight, open-source model registry
- Track model versions, metadata, and approval status
- Integrates with TFX, scikit-learn, TensorFlow, PyTorch, etc.
- UI and REST API for governance

---

## 1. Install MLflow

Add to requirements.txt:
```
mlflow==2.11.3
```

Or install manually:
```bash
pip install mlflow==2.11.3
```

---

## 2. Start MLflow Tracking Server (local dev)
```bash
mlflow server --backend-store-uri sqlite:///mlflow.db --default-artifact-root ./mlruns --host 0.0.0.0 --port 5000
```

- UI: http://localhost:5000
- Models/metadata stored in ./mlruns

---

## 3. Register and Version Models in Pipeline

Example (Python):
```python
import mlflow
import mlflow.tensorflow

with mlflow.start_run(run_name="tfx_pipeline_run"):
    # Log model artifact
    mlflow.tensorflow.log_model(tf_model, "model", registered_model_name="tfx_model")
    # Log metrics/params
    mlflow.log_metric("accuracy", accuracy)
    mlflow.log_param("data_version", data_version)
```

---

## 4. Track Approval Status
- In UI: Set model stage (Staging, Production, Archived)
- Or via API:
```python
from mlflow.tracking import MlflowClient
client = MlflowClient()
client.transition_model_version_stage(
    name="tfx_model", version=1, stage="Production"
)
```

---

## 5. Store Metadata
- Use `mlflow.log_param`, `mlflow.log_metric`, `mlflow.set_tags` for metadata
- All runs and models are versioned and queryable

---

## 6. Vertex AI (Optional, for GCP)
- Vertex AI Model Registry is cloud-native, integrates with GCP pipelines
- See: https://cloud.google.com/vertex-ai/docs/model-registry

---

## References
- [MLflow Model Registry Docs](https://mlflow.org/docs/latest/model-registry.html)
- [MLflow Python API](https://mlflow.org/docs/latest/python_api/mlflow.html)
- [Vertex AI Model Registry](https://cloud.google.com/vertex-ai/docs/model-registry)
