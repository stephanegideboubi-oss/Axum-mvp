# How to show AXUM to people (no technical steps needed on your end)

You already got this running once, so this will feel familiar. No need to put anything online —
you'll just run it on your own computer and share your screen.

## Before your call: start the app

1. Open **Docker Desktop** (the app you installed). Wait for it to say it's running.
2. Open a terminal in the `AXUM MVP` folder (same way you did before).
3. Run this one command and wait — it can take a minute the first time:

```bash
docker compose up --build
```

4. Leave that window open and running in the background — don't close it.
5. If this is the very first time, run this once too, to fill the app with example projects so it
   doesn't look empty:

```bash
docker compose exec backend npm run seed
```

6. Open your web browser and go to: **http://localhost:5173**

That's it — the app is now running and ready to show. When you're done, go back to that terminal
window and press `Ctrl + C` to stop it.

## What to click through during your demo

You don't need to explain any of the technical plumbing — just walk through these screens. There
are pre-made example accounts so you don't have to create anything live. All of them use the same
password: **`Demo1234!`**

| Who you're logging in as | Email |
|---|---|
| The person running a project | `entrepreneur1@axum.demo` |
| Someone who's already funded the project | `contributor1@axum.demo` |
| A second contributor | `contributor2@axum.demo` |
| An already-approved contractor | `vendor1@axum.demo` |
| A contractor still awaiting approval | `vendor2@axum.demo` |
| The platform administrator | `admin@axum.demo` |

### A suggested order

1. **Don't log in yet.** Go to `/projects` and open "Community Health Clinic — Rural Kenya."
   Point out: anyone can see the goal, how much has been raised, and every budget line item —
   without needing an account. That's the "radical transparency" pitch.

2. **Log in as the platform administrator** (`admin@axum.demo`), go to `/admin`. Approve
   `vendor2@axum.demo`, who's shown as "pending" — this is the manual vendor-vetting step:
   nobody can bid on real work until a person has looked at their business info.

3. **Log in as the contractor** (`vendor1@axum.demo`). Open the "Staff training program" line
   item on the clinic project and submit a bid — mention that bidding only opens once a
   project has hit its full funding goal, never before.

4. **Log in as the project owner** (`entrepreneur1@axum.demo`). Open that same line item,
   click "View bids," and click **Select** on the bid. Point out it's just locked in — the
   money still hasn't moved anywhere yet.

5. **Log back in as the administrator.** Open that same line item and click **"Hold funds in
   escrow."** This is the manual stand-in for a real bank/escrow partner — no real money moves,
   but the workflow is exactly what would happen with one.

6. **Log in as the contractor again** and use the **Upload proof** form to attach an invoice
   (any link works for the demo). Point out this becomes visible to every contributor on the
   project — nobody has to ask for it.

7. **Log back in as the administrator** and click **"Release funds to vendor."** This is the
   moment to pause on: the money only ever moves after proof is attached and a person signs off
   — never automatically, and never before that.

8. **Log in as a contributor** (`contributor1@axum.demo`). Contribute a small amount to the
   second project, "Local Bakery Expansion" — point out you immediately get a tracking number
   (a "UIN"). **Log all the way out**, go to `/track`, and paste that number in — show that
   anyone can check on a project's progress this way, with no account at all.

9. **Log back in as a contributor**, open the clinic project, and click "Flag this line item as
   suspicious" on any line with a reason. If that contributor funded a large enough share of the
   project, the line freezes immediately — point out that this protects contributors without
   needing a full vote. Then **log in as the administrator**, go to `/admin/disputes`, and
   resolve it (check "unfreeze" to clear it).

## If something looks broken during a real demo

- If a page won't load, check the terminal window from step 3 is still open and running.
- If a status label doesn't make sense at a glance (like "awarded" or "proof_submitted"), you
  can just describe it in plain terms: "the contractor's been picked but the money hasn't moved
  yet" or "they've shown their invoice, just waiting on the release."
- You don't need to touch any code or terminal commands during the demo itself — everything
  after step 2 above is just clicking around the website.
