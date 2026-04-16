# File: phase4_observability_setup.ps1
# Purpose: Add Phase 4 observability artifacts: structured JSON logging, metrics helpers, Prometheus/Grafana stack, CI hooks, and runbook stubs.
# Edit variables below before running.

$ProjectRoot = "C:\path\to\your\TFXHubProject"    # <-- set your project path
$SLMPath = Join-Path $ProjectRoot "slm"
$PipelinesPath = Join-Path $SLMPath "pipelines"
$ScriptsPath = Join-Path $ProjectRoot "scripts"
$MonitoringPath = Join-Path $ProjectRoot "monitoring"
$CIPath = Join-Path $ProjectRoot ".github\workflows"
$DockerComposePath = Join-Path $MonitoringPath "docker"
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")

# Safety checks
if (-not (Test-Path $ProjectRoot)) { Write-Error "Project root $ProjectRoot not found. Edit script and re-run."; exit 1 }

# Create directories
New-Item -ItemType Directory -Force -Path $PipelinesPath | Out-Null
New-Item -ItemType Directory -Force -Path $ScriptsPath | Out-Null
New-Item -ItemType Directory -Force -Path $MonitoringPath | Out-Null
New-Item -ItemType Directory -Force -Path $DockerComposePath | Out-Null
New-Item -ItemType Directory -Force -Path $CIPath | Out-Null

Write-Output "Creating Phase 4 observability artifacts..."

# 1) Structured logging config for Python using structlog and python-json-logger
$loggingFile = Join-Path $ScriptsPath "logging_config.py"
$loggingContent = @"
# logging_config.py
# Structured JSON logging configuration using structlog and python-json-logger
import logging
import structlog
from pythonjsonlogger import jsonlogger

def configure_logging(service_name='tfx_hub_service', level=logging.INFO):
    # Standard logging handler with JSON formatter
    handler = logging.StreamHandler()
    formatter = jsonlogger.JsonFormatter('%(asctime)s %(levelname)s %(name)s %(message)s %(service)s %(run_id)s')
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = []
    root.addHandler(handler)

    # structlog configuration
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt='iso'),
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer()
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # attach service metadata to root logger
    root = structlog.get_logger()
    root = root.bind(service=service_name)
    return root
"@
$loggingContent | Out-File -FilePath $loggingFile -Encoding UTF8
Write-Output "Wrote structured logging config to $loggingFile"

# 2) Metrics helper using prometheus_client
$metricsFile = Join-Path $ScriptsPath "metrics_helper.py"
$metricsContent = @"
# metrics_helper.py
# Prometheus metrics helper for pipelines and model runs
from prometheus_client import Counter, Histogram, Gauge, start_http_server
import time
import os

# Metrics
PIPELINE_RUNS = Counter('tfx_pipeline_runs_total', 'Total number of pipeline runs', ['pipeline'])
PIPELINE_FAILURES = Counter('tfx_pipeline_failures_total', 'Total number of failed pipeline runs', ['pipeline'])
PIPELINE_DURATION = Histogram('tfx_pipeline_duration_seconds', 'Pipeline run duration seconds', ['pipeline'])
DATA_VOLUME = Gauge('tfx_data_volume_bytes', 'Data volume processed in bytes', ['pipeline'])

def start_metrics_server(port=8000):
    # Start Prometheus metrics HTTP server
    start_http_server(port)
    print(f'Prometheus metrics server started on port {port}')

# Context manager for timing pipeline runs
from contextlib import contextmanager
@contextmanager
def track_pipeline_run(pipeline_name):
    start = time.time()
    PIPELINE_RUNS.labels(pipeline=pipeline_name).inc()
    try:
        yield
    except Exception as e:
        PIPELINE_FAILURES.labels(pipeline=pipeline_name).inc()
        raise
    finally:
        duration = time.time() - start
        PIPELINE_DURATION.labels(pipeline=pipeline_name).observe(duration)
"@
$metricsContent | Out-File -FilePath $metricsFile -Encoding UTF8
Write-Output "Wrote metrics helper to $metricsFile"

# 3) Example integration snippet for pipeline code to use logging and metrics
$integrationFile = Join-Path $PipelinesPath "observability_integration_example.py"
$integrationContent = @"
# observability_integration_example.py
# Example showing how to use logging_config and metrics_helper in pipeline code
from scripts.logging_config import configure_logging
from scripts.metrics_helper import start_metrics_server, track_pipeline_run
import os
import time

logger = configure_logging(service_name='tfx_pipeline_example')
start_metrics_server(port=int(os.environ.get('METRICS_PORT', 8000)))

def run_pipeline():
    with track_pipeline_run('slm_pipeline'):
        logger.info('pipeline_start', run_id='run-123', details='Starting pipeline run')
        # Simulate work
        time.sleep(2)
        # Example of logging an error
        try:
            # placeholder for pipeline step
            pass
        except Exception as e:
            logger.error('pipeline_step_error', error=str(e))
            raise
        logger.info('pipeline_end', run_id='run-123', details='Pipeline completed successfully')

if __name__ == '__main__':
    run_pipeline()
"@
$integrationContent | Out-File -FilePath $integrationFile -Encoding UTF8
Write-Output "Wrote observability integration example to $integrationFile"

# 4) Docker Compose for Prometheus and Grafana lightweight stack
$dockerComposeFile = Join-Path $DockerComposePath "docker-compose.yml"
$prometheusConfigFile = Join-Path $DockerComposePath "prometheus.yml"
$dockerComposeContent = @"
version: '3.7'
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports:
      - '9090:9090'
  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - '3000:3000'
    depends_on:
      - prometheus
"@
$prometheusConfigContent = @"
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'tfx_hub'
    static_configs:
      - targets: ['host.docker.internal:8000']  # metrics_helper default
"@
$dockerComposeContent | Out-File -FilePath $dockerComposeFile -Encoding UTF8
$prometheusConfigContent | Out-File -FilePath $prometheusConfigFile -Encoding UTF8
Write-Output "Wrote docker-compose and Prometheus config to $DockerComposePath"

# 5) CI workflow snippet to scrape metrics and fail on high failure rate or long duration
$ciFile = Join-Path $CIPath "observability_ci_checks.yml"
$ciContent = @"
name: Observability CI Checks

on:
  schedule:
    - cron: '0 * * * *'  # hourly check
  workflow_dispatch:

jobs:
  observability-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install prometheus-client requests

      - name: Query metrics and enforce simple thresholds
        run: |
          python - <<'PY'
import requests, os, sys
PROM_URL = os.environ.get('PROM_URL','http://localhost:9090')
# Example PromQL queries to check pipeline failures and duration
# MANUAL: Replace with your Prometheus endpoint and adjust thresholds
failure_query = 'increase(tfx_pipeline_failures_total[1h])'
duration_query = 'histogram_quantile(0.95, sum(rate(tfx_pipeline_duration_seconds_bucket[5m])) by (le))'
try:
    r = requests.get(f'{PROM_URL}/api/v1/query', params={'query': failure_query}, timeout=10)
    data = r.json()
    failures = float(data['data']['result'][0]['value'][1]) if data['data']['result'] else 0.0
    print('Failures in last hour:', failures)
    if failures > 0:
        print('Observability check failed: pipeline failures detected')
        sys.exit(2)
except Exception as e:
    print('Prometheus query failed', e)
    sys.exit(1)
PY
"@
$ciContent | Out-File -FilePath $ciFile -Encoding UTF8
Write-Output "Wrote CI observability checks workflow to $ciFile"

# 6) Monitoring and runbook stub
$monitoringFile = Join-Path $MonitoringPath "observability_runbook.md"
$monitoringContent = @"
# Observability and Operations Runbook

## Structured Logging
- All pipeline and model run logs must be JSON structured.
- Use scripts/logging_config.py to configure loggers.
- Key fields to include: timestamp, level, service, run_id, pipeline_step, message, error.

## Metrics
- Metrics endpoint default: http://<host>:8000/metrics
- Metrics to track:
  - tfx_pipeline_runs_total
  - tfx_pipeline_failures_total
  - tfx_pipeline_duration_seconds
  - tfx_data_volume_bytes

## Monitoring Stack
- Local dev stack: monitoring/docker/docker-compose.yml
- Prometheus UI: http://localhost:9090
- Grafana UI: http://localhost:3000 (admin/admin)

## Alerts
- Alert on any pipeline failure count > 0 in last hour.
- Alert on 95th percentile pipeline duration > configured threshold.

## Troubleshooting
- If metrics missing, ensure metrics server started in pipeline code.
- If logs are not JSON, verify logging_config.py is imported at process start.
"@
$monitoringContent | Out-File -FilePath $monitoringFile -Encoding UTF8
Write-Output "Wrote observability runbook to $monitoringFile"

# 7) Add small helper script to start local monitoring stack
$startStack = Join-Path $DockerComposePath "start_monitoring.sh"
$startStackContent = @"
#!/bin/bash
# start_monitoring.sh
# Start Prometheus and Grafana for local development
docker-compose up -d
echo 'Prometheus available at http://localhost:9090'
echo 'Grafana available at http://localhost:3000 (admin/admin)'
"@
$startStackContent | Out-File -FilePath $startStack -Encoding UTF8
Set-ItemProperty -Path $startStack -Name IsReadOnly -Value $false
Write-Output "Wrote start script to $startStack"

# 8) Add pre-commit hook to ensure logging and metrics helpers are present
$gitHooksDir = Join-Path $ProjectRoot ".git\hooks"
if (-not (Test-Path $gitHooksDir)) { New-Item -ItemType Directory -Force -Path $gitHooksDir | Out-Null }
$preCommitHook = Join-Path $gitHooksDir "pre-commit"
$preCommitContent = @"
#!/bin/sh
# pre-commit: ensure observability artifacts exist
if [ ! -f scripts/logging_config.py ]; then
  echo 'Error: scripts/logging_config.py missing. Add it before committing.'
  exit 1
fi
if [ ! -f scripts/metrics_helper.py ]; then
  echo 'Error: scripts/metrics_helper.py missing. Add it before committing.'
  exit 1
fi
exit 0
"@
$preCommitContent | Out-File -FilePath $preCommitHook -Encoding ASCII
try { icacls $preCommitHook /grant Everyone:RX } catch { }
Write-Output "Wrote pre-commit hook to $preCommitHook"

# 9) Summary output
Write-Output "Phase 4 observability artifacts created at $Timestamp."
Write-Output "Files created:"
Get-ChildItem -Path $ScriptsPath, $PipelinesPath, $MonitoringPath, $CIPath -Recurse | Select-Object FullName | ForEach-Object { Write-Output $_.FullName }

Write-Output "Manual actions required after running this script:"
Write-Output " - Add prometheus-client, structlog, python-json-logger to requirements.txt and install dependencies."
Write-Output " - If running monitoring stack in cloud, adapt docker-compose to your environment or deploy Prometheus/Grafana via IaC."
Write-Output " - Update pipeline code to import scripts/logging_config.py and scripts/metrics_helper.py and start metrics server."
Write-Output " - Configure Grafana dashboards and alerts; import metrics and create panels for pipeline duration, failures, and data volume."
Write-Output " - Add Prometheus endpoint URL to CI secrets if using remote Prometheus."
