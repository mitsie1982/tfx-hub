#!/usr/bin/env bash
# setup_env_for_pipeline.sh
# Sets required environment variables for orchestrator/automation pipeline verification

export ALERTMANAGER_URL="https://your-alertmanager-url"
export PUSHGATEWAY_URL="https://your-pushgateway-url"
export LAUNCHDARKLY_API_TOKEN="your-launchdarkly-token"

echo "[INFO] Environment variables set for pipeline verification."
