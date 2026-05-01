# Azure Web App Slot Configuration

- Each environment (dev, staging, prod) uses a separate deployment slot.
- Configure slot-specific settings (e.g., connection strings, secrets) in Azure Portal > Web App > Deployment slots > [Slot] > Configuration.
- Use slot swapping for zero-downtime production releases.
- Reference slot name in deploy workflow with `slot-name` input.
