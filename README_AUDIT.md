# Audit Logging

All critical actions and policy decisions should be logged to `out/audit.log`.

- CI jobs and orchestrators should append to this log for traceability.
- See `scripts/trace_utils.py` for trace helpers.
