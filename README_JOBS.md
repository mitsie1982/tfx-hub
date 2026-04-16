# Job API Endpoints

## Accept a Job (Optimistic Locking)

**POST** `/api/jobs/:id/accept`

Request body:

```
{
  "contractorId": "string",
  "version": 1
}
```

- Only works if the job is in `offered` status and the version matches.
- On success: returns `{ ok: true, job }`.
- On conflict: returns 409 with `{ error, currentVersion, status }`.

## Example Response

**Success:**

```
{
  "ok": true,
  "job": { ...updated job object... }
}
```

**Conflict:**

```
{
  "error": "Conflict or already accepted",
  "currentVersion": 2,
  "status": "accepted"
}
```

---

## Add more endpoints as needed for job creation, update, listing, etc.
