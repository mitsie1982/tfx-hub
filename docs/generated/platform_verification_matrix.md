# Platform Verification Matrix

This document records the verified role and channel state after the April 2, 2026 re-check.

| Role | Browser | WhatsApp | Verification State | Notes |
| --- | --- | --- | --- | --- |
| Contractor | Pass | Pass | Verified | Browser host serves the contractor dashboard, leads, detail, history, and WhatsApp subscription entry. WhatsApp contractor flows passed shared-logic integration and local Meta webhook smoke coverage. |
| Customer | Pass | Pass | Verified | Browser host serves overview, professional directory, shortlist, and prepared contact request flow. WhatsApp customer flows now support jobs, professionals, shortlist, and guided job request creation. |
| Association | Pass | Pass | Verified | Members browser host and mobile app expose association overview, professionals, professional detail, and queued member-review and trade-outreach actions. WhatsApp association flows support overview, professional directory, professional detail, member-review queueing, trade-outreach queueing, recent action review, trade-breakdown navigation, and first-contact registration or linking. |
| Professional | Pass | Pass | Verified | Members browser host and mobile app expose professional directory, professional detail, availability, and tier-review request actions. WhatsApp professional flows support linked profile review, professional directory/detail navigation, availability check-ins, tier-review requests, recent request review, and first-contact registration or linking. |
| Admin | Pass | Blocked | Verified | Browser host and mobile shell require the secret admin username with the admin email address as the password. Admin WhatsApp access and admin WhatsApp subscription are disabled across direct routes and Meta webhook routing. |

## Evidence

1. Full workspace tests passed, including the members package tests, app-side mobile shell tests, and browser-host tests.
2. Shared-logic integration passed with contractor, customer, association, and professional WhatsApp menu and detail navigation flows, and with the admin WhatsApp path verified as blocked.
3. Local Meta WhatsApp smoke passed for webhook verification, inbound processing, first-contact role selection for unlinked numbers, multi-role routing across contractor, customer, admin, association, and professional numbers, first-contact registration paths for association and professional, explicit admin WhatsApp blocking, and outbound interactive reply transport.
