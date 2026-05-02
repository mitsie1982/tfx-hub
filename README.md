# TFXHub ML Automation VS Code Extension

This extension provides:
- OpenAI integration using API keys securely retrieved from AWS Secrets Manager
- A command to run completions from the VS Code command palette
- A template for ML workflow automation

## Features
- Command: `TFXHub: Run OpenAI Completion` (find in Command Palette)
- Prompts for AWS secret name and OpenAI prompt
- Displays OpenAI completion result

## Setup
1. Run `npm install` to install dependencies
2. Press `F5` to launch the extension in a new Extension Development Host

## Customization
- Update the OpenAI model or prompt logic in `src/extension.ts`
- Adapt the AWS region or secret name as needed

## Automation Example
See `scripts/openai_aws_secrets_example.py` for a Python automation script using the same secret retrieval logic.

---

Replace placeholders and adapt workflow as needed for your ML automation tasks.

## CI Status

[![Certification Marketplace CI](https://github.com/mitsie1982/tfx-hub/actions/workflows/ci-certification-marketplace.yml/badge.svg?branch=chore/verify-full-pipeline-setup)](https://github.com/mitsie1982/tfx-hub/actions/workflows/ci-certification-marketplace.yml)

---
