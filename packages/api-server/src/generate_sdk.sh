#!/bin/bash
# Generate TypeScript and Python SDKs from OpenAPI spec
npx openapi-generator-cli generate -i openapi.yaml -g typescript-axios -o ../sdk/typescript
npx openapi-generator-cli generate -i openapi.yaml -g python -o ../sdk/python
