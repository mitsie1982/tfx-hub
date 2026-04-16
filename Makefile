# =========================
# TFX-Hub Automation Engine
# =========================

.PHONY: help setup validate lint test pipeline security clean rollback model-registry drift-check

help:
	@echo "Available commands:"
	@echo "make setup       - Full environment bootstrap"
	@echo "make validate    - Full validation (lint, test, pipeline)"
	@echo "make lint        - Code linting & formatting"
	@echo "make test        - Run all tests"
	@echo "make pipeline    - Run TFX pipeline"
	@echo "make security    - Security checks"
	@echo "make clean       - Cleanup temp/cache"
	@echo "make rollback    - Rollback model"
	@echo "make model-registry - Register model"
	@echo "make drift-check - Drift detection"

# -------------------------
# SETUP
# -------------------------
setup:
	npm ci
	git config core.hooksPath .husky || true

# -------------------------
# VALIDATION (Pre-commit equivalent)
# -------------------------
validate:
	powershell -ExecutionPolicy Bypass -File scripts/validate.ps1

# -------------------------
# LINT
# -------------------------
lint:
	@echo "Running lint + format..."
	black .
	flake8 .

# -------------------------
# TEST
# -------------------------
test:
	@echo "Running tests..."
	pytest tests/

# -------------------------
# PIPELINE
# -------------------------
pipeline:
	powershell -ExecutionPolicy Bypass -File scripts/pipeline.ps1

# -------------------------
# SECURITY
# -------------------------
security:
	powershell -ExecutionPolicy Bypass -File scripts/security.ps1

# -------------------------
# CLEAN
# -------------------------
clean:
	@echo "Cleaning cache..."
	rm -rf __pycache__ .pytest_cache .mypy_cache

# -------------------------
# ROLLBACK
# -------------------------
rollback:
	powershell -ExecutionPolicy Bypass -File scripts/rollback.ps1

model-registry:
	python scripts/register_model.py

drift-check:
	python scripts/drift_detection.py
