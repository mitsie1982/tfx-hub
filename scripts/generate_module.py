# scripts/generate_module.py
"""
AI Task Runner: Generate code modules using standardized prompts.
Usage: python scripts/generate_module.py <module_name> <task_type>
Task types: codegen, refactor, testgen
"""
import sys
import os
from datetime import datetime

PROMPT_LIBRARY = {
    "codegen": "You are an expert developer. Generate a production-ready {module} module with clear structure, docstrings, and error handling.",
    "refactor": "You are a senior engineer. Refactor the {module} module for clarity, maintainability, and performance. Include comments on changes.",
    "testgen": "You are a test automation specialist. Generate comprehensive unit tests for the {module} module, covering edge cases and error handling."
}

PROMPT_VERSION = "v1.0.0"

MODULE = sys.argv[1] if len(sys.argv) > 1 else "example"
TASK = sys.argv[2] if len(sys.argv) > 2 else "codegen"

prompt = PROMPT_LIBRARY.get(TASK, PROMPT_LIBRARY["codegen"]).format(module=MODULE)

# Save prompt for traceability/versioning
os.makedirs("prompts", exist_ok=True)
prompt_file = f"prompts/{MODULE}_{TASK}_prompt_{PROMPT_VERSION}.txt"
with open(prompt_file, "w") as f:
    f.write(f"# Prompt Version: {PROMPT_VERSION}\n# Task: {TASK}\n# Module: {MODULE}\n\n{prompt}\n")

print(f"Prompt for {MODULE} ({TASK}) written to {prompt_file}")
# Here you would invoke your AI codegen agent or API with the prompt
