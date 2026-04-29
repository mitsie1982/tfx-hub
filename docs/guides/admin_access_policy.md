# Admin Access Policy

This guide defines the current admin access model for TFX Hub.

## Access Channels

Admin access is allowed through:

1. The admin browser workspace.
2. The admin mobile workspace.

Admin access is not allowed through WhatsApp.

## Login Rules

Use these environment variables to configure admin bootstrap access:

1. `TFX_ADMIN_USERNAME`: the secret admin username.
2. `TFX_ADMIN_EMAIL`: the admin email address.
3. `TFX_ADMIN_PASSWORD`: the secret admin password.

The current login rule is:

1. Username: `TFX_ADMIN_USERNAME`
2. Password: `TFX_ADMIN_PASSWORD`

Admin login is intentionally rejected when attempted with email-only or phone-only identifiers.

## Operating Window

Admin operations are expected to be handled during business hours:

1. Start: 08:00
2. End: 17:00

This repo enforces the business-hours rule in the API auth layer so browser and mobile admin clients follow the same rule.

## Security Notes

1. Do not commit live admin usernames to the repository.
2. Keep `TFX_ADMIN_USERNAME`, `TFX_ADMIN_EMAIL`, and `TFX_ADMIN_PASSWORD` in your secret manager or deployment environment.
3. Rotate the admin username if it is disclosed.
4. Rotate the admin password if it is disclosed.
5. Rotate the admin email address if the contact mailbox changes.

## Local Development

Example local environment values:

```text
TFX_ADMIN_USERNAME=local-admin-secret
TFX_ADMIN_EMAIL=admin@example.com
TFX_ADMIN_PASSWORD=change-this-admin-password
```

The seeded admin account uses these values in local demo and test flows. The production API server fails fast on startup if they are missing.
