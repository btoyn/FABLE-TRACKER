# Lender CRM — Working Guide

One relationship system for roughly 120 commercial lenders. It exists to answer a single
question — *who is slipping?* — and to make doing something about it take five minutes a day
rather than an afternoon.

Live at `fable-tracker.vercel.app`. A styled version of this guide is published as an artifact;
this file is the copy that travels with the code.

---

## The one idea

You cannot hold 120 relationships in your head. What you *can* do is make sure nobody goes more
than about a month without hearing from you personally — and that when you do reach out, you
remember what matters to them.

So the CRM keeps a running clock on every lender. It never resets on the first of the month; it's
always counting from the last time you actually spoke. When someone drifts past the line, they
surface. When they're fine, they stay out of your way.

You should never have to decide who to call. The app decides, ordered worst-first, and tells you
why.

## The 30-day clock

| State | Days since personal contact | Meaning |
|---|---|---|
| On track | 0–30 | Spoken within the goal window. Nothing to do. |
| Grace period | 31–40 | Just past the line. Still easy to recover. |
| Overdue | 41–60 | A real gap. They're in your queue. |
| Seriously overdue | 61+ | These lead the weekly list. |
| Never contacted | — | Imported but never personally reached. Same urgency as overdue. |

Both the goal window and the grace period are adjustable in Settings; 30 and 10 are defaults.

**Booking a meeting covers someone immediately.** A confirmed lunch three weeks out stops that
lender showing as overdue today. If the meeting is cancelled, the clock goes back to counting from
your last real conversation.

## Two kinds of contact

Every lender carries two clocks:

- **Overall contact** — anything that reached them, mass email included.
- **Personal contact** — one-to-one only: a call, a text, an email you wrote, a lunch, a pop-in,
  an SBA question they asked you.

Send a newsletter to 80 lenders and their overall clock resets while their personal clock keeps
counting. The app calls that **Campaign only** and treats it as a gap, because it is one. Every
headline number — the ring, the percentage, the weekly list — runs on the *personal* clock.

**Counts as personal:** calls, texts, personal emails, inbound emails, lunch, breakfast, golf,
office visits, pop-ins, SBA questions, deal conversations, weekly loan updates.

**Does not count:** campaign email (overall only), drop-offs where nobody talked to you, notes you
write to yourself.

---

## Every morning — about 5 minutes

The dashboard is ordered by urgency. Read down.

1. **Read the blue banner.** One sentence covering overdue promises, loan updates due, meeting
   notes to capture, and how many people are on this week's list. The ring is your personal
   coverage percentage. If it says you're caught up, you are.

2. **Clear Today's attention.** Three kinds of item, urgent first, one button each:
   - *Promises* — something owed in either direction, past its date → **Mark done**
   - *Loan updates due* — an active loan hasn't had its weekly touch → **Log update** records it
     and pushes the next one out a week
   - *Meeting notes* — a meeting happened and nothing was written down → **Capture notes** opens a
     box inline

   Write the notes while they're fresh. Everything downstream comes out of that box.

3. **Glance at the right-hand rail.** Confirmed meetings, whether a brief is prepared, your next
   trip, and anything **waiting on a reply** — that's where tentative invitations sit so they don't
   quietly die.

### What the four cards mean

Each card links to the filtered list behind it.

- **Personal coverage** — share of active lenders with a real one-to-one touch inside the window,
  plus the change since last week. This is the number to care about.
- **Meetings** — confirmed meetings ahead, when the next is, how many await notes.
- **Weekly loan communication** — reads as `3/5`. Every active loan gets a weekly touch *even when
  nothing changed*, because silence is what makes referral partners nervous.
- **Annual SBA approvals** — approvals year to date against goal, with dollars and the gap.

Below those: an **eight-week coverage line**, rebuilt from your activity every page load (so
backdating a logged call redraws history honestly), and a **relationship status bar** where every
band and legend row links to that exact list.

---

## Every Monday — about 20 minutes

Press **Start weekly outreach** in the banner once a week. The app ranks every lender by who's
slipping furthest, builds a list of ten with ten more on deck, and shows the first five.

Each row gives you their name, bank, territory, how long it's been, **why now**, and **a suggested
action** matched to how that person prefers to be contacted.

You don't tick anything off — **logging a touch closes the row automatically**, and the progress
bar fills as you go. **View all** reveals the rest.

Ten is the plan; five is what fits in a sitting. Getting through five a week is a working system.

### The four row buttons

**Draft email** — opens a new message in Outlook addressed to that lender. You send it as yourself
from your own mailbox, so replies land in your normal thread history. When you come back, the app
asks whether it went out and logs the touch. The app deliberately does not send lender email on
your behalf; mail from a system address reads as bulk and damages deliverability.

**Text** — opens Messages with their number, then offers to log it. Same pattern: the app can't see
whether you hit send, so it asks.

**Schedule** — places a **tentative hold**: type, time, optional location. It stays tentative
because nothing is agreed until they reply, and it appears under *Waiting on replies* until it
firms up. Durations default sensibly — lunch and breakfast 60 minutes, golf 150, office visits and
pop-ins 15.

**Replace** — takes that lender off this week's list and promotes the next one on deck into the
slot. Nothing is deleted; you're saying "not now."

---

## As it happens

### Logging what you did

Lender profile → **Log activity**. Pick what happened, when, and a one-line summary. Tick *they
reached out to me* if they started it — inbound contact is a real signal about relationship health.

Logging resets the clock, feeds the coverage percentage, closes weekly list rows, and builds the
timeline you'll read before your next meeting. An unlogged call may as well not have happened.

### Promises

Tracked separately from ordinary tasks and shown more aggressively, because breaking one costs more
than forgetting a task. Two directions: **I promised** and **they promised**. Both go stale, both
are worth chasing.

Add from the lender's Actions panel. Overdue ones surface in Today's attention; everything open
lives on **Follow-ups**, where you can complete, reschedule, or dismiss. The sidebar badge counts
open promises and tasks together.

### Remembering the person

Each profile holds **personal notes and interests** — golf, kids' soccer, BYU tickets, the lunch
spot they like, the fact they only answer texts. Categorized, and they never expire on their own. A
coverage clock resets constantly; the fact that their daughter plays club soccer stays true for
years. When AI drafting is on, this is the material it draws on.

You can also set each lender's preferred contact method, which changes the weekly list's suggested
action.

### When someone changes banks

Profile → **Changed banks?** The lender keeps their entire history — conversations, promises,
personal notes all follow them — and only the current institution changes. The old bank is
preserved in their institution history. The app also flags the bank they left, since that branch may
now need a replacement contact.

---

## Reference

### Finding people

**Lenders** — full list with typo-tolerant search across names, banks, and emails
(*Whitfeild* finds Whitfield). Built-in views:

| View | Who's in it |
|---|---|
| On track | Personally covered, no meeting needed |
| Needs contact | Past the goal window on overall contact |
| No personal touch | Never had a one-to-one interaction |
| Campaign-only | Reached by mass email, never personally |
| Recently contacted | Spoken to in the last week |
| Upcoming meetings | Has a confirmed meeting booked |
| St. George candidates | Southern Utah, for trip planning |
| Salt Lake candidates | Wasatch Front |
| Active-loan contacts | Referred a loan currently in process |
| Overdue promises | Something outstanding between you |

**Needs Attention** — the full queue of everyone not personally on track, worst first. Filter by
state (grace, overdue, seriously overdue, campaign-only, no personal touch, active loan, open
promise) and narrow by territory when planning a trip.

**Institutions** — the bank view. Every contact you have there plus recent activity across all of
them. Useful for spotting a bank where you know one person and should know three.

### Settings worth setting

- **Your name and home base** — greetings and travel distance
- **Contact goal and grace period** — the 30 and 10. If a month is too aggressive across 120
  people, raise the goal rather than living with a permanently red dashboard.
- **Weekly list sizes** — Top and On Deck counts, ten and ten by default
- **Daily digest** — whether you get a morning summary, and when

Settings also holds **Import**, **CSV export**, and the connection status for Microsoft 365, AI
drafting, and digest email.

### Getting your real list in

1. **Upload** your Excel file or CSV.
2. **Match your columns** — the app guesses; you correct. Nothing imports on a guess.
3. **Review** — how many lenders will be created, likely duplicates, and suggested tags pulled from
   your notes column (mention golf or BYU or kids and it offers to file those as personal details).
   Approve or reject each. Your original note text is always kept as written.
4. **Import** — you get a report. If sample data is still present, the app offers to clear it first
   so demo and real lenders never mix.

### The safety net

**Nothing deletes immediately.** Deleting moves a record to **Trash**, restorable for 90 days
before permanent cleanup. Delete the wrong lender and their whole history comes back.

**Your data is exportable.** One-click CSV for lenders, institutions, activities, tasks, promises,
referrals, and active loans.

**Private by default.** The database enforces per-person access at its own level, not just in the
app. There's also an audit log recording what changed and whether it was you, the assistant, or an
automated process.

**On your phone:** open the site and use *Add to Home Screen*. It installs like an app, which makes
the thirty-second "log that call from the car" habit realistic.

### How do I…

| Task | Where |
|---|---|
| Log a call I just had | Lender profile → Log activity → Call |
| Add a lender | Add, or Lenders → New. Checks duplicates as you type. |
| Record something I owe someone | Profile → Add promise → I promised → due date |
| See who's slipping | Needs Attention, or the Overdue band on the status bar |
| Plan a St. George trip | Needs Attention → territory Southern Utah |
| Book a tentative lunch | Schedule on their weekly-list row |
| Write up a meeting | Dashboard → Capture notes |
| Note that someone moved banks | Profile → Changed banks? |
| Rebuild this week's list | Start weekly outreach in the banner |
| Undo a deletion | Trash → Restore (90 days) |
| Get my data out | Settings → Export your data |
| Change the 30-day goal | Settings → Contact goal and grace period |

---

## Live now vs. coming

### Working today

Dashboard as described · both coverage clocks and all states · eight-week history · weekly list
(generate, work, replace, auto-complete) · lenders and institutions with search, profiles,
timelines, bank changes · promises and tasks in both directions · Needs Attention queue with
filters · tentative meeting holds, notes capture, brief status · weekly loan-update tracking ·
import wizard and CSV export · 90-day trash and audit log.

### Needs a key or an approval

| Feature | What it needs |
|---|---|
| AI drafting in your voice | An Anthropic key, a few dollars a month. Today it powers *Ask assistant* and nothing else. |
| Daily digest by email | A Resend key. The morning summary shows in the app either way. |
| Real Outlook drafts and calendar | Microsoft 365 app registration and admin consent at IMBL. |

### Designed, not built yet

| Feature | Where it stands |
|---|---|
| Your writing voice | Storage ready. Needs the screen where you paste samples. |
| Referral and deal tracking | Follow-up logic written and unit-tested. No screen. |
| Active-loan management | Visible on the dashboard; no screen to add or edit loans. |
| Campaigns | Storage ready. No screen, no sending. |
| Trip planning | Shows in the rail if a trip exists; no screen to create one. |
| Meeting briefs | Status shown; nothing generates them yet. |
| Annual goal | Read on the dashboard; no screen to set it. |
| Expenses, reports, drop-offs | Storage ready. No screens. |

None of that last list is hard — mostly screens over tables that already exist. The first two worth
doing are probably the voice screen and the annual goal, since both improve something you already
look at daily.

## Finish setting up

1. **Add the redirect addresses in Supabase** (Authentication → URL Configuration), with the
   `https://` prefix. Until then *Forgot password* fails. Signing in normally already works.
2. **Turn off the Vercel login wall** so the site opens on your phone. Your own login is the real
   front door.
3. **Set your annual approval goal** once that screen exists.

---

One habit carries the whole system: log the touch while you still remember it. Everything the
dashboard tells you is downstream of that. If a week goes by where you only do one thing, make it
pressing **Start weekly outreach** and working the five names.
