"""
TFX Pipeline Orchestration with Apache Airflow

- Define your pipeline using TFX DSL
- Deploy to Airflow for DAG-based orchestration
- Fill in your pipeline components below
"""

import os

from tfx.orchestration import pipeline
from tfx.orchestration.airflow.airflow_dag_runner import (
    AirflowDagRunner,
    AirflowPipelineConfig,
)

# Example pipeline root and metadata path
PIPELINE_NAME = 'tfx_hub_airflow'
PIPELINE_ROOT = os.path.join('gs://your-bucket/tfx', PIPELINE_NAME)
METADATA_PATH = os.path.join(PIPELINE_ROOT, 'metadata.sqlite')


# Example pipeline components (customize as needed)
from mlmd_setup import get_metadata_connection_config
from tfx.components import CsvExampleGen, Pusher, Trainer
from tfx.proto import trainer_pb2

# Example input data location
DATA_ROOT = os.path.join(os.path.dirname(__file__), 'data', 'train')

example_gen = CsvExampleGen(input_base=DATA_ROOT)
trainer = Trainer(
    module_file=os.path.join(os.path.dirname(__file__), 'trainer_module.py'),
    examples=example_gen.outputs['examples'],
    train_args=trainer_pb2.TrainArgs(num_steps=100),
    eval_args=trainer_pb2.EvalArgs(num_steps=50),
)
pusher = Pusher(
    model=trainer.outputs['model'],
    model_blessing=None,  # Add Evaluator for real use
    push_destination=None,  # Fill for TF-Serving
)

components = [example_gen, trainer, pusher]


def create_pipeline():
    return pipeline.Pipeline(
        pipeline_name=PIPELINE_NAME,
        pipeline_root=PIPELINE_ROOT,
        components=components,
        metadata_connection_config=get_metadata_connection_config(METADATA_PATH),
        enable_cache=True,
        beam_pipeline_args=[],
    )

DAG = AirflowDagRunner(AirflowPipelineConfig()).run(create_pipeline())
