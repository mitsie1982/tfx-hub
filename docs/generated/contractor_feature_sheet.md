# Contractor Feature Sheet

> Generated file. Update docs/data/contractor_capabilities.json and run pnpm.cmd run docs:contractor:generate.

This sheet is intended for client-facing or stakeholder-facing communication.

## Browser

### Browser Actions

1. Sign in to the contractor workspace
1. Register a new contractor account
1. Request a password reset and confirm it with a reset token
1. Restore an existing session automatically
1. Browse matched project leads
1. Search leads by project, suburb, or scope
1. Filter leads by trade
1. Select a lead and open its detail view
1. Express interest in a lead
1. Submit a quote with amount, timeline, and note
1. Send an opening message to the homeowner
1. Review lead history
1. Sign out

### Browser Visibility

1. Contractor profile summary including name, trade, tier, rating, completed jobs, active quotes, and response time
1. Dashboard stats for completed jobs, active quotes, open leads, and response time
1. Pipeline snapshot for interest count and history count
1. Lead list entries showing title, trade, match score, location, budget, urgency, posted time, lead type, and short description
1. Lead detail including description, homeowner requirements, and lead type
1. Quote entry fields and message entry fields
1. History feed with interest, quote, and message actions, including status, timestamp, and source
1. Live-data versus sample-data status
1. Warnings when the app falls back or cannot reach live data

## WhatsApp

### WhatsApp Actions

1. Start from Hi, Menu, Start, or any inbound message from a registered number
1. Link an existing contractor account by email
1. Register a new contractor account directly in chat
1. Request a password reset and confirm it with a reset token in chat
1. Open the main contractor menu
1. View the contractor profile summary
1. Open account help from the linked contractor menu
1. View matched leads
1. Page through more matched leads in chat
1. Filter matched leads by trade in chat
1. Search matched leads by text in chat
1. Open a lead from the lead list
1. Express interest in a lead
1. Complete a guided quote flow
1. Complete a guided homeowner message flow
1. View recent activity
1. Page through older activity in chat
1. Request help and return to menu navigation

### WhatsApp Visibility

1. Main menu with a contractor snapshot for open leads, active quotes, completed jobs, and response time
1. Account-help prompts with linked sign-in identifiers and password-reset actions
1. Profile details including name, trade, tier, rating, completed jobs, active quotes, and response time
1. Lead list with top matched leads, location, budget, urgency, match score, the active trade filter or text search when one is set, and the current lead page window
1. Lead detail with title, location, budget, urgency, scope, and homeowner requirements
1. Interest confirmation and next-step options
1. Quote flow prompts for amount, timeline, note, and confirmation summary
1. Message flow prompts and preview before sending
1. Activity feed with recent interest, quote, and message actions plus the current activity page window
1. Help text describing available contractor actions
1. Account-linking and registration prompts for unrecognized phone numbers

## Capability Matrix

| Capability | Browser | WhatsApp | Status |
| --- | --- | --- | --- |
| Sign in to contractor workspace | Yes | No | Implemented |
| Register new contractor account | Yes | Yes | Implemented |
| Link existing account to phone number | No | Yes | Implemented |
| Password reset request and confirm | Yes | Yes | Implemented |
| Browse older activity pages | Yes | Yes | Implemented |
| Restore session automatically | Yes | Yes | Implemented |
| View contractor profile summary | Yes | Yes | Implemented |
| View name, trade, tier, rating | Yes | Yes | Implemented |
| View completed jobs, active quotes, response time | Yes | Yes | Implemented |
| View dashboard summary cards | Yes | Yes | Implemented |
| Browse matched leads | Yes | Yes | Implemented |
| Browse more than the first lead page | Yes | Yes | Implemented |
| Search leads by text | Yes | Yes | Implemented |
| Filter leads by trade | Yes | Yes | Implemented |
| View top lead matches | Yes | Yes | Implemented |
| View lead title, budget, location, urgency | Yes | Yes | Implemented |
| View lead description | Yes | Yes | Implemented |
| View homeowner requirements | Yes | Yes | Implemented |
| Express interest in a lead | Yes | Yes | Implemented |
| Submit quote amount, timeline, and note | Yes | Yes | Implemented |
| Confirm quote before sending | Yes | Yes | Implemented |
| Send homeowner message | Yes | Yes | Implemented |
| Preview message before sending | Yes | Yes | Implemented |
| View lead history or activity | Yes | Yes | Implemented |
| View quote, message, and interest statuses | Yes | Yes | Implemented |
| Help and usage guidance | Minimal | Yes | Implemented, stronger on WhatsApp |
| Live versus sample data indicator | Yes | No | Implemented only on Browser |
| Browse many leads quickly | Yes | Limited | Implemented, better on Browser |
| Back-to-menu navigation | UI navigation | Yes | Implemented |
| Open project detail directly from list | Yes | Yes | Implemented |
| Onboard entirely inside the channel | Forms | Yes | Implemented |
