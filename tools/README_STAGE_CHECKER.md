## Go Phase: Trust & Admin Tools

**Primary Objective:**
- Capture feedback and surface trust signals; provide admin tools.

**Key Tasks:**
- Ratings and review submission and aggregation.
- Implement trust tier calculation and UI badges.
- Build admin console pages for manual verification and dispute triage.
- Add basic role-based access control (RBAC) for admin functions.

**Owners:**
- Backend dev, Frontend dev, Trust specialist.

**Acceptance Criteria:**
- Ratings update contractor score and tier in real time.
- Admin can view pending verifications and mark verified.
- RBAC prevents non-admins from accessing admin pages.

**Deliverables:**
- Ratings system
- Trust tier logic
- Admin console MVP
## TFX Hub Suite Functionalities Comparison

| Functionality / Feature                                | **Freemium** | **Basic Suite** | **Professional Suite** | **Enterprise Suite AMS** |
| ------------------------------------------------------ | ------------ | --------------- | ---------------------- | ------------------------ |
| Basic listing/profile                                  | ✓            | ✓               | ✓                      | ✓                        |
| View-only stats                                        | ✓            | ✓               | ✓                      | ✓                        |
| Signup link                                            | ✓            | ✓               | ✓                      | ✓                        |
| Core functionality (job search, etc.)                  |              | ✓               | ✓                      | ✓                        |
| Unlimited job bids                                     |              | ✓               | ✓                      | ✓                        |
| WhatsApp onboarding                                    |              | ✓               | ✓                      | ✓                        |
| Basic credentials                                      |              | ✓               | ✓                      | ✓                        |
| Monthly stats                                          |              | ✓               | ✓                      | ✓                        |
| Advanced portfolio tools                               |              |                 | ✓                      | ✓                        |
| Priority dispute resolution                            |              |                 | ✓                      | ✓                        |
| Enhanced analytics                                     |              |                 | ✓                      | ✓                        |
| Association Member Management System (AMMS) onboarding |              |                 |                        | ✓                        |
| Member registry & verification                         |              |                 |                        | ✓                        |
| Compliance tracking                                    |              |                 |                        | ✓                        |
| Disciplinary workflows                                 |              |                 |                        | ✓                        |
| Legacy integration                                     |              |                 |                        | ✓                        |

---

# TFX Hub Stage Checker

## Purpose

Run the checker to determine the maturity stage for each stakeholder: Service Professionals, Customers, Associations, Members, Demo.

## How to run

1. Ensure `.env` exists if you want TF‑Serving runtime checks (set TF_SERVING_URL).
2. From VS Code: Run task "TFX Hub Stage Check".
3. Or run manually:

   ```bash
   bash tools/check_tfx_hub_stage.sh
   ```

---

### How the script maps to stakeholder needs

- **Service Professional Customer Management System (CCMS)** — need runnable pipeline, trainer, pusher, and serving so service professional‑facing model endpoints and SDKs exist. The script checks for those artifacts.
- **Customers** — need evaluator gating, demo data, and demo compose so customers can validate model behavior and try the demo.
- **Association Member Management System (AMMS)** — need CI, TF‑Serving manifests, and publish helper for governance and deployment automation.
- **Members** — need pipeline + evaluator + demo seeds and docs to reproduce and validate models.
- **Demo** — needs demo compose, seed scripts, and demo TF‑Serving image to run locally.

---

### Establishing a Formal Feedback Loop

Current state: Ad hoc channels such as informal chats do not yield structured, actionable insights.

**Recommendation:**

• Implement structured feedback mechanisms:
◦ In‑app surveys triggered after key actions such as onboarding completion and job closure.
◦ Weekly check‑ins via short calls or standardised forms.
◦ Dedicated feedback channel such as a monitored email alias or a single WhatsApp line.
◦ Feedback tracking process to categorise, prioritise, and analyze all inputs.

**Implemented Feedback Mechanisms:**

1. **In-app surveys after job closure**
   - Users are prompted with a survey modal after completing a job in the Members app.
   - Feedback is collected directly in-app and can be sent to the backend for analysis.

2. **Weekly check-ins (calls & forms)**
   - Users see a weekly check-in prompt in the Members app.
   - They can fill out a check-in form or request a callback for a phone check-in.

3. **Dedicated feedback channel**
   - Optionally, users can reach out via a monitored email alias or WhatsApp line.

4. **Feedback tracking**
   - All feedback is categorized, prioritized, and analyzed for continuous improvement.

---

### Next steps I recommend you run now in VS Code

1. **Add the three files** above into your repo (`tools/check_tfx_hub_stage.sh`, `.vscode/tasks.json`, `README_STAGE.md`).
2. **Open VS Code** and run the task **TFX Hub Stage Check** (Terminal → Run Task).
3. **Review the output table** and focus on the **missing indicators** for the stakeholder(s) you care about most.
4. **Implement the highest‑impact missing items** (e.g., add `pipelines/tfx_pipeline.py` or `seed/seed-demo.py`) and re-run the task until the desired stage is reached.
5. If you want, I will **generate the missing artifacts** (pipeline skeleton, seed script, publish helper, TF‑Serving manifest, CI YAML) tailored to the exact gaps the checker reports — tell me which stakeholder to prioritize and I’ll produce the repo‑ready files next.

---

This gives you a reproducible, VS Code–native way to **confirm the TFX Hub stage** for each audience and to surface the exact gaps to close to reach MVP or Production.

---

## TFX Hub MVP Tiers

| Tier                     | Target User                           | Monthly Price (ZAR) | Features                                                                                                                                                |
| ------------------------ | ------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FREEMIUM**             | Customers and Members / Professionals | 0                   | Basic listing; view-only stats; signup link                                                                                                             |
| **Basic Suite**          | Individual Contractors & Artisans     | R49–R99             | Core functionality; unlimited job bids; WhatsApp onboarding; basic credentials; monthly stats                                                           |
| **Professional Suite**   | Small to Medium Construction Firms    | R199–R299           | Full suite; advanced portfolio tools; priority dispute resolution; enhanced analytics                                                                   |
| **Enterprise Suite AMS** | Associations & Governing Bodies       | Custom (R5k+)       | Association Member Management System (AMMS) onboarding; member registry & verification; compliance tracking; disciplinary workflows; legacy integration |

---
