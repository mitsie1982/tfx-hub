# TFX Dispute Center: Migration & Run Instructions

## 1. Run the Migration

- Apply the SQL migration to create the Dispute table in your Postgres database:

```
psql $DATABASE_URL -f prisma/migrations/20260411_add_dispute_model.sql
```
- Or use your preferred migration tool to apply the schema in `prisma/add_dispute_model.prisma`.

## 2. Set Admin Token (for authentication)

- In your environment, set an admin token for secure access:

```
export ADMIN_TOKEN=letmein  # (or your own secure value)
```
- You can also use `?admin_token=letmein` in the browser for quick testing.

## 3. Start the Main App

- Start the main server (from the project root):

```
node server.js
```

- The Dispute Center API is now available at:
  - `http://localhost:4000/api/disputes` (requires admin token)
  - `http://localhost:4000/admin` (requires admin token)

---

**You can now create, review, and resolve disputes with full authentication and persistent storage.**
