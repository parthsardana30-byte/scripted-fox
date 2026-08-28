# Dashboard Implementation Plan

## 1. Purpose

Build the authenticated working product behind the existing landing page. The landing page remains a public introduction; the dashboard is where creators discover ideas, build video plans, generate and edit scripts, review channel evidence, and manage projects.

Implementation is split into two major stages:

1. **Frontend first:** complete and approve the full dashboard experience using typed mock data.
2. **Backend second:** integrate authentication, Supabase Postgres, YouTube data, AI generation, persistence, exports, and production security.

Backend implementation must not begin until the frontend approval gate is passed, except for defining shared types and service contracts that prevent rework.

---

## 2. Approved product decisions

- Landing and dashboard use separate layouts.
- Landing-page “Sign in” returns the user to the dashboard after authentication.
- Landing-page “Generate script” preserves the entered idea through authentication and opens the editor.
- Dashboard sidebar:
  - Home
  - Script Editor
  - Ideas
  - Projects
  - Channel Analytics
  - Account and Settings at the bottom
- The sidebar is collapsible.
- The Script Editor has one optional right-side AI panel. There is no second permanent content sidebar.
- Video Plan, Script, and Recording Notes are views inside the editor.
- Saved ideas stay inside the Ideas page rather than becoming a navbar page.
- Recommendations show the conclusion first and supporting evidence on demand.
- Initial recommendations: three strong ideas.
- “Generate more ideas” appends three additional ideas.
- “Not interested” removes an idea immediately and shows a short Undo notification.
- Supabase Postgres and Supabase Auth are the planned data and identity platform.
- Google sign-in and YouTube Analytics permission are separate flows.
- YouTube data is stored in the database, not temporary files.
- One server-side AI provider key is acceptable for the MVP.

---

## 3. Experience principles

### 3.1 One job per page

- **Home:** start or resume useful work.
- **Script Editor:** plan, write, improve, and export.
- **Ideas:** decide what to make and understand why.
- **Projects:** find and manage saved work.
- **Channel Analytics:** translate data into creator decisions.

### 3.2 Visual direction

- Treat the dashboard as a calm creator workbench.
- Preserve the landing page’s brand tokens and coral accent while using a separate application shell.
- Use accent color primarily for selected states and primary actions.
- Prefer typography, spacing, dividers, and restrained surfaces over excessive cards and shadows.
- Keep the main working canvas wide.
- Use medium information density: practical but not crowded.
- Make the Script Editor the signature product surface.

### 3.3 Content rules

- Use plain labels such as “Generate script,” “Save idea,” and “Reconnect YouTube.”
- Never show invented metrics, fake trend data, viral scores, or guaranteed performance.
- During frontend development, label sample data as demonstration data.
- Explain errors by stating what happened and what the user can do next.

---

# Stage A — Frontend Implementation

The frontend uses typed mock repositories and service interfaces. Mock data must be replaceable without rewriting page components.

## Frontend Phase F0 — Baseline and architecture

### F0.1 Inspect the current application

- Read `AGENTS.md` and the installed Next.js 16 documentation before using framework APIs.
- Inventory the landing layout, design tokens, components, tests, and placeholder routes.
- Record baseline lint, type-check, test, and production-build results.
- Preserve existing landing behavior and unrelated user changes.

### F0.2 Establish layout boundaries

Recommended route structure:

```text
app/
  (marketing)/page.tsx
  (auth)/
    sign-in/page.tsx
    sign-up/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
  dashboard/
    layout.tsx
    page.tsx
    editor/page.tsx
    editor/[projectId]/page.tsx
    ideas/page.tsx
    projects/page.tsx
    analytics/page.tsx
    account/page.tsx
    settings/page.tsx
```

Adapt the existing route tree safely rather than deleting working routes unnecessarily.

### F0.3 Define domain types

Create TypeScript types for:

- User profile and preferences
- Channel connection and sync state
- Channel insight and evidence
- Video idea and idea status
- Project and project status
- Video Plan
- Script document, section, and version
- Recording note
- AI editor action
- Export format
- Loading, empty, error, and stale-data states

### F0.4 Define mock service contracts

Create replaceable interfaces such as:

- `AuthService`
- `IdeasRepository`
- `ProjectsRepository`
- `AnalyticsRepository`
- `ScriptGenerationService`
- `ExportService`

### F0 completion gate

- Landing and dashboard layouts are structurally separate.
- Types and mock service boundaries exist.
- The frontend runs without database or backend credentials.
- Baseline verification is recorded.

---

## Frontend Phase F1 — Design system and dashboard shell

### F1.1 Extend design tokens

Reuse existing tokens and add only necessary application tokens for:

- Sidebar and canvas surfaces
- Hover, selected, focus, success, warning, and destructive states
- Compact dashboard spacing
- Editor and AI-panel widths
- Mobile navigation
- Dialog, drawer, menu, and notification layers

### F1.2 Build the collapsible desktop sidebar

```text
Logo
New script

Home
Script Editor
Ideas
Projects
Channel Analytics

Account
Settings
```

Requirements:

- Expanded and icon-only states
- Current-route indication
- Tooltips in icon-only mode
- Persistent “New script” action
- Account and Settings anchored near the bottom
- Keyboard navigation and visible focus
- Locally persisted collapse preference during the frontend stage

### F1.3 Build mobile navigation

- Replace the sidebar with a compact mobile pattern.
- Keep “New script” easy to reach.
- Prevent navigation labels from wrapping.
- Ensure menus and sheets fit 320, 375, 414, and 768 pixel widths.

### F1.4 Shared dashboard components

- Page header and actions
- Status indicator
- Skeleton
- Empty state
- Inline notice
- Accessible dialog/drawer/menu
- Notification system: bottom-right desktop, bottom-center above mobile navigation

### F1 completion gate

- Every dashboard route renders inside the shell.
- Sidebar collapse and mobile navigation work without layout jumps.
- The dashboard feels related to the brand but distinct from the landing page.
- Interactive shell elements have all relevant states.

---

## Frontend Phase F2 — Home page

### F2.1 Primary start action

Lead with:

> What do you want to create today?

Include an idea input, “Generate script,” validation, and a secondary path to Ideas. Do not add advanced configuration here.

### F2.2 Continue working

Feature the most recent project with title, current stage, last edit, estimated duration when available, and “Continue editing.”

### F2.3 Recommended next idea

Show one idea with title, angle, short reason, “Generate script,” and a link to all ideas.

### F2.4 Recent projects

Show a short list, not a duplicate of the full Projects page.

### F2.5 New-user checklist

Until completed, show:

- Create the first script
- Connect YouTube for personalized ideas
- Export the first script

The checklist disappears after completion.

### F2 completion gate

- Home clearly motivates the editor.
- New script and Continue editing are dominant.
- New and returning-user states exist.
- There is no generic KPI row or decorative analytics.

---

## Frontend Phase F3 — Script Editor foundation

### F3.1 Layout

Use only:

```text
Collapsible navigation | Main editor canvas | Optional AI panel
```

Closing the AI panel returns its width to the document.

### F3.2 Editor header

- Editable project title
- Autosave status
- Word count
- Estimated video duration
- Version history
- Export
- Distraction-free mode

### F3.3 Editor views

- Video Plan
- Script
- Recording Notes

These remain inside the editor and never become sidebar destinations.

### F3.4 Video Plan

- Strategy
- Intended viewer
- Video promise
- Recommended angle
- Title options
- Thumbnail direction
- Opening hook
- Outline
- Supporting evidence

### F3.5 Script document

- Editable structured document
- Section headings
- Add, remove, reorder, duplicate, and rename sections
- Undo and redo
- Find and replace
- Selection-aware actions
- Keyboard shortcuts
- Clear save and error states

### F3.6 Recording Notes

- Delivery notes
- B-roll suggestions
- On-screen text
- Visual demonstrations
- Pronunciation/emphasis notes
- Teleprompter preparation

### F3 completion gate

- Users move through Plan, Script, and Notes without leaving the editor.
- The document remains the visual priority.
- Prototype state persists locally.
- Keyboard and responsive behavior are verified.

---

## Frontend Phase F4 — AI assistant and professional editing

### F4.1 Right AI panel

- Generate or continue a section
- Improve the hook
- Rewrite selected text
- Shorten or expand
- Change tone
- Add an example
- Check pacing and repetition
- Ask a script-specific question

### F4.2 Selection toolbar

Show a small toolbar only when text is selected. Keep common actions visible and less common actions under “More.”

### F4.3 Generation states

- Ready
- Generating/streaming
- Stop generation
- Successful insertion
- Retryable error
- Usage limit
- Offline

User text must never disappear after a failure.

### F4.4 Version history prototype

- Version list
- Preview
- Restore confirmation
- Automatic version labels

### F4 completion gate

- The product feels like a document editor with AI built in, not a chatbot.
- The AI panel is optional.
- Mock actions include loading, success, cancellation, retry, and failure behavior.

---

## Frontend Phase F5 — Export experience

### F5.1 Formats

- PDF
- Word document
- Plain text
- Markdown
- SRT subtitles
- Copy to clipboard
- Teleprompter view

Google Docs integration is deferred.

### F5.2 Options

- Include/exclude Video Plan
- Include/exclude Recording Notes
- Include section headings
- Subtitle timing method for SRT

### F5.3 Teleprompter

- Full-screen readable script
- Adjustable text size and line spacing
- Scroll speed and pause
- Reduced-motion support

### F5 completion gate

- Export stays discoverable without occupying permanent editor space.
- Frontend-only downloads work where practical.
- Unsupported formats are not presented as functional.

---

## Frontend Phase F6 — Ideas page

### F6.1 Internal views

```text
Recommended | Saved
```

Do not add another navbar page. A Not Interested history view is deferred unless research proves it useful.

### F6.2 Recommendation rows

Show three long horizontal rows initially. Each contains:

- Suggested title
- One-sentence angle
- Suggested format
- Plain-language reason
- Two or three strong evidence points
- “Generate script”
- Save/bookmark
- “Not interested”

Separate evidence into “Your channel” and “YouTube trend signal.” Detailed reasoning expands below the row or opens an accessible drawer.

### F6.3 Saved ideas

- Save updates immediately.
- Saved ideas appear under Saved.
- Unsave does not mean Not Interested.
- Generate Script creates a project and preserves the evidence snapshot.

### F6.4 Not Interested with Undo

1. Remove the row immediately.
2. Show a notification for approximately six seconds.
3. Provide Undo.
4. Restore the idea to its original position.
5. Pause the timer while hovered or keyboard-focused.

### F6.5 More Ideas

- Place “Generate more ideas” after the list.
- Disable it while loading.
- Append exactly three new ideas.
- Avoid duplicates and dismissed angles.
- Offer refinement if no strong additional ideas are available.
- Do not use infinite scroll.

### F6.6 Data states

- Not connected: trend-based ideas and connection CTA
- Initial sync: “Analyzing your channel…”
- Insufficient history: explain the limitation and use available context
- Stale cache: continue showing ideas with last-updated information
- Refresh failed with cache: use cached evidence and allow retry
- No cache: reconnect/retry state
- AI failure: retain existing ideas and choices

### F6 completion gate

- Three initial ideas are easy to compare.
- Rows become structured stacked content on mobile.
- Save, dismiss, Undo, Generate Script, and More Ideas work with mock state.
- Demo evidence cannot be mistaken for real user data.

---

## Frontend Phase F7 — Projects page

### F7.1 Project list

- Title
- Current stage
- Last edited
- Script length/estimated duration
- Source: personal idea or recommendation
- Continue action

### F7.2 Search and filters

- Search
- Status filter
- Sort by last edited or created

Statuses:

```text
Idea → Planning → Writing → Ready to record → Complete
```

### F7.3 Project actions

- Rename
- Duplicate
- Archive
- Delete with safe confirmation or recoverable Undo

### F7.4 Empty state

Direct users to start a script or choose an idea.

### F7 completion gate

- Saved work is easy to find without another scripts/library page.
- Destructive actions are deliberate and recoverable where practical.
- The list remains efficient with larger mock datasets.

---

## Frontend Phase F8 — Channel Analytics

### F8.1 Conclusion-first sections

- What is working
- What is losing viewers
- Topics viewers return for
- Formats that hold attention
- Upload patterns
- Content opportunities
- Recent changes worth noticing

### F8.2 Evidence and charts

- Use charts only when they clarify a conclusion.
- Label date range, metric, units, and comparison basis.
- Identify all Stage A data as demonstration data.
- Avoid vanity-stat rows.

### F8.3 Insight actions

- Create an idea from this
- Use this format
- Improve this opening
- Generate a follow-up video

### F8.4 Connection states

- Not connected
- Connecting
- Syncing
- Connected/current
- Connected/stale
- Permission expired
- Insufficient history
- API unavailable

### F8 completion gate

- Analytics explains what data means rather than copying YouTube Studio.
- Each important insight has a relevant next action.
- Charts have accessible textual summaries.

---

## Frontend Phase F9 — Authentication, account, and settings UI

### F9.1 Authentication screens

- Sign up
- Sign in
- Email verification sent
- Forgot password
- Reset password
- Invalid/expired link
- Signed-out redirect

Primary option: Continue with Google. Secondary option: email and password.

### F9.2 Account placeholder

- Display name
- Avatar
- Email
- Sign out
- Delete-account entry point without implementing deletion yet

### F9.3 Settings placeholder

- Default script preferences
- YouTube connection
- Data and privacy
- Export defaults
- Usage information

### F9.4 Separate YouTube consent

Explain why access is requested, what will be read, how to disconnect, and what works without connection.

### F9 completion gate

- Auth screens are separate from both marketing and dashboard layouts.
- Redirect destination and landing-page intent are represented.
- YouTube connection is never required for basic editor use.

---

## Frontend Phase F10 — Responsive, accessibility, and approval

### F10.1 Responsive verification

Verify 320, 375, 414, 768, 1024, 1440, and wide desktop widths. Focus on navigation, editor/AI panel, recommendation rows, charts, notifications, dialogs, and teleprompter mode.

### F10.2 Accessibility

- Semantic headings and landmarks
- Keyboard-complete navigation
- Visible focus
- Accessible tabs, dialogs, menus, and notifications
- Screen-reader announcements for generation and autosave
- Contrast and touch targets
- Reduced motion
- Chart summaries
- No color-only meaning

### F10.3 Automated tests

- Sidebar collapse/navigation
- Home start/resume flows
- Editor tabs and AI panel
- State preservation after mock failures
- Save idea
- Timed Not Interested Undo
- More Ideas adding three unique rows
- Project filters/actions
- Analytics states
- Auth validation and intent preservation

### F10.4 Browser QA

Run locally, inspect real desktop and mobile states, capture representative screenshots, and correct visual regressions.

### Frontend approval gate

Backend begins only after:

- All frontend routes exist.
- Primary interactions work with mock services.
- Lint, type-check, tests, and build pass.
- Desktop and mobile layouts are directly inspected.
- The user approves the frontend.

---

# Stage B — Backend Implementation

Backend services replace mock services incrementally. Page components should not require structural rewrites.

## Backend Phase B0 — Foundations and security model

### B0.1 Infrastructure

- Supabase Postgres
- Supabase Auth
- Next.js Server Actions and Route Handlers
- Server-only AI provider client
- Google OAuth and YouTube APIs
- Scheduled/background jobs appropriate to hosting

### B0.2 Environments and secrets

Separate development, test, preview, and production. Server-only secrets include the AI key, Supabase service role, Google client secret, YouTube token-encryption key, and job secret.

### B0.3 Data-access layer

- Centralize authenticated database operations.
- Validate external input with Zod.
- Return minimal typed objects.
- Isolate service-role operations.
- Never log secrets, full OAuth tokens, or unnecessarily sensitive prompt content.

### B0 completion gate

- Trust boundaries and secret ownership are documented.
- Example environment files contain names only.
- Each mock domain can be replaced independently.

---

## Backend Phase B1 — Database and migrations

### B1.1 User data

- `profiles`
- `user_preferences`
- `usage_events`

### B1.2 YouTube data

- `youtube_connections`
- `channel_snapshots`
- `video_metrics`
- `creator_profiles`
- `trend_snapshots`
- `sync_runs`

Sensitive OAuth tokens belong in restricted server-only storage, not a browser-accessible table.

### B1.3 Product data

- `ideas`
- `idea_evidence`
- `projects`
- `video_plans`
- `scripts`
- `script_sections`
- `script_versions`
- `recording_notes`
- `exports`

### B1.4 Row Level Security

- Enable RLS on every exposed user table.
- Default deny.
- Permit only rows owned by the authenticated user.
- Test that users cannot access one another’s data.

### B1 completion gate

- Migrations are repeatable.
- Generated TypeScript database types exist.
- Ownership, foreign keys, indexes, retention fields, and timestamps are explicit.
- RLS isolation tests pass.

---

## Backend Phase B2 — Authentication and authorization

### B2.1 Supabase SSR

- Use the current official Supabase cookie/session pattern.
- Configure browser and server clients.
- Implement callback and session refresh.

### B2.2 Methods

- Google identity sign-in
- Email/password signup and login
- Email verification
- Password recovery/reset
- Sign out

### B2.3 Authorization

- Redirect signed-out dashboard navigation.
- Re-check authentication in every Server Action and Route Handler.
- Enforce ownership in the data-access layer.
- Use RLS as defense in depth.

### B2.4 Preserve landing intent

Store a landing-page draft in a short-lived server-side record, associate it after authentication, and restore it in the editor. Do not put long/private drafts in query strings.

### B2 completion gate

- Complete auth lifecycle works.
- Cross-user authorization tests pass.
- Open redirects and session-fixation paths are prevented.

---

## Backend Phase B3 — YouTube authorization and token lifecycle

### B3.1 Separate consent

- Request read-only YouTube scopes only after Connect YouTube.
- Explain access before redirect.
- Cancellation does not block the editor.

### B3.2 Token protection

- Handle provider tokens only on trusted server routes.
- Encrypt refresh tokens before storage.
- Never return refresh tokens to the client.
- Refresh access server-side.
- Detect revoked/expired permission and provide Reconnect.
- Disconnect deletes credentials and relevant private cache according to policy.

### B3.3 Channel identity

- Confirm the connected channel.
- Handle multiple accessible channels if necessary.
- Prevent accidental channel ownership conflicts.

### B3 completion gate

- Google login and YouTube connection remain separate.
- Connect, cancel, reconnect, refresh, and disconnect work.
- Tokens never appear in logs, HTML, analytics, or client responses.

---

## Backend Phase B4 — YouTube sync and creator profile

### B4.1 Initial sync

Fetch only metrics needed for product decisions. Record status, time range, last success, and partial failures.

### B4.2 Refresh policy

- Channel statistics approximately daily
- Recent performance refreshed when stale
- Shared trend snapshots refreshed periodically
- Manual refresh rate-limited
- YouTube quota and retention rules respected

### B4.3 Deterministic analysis before AI

Calculate with normal code:

- Strong topics/formats
- Retention baselines
- Over/under-performing content
- Returning-viewer patterns
- Recent changes
- Confidence and insufficient-data state

### B4.4 Compact creator profile

Store a versioned summary for AI context. Do not send raw channel history with every generation.

### B4 completion gate

- Script generation does not repeatedly refetch all YouTube history.
- Stale cache can be used during refresh.
- Backend states match the frontend’s connection/error states.

---

## Backend Phase B5 — Trend intelligence

### B5.1 Approved sources

Define exact sources, terms, quotas, update frequency, and storage rules. Do not call ordinary search results definitive trends.

### B5.2 Shared snapshots

Cache by niche, locale, and time window. Record source, capture time, and confidence.

### B5.3 Match before AI

Match trends against the creator profile before asking AI to explain or write recommendations.

### B5 completion gate

- Trend evidence is traceable and time-bounded.
- Channel and wider trend evidence remain distinguishable.
- Trend failure does not block script editing.

---

## Backend Phase B6 — AI gateway and cost controls

### B6.1 Central server-only gateway

Own:

- Provider/model selection
- Prompt versions
- Structured outputs
- Streaming/cancellation
- Safe retries/timeouts
- Token/cost records
- Per-user limits
- Abuse prevention
- Redacted logs

One MVP key is acceptable; use separate development and production project credentials where supported.

### B6.2 Minimal context

Send only stable instructions, compact creator profile, relevant evidence, selected/user idea, preferences, and the current section needed for editing. Never send entire analytics tables or every version.

### B6.3 Model routing

If multiple models are available under one account, use a capable model for recommendations/full scripts and an efficient model for short rewrites, formatting, classification, and extraction when quality permits.

### B6.4 Validate output

- Require structured recommendation/plan results.
- Validate before persistence.
- Treat model output as untrusted content.
- Never execute model-produced markup or code.

### B6 completion gate

- AI key never reaches the browser.
- Usage is attributable by user and operation.
- Failures preserve input.
- Token savings come from compact context and reuse, not temporary files.

---

## Backend Phase B7 — Recommendation service

### B7.1 Initial ideas

- Generate three.
- Store idea, evidence snapshot, reason, format, and version.
- Avoid recent, saved, and dismissed duplicates.

### B7.2 More Ideas

- Append three on request.
- Reuse creator/trend cache.
- Send a compact exclusion set.
- Add rate limits and idempotency.

### B7.3 Saved and dismissed

- Save/unsave inside Ideas.
- Dismiss immediately.
- Support short server-side Undo.
- Store dismissal as a preference signal without over-learning from one action.

### B7.4 Generate from an idea

- Create project.
- Preserve idea/evidence.
- Generate Video Plan first.
- Use the plan for the script.
- Do not repeat complete recommendation analysis.

### B7 completion gate

- Initial, More, Save, Dismiss, Undo, and Generate Script work end to end.
- Concurrent requests do not duplicate results.
- Displayed evidence matches the generation snapshot.

---

## Backend Phase B8 — Projects, persistence, and AI editing

### B8.1 Project lifecycle

Create, load, rename, duplicate, archive, restore, and delete with ownership checks and valid status transitions.

### B8.2 Autosave

- Debounce saves.
- Use revision numbers or optimistic concurrency.
- Provide conflict recovery for multiple tabs.

### B8.3 Versions

- Save meaningful checkpoints, not every keystroke.
- Preview and restore.
- Track AI-generated versus user-edited changes where useful.

### B8.4 AI editing

- Send the selected section and necessary context only.
- Stream when helpful.
- Support cancel and retry.
- Validate before applying.
- Provide Undo after applying.

### B8 completion gate

- Work persists across refresh/devices.
- Save conflicts are safe.
- AI failure never destroys manual work.
- Cross-user project access is denied and tested.

---

## Backend Phase B9 — Exports

### B9.1 Server-generated

- PDF
- DOCX
- TXT
- Markdown
- SRT

### B9.2 Client-local

- Copy to clipboard
- Teleprompter view

### B9.3 Export safety

- Authorize ownership.
- Escape content.
- Use safe filenames.
- Apply size/rate limits.
- Expire temporary download objects.

### B9 completion gate

- Every advertised format opens correctly.
- Included sections match user choices.
- Users cannot export another user’s work.

---

## Backend Phase B10 — Production hardening and release

### B10.1 Security review

Use `skills/security-best-practices` for:

- Authentication/authorization on mutations
- RLS coverage
- OAuth state and PKCE
- Redirect allow lists
- CSRF-relevant flows
- Input validation and XSS-safe rendering
- Secret separation and token encryption
- Rate limits and abuse controls
- Dependency/configuration review

### B10.2 Reliability

- Idempotency
- Retry/backoff
- Timeouts
- Stale-cache fallback
- Job observability
- Backup and migration rollback strategy

### B10.3 Monitoring and cost

- AI usage/cost by user and operation
- YouTube quota usage
- Authentication and sync failures
- Generation latency/errors
- Export failures
- Spending caps and alerts

### B10.4 End-to-end flows

1. Sign up and reach dashboard.
2. Create without YouTube.
3. Connect YouTube and sync.
4. Generate three recommendations.
5. Save, dismiss, and Undo.
6. Generate More Ideas.
7. Turn an idea into Plan and Script.
8. Edit manually and with AI.
9. Restore a version.
10. Export all formats.
11. Disconnect YouTube.
12. Verify cross-user isolation.

### B10 completion gate

- Security findings are resolved or explicitly accepted.
- Lint, type-check, unit, integration, end-to-end, and build checks pass.
- Failure states and jobs are observable.
- No real secret exists in source control or client bundles.
- Production has a rollback plan.

---

## 4. Frontend/backend contracts

Define shapes before frontend approval for:

- Authentication state
- Channel connection/sync state
- Recommendations and evidence
- Save/dismiss/Undo
- More Ideas
- Project list/detail
- Video Plan
- Script and versions
- Streaming AI edits
- Analytics insights/chart series
- Export request/result
- Standard errors

Standard errors include a stable code, safe user message, retryability, and optional field errors. They never include stack traces or secrets.

---

## 5. Testing strategy

### Frontend

- Component behavior
- Keyboard interaction
- Responsive visual states
- Accessibility
- Mock success/failure paths
- Controlled timers for Undo

### Backend

- Validation
- RLS and ownership isolation
- OAuth/token lifecycle
- Sync calculations
- Prompt/context construction
- Structured AI validation
- Rate limits/idempotency
- Export correctness

### End to end

- Use test accounts and nonproduction credentials.
- Never commit real creator analytics as fixtures.
- Redact channel IDs, emails, prompts, videos, and tokens from artifacts.

---

## 6. Explicitly deferred

- Team collaboration
- Content calendar
- Community feed
- Template marketplace
- Notifications page
- Standalone AI chat
- Separate Video Plan page
- Separate Saved Ideas page
- Billing implementation
- Direct YouTube publishing/upload
- Google Docs integration
- Dark mode if it delays core work

---

## 7. Overall definition of done

1. Landing and dashboard remain separate.
2. Frontend is completed and approved before backend integration.
3. Home drives creators to start or resume work.
4. Editor includes Plan, Script, Notes, one AI panel, versions, and exports.
5. Ideas includes three justified recommendations, Saved, timed Undo, and More Ideas.
6. Projects manages saved work without unnecessary navigation.
7. Analytics explains decisions rather than repeating raw data.
8. Supabase Auth, Postgres, RLS, and server authorization are tested.
9. Google identity and YouTube access remain separate.
10. Cached YouTube/trend data becomes a compact AI context.
11. AI calls are server-only, minimal, validated, rate-limited, and observable.
12. Responsive, accessibility, security, and failure-state reviews pass.
13. Every advertised export is verified.
14. No invented user data, fake trends, or secrets appear in the product or repository.

---

## 8. Instructions for implementation tasks

1. Read this plan fully before editing.
2. Read `AGENTS.md` and relevant installed Next.js 16 documentation.
3. Complete frontend phases in order and stop at the approval gate.
4. Preserve the landing page and unrelated changes.
5. Announce expected file changes before editing.
6. Use project-local skills in `skills/` when their triggers apply.
7. Use browser control for real visual and interaction QA.
8. Use `security-best-practices` for auth, OAuth, routes, database access, secrets, and final security review.
9. Verify incrementally.
10. Report completed phases, checks, deviations, and remaining work at every handoff.
