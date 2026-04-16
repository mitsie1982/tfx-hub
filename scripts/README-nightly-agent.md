# Nightly Agent Setup

This guide explains how to set up a scheduled local agent for heavy nightly tasks.

## 1. Provision a Dedicated Machine

- Use a VM, server, or workstation with sufficient resources.

## 2. Install a Self-hosted GitHub Actions Runner (Recommended)

- Follow: https://docs.github.com/en/actions/hosting-your-own-runners/adding-self-hosted-runners
- Register the runner to your repository or organization.
- Secure the machine (firewall, updates, access control).
- Audit logs and runner activity regularly.

## 3. (Alternative) Use a Scheduled Cron Job

- Edit your crontab (e.g., `crontab -e`) and add:
  ```
  0 2 * * * /bin/bash /path/to/repo/scripts/nightly-agent.sh >> /path/to/repo/logs/nightly.log 2>&1
  ```
- This runs the agent script nightly at 2am and logs output.

## 4. Security & Auditing

- Restrict access to the agent machine.
- Use SSH keys or tokens with least privilege.
- Monitor for unauthorized changes or access.
- Regularly review logs and update dependencies.

---

**Note:**

- The provided `scripts/nightly-agent.sh` pulls the latest repo and runs CI tasks. Adjust as needed for your workflow.
