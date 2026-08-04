# Lender CRM — Working Guide

One system for ~120 commercial lenders. It answers one question — *who is slipping?* — in five
minutes a day. Live at `fable-tracker.vercel.app`.

This file is the single source for the guide: it renders inside the app at **Guide** in the sidebar,
and reads as plain markdown on GitHub. Editing it updates both.

## How coverage works

The app keeps a running clock on every lender, counting from the last time you actually spoke —
never a calendar reset. Past the line, they surface. Inside it, they stay out of your way. You never
decide who to call; the app ranks them worst-first and tells you why.

| State | Days since personal contact | |
|---|---|---|
| On track | 0–30 | Nothing to do |
| Grace period | 31–40 | Just past the line |
| Overdue | 41–60 | A real gap |
| Seriously overdue | 61+ | Leads the weekly list |
| Never contacted | — | Same urgency as overdue |

- Goal window and grace are adjustable in Settings — 30 and 10 are defaults.
- **A confirmed future meeting covers a lender the moment you book it.** Cancel it and the clock
  silently resumes from your last real conversation.

### Two clocks per lender

**Overall** counts anything that reached them, mass email included. **Personal** counts one-to-one
only. Send a newsletter to 80 lenders and their overall clock resets while personal keeps counting —
the app calls that **Campaign only** and treats it as the gap it is. Every headline number runs on
the *personal* clock.

- **Counts as personal:** calls, texts, emails you wrote, inbound emails, lunch, breakfast, golf,
  office visits, pop-ins, SBA questions, deal conversations, loan updates.
- **Doesn't:** campaign email (overall only), drop-offs where nobody talked to you, notes to
  yourself.

## Every morning — 5 minutes

The dashboard is ordered by urgency. Read down.

1. **The blue banner** — one sentence of what's outstanding, plus your personal coverage ring. If it
   says you're caught up, you are.
2. **Today's attention** — three kinds of item, urgent first, one button each: *promises* past their
   date → **Mark done**; *loan updates due* → **Log update** records it and pushes the next out a
   week; *meeting notes* → **Capture notes** opens a box inline. Write notes while they're fresh —
   everything downstream comes from that box.
3. **The right rail** — confirmed meetings, whether each brief is prepared, your next trip, and
   anything **waiting on a reply** so tentative invitations don't quietly die.

### The four cards — each links to the list behind it

| Card | What it tells you |
|---|---|
| Personal coverage | Share of active lenders with a real one-to-one touch inside the window, plus the change since last week. The number to care about. |
| Meetings | Confirmed meetings ahead, when the next is, how many await notes. |
| Weekly loan communication | Reads as `3/5`. Every active loan gets a weekly touch *even when nothing changed* — silence is what makes referral partners nervous. |
| Annual SBA approvals | Approvals year to date against goal, with dollars and the gap remaining. |

Below those: an **eight-week coverage line**, rebuilt from your activity on every page load (so
backdating a logged call redraws history honestly), and a **status bar** where every band and legend
row links to that exact list.

## Every Monday — 20 minutes

Press **Start weekly outreach** once a week. The app ranks everyone by who's slipping furthest,
builds ten with ten more on deck, and shows the first five. Each row carries their bank, territory,
days since you spoke, **why now**, and a **suggested action** matched to how they prefer to be
contacted.

You don't tick anything off — **logging a touch closes the row automatically** and fills the progress
bar. **View all** reveals the rest. Ten is the plan; five is what fits in a sitting.

| Button | What it does |
|---|---|
| Draft email | Opens Outlook addressed to them. You send it as yourself so replies land in your normal thread history; the app then asks whether it went out and logs it. It deliberately never sends lender mail on your behalf — system-address mail reads as bulk and hurts deliverability. |
| Text | Opens Messages with their number, then offers to log it. |
| Schedule | Places a **tentative hold** — type, time, optional location. Stays tentative until they reply and sits under *Waiting on replies*. Durations default: lunch and breakfast 60 min, golf 150, office visits and pop-ins 15. |
| Replace | Drops them from this week and promotes the next lender on deck into the slot. Nothing is deleted — you're saying "not now." |

## As it happens — the four habits

**Log the touch.** Profile → *Log activity*: what happened, when, one line of summary. Tick *they
reached out to me* if they started it — inbound contact is a real health signal. Logging resets the
clock, feeds coverage, closes weekly rows, and builds the timeline you'll read before your next
meeting. An unlogged call may as well not have happened.

**Record promises.** Two directions, kept apart: **I promised** and **they promised**. Added from the
profile, surfaced in Today's attention when overdue, and all open ones live on **Follow-ups** to
complete, reschedule, or dismiss. The sidebar badge counts open promises and tasks together.

**Note the person.** Golf, kids' soccer, BYU tickets, the fact they only answer texts — categorized
on the profile and never expiring, because a coverage clock resets constantly but their daughter
plays club soccer for years. Also set their preferred contact method; the weekly list's suggested
action follows it. This is the material AI drafting draws on once it's switched on.

**Handle bank changes.** Profile → *Changed banks?* The lender keeps their entire history —
conversations, promises, personal notes — and only the current institution changes. The old bank
stays in their history, and the app flags it, since that branch may now need a replacement contact.

## Finding people

**Lenders** has typo-tolerant search across names, banks, and emails (*Whitfeild* finds Whitfield)
plus one-click views:

| View | Who's in it |
|---|---|
| On track | Personally covered, no meeting needed |
| Needs contact | Past the goal window on overall contact |
| No personal touch | Never had a one-to-one interaction |
| Campaign-only | Reached by mass email, never personally |
| Recently contacted | Spoken to in the last week |
| Upcoming meetings | Has a confirmed meeting booked |
| St. George / Salt Lake | Southern Utah and Wasatch Front, for trips |
| Active-loan contacts | Referred a loan currently in process |
| Overdue promises | Something outstanding between you |

**Needs Attention** is the full queue of everyone not personally on track, worst first — filter by
grace, overdue, seriously overdue, campaign-only, no personal touch, active loan, or open promise,
and narrow by territory when planning a trip. **Institutions** shows every contact you have at a
bank plus their combined activity — useful for spotting a bank where you know one person and should
know three.

## Settings & import

- **Contact goal and grace** — the 30 and 10. If a month is too aggressive across 120 people, raise
  the goal rather than living with a permanently red dashboard.
- **Weekly list sizes** — Top and On Deck counts, ten and ten by default.
- **Your name and home base**, and **daily digest** on/off plus time.
- Settings also holds **Import**, **CSV export**, and on/off status for Microsoft 365, AI drafting,
  and digest email.

**Importing your real list** runs in four steps and saves nothing until the last: upload the file →
correct the column matching it guessed → review the count, likely duplicates, and suggested tags
pulled from your notes column (mention golf or BYU and it offers to file those as personal details;
your original note text is always kept) → import and get a report. If sample data is still present it
offers to clear it first, so demo and real lenders never mix.

## Safety net

- **Nothing deletes immediately.** Deleting moves a record to **Trash**, restorable for 90 days.
  Delete the wrong lender and their whole history returns.
- **Your data is exportable** — one-click CSV for lenders, institutions, activities, tasks, promises,
  referrals, and active loans.
- **Private by default.** The database enforces per-person access at its own level, not just in the
  app. An audit log records what changed and whether it was you, the assistant, or automation.
- **On your phone:** open the site and use *Add to Home Screen*. It installs like an app, which makes
  the "log that call from the car" habit realistic.

## How do I…

| Task | Where |
|---|---|
| Log a call I just had | Profile → Log activity → Call |
| Add a lender | Add, or Lenders → New. Checks duplicates as you type. |
| Record something I owe | Profile → Add promise → I promised → due date |
| See who's slipping | Needs Attention, or the Overdue band on the status bar |
| Plan a St. George trip | Needs Attention → territory Southern Utah |
| Book a tentative lunch | Schedule on their weekly-list row |
| Write up a meeting | Dashboard → Capture notes |
| Note that someone moved banks | Profile → Changed banks? |
| Rebuild this week's list | Start weekly outreach in the banner |
| Undo a deletion | Trash → Restore (90 days) |
| Get my data out | Settings → Export your data |
| Change the 30-day goal | Settings → Contact goal and grace |

## What's live

So you don't hunt for a screen that isn't built.

| Area | State | Notes |
|---|---|---|
| Dashboard, coverage, weekly list | Working | Everything above |
| Lenders, institutions, profiles | Working | Search, timelines, bank changes |
| Promises, tasks, Needs Attention | Working | Both directions, filters |
| Meetings | Working | Tentative holds, notes, brief status |
| Loan update tracking | Working | Weekly touch, logging |
| Import, export, trash, audit | Working | Full wizard, 90-day restore |
| AI drafting in your voice | Needs key | Anthropic, a few dollars a month. Today it powers *Ask assistant* and nothing else. |
| Daily digest by email | Needs key | Resend. The summary shows in the app either way. |
| Real Outlook drafts & calendar | Needs IT | Microsoft 365 registration and admin consent at IMBL |
| Your writing voice | Not built | Storage ready; needs the screen to paste samples |
| Annual goal | Not built | Read on the dashboard; no screen to set it |
| Referral & deal tracking | Not built | Follow-up logic written and tested; no screen |
| Active-loan management | Not built | Visible on the dashboard; can't add or edit loans |
| Campaigns | Not built | Storage ready; no screen, no sending |
| Trip planning | Not built | Shows in the rail if a trip exists; can't create one |
| Meeting briefs | Not built | Status shown; nothing generates them |
| Expenses, reports, drop-offs | Not built | Storage ready; no screens |

None of the "not built" items are hard — mostly screens over tables that already exist. The two worth
doing first are the voice screen and the annual goal, since both improve something you already look
at daily.

## Loose ends

1. **Add the redirect addresses in Supabase** (Authentication → URL Configuration), with the
   `https://` prefix. Until then *Forgot password* fails; signing in normally already works.
2. **Set your annual approval goal** once that screen exists.

Done: the Vercel login wall is off, so the site opens normally on any device and can be installed
to your home screen.

---

One habit carries the system: log the touch while you still remember it. If a week goes by where you
only do one thing, make it pressing **Start weekly outreach** and working the five names.
