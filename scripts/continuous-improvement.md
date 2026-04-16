# Continuous Improvement: Measure and Iterate

## 1. Track MTTR for Broken Builds & PR Feedback Time

- Add timestamps to build failure and fix events in `.logs/workflows.log`.
- Use a script to calculate Mean Time To Recovery (MTTR) from the log.
- Use GitHub API or scripts to measure average time from PR open to first review/merge.

## 2. Periodic Audits

- Schedule a quarterly review of `.vscode/extensions.json` and installed extensions.
- Add `npm audit` or `snyk test` to CI and/or a scheduled job for security scans.

## 3. Quarterly Retro

- Schedule a 15–30 minute team meeting every quarter.
- Discuss:
  - What’s slow?
  - What’s noisy?
  - What can be improved or automated further?
- Capture action items and assign owners.

---

## Example: MTTR Calculation Script

```bash
# scripts/calc-mttr.sh
awk '/started build/ {start=$1" "$2} /build fixed/ {if(start) {print start, $1" "$2; start=""}}' .logs/workflows.log |
  awk '{print $1" "$2, $3" "$4}' |
  while read s e; do
    st=$(date -d "$s" +%s)
    et=$(date -d "$e" +%s)
    echo $((et-st))
  done | awk '{sum+=$1; n++} END {if(n>0) print "MTTR:", sum/n, "seconds"; else print "No data"}'
```

## Example: Security Audit in CI

Add to your GitHub Actions workflow:

```yaml
- name: Run npm audit
  run: npm audit --audit-level=moderate || true
```

---

_Keep this file updated with improvement ideas and action items from each retro!_
