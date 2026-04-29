# Audit Streaming Automation

## Automated Task
- **Stream Audit Log to SIEM (admin)**: Runs `audit_streamer.py` with admin authentication.
- Location: VS Code Tasks (Ctrl+Shift+P → Run Task → Stream Audit Log to SIEM (admin))
- Environment variables:
  - `AUDIT_SIEM_ENDPOINT`: Target SIEM/Elasticsearch bulk endpoint (default: http://localhost:9200/_bulk)
  - `ADMIN_TOKEN`: Admin bearer token for authentication (replace in tasks.json or set in your shell)

## Script Usage
```sh
python3 scripts/audit_streamer.py --file out/action_audit.log --dest "$AUDIT_SIEM_ENDPOINT" --admin-token "$ADMIN_TOKEN"
```
- Streams all audit entries as Elasticsearch bulk JSON lines
- Requires `requests` Python package

## Security
- Admin token is sent as `Authorization: Bearer ...` header
- Do not commit real secrets/tokens to source control

## Customization
- Change endpoint or token in `.vscode/tasks.json` or via environment variables
- Supports custom index name via `--index` argument

---
For further automation or integration, update the script or task as needed.
