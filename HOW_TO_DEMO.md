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

### Want a fresh start before each demo?

Every click you make during a demo changes the example data (a bid gets picked, money gets
released), so a second run-through won't match the script below. To reset everything back to the
starting examples, stop the app (`Ctrl + C`) and run these two, then the seed command above again.
This erases only the practice data on your computer:

```bash
docker compose down -v
docker compose up --build
```

## The demo accounts

All of them use the same password: **`Demo1234!`**

| Who you're logging in as | Email | What they do in the story |
|---|---|---|
| Project owner | `entrepreneur1@axum.demo` | Runs the clinic project, picks the winning contractor |
| Contributor | `contributor1@axum.demo` | Funded the clinic; funded the bakery |
| Second contributor | `contributor2@axum.demo` | Also funded the clinic |
| Approved contractor | `vendor1@axum.demo` | Does the work, uploads proof |
| Contractor awaiting approval | `vendor2@axum.demo` | Gets approved live by the admin |
| Platform administrator | `admin@axum.demo` | Vets contractors, reviews proof, **authorizes** payments — but can't move money |
| The bank (escrow partner) | `escrow@axum.demo` | Holds the money and is the **only** one who can release it |

## The story to tell (about 10 minutes)

The point to land: **no single person can move money.** The project owner picks a contractor,
the admin checks the proof, and the bank releases the funds — and everyone can see every step.

1. **Don't log in yet.** Go to Projects and open "Community Health Clinic — Rural Kenya."
   Show that anyone can see the goal, the amount raised, every budget line, and the
   "Confirmed by First Trust Escrow" badge. That's the transparency pitch.

2. **Log in as the administrator.** Open the vendor list under Admin and approve
   `vendor2@axum.demo` (shown as "pending"). Nobody can bid until a person has checked their
   business details.

3. **Log in as the approved contractor** (`vendor1@axum.demo`). Open the "Staff training program"
   line and submit a bid. Mention bidding only opens after a project reaches its full goal.

4. **Log in as the project owner** (`entrepreneur1@axum.demo`). Open that same line, click "View
   bids," and **Select** the bid. It's locked in, but no money has moved.

5. **Log in as the bank** (`escrow@axum.demo`). Open the "Solar power system" line (its contractor
   was already picked) and click **"Hold … in escrow."** The bank, not the platform, holds funds.

6. **Log in as the contractor again** (`vendor1@axum.demo`). On the solar line, use **Upload
   proof** to attach an invoice (any link works). Every contributor can now see it.

7. **Log in as the administrator.** Open the "Medical equipment procurement" line — its proof is
   already uploaded. Click **"Authorize release."** Pause here: the admin has signed off, but the
   screen says "awaiting the escrow partner." The admin cannot send the money.

8. **Log in as the bank again.** On the same equipment line, click **"Release … to vendor."**
   (Before step 7 this button was greyed out with "Waiting for an admin to authorize" — worth
   showing if you have time.) Then open the **Escrow** page from the menu: the project now shows
   as "Unconfirmed" because the held amount changed — click **Confirm balance**. That's the bank
   attesting to the live number.

9. **Log in as a contributor** (`contributor1@axum.demo`). Contribute a small amount to "Local
   Bakery Expansion" and note the tracking number (UIN) you get. **Log all the way out**, go to
   "Track a project," and paste the number in — anyone can check a project's progress without an account.

10. **Log back in as a contributor** (`contributor1@axum.demo`), open the clinic, and click
    "Flag this line item as suspicious" on the solar line with a reason. Because this contributor
    funded over half the project, the line freezes immediately. Then log in as the administrator,
    open Admin, click the Disputes link, and resolve it (tick "unfreeze" to clear it).

## If something looks broken during a real demo

- If a page won't load, check the terminal window you left running in "Before your call" is still
  open.
- If a button you expect isn't there, you're probably logged in as the wrong person — the app
  deliberately shows each role only its own buttons. Check the name in the top corner.
- If the steps don't match what you see, the example data has already been clicked through once.
  Use "Want a fresh start" above.
- If a status label doesn't make sense at a glance (like "awarded" or "proof_submitted"), describe
  it in plain terms: "the contractor's been picked but the money hasn't moved yet" or "they've
  shown their invoice, just waiting on the sign-off."
- You don't need to type any commands during the demo itself — it's all clicking.
