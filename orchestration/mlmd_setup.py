"""
MLMD (ML Metadata) Integration Stub

- Configure and connect to MLMD for pipeline lineage and artifact tracking
- Used by both Airflow and Vertex orchestrators
"""

from tfx.orchestration.metadata import sqlite_metadata_connection_config


# Example: SQLite metadata store (for demo/dev)
def get_metadata_connection_config(metadata_path):
    return sqlite_metadata_connection_config(metadata_path)

# For production, use MySQL or other supported backends
# See: https://www.tensorflow.org/tfx/guide/mlmd#using_mysql_metadata_store
