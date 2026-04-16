from tfx.dsl.components.base import base_component, executor_spec
from tfx.dsl.components.base.base_executor import BaseExecutor


class MyCustomExecutor(BaseExecutor):
    def Do(self, input_dict, output_dict, exec_properties):
        # custom logic: e.g., add metadata, call external service, enrich model
        pass

class MyCustomComponent(base_component.BaseComponent):
    SPEC_CLASS = None  # Replace with your custom spec class
    EXECUTOR_SPEC = executor_spec.ExecutorClassSpec(MyCustomExecutor)
