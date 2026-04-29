#!/bin/bash
# Checks for Terraform/K8s plan files
if [ -f terraform/main.tf ] && [ -f k8s/multi-az-cluster.yaml ]; then
  echo "IaC plan present."
  exit 0
else
  echo "IaC plan missing!"
  exit 1
fi
