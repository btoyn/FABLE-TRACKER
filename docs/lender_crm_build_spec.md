# Lender Relationship CRM — Product and Build Specification

## Purpose

Build a simple, intuitive, polished CRM for an SBA 504 Business Development Officer whose primary job is maintaining lender relationships, scheduling in-person meetings, drafting personal outreach, sending a monthly personalized mass email, and tracking early deal referrals through handoff to preflight.

This is **not** a loan underwriting or processing system.

The product must help the user stay visible to approximately 120 commercial lenders while balancing substantial desk work analyzing and processing loans.

The CRM must reduce administrative work. It must not become another system that requires constant manual upkeep.

---

# 1. Product Principles

1. **Simple before powerful**
   - One clear primary action per screen.
   - Use plain language instead of traditional CRM jargon.
   - Hide advanced detail until needed.
   - Avoid unnecessary charts and dashboards full of vanity metrics.

2. **Action-oriented**
   - The home screen should tell the user what to do next.
   - Relationship history and analytics should support actions, not replace them.

3. **Human communication**
   - Drafts must sound casual, conversational, and natural.
   - Some lenders may require a warmer, more professional tone.
   - The user always has final approval before an email, calendar invitation, record change, or AI-generated personal message is released.

4. **Outlook remains the email and calendar system**
   - The CRM is not a replacement inbox.
   - The CRM provides relationship context, drafts, scheduling assistance, reminders, and logging.

5. **Privacy by default**
   - Each user has a private workspace.
   - Other users cannot see contacts, notes, opportunities, emails, activities, campaigns, or relationship history.
   - Build multi-user readiness into the database from day one, but launch for one user first.

6. **Low operating cost**
   - Target operating cost under $50 per month for the initial version.
   - Acceptable ceiling under $100 per month only if the Microsoft and AI features provide clear value.
   - Core CRM features must continue working if AI is disabled.

7. **No uncontrolled automation**
   - AI may recommend, prepare, organize, and draft.
   - AI does not silently send, schedule, reclassify, delete, or bulk-edit.
   - Show a preview and require approval for consequential actions.

---

# 2. Target User and Context

## Initial user

An SBA 504 Business Development Officer based in South Ogden, Utah.

Primary lender territories:

- Wasatch Front
- Southern Utah, including Cedar City and St. George
- Northern Utah
- Other Utah markets

The majority of contacts are commercial lenders, with some managers, branch employees, credit personnel, and executives.

Initial lender list:

- Approximately 120 active lenders
- Approximately 1 to 2 new lenders added per month
- Existing data is stored in Excel
- Current spreadsheet fields include:
  - Banker name
  - Email
  - Institution name
  - Some addresses
  - Informal notes such as golf interest or sports affiliation

Future rollout:

- Three additional loan officers may use the system later
- Every user's records must remain private
- No shared notes or activity by default
- Optional deliberate record sharing may be a future feature

---

# 3. MVP Priorities

The first build must prioritize, in this order:

1. Email drafting and campaign preparation
2. Meeting scheduling
3. Relationship tracking
4. Follow-ups, promises, and reminders
5. Mobile meeting-note capture
6. Lightweight early-deal tracking
7. Lightweight active-loan communication tracking

Do not overbuild underwriting, document analysis, closing, funding, or event-management functionality.

---

# 4. Recommended Technical Foundation

Use the existing connected services:

- GitHub repository
- Vercel deployment
- Supabase database and authentication

Recommended application stack:

- Next.js with TypeScript
- App Router
- Supabase Postgres
- Supabase Auth using separate email and password login
- Supabase Row Level Security on every user-owned table
- Vercel deployment
- Responsive web application
- Progressive Web App support for installation on iPhone
- Component system such as shadcn/ui
- Tailwind CSS
- Microsoft Graph integration behind a modular integration service
- AI provider abstraction so models can be changed without rewriting the application
- Background jobs using a low-cost scheduled-function approach compatible with Vercel and Supabase

Do not make Microsoft integration a prerequisite for using the CRM.

The CRM must work in manual mode before Microsoft administrator consent is obtained.

---

# 5. Visual Direction

## Style

A mix of:

- Professional financial-services credibility
- Modern startup polish
- Clean, spacious, intuitive interface

## Initial theme

- Light mode only
- Royal blue primary accent
- White and soft-gray surfaces
- Charcoal text
- Restrained green, amber, and red status colors
- Rounded cards with subtle borders or shadows
- Minimal charts
- Strong typography and clear hierarchy
- Avoid IMBL branding and IMBL blue
- Use a neutral working product name such as **Lender CRM**

## Responsive priorities

Laptop is the primary experience.

Mobile must prioritize:

- Search lender
- Text lender
- Record meeting notes
- View today's priorities
- Complete promises and follow-ups
- Add a lender
- Add a referral
- View meeting brief

---

# 6. Navigation

Use a simple left sidebar on desktop and bottom or compact navigation on mobile.

Primary navigation:

1. Dashboard
2. Lenders
3. Institutions
4. Meetings
5. Outreach
6. Deals
7. Loan Updates
8. Assistant
9. Reports
10. Settings

Avoid adding separate navigation items for every minor feature.

---

# 7. Authentication and Privacy

## Authentication

- Separate CRM email and password
- Password reset
- Secure account recovery
- Session management
- Microsoft 365 connection is separate from CRM login

## Row Level Security

Every user-owned table must include `user_id`.

RLS must ensure:

- Users can only read their own records
- Users can only update their own records
- Users cannot access another user's contacts, activities, notes, campaigns, opportunities, files, or reports
- Admin account management does not automatically provide access to private CRM data

## Soft deletion

- Soft-delete records first
- Recoverable for 90 days
- Permanent deletion after 90 days
- Provide a Trash screen
- Allow immediate permanent deletion when explicitly chosen

## Audit log

Track:

- Entity type
- Entity ID
- User
- Assistant or user action
- Previous value
- New value
- Timestamp
- Action type
- Undo availability

Important records should support version history and undo.

---

# 8. Core Data Model

Use normalized relational tables. Suggested tables are below.

## users

- id
- email
- display_name
- timezone
- home_city
- home_state
- workday_end_time
- created_at
- updated_at

Default timezone: `America/Denver`

Default end of day: `17:00`

## user_preferences

- user_id
- daily_digest_enabled
- daily_digest_time
- weekday_digest_only
- final_missing_notes_email_enabled
- default_contact_goal_days
- contact_grace_days
- weekly_top_count
- weekly_on_deck_count
- default_campaign_batch_size
- ai_enabled
- ai_monthly_spend_limit
- theme

Defaults:

- Digest: weekdays at 8:00 AM Mountain Time
- Contact goal: 30 days
- Grace period: 10 days
- Top list: 10
- On Deck: 10
- Light theme

## institutions

- id
- user_id
- name
- normalized_name
- website
- main_phone
- address
- city
- state
- postal_code
- territory
- notes
- created_at
- updated_at
- deleted_at

## lenders

- id
- user_id
- institution_id
- first_name
- last_name
- full_name
- title
- role_type
- email
- mobile_phone
- office_phone
- address
- city
- state
- postal_code
- territory
- relationship_tier
- manual_tier_override
- relationship_health
- communication_style
- preferred_contact_method
- active
- notes
- created_at
- updated_at
- deleted_at

Role types:

- Commercial lender
- Commercial lending manager
- Branch manager
- Credit or underwriting
- Executive
- Other bank employee

Relationship tiers:

- A
- B
- C
- Unassigned

Communication styles:

- Casual and conversational
- Warm and professional
- Direct and concise
- Formal when needed

## lender_institution_history

Preserve the lender relationship when the lender changes institutions.

- id
- user_id
- lender_id
- institution_id
- title
- start_date
- end_date
- is_current
- notes

## lender_personal_details

- id
- user_id
- lender_id
- category
- detail
- source_activity_id
- captured_date
- is_active_suggestion
- created_at
- updated_at
- deleted_at

Categories:

- Long-term interest
- Life event
- Family
- Sports
- Golf
- Restaurant
- Community
- Communication preference
- Meeting preference
- Follow-up topic
- Other

Personal details never expire automatically.

The assistant may stop actively suggesting a stale life event, but the detail remains until the user removes it.

## activities

Use one unified activity timeline.

- id
- user_id
- lender_id
- institution_id
- opportunity_id
- active_loan_id
- meeting_id
- campaign_id
- activity_type
- direction
- occurred_at
- subject
- summary
- details
- meaningful_touch
- personal_touch
- initiated_by_lender
- counts_for_coverage
- source
- external_id
- created_at
- updated_at
- deleted_at

Activity types:

- Personal email
- Campaign email
- Incoming email
- Text
- Call
- Lunch
- Breakfast
- Golf
- Office visit
- Pop-in
- Drop-off
- General meeting
- SBA question
- Deal conversation
- Loan update
- Note
- Task completed
- Other

Direction:

- Outbound
- Inbound
- Two-way
- Internal

## tasks

- id
- user_id
- lender_id
- institution_id
- opportunity_id
- active_loan_id
- meeting_id
- task_type
- title
- description
- due_at
- status
- priority
- source
- assistant_created
- completed_at
- snoozed_until
- created_at
- updated_at
- deleted_at

Task statuses:

- Open
- Completed
- Snoozed
- Dismissed

## promises

Promises should be more visible than ordinary tasks.

- id
- user_id
- lender_id
- opportunity_id
- active_loan_id
- meeting_id
- direction
- description
- owner_name
- due_at
- status
- completed_at
- created_at
- updated_at
- deleted_at

Directions:

- I promised
- They promised

## meetings

- id
- user_id
- institution_id
- meeting_type
- title
- status
- start_at
- end_at
- location_name
- address
- city
- state
- territory
- confirmed
- tentative
- external_calendar_event_id
- notes_status
- meeting_brief_generated_at
- created_at
- updated_at
- deleted_at

Meeting types and default durations:

- Lunch: 60 minutes
- Breakfast: 60 minutes
- Golf: 150 minutes
- Office visit: 15 minutes
- Pop-in: 15 minutes
- General meeting: custom

Do not include coffee or virtual meeting types in the MVP.

## meeting_attendees

- meeting_id
- lender_id
- response_status
- attended
- personal_touch_awarded

Response statuses:

- Invited
- Awaiting reply
- Tentative
- Confirmed
- Declined
- No response

## meeting_notes

- id
- user_id
- meeting_id
- raw_notes
- cleaned_summary
- input_method
- created_at
- updated_at

Input methods:

- Speech to text
- Typed

## assistant_suggestions

- id
- user_id
- suggestion_type
- related_entity_type
- related_entity_id
- title
- explanation
- payload
- status
- user_feedback
- created_at
- reviewed_at

## weekly_relationship_plans

- id
- user_id
- week_start
- generated_at
- plan_status
- generation_context
- created_at

## weekly_relationship_plan_items

- id
- plan_id
- lender_id
- list_type
- rank
- explanation
- recommended_action
- alternative_actions
- estimated_effort_minutes
- status
- user_feedback
- completed_at

List types:

- Top 10
- On Deck

## opportunities

This is an early referral tracker only.

- id
- user_id
- lender_id
- institution_id
- borrower_name
- estimated_amount
- structure_summary
- property_or_equipment_type
- communication_path
- stage
- received_at
- last_activity_at
- next_follow_up_at
- follow_up_attempt_count
- preflight_handoff_date
- dormant_reason
- created_at
- updated_at
- deleted_at

Communication paths:

- Lender-led
- Borrower-direct
- Shared

Stages:

1. Initial inquiry
2. Sources and Uses sent
3. Needs list sent
4. Documents pending
5. Ready for preflight
6. Handed off to preflight
7. Dormant or no response
8. Closed without handoff

Stop the workflow at handoff to the separate preflight system.

## opportunity_files

- id
- user_id
- opportunity_id
- template_id
- file_type
- storage_path
- internal_only
- sent_to_contact
- created_at
- deleted_at

File types:

- Internal Excel
- Sendable PDF
- Image snippet
- Other

## active_loans

Lightweight communication tracker only.

- id
- user_id
- opportunity_id
- lender_id
- institution_id
- borrower_name
- loan_amount
- stage
- current_blocker
- next_milestone
- update_style
- last_update_sent_at
- next_update_due_at
- sba_approval_date
- approved_sba_amount
- external_system_url
- created_at
- updated_at
- deleted_at

Stages:

- Processing
- Underwriting
- Board approved
- SBA approved

Update styles:

- Brief
- Standard
- Detailed

Once SBA approved, the loan no longer requires weekly updates unless manually kept active.

## active_loan_recipients

- id
- active_loan_id
- recipient_type
- lender_id
- borrower_name
- email
- is_primary
- receives_updates

## campaigns

- id
- user_id
- name
- subject
- body_template
- intent
- status
- audience_filter
- approved_at
- created_at
- updated_at
- deleted_at

Campaign intents:

- Informational
- Response requested
- Meeting outreach
- Event invitation, future-ready but not a full event module

## campaign_recipients

- id
- campaign_id
- lender_id
- first_name
- email
- personalized_intro
- personalization_requires_review
- personalization_status
- queue_status
- batch_number
- outlook_draft_id
- sent_at
- replied_at
- bounced
- excluded_reason

## campaign_batches

- id
- campaign_id
- batch_number
- batch_size
- status
- released_at
- completed_at

## territories

Seed:

- Northern Utah
- Wasatch Front
- Southern Utah
- Other

## trips

- id
- user_id
- name
- territory
- start_date
- end_date
- status
- notes
- created_at
- updated_at
- deleted_at

## trip_targets

- id
- trip_id
- lender_id
- institution_id
- target_type
- status
- suggested_meeting_type
- notes

Target types:

- Group lunch
- Breakfast
- Golf
- Scheduled office visit
- Pop-in candidate
- Backup candidate

## expenses

Keep Expensify as the official reimbursement source.

- id
- user_id
- lender_id
- institution_id
- trip_id
- meeting_id
- category
- amount
- expense_date
- description
- expensify_reference
- reconciliation_status
- created_at
- updated_at
- deleted_at

Categories:

- Lender marketing
- Travel
- Car or mileage
- Meals
- Golf
- Gifts
- Other

## monthly_budgets

- id
- user_id
- month
- year
- category
- budget_amount

## templates

- id
- user_id
- name
- category
- file_path
- version
- active
- created_at
- updated_at
- deleted_at

Start with one master Sources and Uses Excel template and allow more later.

## voice_examples

- id
- user_id
- example_type
- title
- content
- active
- created_at
- deleted_at

Example types:

- Personal outreach
- Scheduling
- Loan update
- Monthly campaign
- Text

## voice_preferences

- user_id
- default_tone
- never_say_phrases
- style_notes
- updated_at

---

# 9. Relationship Coverage Rules

Use a rolling window, not a calendar-month reset.

## Coverage statuses

- **On track:** 0 to 30 days since last valid touch
- **Grace period:** 31 to 40 days
- **Overdue:** 41 to 60 days
- **Seriously overdue:** 61 or more days

All lenders use the same 30-day goal.

Tier A does not have a shorter required cadence.

Tier influences prioritization, not the required window.

## Valid coverage

Count as coverage:

- Personal email
- Incoming lender email
- Two-way email conversation
- Text
- Call
- Lunch
- Breakfast
- Golf
- Office visit
- Pop-in where the lender was actually seen
- SBA question interaction
- Deal conversation
- Active-loan update
- Monthly campaign
- Confirmed future meeting

Do not count:

- Tentative meeting hold
- Unconfirmed meeting proposal
- Gift or flyer drop-off without actual interaction
- Merely viewing a profile
- Internal note

## Coverage categories

Show both:

1. **Visible**
   - Any valid touch, including campaign email

2. **Personally engaged**
   - One-to-one email
   - Incoming email
   - Text
   - Call
   - Meeting
   - Deal conversation
   - Loan update
   - SBA question

A lender may be campaign-covered but still personally overdue.

Confirmed meetings count as covered immediately.

If a confirmed meeting is canceled, restore coverage status based on the last completed valid touch.

---

# 10. Dashboard

The home screen should be action-focused.

## Header

Example:

> Good morning, Brandon  
> 4 follow-ups are overdue, 3 loan updates are due, and 7 lenders need attention.

Top actions:

- Add lender
- Log activity
- Draft outreach
- Schedule meeting
- Ask Assistant

## Core cards

Keep metrics minimal:

- Personal coverage
- Overall coverage
- Overdue relationships
- Meetings scheduled
- Weekly loan update coverage
- SBA approvals year to date

Every card must be clickable and show underlying records.

## Priority order

1. Missing meeting notes
2. Overdue promises
3. Active-loan updates due
4. Scheduling replies awaiting action
5. Weekly Top 10
6. Upcoming meetings
7. Assistant suggestions

## Weekly relationship plan

Show:

- Top 10
- On Deck 10
- Link to full Needs Attention queue

For each lender:

- Name
- Institution
- Territory
- Days since last personal touch
- Last interaction
- Why selected
- Best recommended action
- Alternative actions
- Personal context
- Estimated effort
- Draft
- Schedule
- Text
- Snooze
- Replace
- Complete

Top 10 and On Deck refresh:

- Weekly
- On demand

Keep the weekly list stable during the week.

Do not silently reshuffle it.

Lenders with confirmed meetings should be excluded unless another action is specifically required.

## Full Needs Attention queue

Filters:

- Grace period
- Overdue
- Seriously overdue
- Territory
- Institution
- Campaign-only
- No personal touch
- Active loan
- Open promise

---

# 11. Weekly Top 10 AI Logic

Use AI recommendations with explainable reasoning.

Inputs may include:

- Days since last valid touch
- Days since last personal touch
- Relationship tier
- Relationship health
- Incoming contact
- Active loan
- Open opportunity
- Open promise
- Upcoming trip
- Territory
- Institution
- Confirmed meetings
- Recent campaign coverage
- Personal notes
- Prior response behavior
- User feedback on past recommendations

Rules:

- Exclude confirmed-meeting contacts unless another action is needed
- Do not over-select the same institution unless it is strategically useful
- Mix strong relationships, cooling relationships, and high-potential relationships
- Favor location efficiency during a trip
- Provide one best action and several alternatives
- Explain every recommendation in one or two sentences
- Let the user replace, snooze, or reject the recommendation
- Learn from explicit feedback

Do not use a mysterious single score without explanation.

---

# 12. Lender List and Profile

## Default lender views

- Needs Contact
- Upcoming Meetings
- By Location
- By Institution
- No personal touch
- Campaign-only
- Recently contacted
- St. George candidates
- Salt Lake candidates
- Active-loan contacts
- Overdue promises

## Search

MVP search priority:

1. Lender name
2. Institution
3. Email

Use typo-tolerant autocomplete.

Do not build expensive full-text email search in the MVP.

## Lender profile header

Immediately show:

1. Last contact date
2. Last interaction type and summary
3. Current institution
4. Personal notes and interests
5. Next recommended action

Also surface:

- Upcoming confirmed meeting
- Open promises
- Active loan
- Early referral
- Coverage status
- Relationship tier
- Relationship health

## Timeline

One chronological timeline with filters:

- All activity
- Personal interactions
- Deals and loans
- Notes and promises
- Campaigns

## Institution changes

A lender is a person record independent of institution.

When a lender changes banks:

- Preserve the same lender record
- Update current institution
- Retain institution history
- Preserve all prior meetings, notes, referrals, and activity
- Notify the user that the former institution may need a replacement contact

---

# 13. New Lender Workflow

Required fields:

- Name
- Institution

Optional:

- Email
- Phone
- City
- Territory
- Title
- Notes
- Interests

On save:

- Check for likely duplicates
- Create the record immediately
- Place incomplete records into a Needs Enrichment queue
- Ask for follow-up timing:
  - Next week
  - In 30 days
  - Before next territory trip
  - Custom date
- If skipped, default to 30 days

Do not require event source or who introduced the lender in the MVP.

---

# 14. Excel Import

Create an import wizard.

Required features:

- Upload `.xlsx` or `.csv`
- Column mapping
- Preview
- Duplicate detection by name, email, and institution
- Institution matching
- Preserve original notes
- Suggest structured tags from notes
- Never overwrite without confirmation
- Import report:
  - Added
  - Merged
  - Skipped
  - Needs review
  - Missing email
  - Missing territory

Example note parsing:

- “Likes to golf” -> Golf interest
- “Big BYU guy” -> BYU sports interest

The original note must always remain intact.

## Demo data behavior

Seed the first launch with realistic fictional sample data:

- 20 to 30 lenders
- 6 to 8 institutions
- Multiple territories
- Personal details
- Meetings
- Campaigns
- Opportunities
- Active loans
- Missing notes
- Promises
- Top 10 and On Deck examples
- One sample St. George trip

Clearly label all records as Sample Data.

When the user imports a real Excel lender list:

- Show a confirmation that sample data will be removed
- Automatically delete all sample data after confirmation
- Never mix sample and real records

---

# 15. Meeting Scheduling

## Outlook strategy

Version one:

- CRM drafts scheduling emails
- User approves
- CRM creates Outlook drafts
- User sends from Outlook
- CRM may create tentative calendar holds if Microsoft permissions allow
- No automatic final invitation without approval

## Scheduling flow

1. Select lender or group
2. Choose meeting type
3. Check Outlook availability
4. Suggest 2 or 3 specific times
5. Suggest locations
6. User selects location
7. Create tentative holds
8. Draft email in user voice
9. User approves
10. Create Outlook draft
11. Monitor replies for known CRM thread
12. Suggest selected time
13. User approves final event
14. Create confirmed calendar event
15. Release unused tentative holds

Tentative holds remain until the lender responds or the user releases them.

Do not count tentative holds as coverage.

## Location

The CRM suggests locations, but the user chooses.

Consider:

- Lender office
- User's prior and next calendar locations
- Travel time
- Saved restaurant or golf location
- Lender preference
- Parking
- Business suitability

Create a location library with:

- Name
- Address
- Territory
- Type
- Notes
- Parking note
- Quiet or loud
- Previously used

## Travel time

Use a low-cost map provider.

- Calculate based on actual locations
- Add a parking buffer
- Warn about unrealistic meeting spacing
- Allow manual override
- Do not require live traffic in the MVP

---

# 16. Group Meetings

Support group scheduling as a first-class feature.

Typical use:

- Lunch with several lenders at one institution
- Office visit with one or several lenders
- Institution visit where attendees are added afterward

Rules:

- One scheduling thread
- Equal attendee treatment
- Individual response status
- One calendar event
- Personal-touch credit for every attendee who attends
- Shared notes plus lender-specific notes
- One meeting can cover multiple lender records

---

# 17. St. George Trip Planner

This is important but must remain simple.

## Trip setup

- Enter trip name
- Enter known start and end dates
- Select Southern Utah territory

## Suggested targets

Pull:

- Lenders due soon
- Overdue lenders
- Lenders with active loans
- Lenders with open promises
- Lenders with useful personal follow-up topics
- Institution clusters

Exclude:

- Confirmed meetings already scheduled unless another action is needed

## Statuses

- Invited
- Awaiting reply
- Tentative
- Confirmed
- Declined
- Pop-in candidate
- Backup candidate

## Planning goals

The user normally has four days.

Prioritize:

- Group lunch with several lenders from the same institution
- Golf block
- Scheduled office visits
- Nearby pop-ins
- Minimal backtracking
- Backup candidates for cancellations

Do not build advanced route optimization in the MVP.

---

# 18. Meeting Briefs

Generate a meeting brief two hours before every confirmed meeting.

Show:

- Attendees
- Institution
- Last interaction
- What was discussed
- Personal notes
- Open promises
- Early opportunities
- Active loans
- SBA questions
- Suggested conversation topics
- Items to bring
- Suggested follow-up considerations

For group meetings:

- Shared institution section
- Short section per attendee

Make the brief mobile-friendly.

---

# 19. Post-Meeting Notes

Meeting-note capture is a core feature.

## Reminder sequence

- Immediately when meeting ends
- 30 minutes later if still missing
- 5:00 PM Mountain Time if still missing
- The 5:00 PM reminder appears in the CRM and by email
- Missing notes remain in a queue
- Missing notes appear first in the next 8:00 AM digest

## Note entry

Primary:

- Speech to text using built-in browser or phone speech recognition when possible

Fallback:

- Typed rough notes

Do not require a paid transcription service for the MVP.

## AI extraction

From rough notes, suggest:

- Clean summary
- Personal details
- Interests
- Life events
- Potential opportunity
- I promised
- They promised
- Follow-up date
- Next contact topic

Personal details require approval before being written to the lender profile.

After notes are saved, ask:

> Create follow-up?

Options:

- Draft thank-you email
- Draft text
- Create task only
- No follow-up needed

---

# 20. Texting

The user will keep using a personal iPhone number.

Do not attempt to create a separate business texting number.

## Mobile flow

- Tap Text Lender
- Open native iPhone Messages app using an `sms:` link
- Optionally prefill an AI-suggested message
- User can delete or edit it
- When the user returns, prompt:
  - Log this text?
  - Add summary
  - Skip

The system cannot fully verify that a text was sent.

Be transparent in the UI.

Text activity counts as a personal touch only when the user confirms logging it.

---

# 21. Personal Voice Profile

The user will later provide 5 to 10 real emails and texts.

Build:

- Voice Examples screen
- Example type
- Paste content
- Never Say list
- Tone guidance
- User feedback buttons:
  - Too formal
  - Too salesy
  - Too long
  - Not how I talk
  - Good

Default tone:

- Casual and conversational
- Warm and professional when relationship context calls for it

The assistant should learn from edited drafts when the user explicitly approves that learning.

Do not automatically use personal notes in a draft without showing the user.

---

# 22. Email and Outlook Integration

## CRM is not an inbox

Do not build a full Outlook inbox inside the CRM.

Show only relevant messages linked to:

- Lender
- Opportunity
- Meeting
- Campaign
- Active loan

## Version-one behavior

- Draft inside CRM
- Review beside relationship context
- Approve
- Create Outlook draft
- User sends from Outlook
- Automatically log drafts created through the CRM
- Log known replies when available
- Do not import the entire mailbox

## Manual logging

Future Outlook add-in:

- Log to CRM
- Match lender by email
- Suggest opportunity or active loan
- Count as touch
- Create follow-up task

The Outlook add-in is a later phase.

## Microsoft permission strategy

Request the minimum possible permissions.

Likely features:

- Read availability
- Create and update calendar events
- Create Outlook drafts
- Read messages in CRM-linked threads where technically feasible
- Send only in a later phase

The app must display:

- Features available without Microsoft connection
- Features enabled after user consent
- Features requiring administrator consent

---

# 23. Campaigns and Personalized Mail Merge

Monthly campaigns occur at most once per month.

Most campaigns go to the broad active lender list.

Optional filters:

- Territory
- City
- Institution
- Interest
- Contact role
- Tier
- Active loan
- Open opportunity

## Format

Campaigns should look like a simple personal email, not a polished newsletter.

Use:

- User's Outlook address
- User's signature
- Plain text or simple HTML
- First-name mail merge
- Short subject
- Minimal graphics

## Approval logic

- Approve master message once
- Standard greeting such as “Hi Jake” does not require individual review
- Any AI-generated personal intro requires individual approval
- Explain why the personal intro was suggested
- Never invent familiarity

Example campaign review:

- 108 standard messages approved
- 9 personalized intros require review
- 3 recipients excluded

## Queue

Do not create all Outlook drafts immediately.

Use a CRM queue.

- User approves campaign
- Campaign waits in queue
- User manually clicks Release Next Batch
- Drafts are created in Outlook in controlled batches
- Default batch size can be configurable
- No automatic release
- No direct sending in version one

## Campaign intent

- Informational
- Response requested
- Meeting outreach
- Future event invitation

Informational campaigns do not create a follow-up sequence.

For response-requested campaigns, track replies and only create relevant follow-up actions.

## Compliance basics

Include:

- Unsubscribe status
- Invalid email suppression
- Bounce suppression
- Duplicate prevention
- Do-not-contact option

---

# 24. Content Intelligence

This is not required for the first usable release unless it can be added cheaply after the CRM foundation is stable.

Goal:

- Gather official SBA news
- Review content from strong CDCs outside Utah
- Gather ideas from selected LinkedIn pages
- Draft one monthly lender email in the user's voice
- Optional LinkedIn-ready draft, but do not publish automatically

Rules:

- Prioritize official SBA sources
- Clearly label official fact versus commentary
- Show source URL and publication date
- Flag uncertain or stale claims
- Do not copy another CDC's wording
- Use competitor content only for topic discovery

Start with a manually maintained source watchlist.

Do not build local-market intelligence in the MVP.

---

# 25. Early Deal Tracking

## Quick Deal Intake

Required:

- Borrower name
- Referring lender
- Institution
- Estimated loan or project amount
- Basic structure
- Property or equipment type
- Notes

On create:

- Stage = Initial inquiry
- Credit referral to lender
- Create Sources and Uses task
- Create follow-up date
- Preserve lender relationship attribution

## Sources and Uses workflow

- Duplicate master Excel template
- Complete in Excel
- Save internal workbook
- Create or upload sendable PDF
- Optionally create image snippet
- Attach to opportunity
- Draft email
- Log what was sent

Internal Excel must be clearly labeled and never attached by default.

Send options:

- Full PDF
- Key-section image
- Both

## Follow-up

After Sources and Uses is sent:

- Follow up after 7 days if no response
- Maximum 3 unanswered follow-ups
- Suggested sequence:
  - Day 7: casual check-in
  - Day 14: ask whether deal remains active
  - Day 21: final follow-up and close for now
- Then move to Dormant or No Response
- Reopen automatically when lender responds
- Allow custom future follow-up date

## SBA questions

Track general SBA questions separately from formal opportunities.

Fields:

- Lender
- Topic
- Date
- Response summary
- Follow-up needed
- Later became opportunity

SBA questions count as meaningful personal engagement.

---

# 26. Active Loan Update Center

Keep this lightweight.

## Stages

- Processing
- Underwriting
- Board approved
- SBA approved

## Weekly standard

Every active loan must receive an update at least every 7 days, even if nothing changed.

Friday morning is the preferred update work block, but the calendar block is recommended, not automatically created.

## Update workflow

- Show loans due for update
- User types or dictates rough notes
- Assistant drafts short update in user's voice
- Show previous update beside current draft
- User edits and approves
- Create Outlook draft
- Log update
- Reset next update due date

Update recipients are configurable per loan:

- Referring lender
- Additional bank contact
- Borrower
- Internal contact

Default recipient is the referring lender.

## Update content

Default to short.

The assistant should detect:

- No material change
- Action needed
- Milestone reached
- Problem or delay
- Next step

Allowed AI data:

- Borrower or business name
- General loan amount
- Current stage
- Current blocker
- Next milestone
- Nonconfidential rough notes

Do not send confidential loan documents or sensitive financial information to AI.

---

# 27. Approval Goal Tracking

Company goal:

- Annual SBA approvals
- Approval means SBA approval

The goal changes each year.

## Fields

- Year
- Annual approval goal
- SBA approvals year to date
- SBA approval date
- Approved SBA amount
- Referring lender
- Institution

## Dashboard

Show:

- Annual goal
- Approved
- Remaining
- Pace
- Forecast
- Active loans likely to approve
- Estimated gap

The forecast should improve with historical data but remain explainable.

Closing and funding are outside this tool.

---

# 28. Promises and Follow-Ups

This is a critical feature.

Dashboard sections:

## I promised

- Description
- Lender
- Due date
- Status
- Draft follow-up

## They promised

- Description
- Lender
- Due date
- Status
- Follow-up reminder

Promises remain visible until:

- Completed
- Rescheduled
- Dismissed

Overdue promises appear near the top of the dashboard and daily digest.

---

# 29. Drop-Offs

A gift or flyer left when the lender is unavailable does not count as a completed touch.

Log:

- Lender
- Institution
- Item
- Type
- Approximate cost
- Date
- Who received it
- Follow-up date

Types:

- Gift
- Flyer or marketing material

Create suggested follow-up.

Connect the expense to budget tracking.

---

# 30. Expenses and Budgets

Expensify remains the source of truth.

## MVP

- Manual provisional expense entry
- Monthly CSV import from Expensify
- Duplicate prevention
- Match expenses to:
  - Lender
  - Institution
  - Meeting
  - Trip
  - Campaign
- Mark pending or reconciled

## Monthly budgets

Primary categories:

- Lender marketing
- Travel
- Car or mileage
- Meals
- Golf
- Gifts
- Other

Show:

- Budget
- Actual
- Remaining
- Percent used
- Pending expenses
- Projected month-end

Alerts:

- 75%
- 90%
- 100%

Automatic Expensify API sync is a later phase.

---

# 31. Daily Digest and Notifications

## Weekday digest

Send at 8:00 AM Mountain Time every weekday.

Priority order:

1. Missing meeting notes
2. Overdue promises
3. Active-loan updates due
4. Scheduling replies awaiting approval
5. Weekly Top 10
6. Upcoming meeting preparation
7. Important assistant suggestions

Keep it short.

## Immediate alerts

Use sparingly.

Examples:

- Critical scheduling conflict
- High-priority reply requiring action
- Active-loan update overdue
- Assistant bulk action awaiting approval

## Meeting note alerts

- Immediate in-app
- 30 minutes later in-app
- 5:00 PM in-app and email

Do not add a recurring Friday general cleanup reminder.

---

# 32. Assistant

Provide both:

1. Chat-style assistant
2. Action panel with suggested workflows

Example requests:

- Build my Salt Lake outreach list
- Plan my St. George trip
- Draft emails to this week's Top 10
- Draft active-loan updates due this week
- Show lenders who have not had a personal touch
- Create tentative holds for these meeting options
- Move these opportunities to Documents Pending
- Turn these meeting notes into promises and follow-ups

## Approval and action rules

After explicit instruction and approval, the assistant may:

- Create or update tasks
- Add lender notes
- Suggest or change tiers
- Create Outlook drafts
- Create tentative calendar holds
- Update opportunity stages
- Update active-loan stages
- Create trip targets
- Create campaign personalization

Before action:

- Preview changes
- Show affected records
- Explain consequences
- Require approval

After action:

- Audit log
- Undo when possible

No silent bulk actions.

---

# 33. AI Privacy Boundary

Allowed AI context:

- Lender names
- Institution
- General communication history
- Approved personal notes
- Meeting summaries
- Borrower or business name
- General loan amount
- Loan stage
- Nonconfidential status notes
- User's writing examples

Never send to AI:

- Tax returns
- Financial statements
- Personal financial statements
- Bank statements
- Credit reports
- Social Security numbers
- Confidential loan documents
- Sensitive borrower uploads
- Raw underwriting documents
- Any content marked confidential

Implement:

- AI input preview
- Sensitive-data warning
- Manual confirmation when risk is detected
- Document uploads excluded from AI by default
- AI-off mode

---

# 34. Reports

Keep reports practical.

## Relationship coverage

- Overall coverage
- Personal coverage
- Campaign-only
- Grace period
- Overdue
- Seriously overdue
- Coverage by territory
- Coverage by institution
- Coverage by tier

## Activity

- Personal emails
- Texts
- Meetings
- Lunches
- Breakfasts
- Golf
- Office visits
- Incoming lender contacts
- SBA questions

## Referral performance

- New inquiries
- Sources and Uses sent
- Needs lists sent
- Preflight handoffs
- Handoff rate
- Referrals by lender and institution

## Loan communication

- Weekly update coverage
- Overdue updates
- Update frequency
- Updates by lender

## Production

- Annual SBA approval goal
- Approvals year to date
- Forecast
- Referring lender attribution

## Campaigns

- Sent
- Replies
- Questions generated
- Meetings generated
- Deal inquiries generated
- Bounces
- Unsubscribes

Do not overemphasize open rates.

---

# 35. Backup and Export

Provide:

- Supabase automated backups
- One-click CSV export
- Optional Excel export
- Export all data
- Export filtered views
- Export contacts, institutions, activities, notes, tasks, promises, opportunities, active loans, campaigns, and approvals
- Restore soft-deleted records within 90 days

The user must never be trapped in the platform.

---

# 36. MVP Screens

Build these polished screens first:

1. Login
2. Dashboard
3. Lender List
4. Lender Profile
5. Institution Profile
6. Add Lender
7. Excel Import
8. Weekly Top 10 and On Deck
9. Needs Attention Queue
10. Meetings List
11. Meeting Detail
12. Meeting Brief
13. Meeting Notes Capture
14. Scheduling Composer
15. Outreach Draft Composer
16. Campaign List
17. Campaign Builder
18. Campaign Queue
19. Quick Deal Intake
20. Opportunity Detail
21. Active Loan Update Center
22. Active Loan Detail
23. Assistant
24. Reports
25. Templates
26. Settings
27. Trash
28. Audit History

Do not build empty placeholder screens for later phases.

---

# 37. MVP Acceptance Criteria

The MVP is successful when the user can:

1. Create an account and log in
2. Import the lender Excel file
3. Automatically remove sample data after confirming import
4. Search for a lender by name
5. See last contact, institution, personal notes, and next action
6. View coverage status based on rolling 30 days and 10-day grace
7. Generate Weekly Top 10 and On Deck 10
8. See why each lender was recommended
9. Log email, text, meeting, SBA question, deal conversation, or note
10. Add and track promises
11. Draft personal outreach in the user's voice
12. Create an Outlook draft when Microsoft is connected
13. Suggest meeting times and locations
14. Create tentative calendar holds with approval
15. Confirm group meetings with multiple lender attendees
16. Generate a meeting brief two hours before a confirmed meeting
17. Receive meeting-note reminders
18. Record meeting notes by speech or text
19. Approve extracted personal details and follow-ups
20. Create and manage a monthly mail-merge campaign
21. Approve the master campaign once
22. Individually review only AI-personalized intro lines
23. Release campaign batches manually into Outlook drafts
24. Log an early deal referral
25. Track it through preflight handoff
26. Receive a 7-day reminder after sending Sources and Uses
27. Stop after 3 unanswered follow-ups
28. Track active loans for weekly communication
29. Draft weekly loan updates from rough notes
30. Track SBA approval date and amount manually
31. Receive an 8:00 AM weekday digest
32. Export data
33. Restore deleted records for 90 days
34. Use the core CRM without AI
35. Use the core CRM without Microsoft integration

---

# 38. Phased Roadmap

## Phase 1 — Polished Core MVP

Build now:

- Authentication
- Private RLS-secured data
- Lenders
- Institutions
- Excel import
- Coverage tracking
- Top 10 and On Deck
- Tasks and promises
- Meetings
- Meeting notes
- AI drafting
- Basic Microsoft drafts and calendar if approved
- Campaign queue
- Early opportunities
- Active-loan update tracker
- Daily digest
- Reports
- Demo data
- Exports
- Audit and 90-day recovery

## Phase 2 — Workflow Improvement

Add after MVP proves useful:

- Better Microsoft reply matching
- Improved meeting-time extraction
- Sources and Uses PDF or snippet automation
- Basic map view
- Better St. George itinerary support
- Expensify CSV matching improvements
- Voice-learning from approved edits
- Content watchlist and monthly draft generation

## Phase 3 — Advanced Integrations

Only after proven value:

- Outlook add-in with Log to CRM
- Direct email sending
- Automatic campaign sending controls
- Expensify API sync
- More advanced route planning
- Bank-change detection
- LinkedIn draft or publishing support
- More advanced attribution
- Optional deliberate record sharing

---

# 39. Build Instructions for Claude Code and Fable

1. Read this specification fully before writing code.
2. Create an implementation plan and database migration plan.
3. Build the Supabase schema and RLS policies first.
4. Seed realistic fictional demo data.
5. Build the dashboard and lender workflow before advanced integrations.
6. Use mocked Microsoft integration adapters until credentials and permissions are available.
7. Never block the application because Microsoft is disconnected.
8. Build AI calls behind a provider interface.
9. Add feature flags for:
   - Microsoft integration
   - AI drafting
   - Campaign queue
   - Content intelligence
   - Expense import
10. Keep the UI light, simple, and fast.
11. Use realistic empty states and loading states.
12. Add validation and friendly error messages.
13. Add basic automated tests for:
   - RLS privacy
   - Coverage calculations
   - Meeting-confirmation coverage
   - Campaign approval logic
   - Sample-data deletion
   - Follow-up sequence
   - 90-day soft deletion
14. Do not add features not defined here without explaining the reason.
15. Prefer a working, polished workflow over a broad, unfinished feature set.

---

# 40. Initial Build Sequence

Recommended order:

1. Project setup
2. Supabase schema
3. RLS and authentication
4. Demo seed
5. Lenders and institutions
6. Excel import
7. Activity timeline
8. Coverage engine
9. Dashboard
10. Weekly Top 10 and On Deck
11. Tasks and promises
12. Meetings
13. Meeting notes and reminders
14. Assistant foundation
15. Email drafting
16. Microsoft adapter
17. Campaign queue
18. Opportunities
19. Active-loan updates
20. Reports
21. Exports, trash, audit
22. Mobile and PWA polish
23. Testing and deployment

---

# 41. Final Scope Guardrails

Do not turn this into:

- A full loan origination system
- A preflight underwriting system
- A borrower document portal
- A closing tracker
- An Outlook replacement
- A full event-management platform
- A complex enterprise CRM
- A micromanagement system

The product should remain a **personal lender relationship and communication command center**.

The central test for every feature is:

> Does this help the user remember the relationship, communicate consistently, schedule the next meaningful interaction, or keep a lender informed?

If not, it probably does not belong in the MVP.
