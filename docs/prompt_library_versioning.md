# Prompt Library Versioning

All standardized prompts for AI code generation, refactoring, and test generation are versioned and stored in the `prompts/` directory.

- Prompt version: v1.0.0
- Prompt file naming: `{MODULE}_{TASK}_prompt_{VERSION}.txt`
- Supported tasks: codegen, refactor, testgen

## Example Usage

```
make generate-module MODULE=auth TASK=codegen
```

This will create a versioned prompt file in `prompts/` for traceability and reproducibility.

## Standardized Prompts

- **Code generation**: "You are an expert developer. Generate a production-ready {module} module with clear structure, docstrings, and error handling."
- **Refactoring**: "You are a senior engineer. Refactor the {module} module for clarity, maintainability, and performance. Include comments on changes."
- **Test generation**: "You are a test automation specialist. Generate comprehensive unit tests for the {module} module, covering edge cases and error handling."

Update the prompt library and version as your workflow evolves.
