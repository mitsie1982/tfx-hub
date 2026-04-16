#!/usr/bin/env bash
set -euo pipefail
IMAGE="${1:-}"
if [ -z "$IMAGE" ]; then
  echo "Usage: $0 <image:tag>"
  exit 2
fi
echo "Building Docker image $IMAGE"
docker build -t "$IMAGE" .
echo "Pushing $IMAGE"
docker push "$IMAGE"
