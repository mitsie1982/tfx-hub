# Meta WhatsApp Live Setup

This guide covers the two practical ways to close the last external validation gap for the contractor WhatsApp flow.

It assumes the backend transport in this repository is already working locally through:

- `pnpm run smoke:api:meta:local`

Use this guide only when you want live validation against the real Meta WhatsApp Business Platform.

## Decision

There are two valid operating models:

1. use your existing WhatsApp Business app number as the real recipient
2. migrate that number into Meta as the real API sender

Do not try to use the same number as both the Cloud API sender and the recipient in the same test flow.

For a South African number such as `082 345 3105`:

- WhatsApp app display format: `082 345 3105`
- E.164 account format: `+27823453105`
- Meta recipient field format for this project: `27823453105`

## Option 1: Keep Your WhatsApp Business App Number As Recipient

This is the fastest path to live validation.

Your number stays active in the WhatsApp Business app and receives messages from a separate Meta-connected sender number.

### Recipient Path Requirements

- a Meta Business account with WhatsApp Business Platform access
- a WABA-configured sender number that is not your app number
- a valid access token
- the sender `phone_number_id`
- a webhook verify token
- your recipient number active on WhatsApp Business

### Recipient Path Checklist

1. Confirm `082 345 3105` is active in the WhatsApp Business app and can receive normal WhatsApp messages.
2. In Meta, use a separate sender number already attached to your WABA or Cloud API test setup.
3. Add your recipient number to the allowed recipient list if your Meta environment still restricts who can be messaged.
4. Set the local environment variables:

```powershell
$env:WHATSAPP_WEBHOOK_TOKEN = "your-verify-token"
$env:WHATSAPP_ACCESS_TOKEN = "your-meta-access-token"
$env:WHATSAPP_PHONE_NUMBER_ID = "your-meta-sender-phone-number-id"
$env:WHATSAPP_TEST_RECIPIENT = "27823453105"
```

You can also use the Windows helper and pass your recipient in local RSA format such as `082 345 3105`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_meta_recipient_option1.ps1 `
  -VerifyToken "your-verify-token" `
  -AccessToken "your-meta-access-token" `
  -PhoneNumberId "your-meta-sender-phone-number-id" `
  -SenderNumber "082 555 0101" `
  -Recipient "082 345 3105"
```

Before attempting the live send, you can run a non-secret readiness report that validates the current environment, normalizes the recipient, and checks that sender and recipient are not the same number:

```powershell
pnpm.cmd run smoke:api:meta:recipient:option1:preflight
```

The report prints:

- whether each required live variable is present
- the normalized recipient that will be used for Meta
- a masked access token preview
- whether the sender number and recipient number conflict
- whether you are still pointing at a local Graph API base URL instead of live Meta

1. Start the API server if it is not already running.
2. Run the live smoke script:

```powershell
pnpm.cmd run smoke:api:meta:whatsapp
```

1. Confirm all three outcomes:

- webhook verification returns the challenge
- inbound payload is accepted by `/webhooks/meta/whatsapp`
- your WhatsApp Business app receives the reply from the Meta sender

### Recipient Path Outcome

This resolves the “real recipient” problem without migrating your existing app number.

### Recipient Path Risks

- if your Meta sender is still in a limited test state, it may only message pre-approved recipients
- if you use the wrong recipient format, delivery can fail silently or be rejected
- if your access token expires, the webhook will still verify but outbound send will fail

## Option 2: Migrate Your WhatsApp Business App Number Into Meta As Sender

This is the production path if you want your existing business number to become the official API sender identity.

Once migrated, that number stops being just a standalone app-based recipient for this flow and becomes part of your WABA configuration.

### Sender Migration Requirements

- ownership and control of the phone number
- ability to receive OTP or verification calls/SMS for the number
- a Meta Business account and WABA ready for number onboarding
- a second real WhatsApp number to act as the recipient after migration

### Sender Migration Checklist

1. Decide that `082 345 3105` will become the sender number, not the recipient.
2. Prepare another handset or WhatsApp number to receive live test messages.
3. Back up any operational information you need from the standalone WhatsApp Business app before migration.
4. In Meta Business Manager or the WhatsApp onboarding flow, add the number as a sender in your WABA.
5. Complete the phone verification challenge from Meta.
6. Finish the sender registration and obtain:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_WEBHOOK_TOKEN`

1. Point the Meta webhook to your deployed `/webhooks/meta/whatsapp` endpoint.
2. Set the local or deployed environment variables.
3. Use a different real WhatsApp number as `WHATSAPP_TEST_RECIPIENT` and run:

```powershell
pnpm.cmd run smoke:api:meta:whatsapp
```

1. Verify that the migrated number is now the visible sender identity for outbound WhatsApp replies.

### Sender Migration Outcome

This resolves the “real sender” problem and gives the project a production-aligned WhatsApp identity.

### Sender Migration Risks

- migration can interrupt normal app-based operations on the number during cutover
- you cannot use the same number as both sender and recipient in the same live test
- template approval or production messaging restrictions may still apply depending on your Meta account state

## Recommended Path

For this repository, the safest order is:

1. validate locally with `pnpm run smoke:api:meta:local`
2. use your existing WhatsApp Business app number as recipient first
3. migrate the number into Meta only when you are ready to make it the long-term sender identity

## Troubleshooting

If live sending fails but the local smoke test passes, check these first:

1. `WHATSAPP_PHONE_NUMBER_ID` belongs to the real Meta sender number, not the recipient
2. `WHATSAPP_TEST_RECIPIENT` is in digit form like `27823453105`
3. the access token is valid and scoped correctly
4. the webhook verify token configured in Meta matches the server environment
5. the recipient number is allowed by the current Meta environment and messaging tier
