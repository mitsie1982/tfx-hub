<<<<<<< HEAD
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
=======
# TFX Hub

Welcome to TFX Hub! This is the main repository for the TFX Hub platform.

## Secret Management Upgrade

See [docs/secret_management_upgrade.md](docs/secret_management_upgrade.md) for the new Azure Key Vault-based secret management, rotation, and recovery process. All secrets must be managed via Key Vault and referenced in CI/CD workflows.

## Documentation

- See the [docs/README.md](docs/README.md) for full documentation and onboarding guides.

## Database Migration: Normalize Entity Names

A migration script is provided to normalize legacy entity names in the `users` table to the new codes:

- `Contractor` → `CCMS`
- `Association` → `AMMS`

To apply this migration, run the SQL in `migrations/20260409_normalize_entity_names.sql` against all relevant databases as part of your deployment pipeline.

Example (psql):

```sh
psql $DATABASE_URL -f migrations/20260409_normalize_entity_names.sql
```

Ensure this step is included in your automated deployment process.

# CI: TFMA Gate and Image Build

This repository includes a GitHub Actions workflow that builds the model image, runs TFDV/TFMA evaluation, executes unit tests for the TFMA gate, and enforces TFMA quality gates before pushing images.

## Files of interest

- `.github/workflows/ci-tfx.yml` — CI workflow (build, TFMA gate, unit tests).
- `scripts/tfma_gate.py` — TFMA gating script (compares metrics to thresholds).
- `tests/test_tfma_gate.py` — pytest unit tests for the gating script.
- `tfma-samples/` — sample TFMA JSON metrics used by unit tests.

## Required repository secrets

Set these in **Settings → Secrets**:

- `GCP_SA_KEY` — GCP service account JSON (used for GCR auth and any GCP operations).
- `GCP_PROJECT_ID` — GCP project id (used in image name).
- `IMAGE_NAME` — image repository name (e.g., `tfx-model`).
- `TFMA_THRESHOLDS` — JSON string of metric thresholds, e.g.:
  ```json
  { "accuracy": 0.9, "auc": 0.85 }
  ```

## Environment Tuning Best Practices

### Python
- Use a `.venv` (virtual environment) per project to avoid global package conflicts and speed up interpreter startup.
- Preinstall heavy packages in your devcontainer or WSL image to avoid reinstalling them in every CI run.

### Node.js
- Use local `node_modules` per project and tools like `nvm` or `Volta` to manage Node versions.
- Preinstall large dependencies in devcontainers or WSL images for faster setup.

### Docker
- Use Docker build cache and multi-stage builds to reduce rebuild time.
- Add `--cache-from` in CI and local scripts to leverage previous build layers.

### WSL2 (Windows)
- Prefer WSL2 for Linux tooling; it’s faster than Windows-native Python for many ML tools.

## Windows Power Mode

- For best development performance on Windows, set your power mode to **Best performance**:
  1. Open the Start menu and type `power`.
  2. Select **Power & sleep settings**.
  3. Under **Related settings**, click **Additional power settings**.
  4. Choose the **High performance** or **Best performance** plan.

This ensures your CPU and disk run at maximum speed during heavy development tasks.

## WSL2 and Docker Desktop Setup

- **Enable WSL2**:
  1. Open PowerShell as Administrator and run:
     ```powershell
     dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
     dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
     ```
  2. Restart your computer.
  3. Install a Linux distribution from the Microsoft Store (e.g., Ubuntu).
  4. Set WSL2 as default:
     ```powershell
     wsl --set-default-version 2
     ```

- **Install Docker Desktop**:
  1. Download and install Docker Desktop for Windows.
  2. In Docker Desktop settings, set the backend to **WSL2**.
  3. Allocate at least **4 CPUs** and **8–10 GB RAM** under Resources > Advanced.

This setup provides optimal performance for development and container workloads on Windows.

## Running a Sample Heavy Task

- To test your system's memory and CPU limits, run the **Sample Heavy Task** from the VS Code task runner.
- Monitor resource usage in Docker Desktop (Dashboard → Containers → Stats), VS Code Process Explorer, or your OS tools (Task Manager, htop, etc.).
- If the task fails or uses too much memory/CPU, increase Docker or devcontainer resource allocations and rerun.
- Script location: `scripts/sample-heavy-task.sh`

## Practical Tip for 16 GB RAM Systems

- Avoid running multiple heavy tasks (e.g., Docker builds, large tests, browsers) at the same time on a 16 GB RAM machine.
- Use a devcontainer or WSL2 to isolate and preinstall dependencies for your project.
- Adjust Docker Desktop settings to allocate sufficient CPU and RAM to your containers.
- These optimizations will make VS Code tasks faster and more reliable, especially on laptops like the Hans notebook.

## Monitoring and Runtime Checks

- Use Task Manager or Resource Monitor (Windows) to watch CPU, memory, and disk usage during heavy tasks.
- In VS Code, use **Help → Open Process Explorer** to identify which extensions or processes are consuming CPU. Disable or uninstall heavy extensions you don’t need.
- Measure and iterate: run a build, note peak memory and CPU usage, then adjust Docker or DevContainer resource allocations accordingly.

## Antivirus Exclusions

- For best performance, exclude your workspace and build folders from antivirus scanning.
  - Example folders to exclude:
    - The full path to your project workspace (e.g., `C:\Users\yourname\workspaces\tfx-hub`)
    - `.venv`, `node_modules`, `dist`, `build`, and Docker volumes
- This reduces file access latency and prevents interference during builds and dependency installs.
- Refer to your antivirus documentation for steps to add exclusions.
>>>>>>> cc1c7797782e87057760a5e8e5bb5fb628d51041
