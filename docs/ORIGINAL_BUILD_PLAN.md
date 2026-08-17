<!--
The original request, kept verbatim. Two documents from August 3, 2026: the
build plan and the enhancements addendum. This is the reference the build is
measured against, not a spec to edit — for the working spec see
docs/lender_crm_build_spec.md.
-->

# Banker Relationship Assistant: Build Plan

Prepared for Brandon Toynbee, Loan Officer / BDO, InterMountain Business Lending
Coverage: Salt Lake City and St. George
Date: August 3, 2026

---

## The short version

Build a small full-stack web app that you own and grow inside Claude Code. Its heart is a real banker database (replacing the "names only" spreadsheet). Around that database sit four jobs: draft outreach in your voice, send it automatically from your Outlook, read the replies, and get meetings onto your calendar with your approval. A monthly "St. George trip" planner sits on top to fill your travel weeks.

The stack is chosen to be beginner friendly, cheap, and something Claude Code can generate well:

- Microsoft Graph API for Outlook email and calendar (free with your Microsoft 365)
- Microsoft Bookings for the self-service scheduling link (included with your Microsoft 365, so no Calendly bill)
- Supabase for the database (free to start)
- Vercel to host the app (free to start)
- Anthropic Claude API as the AI that writes and reads emails (a few dollars a month at your volume)
- Next.js (React) as the app itself (what Claude Code builds)

You can stand this up for roughly zero dollars while you learn, and it settles around 25 to 45 dollars a month once fully scaled. Build it in phases so you get value in week one instead of waiting for the whole thing.

---

## How the system works

Think of it as five parts feeding each other:

1. The banker database. Every banker: name, email, institution, city (SLC or St. George), relationship stage, last contact, last meeting, preferred activity, and notes. This is the single source of truth.

2. Outreach drafting. When it is time to reach out, Claude drafts a short, personal email in your voice ("I will be in St. George the week of the 14th, any interest in golf Tuesday or lunch Wednesday?"). It varies by banker and by how well you know them.

3. Send and monitor. The email goes out from your real Outlook address, so it looks and feels like you sent it. The app watches that thread for a reply.

4. Read and book. When the banker replies, Claude reads the free text, figures out the intent (yes, no, a proposed time, a different activity), checks your calendar for conflicts, and prepares a calendar invite. Because you chose "approve bookings," it holds that invite for your one-click approval before it lands and the invite goes out.

5. Scheduling intelligence. On top of the daily flow sits the trip planner. For your monthly St. George week, it filters to St. George bankers, spreads outreach across the days, avoids double booking, and leaves drive and buffer time between meetings.

The daily loop, once running: the app wakes up, checks for new replies, prepares any bookings for your approval, sends any scheduled follow-ups to people who went quiet, and surfaces who is overdue for a touch. You glance at a dashboard, approve a few things, and move on.

---

## The banker tracker (data model)

This is the part you specifically want built in code. Here is a clean starting schema. Each item below becomes a table.

Institutions: id, name, type (bank or credit union), city, notes.

Bankers: id, first name, last name, email, phone, institution id, city (SLC or St. George), title, relationship stage (new, warming, established, key), preferred activities (golf, lunch, breakfast, drop in), last contact date, last meeting date, next touch due date, notes.

Interactions: id, banker id, date, type (email out, email in, call, meeting, drop in), summary, linked outreach id or meeting id.

Outreach: id, banker id, channel (email), subject, body, status (drafted, sent, replied, booked, no reply, follow up sent, closed), sent date, thread reference, reply text.

Meetings: id, banker id, activity (golf, lunch, breakfast, drop in), datetime, location, city, status (proposed, approved, on calendar, completed, canceled), calendar event id, estimated cost, trip id (nullable).

Trips: id, city (St. George), start date, end date, target meeting count, status (planning, active, done), notes.

Venues: id, city, type (golf course, restaurant, coffee), name, notes, typical duration. This helps the AI suggest real places instead of generic ones.

Two design notes. First, "next touch due date" is what powers the "who is overdue" view, which is where a lot of the value lives. Second, the "estimated cost" and "activity" fields on meetings give you a clean entertainment record, which matters for compliance (see below).

---

## The tool stack (what to get, what it costs)

Microsoft Graph API. This is Microsoft's official way to read and send Outlook mail and read and write your calendar from code. It is free and comes with your Microsoft 365. You register an app in your Microsoft Entra (Azure AD) admin area and grant it permission to your mailbox and calendar. Because you said you have latitude on M365, this should be within reach, though it is worth a quick confirmation that you can register an app (details in the "what to check" section).

Microsoft Bookings. This is Microsoft's built in scheduling page, the equivalent of Calendly, and it is included with Microsoft 365 Business Standard and Business Premium. You get a booking link tied to your calendar for free. Use this for the "link" path in your mix: routine touches get your Bookings link, key relationships get the personal back and forth.

Supabase. A hosted Postgres database with a friendly dashboard and built in login. The free tier is enough to build and run a personal tool like this. When you outgrow it, the Pro plan is 25 dollars a month.

Vercel. Where your Next.js app lives on the web. The Hobby tier is free for personal projects. If you later need the Pro tier it is about 20 dollars a month per user.

Anthropic Claude API. The brain that drafts and reads emails. Claude Haiku 4.5 runs about 1 dollar per million input tokens and 5 dollars per million output tokens. At your volume (a few hundred emails a month plus reply parsing) this is a few dollars a month, not more. Use Haiku for the routine work and step up to Sonnet only for trickier drafting if you want.

Next.js. The React based framework your app is written in. This is what Claude Code scaffolds and edits for you. No separate cost.

Rough total: about zero dollars while you build and test on free tiers, settling around 25 to 45 dollars a month once you are fully scaled and off the free tiers. The Microsoft pieces are already paid for inside your existing 365 subscription.

---

## The workflows in detail

Regular outreach cadence. You set a rule like "every established banker should hear from me every 6 weeks." The app watches "next touch due date," and each morning it drafts outreach for anyone coming due, sends it automatically from your Outlook, and logs it. You do nothing unless you want to review.

Reply handling and booking. Two paths, matching your "mix" choice. On the personal path, the banker replies in free text, Claude reads it, checks your calendar, and stages a specific invite ("Golf, Wednesday 8am, Sky Mountain") for your approval. One click and it books and sends the invite, or you edit the time first. On the link path, your email simply includes your Microsoft Bookings link, the banker self books into a slot you have made available, and the meeting flows straight to your calendar and gets logged automatically with no parsing needed.

The St. George monthly week. You create a Trip with your dates and a target (say, 6 to 8 meetings). The planner filters to St. George bankers, prioritizes the ones most overdue or highest value, and sends a batch of outreach proposing slots across that week. As replies come in, it books them into a sensible daily shape with buffer and drive time, and shows you a live picture of how full the week is and who has not answered yet.

Follow-up nudges. This is the quiet workhorse. If a banker does not reply within, say, 4 business days, the app drafts and sends a light second touch. Most meetings come from the second or third contact, not the first, so automating this is where a lot of your extra meetings will come from.

Approvals. Since you chose auto-send outreach but approve bookings, you need a fast approval surface. The cleanest is a section of your dashboard ("3 bookings waiting"). We can also push these to you by email or text so you can approve from your phone between meetings. We will decide the channel together.

---

## Phased roadmap

Phase 0, foundation (the first sitting). Import your Excel banker list into the Supabase database. Register the Microsoft Graph app and connect it read only so the app can see your calendar. Stand up the empty Next.js app on Vercel. Outcome: your data is real and the plumbing is proven.

Phase 1, the MVP. A dashboard that shows your bankers, who is overdue, and lets Claude draft and auto-send an outreach email from Outlook, then log it. Booking is still manual at this stage. Outcome: you are already sending better, more consistent outreach in week one.

Phase 2, reading and booking. Add reply monitoring, Claude reply parsing, calendar conflict checks, and the one-click booking approval flow. Outcome: the loop closes, meetings land on your calendar with a click.

Phase 3, trips and follow-ups. Add the St. George trip planner, the automatic follow-up nudges, and the Microsoft Bookings link for the self-service path. Outcome: your travel weeks fill themselves and nobody slips through the cracks.

Phase 4, polish. Analytics (meetings per month, response rates, coverage by city), reminders, and a clean entertainment and cost log you can export. Outcome: you can see and prove your activity at a glance.

---

## What you are still missing (decisions and inputs I need)

Your email voice. The drafts are only as good as the voice they imitate. Send me 3 to 5 real emails you have written to bankers (or tell me your style), and I will build a voice profile so the drafts sound like you, not like a robot.

Your activities and venues. A short list of your go to golf courses, lunch spots, and breakfast places in both SLC and St. George. This lets the AI suggest real places and realistic durations instead of generic ones.

Buffer and drive rules. How much time you want between meetings, and whether St. George days should be clustered geographically. Small rules, big difference in how usable the schedule is.

Approval channel. Whether you want booking approvals to reach you in the dashboard, by email, by text, or by a phone notification. This shapes how the approval step is built.

The spreadsheet itself. When you are ready, share your Excel of banker names, emails, and locations, and I will map it into the database schema above and flag anything missing (like which entries are banks vs credit unions).

---

## Compliance and records (please read)

You are in lending, and meals, golf, and gifts to bank and credit union employees can carry compliance sensitivities on both sides. Two practical points. First, build the habit of logging activity and rough cost per meeting from day one; the data model above already supports this, and a clean record protects you. Second, some institutions cap what their own people can accept, so the assistant should make it easy to note and respect those limits.

I am not a compliance officer or attorney, so treat this as a prompt to confirm the specifics with your firm's compliance or management, and with the institutions you host, rather than as a ruling on what is allowed.

---

## Confidence and caveats

Confidence Level: 0.82. The architecture and the fit to your answers (Microsoft 365, auto-send with approved bookings, a mix of link and personal, a real coded tracker, Claude Code as your build tool) are on solid ground, and the tool choices are mainstream and well documented.

Key Caveats:
- Pricing figures are current as of August 2026 and should be reconfirmed at signup, since SaaS pricing shifts. Verified figures used here: Supabase Pro at 25 dollars a month with a free tier, Vercel Hobby free and Pro around 20 dollars a month, Claude Haiku 4.5 at about 1 dollar in and 5 dollars out per million tokens, and Microsoft Bookings included with Microsoft 365 Business Standard and Premium.
- The Microsoft Graph app registration assumes your account can register an app in Microsoft Entra. "I have latitude" suggests yes, but if your tenant blocks self service app registration you will need a quick sign off from whoever administers your Microsoft 365. This is the one feasibility item worth checking first.
- Sending automated email from your real mailbox is powerful and should start conservatively (low volume, you reviewing the first batches) to protect your sender reputation and your relationships.
- The compliance note is general guidance, not legal or compliance advice.

---

# Banker Assistant: Enhancements and Roadmap Addendum

Companion to the build plan. What else to add, what to borrow from comparable systems, and an honest read on your two ideas (texting and a monthly SBA update).
Date: August 3, 2026

---

## The one reframe that matters most

Systems like yours, at bigger scale, are the loan officer and BDO CRMs (Surefire, Follow Up Boss, BombBomb, and similar). Studied together, they all quietly teach the same lesson: the winners stop measuring activity and start measuring outcomes. Emails sent and lunches booked feel like progress, but the number that actually matters is which bankers send you deals.

So the single highest-value thing to add is referral tracking tied back to the source banker. When a banker refers a deal, you log it against them, and follow it through to funded. Now your database can tell you the thing you cannot see today: which relationships produce, which are all lunch and no loans, and where an hour of your time is worth the most. Everything else in this document is good. This one changes how you spend your week.

Practically, add two things to the data model: a Referrals table (source banker, borrower, date, loan type, stage from referred to funded, amount) and a simple relationship score per banker (touches invested versus deals produced). Your dashboard then surfaces a top-partners view and a "high effort, no return" view, and you reallocate accordingly.

---

## Your two ideas, evaluated honestly

### Text messaging: yes, but be deliberate about which kind

Texting is genuinely valuable here, but not for what people usually reach for. Its sweet spot is the day-of layer: "Confirmed for golf at 8, see you at Sky Mountain," "running 10 late," a same-day "great seeing you, let's do it again next trip." Bankers read texts in minutes and it feels personal. It is a poor tool for cold outreach; keep first contact on email.

The important part is that there are two very different ways to send texts, with very different compliance weight:

1. One to one from your own phone. The app drafts the message and you tap send from your personal cell. This is just you texting a colleague. Minimal compliance friction, maximum warmth. This is where I would start, and for your volume it may be all you ever need.

2. Automated sending through a provider (Twilio and similar). The moment software sends business texts to US numbers, it becomes application-to-person messaging, which in 2026 requires A2P 10DLC brand and campaign registration with the carriers, and consent and opt-out handling under the TCPA. This is true even for business-to-business texting, and unregistered traffic gets filtered or blocked. It is very doable, but it is a setup project with real rules, so save it for when your volume clearly justifies automating reminders at scale.

My recommendation: build texting as "draft and I tap send" first. Add provider-based automated SMS later, only if reminder volume gets high enough to be worth the registration.

### Monthly SBA update to your list: strong yes

This may be the best top-of-mind move you have, because it flips the dynamic. Every other touch asks a banker for time. A genuinely useful monthly update gives them something, and it positions you as the SBA expert they call when a deal is over their head or outside their box. Bankers refer to the person they perceive as the expert, and a consistent, useful update manufactures exactly that perception.

Make it genuinely useful, not a flyer. Rotate content like: what changed in SBA 504 and 7(a) this month (rates, policy, limits), a short "would this deal fit" scenario walkthrough, a real (anonymized) success story from your pipeline, and a quick eligibility reminder a banker can actually use at their desk. Keep it short and skimmable, monthly, same time each month.

Two guardrails. First, compliance: a newsletter to a list falls under CAN-SPAM, so use accurate sender details, include a physical mailing address, and offer an unsubscribe. To a professional referral list this is low risk, but do it correctly. Second, segmentation: keep the newsletter list and your one to one outreach separate in the system so the monthly send never cannibalizes or collides with your personal "let's grab lunch" emails.

---

## What comparable systems do, and what to borrow

The loan officer CRM category has already proven what works in relationship-driven lending, just at a larger, more generic scale. Worth borrowing:

Automated nurture cadences so no relationship goes cold on its own. You already have this in the plan; the category confirms it is the backbone.

Video messaging. Tools like BombBomb built a business on short, personal video messages from loan officers because they dramatically lift response and recall versus plain text. A 20 second "hey, thinking about you, I'll be in St. George in two weeks" video stands out in a banker's inbox. Worth adding as an option for key relationships.

Referral-partner-specific tracking. The serious tools treat referral sources as a distinct, measured group, not just contacts. This is the reframe above.

Trigger-based touches: birthdays, work anniversaries, and especially job changes. A banker moving to a new institution is one of the highest-value events in your world, because it is a warm relationship walking into a new lending shop. A system that flags job changes turns a normal loss into a new door.

Where you can beat them: because you are building custom and AI-native, you get personalized drafting and actual reply understanding that the off-the-shelf tools either charge a premium for or do with clunky templates. Your system can feel handwritten at a scale their mass-blast approach cannot.

---

## The full enhancement menu, by value versus effort

Tier 1, high value and reasonable effort, do these early:

Referral tracking and relationship ROI (the reframe above). Highest payoff in the whole list.

Pre-meeting briefs. Each morning, a short summary of who you are seeing today, their institution, your last interaction, and a talking point or two. Turns you into the person who always remembers the details.

Frictionless post-meeting logging. After a meeting, you send a quick voice note or text, and Claude turns it into a clean logged summary plus the next action and next-touch date. The reason CRMs fail is that logging is a chore; remove the chore.

Going-cold alerts and frequency caps. Flag anyone you have not touched in X days, and cap how often the system contacts each banker so you never over-email a relationship.

The monthly SBA update (your idea) and day-of text confirmations (your idea, the tap-send version).

Tier 2, high value, more setup:

Job-change and LinkedIn monitoring, so a banker moving banks becomes an alert and a warm re-introduction instead of a silent loss.

Territory and route planning, especially for drop-in days and your St. George week, clustering meetings geographically to save driving and fit more in.

Expense and receipt capture. Snap a photo of the golf or lunch receipt and it attaches to the meeting for a clean entertainment record.

Video message option for key relationships.

Provider-based automated SMS (the 10DLC path), if reminder volume grows enough to justify it.

Tier 3, nice to have, later:

Birthday and work-anniversary automation. Direct mail or handwritten-note automation for thank-yous. Local commercial real estate and business-news triggers that hint at referral opportunities. Richer analytics: coverage heatmap by city and institution, response rates, a top-partners leaderboard, and a per-trip ROI recap.

---

## Compliance quick-reference

Texting: one to one from your own phone is just you texting. Automated business SMS through a provider needs A2P 10DLC registration plus TCPA consent and opt-out. Do not text cold; earn the number first.

Newsletter: CAN-SPAM applies. Accurate sender, physical address, working unsubscribe. Low risk to a professional list done correctly.

Entertainment and gifts: keep logging activity and rough cost per meeting, and note any institution that caps what its people can accept. This protects you and it is nearly free to capture as you go.

I am not a lawyer or a compliance officer, so treat these as flags to confirm with your firm and your provider, not as legal rulings.

---

## What I would actually add to the build

If it were mine, the first version would still be the lean MVP from the plan, and then I would fold in, in this order: referral tracking (the reframe), pre-meeting briefs and easy post-meeting logging, going-cold alerts, the monthly SBA update, and tap-send text confirmations. That set gives you outcomes you can measure, a system that is easy to keep fed, and two of your own instincts (text and the SBA update) built in from near the start. The trigger-based and automation-heavy items come after, once the core is part of your daily habit.

---

## Confidence and caveats

Confidence Level: 0.8. The enhancement priorities and the comparison to loan officer and BDO CRMs are well grounded, and the referral-ROI reframe is a durable, category-wide lesson rather than a hunch.

Key Caveats:
- The texting compliance picture (A2P 10DLC and TCPA) is current as of 2026 and applies to automated, provider-sent business SMS; the exact registration steps and whether any low-volume nuance applies should be confirmed with whatever texting provider you would use. One to one texts from your own phone sit outside this.
- The value ranking reflects general best practice for relationship-driven lending, not a guarantee for your specific market; your own referral data, once tracked, is the real judge.
- Compliance notes are general guidance, not legal or compliance advice; confirm specifics with your firm.
