
# TFMA imports for EvalConfig
from tensorflow_model_analysis import config as tfma_config
from tensorflow_model_analysis import metrics as tfma_metrics
from tfx.components import (
    CsvExampleGen,
    Evaluator,
    ExampleValidator,
    Pusher,
    SchemaGen,
    StatisticsGen,
    Trainer,
    Transform,
)
from tfx.components.trainer.executor import GenericExecutor
from tfx.dsl.components.base import executor_spec
from tfx.orchestration import metadata, pipeline
from tfx.proto import evaluator_pb2, pusher_pb2, trainer_pb2


def create_pipeline(pipeline_name: str,
                    pipeline_root: str,
                    data_root: str,
                    module_file: str,
                    serving_model_dir: str,
                    metadata_path: str,
                    beam_pipeline_args=None):
    example_gen = CsvExampleGen(input_base=data_root)

    stats_gen = StatisticsGen(examples=example_gen.outputs['examples'])
    schema_gen = SchemaGen(statistics=stats_gen.outputs['statistics'])
    example_validator = ExampleValidator(
        statistics=stats_gen.outputs['statistics'],
        schema=schema_gen.outputs['schema']
    )

    transform = Transform(
        examples=example_gen.outputs['examples'],
        schema=schema_gen.outputs['schema'],
        module_file=module_file
    )

    trainer = Trainer(
        module_file=module_file,
        examples=transform.outputs['transformed_examples'],
        transform_graph=transform.outputs['transform_graph'],
        schema=schema_gen.outputs['schema'],
        train_args=trainer_pb2.TrainArgs(num_steps=1000),
        eval_args=trainer_pb2.EvalArgs(num_steps=200),
        custom_executor_spec=executor_spec.ExecutorClassSpec(GenericExecutor)
    )


    # TFMA EvalConfig with BinaryAccuracy metric
    eval_config = tfma_config.EvalConfig(
        model_specs=[tfma_config.ModelSpec(label_key='label')],
        metrics_specs=[
            tfma_config.MetricsSpec(metrics=[tfma_metrics.MetricConfig(class_name='BinaryAccuracy')])
        ],
        slicing_specs=[tfma_config.SlicingSpec()]
    )

    evaluator = Evaluator(
        examples=example_gen.outputs['examples'],
        model=trainer.outputs['model'],
        eval_config=evaluator_pb2.EvalConfig().FromString(eval_config.SerializeToString())
    )

    pusher = Pusher(
        model=trainer.outputs['model'],
        push_destination=pusher_pb2.PushDestination(
            filesystem=pusher_pb2.PushDestination.Filesystem(
                base_directory=serving_model_dir
            )
        )
    )

    return pipeline.Pipeline(
        pipeline_name=pipeline_name,
        pipeline_root=pipeline_root,
        components=[
            example_gen, stats_gen, schema_gen, example_validator,
            transform, trainer, evaluator, pusher
        ],
        enable_cache=True,
        metadata_connection_config=metadata.sqlite_metadata_connection_config(metadata_path),
        beam_pipeline_args=beam_pipeline_args or []
    )
