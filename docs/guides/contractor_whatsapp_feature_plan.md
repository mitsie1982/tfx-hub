# Contractor WhatsApp Feature Plan

This document translates the currently implemented contractor browser/mobile capabilities into a WhatsApp-first interaction model.

It covers:

- the recommended contractor conversation flow
- the WhatsApp menu tree
- a phased implementation plan mapped to backend endpoints that already exist in the repository

For live Meta setup and real-recipient versus sender-migration decisions, see `docs/guides/meta_whatsapp_live_setup.md`.

## Goal

The browser/mobile contractor workspace already supports:

- registration and sign-in
- password reset request and confirmation
- contractor profile summary
- browsing matched leads
- viewing lead detail
- expressing interest
- submitting quotes
- sending homeowner messages
- reviewing lead history

The WhatsApp version should not try to mirror the UI screen-for-screen. It should optimize for short, high-intent actions inside chat.

## Recommended Contractor WhatsApp Conversation Flow

### 1. Entry

User sends:

- `Hi`
- `Menu`
- any inbound WhatsApp message from their registered phone number

System response:

- identify contractor by WhatsApp number
- if recognized, greet them and open the contractor menu
- if not recognized, start contractor verification or onboarding

Example:

```text
Welcome back, Naledi.

Contractor snapshot
Open leads: 12
Active quotes: 3
Completed jobs: 67
Response time: 12 min

Reply with a number:
1. My Profile
2. My Leads
3. My Activity
4. Quote a Lead
5. Message a Homeowner
6. Help
7. Account Help
```

### 2. Identity and Verification

For existing contractors:

- map phone number to contractor account
- restore contractor identity silently

For unrecognized contractors:

- ask whether they want to register or verify an existing account
- collect minimum information in sequence

Suggested chat onboarding sequence:

1. full name
2. primary trade
3. service area
4. years of experience
5. optional email

This should reuse the existing onboarding stage model where practical.

Password reset recovery should also be available from the unlinked entry flow so a contractor can request a reset token, confirm that token, and set a new password without leaving chat.

For linked contractors, the same reset flow should be reachable from the main menu through an account-help action so they do not need to restart from the unlinked entry screen.

### 3. Profile Summary Flow

Trigger:

- `1`
- `My Profile`

System response:

- contractor name
- trade
- tier
- rating
- completed jobs
- active quotes
- response time

Example:

```text
Your contractor profile

Name: Naledi Khumalo
Trade: General Contractor
Tier: TRUSTED
Rating: 4.7
Completed jobs: 67
Active quotes: 5
Response time: 12 min

Reply:
1. My Leads
2. My Activity
3. Menu
```

### 4. Lead Inbox Flow

Trigger:

- `2`
- `My Leads`

System response:

- fetch open leads
- rank and send top matches first
- allow `MORE` to page through additional matched leads when more than three are available
- show concise lead cards in text form

Example:

```text
Top leads for you

1. Kitchen plumbing and leak repair
Midrand | R4,000 - R8,500 | Urgent
93% match

2. Build garden wall
Centurion | R15,000 - R25,000 | This week
81% match

Reply with a lead number to open it.
Reply MORE for the next leads.
Reply M for menu.
```

### 5. Lead Detail Flow

Trigger:

- `Lead 1`
- `1` after lead list

System response:

- title
- location
- budget
- urgency
- scope summary
- homeowner requirements
- quick actions

Example:

```text
Kitchen plumbing and leak repair
Location: Midrand
Budget: R4,000 - R8,500
Urgency: Urgent

Scope:
Repair sink leak, replace shutoff valves, test water pressure before the weekend.

Requirements:
- Own transport
- Can start today
- Photo updates required

Reply:
1. Interested
2. Send Quote
3. Message Homeowner
4. Back to Leads
```

### 6. Express Interest Flow

Trigger:

- `Interested`
- `1` from lead detail menu

System response:

- confirm interest sent
- log the event
- offer next action

Example:

```text
Interest sent to homeowner.

Next:
1. Send Quote
2. Message Homeowner
3. Back to Leads
```

### 7. Quote Submission Flow

Trigger:

- `Send Quote`
- `Quote`

System dialogue:

1. ask for amount
2. ask for timeline
3. ask for optional note
4. summarize quote
5. ask for confirmation

Example:

```text
Quote flow started.

Step 1 of 3:
What is your quote amount?
Example: R12,500
```

Then:

```text
Step 2 of 3:
How long will the work take?
Example: 3 working days
```

Then:

```text
Step 3 of 3:
Add a short note for the homeowner, or reply SKIP.
```

Confirmation:

```text
Confirm quote

Amount: R12,500
Timeline: 3 working days
Note: Includes labour and materials

Reply YES to send or NO to cancel.
```

### 8. Homeowner Message Flow

Trigger:

- `Message Homeowner`
- `Message`

System dialogue:

1. ask contractor for message body
2. echo preview
3. confirm send

Example:

```text
Type the message you want to send to the homeowner.
```

Then:

```text
Preview:
I can inspect this tomorrow morning and send a final quote after the visit.

Reply YES to send or NO to cancel.
```

### 9. Activity History Flow

Trigger:

- `3`
- `My Activity`

System response:

- recent quotes
- recent messages
- recent interest actions
- capped list with continuation prompt

Example:

```text
Recent activity

1. QUOTE | Kitchen plumbing and leak repair
Quote R12,500 · 3 working days

2. MESSAGE | Kitchen plumbing and leak repair
I can inspect this tomorrow morning.

3. INTEREST | Build garden wall
Interest sent to homeowner

Reply MORE for older activity or M for menu.
```

## Recommended WhatsApp Menu Tree

```text
Main Menu
├─ 1. My Profile
│  ├─ 1. My Leads
│  ├─ 2. My Activity
│  └─ 3. Menu
├─ 2. My Leads
│  ├─ Lead 1
│  │  ├─ 1. Interested
│  │  ├─ 2. Send Quote
│  │  ├─ 3. Message Homeowner
│  │  └─ 4. Back to Leads
│  ├─ Lead 2
│  └─ More Leads
├─ 3. My Activity
│  ├─ More
│  └─ Menu
├─ 4. Quote a Lead
│  ├─ Select lead
│  ├─ Enter amount
│  ├─ Enter timeline
│  ├─ Enter note or skip
│  └─ Confirm send
├─ 5. Message a Homeowner
│  ├─ Select lead
│  ├─ Enter message
│  └─ Confirm send
└─ 6. Help
   ├─ How leads work
   ├─ How quotes work
   └─ Contact support
```

## Implementation Plan Mapped to Existing Backend Endpoints

### Phase 1: Identity and Menu Bootstrap

Objective:

- let a contractor open WhatsApp and be recognized by phone number
- show profile summary and a simple main menu

Current backend support:

- `GET /contractor/profile`
- `GET /user`
- `GET /onboarding/status`
- `POST /onboarding/:stage`

Missing backend support:

- phone-number-to-user lookup
- WhatsApp session state for active conversation step
- contractor account verification by WhatsApp number

Recommended additions:

- `POST /whatsapp/contractor/session/start`
- `GET /whatsapp/contractor/session/:phone`
- `POST /whatsapp/contractor/verify-phone`

Phase result:

- contractor can open WhatsApp, be identified, and reach a menu

### Phase 2: Lead Inbox and Lead Detail

Objective:

- allow the contractor to see matched leads and inspect one lead at a time

Current backend support:

- `GET /jobs`
- `GET /jobs/:id`
- `GET /orders`
- `GET /orders/:id`

Missing backend support:

- lead ranking tuned for WhatsApp presentation
- paging/continuation cursor for chat-sized lead batches

Recommended additions:

- `GET /whatsapp/contractor/leads`
  - returns top N leads with compact fields
- `GET /whatsapp/contractor/leads/:id`
  - returns one lead formatted for WhatsApp detail view

Phase result:

- contractor can browse and open leads in chat

### Phase 3: Express Interest

Objective:

- allow the contractor to quickly raise a hand for a lead

Current backend support:

- `POST /jobs/:id/applications`
- `POST /orders/:id/apply`
- `GET /contractor/history`

Missing backend support:

- optional deduping for repeated interest from the same contractor over WhatsApp
- WhatsApp confirmation copy templates

Recommended additions:

- no blocking endpoint required for MVP
- optional wrapper endpoint: `POST /whatsapp/contractor/leads/:id/interest`

Phase result:

- contractor can express interest from chat in one reply

### Phase 4: Quote Submission Flow

Objective:

- allow the contractor to submit a quote entirely through guided chat

Current backend support:

- `POST /contractor/quotes`
- `GET /contractor/history`

Missing backend support:

- temporary quote-draft state across multiple chat turns
- quote confirmation and cancellation state

Recommended additions:

- `POST /whatsapp/contractor/quote-drafts`
- `PATCH /whatsapp/contractor/quote-drafts/:id`
- `POST /whatsapp/contractor/quote-drafts/:id/submit`

Phase result:

- contractor can complete amount, timeline, note, and confirmation in WhatsApp

### Phase 5: Homeowner Messaging Flow

Objective:

- allow the contractor to send a structured first-contact message to the homeowner

Current backend support:

- `POST /contractor/messages`
- `GET /contractor/history`

Missing backend support:

- draft state between chat turns
- optional homeowner delivery routing rules

Recommended additions:

- `POST /whatsapp/contractor/message-drafts`
- `PATCH /whatsapp/contractor/message-drafts/:id`
- `POST /whatsapp/contractor/message-drafts/:id/send`

Phase result:

- contractor can preview and send a message from chat

### Phase 6: Activity and Follow-up

Objective:

- allow the contractor to review recent actions and continue working from them

Current backend support:

- `GET /contractor/history`

Missing backend support:

- pagination tailored to chat
- “resume previous quote/message flow” convenience actions

Recommended additions:

- `GET /whatsapp/contractor/activity?cursor=...`
- `POST /whatsapp/contractor/activity/:id/resume`

Phase result:

- contractor can review and continue prior work in WhatsApp

## Priority Order

Recommended order of implementation:

1. WhatsApp contractor identity by phone number
2. profile summary and main menu
3. lead inbox and lead detail
4. express interest
5. quote submission flow
6. homeowner message flow
7. recent activity flow

## MVP Scope

If only the smallest high-value WhatsApp contractor release is needed, implement:

- phone-number identity
- main menu
- profile summary
- lead inbox
- lead detail
- express interest

That would give contractors a usable lead-response workflow without building every chat flow at once.

## Notes on What Should Not Be Copied from the Browser

Do not port these directly into WhatsApp:

- full search UI
- dense dashboards with multiple cards
- email/password login
- password reset token entry as a primary flow
- sample-data warnings shown to real end users

The WhatsApp product should stay action-first:

- identify contractor
- show best leads
- let them respond quickly
- confirm each action clearly
