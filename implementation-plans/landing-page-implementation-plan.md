# Data-Backed YouTube Creator SaaS — Landing Page Implementation Plan

## 1. Purpose of this document

This plan describes how to design, implement, and verify the public landing page for a SaaS product that helps YouTube creators decide what to make next and generates a personalized video plan and script.

The page must communicate that recommendations and scripts are supported by:

1. The creator's channel performance.
2. The creator's audience behavior.
3. Current activity and opportunities in the creator's chosen niche.

The product must not look or sound like a generic AI script generator, analytics dashboard, SEO tool, or collection of AI utilities.

The primary emotional outcome is:

> “This product understands my channel, knows what is happening in my niche, and helps me confidently make my next video.”

This document is intentionally copy-friendly so it can be pasted into a new Codex task as the implementation brief.

---

## 2. Confirmed technology stack

### Core stack

- Next.js using the App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui for selected accessible primitives
- Lucide React for icons
- Motion for React for purposeful animation
- React Hook Form and Zod for hero input validation
- pnpm as the package manager

### Verification stack

- ESLint
- TypeScript compiler
- Vitest and React Testing Library for focused component tests, if test infrastructure is present or can be added without unnecessary overhead
- Playwright for critical browser flows
- Browser skill/in-app browser for visual inspection at desktop and mobile widths

### Deployment target

- Vercel initially, while preserving compatibility with a later Docker/Linux deployment

### Explicitly out of scope for this landing-page implementation

- Real Google OAuth
- Real YouTube API connections
- Real niche-trend ingestion
- PostgreSQL and Prisma
- Redis and BullMQ
- Real AI script generation
- AI-provider abstraction
- Competitor crawling
- Deep analytics dashboards
- Payments
- User accounts

The landing page may use realistic example data, but examples must be clearly presented as demonstrations and must never imply that real analysis has occurred.

---

## 3. Product and UX principles

These principles are requirements, not optional suggestions.

### 3.1 Lead with the creator's desired outcome

The creator wants to make a successful video. They do not primarily want analytics. Every section should move the story toward a confident, record-ready video.

### 3.2 Keep the first interaction extremely simple

The hero should initially ask only for a video idea. Tone, audience, duration, format, and advanced controls must not compete with the primary action.

### 3.3 Make the intelligence visible

The page must repeatedly and clearly connect the product output to three evidence sources:

- Your channel
- Your audience
- Your niche right now

### 3.4 Use beginner-friendly language

Prefer:

- “What keeps viewers watching” instead of “retention”
- “How often people choose your video” instead of “CTR”
- “What is getting attention in your niche” instead of “trend velocity”
- “Topics you could make next” instead of “content gaps”

### 3.5 Use progressive disclosure

Show the conclusion first. Reveal supporting details when the visitor asks “Why this?” Avoid presenting a dashboard full of metrics.

### 3.6 Do not make unsupported promises

Use “strong opportunity,” “supported by,” and “based on these signals.” Do not promise views, virality, or guaranteed performance.

### 3.7 Avoid a generic AI aesthetic

Do not rely on excessive purple gradients, glowing orbs, robot illustrations, floating chat bubbles, large sparkle icons, or a wall of glassmorphism cards.

The interface should feel editorial, calm, intelligent, and creator-focused. Use one restrained accent color, strong typography, generous whitespace, precise cards, and product-specific evidence patterns.

### 3.8 Motion must explain state or hierarchy

Animations should reinforce interaction, such as:

- Revealing recommendation evidence
- Switching niche examples
- Progressing through analysis steps
- Entering a section as it becomes relevant

Do not animate every heading, card, or decorative element.

### 3.9 Accessibility and responsive behavior are part of completion

The page is incomplete until it works with keyboard navigation, visible focus styles, reduced-motion preferences, sufficient contrast, screen-reader labels, and mobile layouts.

---

## 4. Intended visitor journeys

### Journey A: Visitor already has an idea

1. Visitor enters an idea in the hero.
2. The form validates the input.
3. The visitor is sent to a placeholder `/create` experience or an intentional demo state.
4. The interface explains that the anonymous result uses the idea and niche context.
5. The visitor is invited to connect YouTube to add channel and audience evidence.

### Journey B: Visitor does not know what to make

1. Visitor selects “Find My Next Video.”
2. A dialog explains why channel access is needed.
3. The visitor chooses “Connect YouTube.”
4. During this phase, the button leads to a safe placeholder `/connect` route or clearly labeled coming-soon state.

### Journey C: Visitor is evaluating the product before acting

1. Visitor scrolls through a concise product story.
2. They see a realistic next-video recommendation.
3. They understand the combination of channel evidence and niche activity.
4. They preview the resulting Video Plan and personalized script.
5. They see how the product learns after publication.
6. They review privacy and frequently asked questions.
7. They reach a repeated final call to action.

---

## 5. Proposed page narrative and section order

The final page should use this order unless implementation evidence shows a stronger sequence:

1. Header
2. Hero with idea composer
3. Outcome strip: from uncertainty to ready to record
4. Three-step explanation
5. Personalized recommendation demonstration
6. Generic AI versus data-backed system comparison
7. Video Plan preview
8. Visible script personalization example
9. Learning loop
10. Cross-niche examples
11. Privacy and channel-control section
12. Final call to action
13. FAQ
14. Footer

Each section must have one job. If two sections communicate the same idea, combine or remove one.

---

## 6. Proposed information architecture and files

Adapt this structure to the repository if an application already exists. Do not overwrite existing user work.

```text
app/
  page.tsx
  layout.tsx
  globals.css
  create/
    page.tsx
  connect/
    page.tsx

components/
  landing/
    site-header.tsx
    hero-section.tsx
    idea-composer.tsx
    outcome-strip.tsx
    how-it-works-section.tsx
    recommendation-demo.tsx
    evidence-list.tsx
    comparison-section.tsx
    video-plan-preview.tsx
    personalization-section.tsx
    learning-loop-section.tsx
    niche-examples.tsx
    privacy-section.tsx
    final-cta.tsx
    faq-section.tsx
    site-footer.tsx
  ui/
    ...selected shadcn primitives only

content/
  landing.ts

lib/
  landing-schema.ts
  utils.ts

tests/
  landing-page.spec.ts
```

### Component rules

- Keep copy and demo data in a typed content module where practical.
- Keep sections independently reusable and easy to rearrange.
- Use server components by default.
- Add `"use client"` only to components that genuinely require browser state, such as the idea form, dialogs, tabs, niche selector, or animated interactions.
- Do not convert the whole landing page into one large client component.
- Do not create abstractions for components used only once unless the abstraction improves readability or accessibility.

---

## 7. Execution phases and subphases

# Phase 0 — Repository audit and implementation alignment

## 0.1 Inspect the workspace

- Identify whether a Next.js project already exists.
- Inspect `package.json`, app structure, TypeScript configuration, Tailwind setup, installed UI libraries, and scripts.
- Inspect existing styles, components, assets, and routes.
- Check the Git working tree and preserve unrelated user changes.
- Determine whether the page is a new build or an addition to an existing product.

## 0.2 Confirm implementation assumptions from local evidence

- Use the existing package manager if the repository already has a lockfile.
- Preserve the current Next.js version unless a change is necessary.
- Reuse existing design tokens and components when they fit the brief.
- Do not reinstall or duplicate packages unnecessarily.

## 0.3 Establish a verification baseline

- Run the existing lint, type-check, test, and build commands before editing.
- Record existing failures so they are not mistaken for regressions.

### Phase 0 completion criteria

- Existing project structure and constraints are understood.
- Unrelated changes are identified and preserved.
- A baseline build/test status is known.

---

# Phase 1 — Creative direction and design system

## 1.1 Define the visual direction

Create a compact visual brief before coding substantial sections:

- Product personality: calm, intelligent, decisive, creator-focused
- Visual tone: editorial SaaS rather than futuristic AI tool
- Primary emotional signal: confidence
- Secondary signal: clarity
- Avoid: generic neon AI imagery and dense analytics dashboards

If visual exploration is needed, use the visualization skill for a page composition or component study. Use image generation only if a custom raster illustration is genuinely necessary. Prefer product UI and code-native graphics over decorative generated artwork.

## 1.2 Define design tokens

Establish:

- Background and surface colors
- Primary text and muted text colors
- One main accent color
- Success/opportunity color used sparingly
- Border colors
- Focus-ring color
- Section spacing scale
- Border radii
- Shadows
- Maximum content widths
- Typography scale

Use CSS variables so future dashboard pages can share the same system.

## 1.3 Typography

- Choose a highly readable interface typeface.
- Use a display treatment only if it remains calm and legible.
- Keep line lengths controlled.
- Use strong contrast and a clear hierarchy.
- Avoid oversized hero copy that pushes the product interaction below the fold on common laptop screens.

## 1.4 Build shared primitives

Create or configure only what is required:

- Button variants
- Text input/textarea
- Badge/evidence chip
- Card surface
- Dialog/drawer
- Tabs
- Accordion
- Tooltip where a label genuinely needs clarification

### Phase 1 completion criteria

- Tokens exist in code.
- Buttons, inputs, focus states, cards, and typography are visually coherent.
- The visual direction does not resemble a generic AI generator.
- Light mode is complete. Dark mode is optional and must not delay the page unless the repository already requires it.

---

# Phase 2 — Global shell and responsive header

## 2.1 Page metadata

Implement:

- Descriptive page title
- Product-oriented meta description
- Open Graph metadata placeholders
- Favicon/app icon integration if assets exist
- Semantic language and viewport behavior

## 2.2 Header

Desktop header:

- Brand/logo
- “How it works”
- “See an example”
- “Sign in”
- Primary “Find My Next Video” button

Mobile header:

- Brand/logo
- One primary CTA
- Accessible menu for secondary links if needed

## 2.3 Navigation behavior

- Section links scroll to stable anchors.
- The header should not obscure anchored headings.
- Sticky behavior is optional and should be used only if it improves conversion without reducing content space.

### Phase 2 completion criteria

- Header works by keyboard and on small screens.
- Links lead to valid sections or safe placeholder routes.
- The above-the-fold region remains uncluttered.

---

# Phase 3 — Hero and primary conversion interaction

## 3.1 Hero content

Recommended message direction:

> Your next YouTube video, backed by real data.

Supporting idea:

> We learn what works on your channel and what is gaining attention in your niche—then create your next video plan and script.

Copy may be refined during implementation, but it must preserve the product position.

## 3.2 Idea composer

Build a large, approachable composer containing:

- Visible question: “What do you want to make?”
- Multi-line idea input
- Specific example placeholder
- Clearly labeled “Create My Script” button
- Inline validation
- Enter/keyboard behavior that does not accidentally submit incomplete multi-line text

Do not include tone, audience, platform, or advanced configuration controls in the initial state.

## 3.3 Secondary path

Add:

```text
Not sure what to make? Find My Next Video
```

Selecting it opens a concise explanation dialog:

- The product needs channel access to make a personal recommendation.
- It will combine channel patterns, audience behavior, and niche activity.
- The visitor controls the connection and can disconnect later.

The CTA leads to `/connect` or a clearly labeled placeholder.

## 3.4 Hero visual support

If a product visual is used, show one focused recommendation or evidence preview. Do not place a miniature dashboard beside the composer.

## 3.5 Hero responsive behavior

- Composer must remain the most prominent element on mobile.
- CTA must have a comfortable touch target.
- Headline must wrap intentionally.
- No horizontal scrolling.
- Supporting evidence must not push the primary interaction too far below the fold.

### Phase 3 completion criteria

- A first-time visitor can understand the product in a few seconds.
- Both “I have an idea” and “I need an idea” paths are obvious.
- The form is validated and keyboard accessible.
- No control makes the hero look like a generic writing configuration form.

---

# Phase 4 — Outcome and explanation sections

## 4.1 Outcome strip

Communicate the transformation:

```text
Video opportunity → Strong angle → Title and thumbnail → Personalized script → Ready to record
```

This should feel like one connected journey, not five separate product modules.

## 4.2 Three-step explanation

Build three concise steps:

1. We learn your channel.
2. We study your niche.
3. We build your next video.

Each step should explain outcomes in plain language and use one supporting visual or icon.

## 4.3 Combined-intelligence visual

Create a code-native composition showing:

```text
Your channel + Your audience + Your niche right now → Your next video plan
```

Prefer CSS, HTML, and SVG over raster artwork.

### Phase 4 completion criteria

- Visitors understand how the product gets from data to a usable script.
- Niche analysis is presented as a first-class input, not a minor feature.
- The section is readable without animation.

---

# Phase 5 — Interactive recommendation demonstration

## 5.1 Recommendation card

Create a large, realistic demonstration featuring:

- Recommendation label
- Video title
- One-sentence angle
- Channel evidence
- Niche evidence
- Human-readable opportunity labels
- “Why this?” control
- “Build My Video Plan” CTA

## 5.2 Evidence design

Separate evidence into two clear groups:

### Your channel

- Relevant topics perform better than the creator's usual videos.
- Demonstration-led content keeps viewers watching longer.

### Your niche

- Interest in the topic is increasing.
- Existing coverage leaves a useful angle available.

Use realistic examples without presenting them as live customer data.

## 5.3 Progressive disclosure

“Why this?” should open a drawer, dialog, or expandable region with a plain-language explanation. It must not expose a dense analytics dashboard.

## 5.4 Interaction states

Implement and style:

- Default
- Hover
- Keyboard focus
- Expanded explanation
- Reduced-motion behavior

### Phase 5 completion criteria

- The recommendation feels reasoned rather than randomly generated.
- Channel and niche evidence are visually distinct but clearly combined.
- “Why this?” is accessible and understandable.

---

# Phase 6 — Differentiation and Video Plan demonstration

## 6.1 Generic AI comparison

Create a concise comparison between:

- A prompt-only AI script
- A data-backed Video Plan

Compare outcomes, not technical architecture. The comparison should cover context, angle, structure, memory, and learning.

On mobile, convert the table into stacked comparison cards if necessary for readability.

## 6.2 Video Plan preview

Build an interactive preview with tabs or segmented navigation:

- Strategy
- Title and thumbnail
- Script
- Recording notes

The preview should demonstrate that the output is more than text generation.

## 6.3 Personalized script annotations

Show a script excerpt with explanations such as:

- Short outcome-focused opening because the audience responds better to it.
- Demonstration placed early because this channel retains viewers longer that way.
- Duration aligned with this creator's successful videos.

## 6.4 Empty and static states

The demonstration should work without a backend. Keep sample content in a typed local data structure so it can later be replaced with real API data.

### Phase 6 completion criteria

- Visitors can clearly explain why this is not another script generator.
- Tabs work with mouse, keyboard, and touch.
- Demo content remains concise enough to scan.

---

# Phase 7 — Long-term value, niche breadth, and trust

## 7.1 Learning loop

Show the feedback cycle:

```text
Recommend → Create → Publish → Learn → Improve the next recommendation
```

Include a compact “What we learned” example with both positive and negative lessons.

## 7.2 Cross-niche examples

Build a selectable demonstration for representative niches such as:

- Technology
- Gaming
- Education
- Business
- Lifestyle
- Travel
- Fitness
- Faceless content

Changing the selected niche should update a sample recommendation. Avoid implying that every niche uses identical reasoning.

Use a horizontally scrollable, keyboard-accessible selector on small screens.

## 7.3 Privacy and control

Explain:

- Read-only analysis intent
- Clear permissions
- Ability to disconnect
- How channel information improves recommendations

Do not claim a final permission scope until OAuth implementation confirms it. Link placeholder policy routes only if they exist; otherwise use non-clickable “policy coming before launch” copy during development.

### Phase 7 completion criteria

- The learning loop communicates compounding value.
- Visitors understand that the system can adapt to different niches.
- Privacy copy is accurate and does not overpromise.

---

# Phase 8 — Final conversion, FAQ, and footer

## 8.1 Final CTA

Repeat the main outcome, not the full feature list:

> Stop guessing what to make next.

Provide two routes:

- Primary: Find My Next Video
- Secondary: Create a Script From My Idea

## 8.2 FAQ

Include approximately five concise questions:

- Do I need to connect YouTube?
- How are recommendations chosen?
- Does this work for my niche?
- Can I bring my own idea?
- Does the product publish videos?

Use an accessible accordion and ensure content remains available without animation.

## 8.3 Footer

Include only relevant links:

- Product
- How it works
- Privacy
- Terms
- Sign in
- Brand/copyright

Do not add nonexistent social profiles or customer logos.

### Phase 8 completion criteria

- The visitor encounters a clear CTA after understanding the product.
- FAQs remove major conversion concerns.
- All links have valid targets or are intentionally excluded.

---

# Phase 9 — Responsive design, accessibility, and performance pass

## 9.1 Responsive verification

Verify at minimum:

- 360px mobile width
- 390px mobile width
- 768px tablet width
- 1024px small laptop width
- 1440px desktop width
- A wider desktop view to ensure content does not stretch excessively

Check:

- Header and navigation
- Hero composer
- Dialogs/drawers
- Recommendation evidence
- Comparison section
- Tabs
- Niche selector
- FAQ
- Footer

## 9.2 Accessibility audit

Verify:

- Semantic heading order
- Landmark elements
- Form labels and validation messages
- Keyboard navigation
- Visible focus states
- Dialog focus management
- Tab semantics
- Accordion semantics
- Color contrast
- Touch target sizes
- Reduced-motion support
- No important information communicated only through color

## 9.3 Performance pass

- Keep the page primarily server-rendered.
- Minimize client-side JavaScript.
- Lazy-load noncritical interactive sections where appropriate.
- Avoid large decorative images and videos.
- Use `next/image` for local raster assets.
- Prevent layout shifts by reserving dimensions.
- Load fonts efficiently.
- Remove unused packages and imports.

## 9.4 SEO and sharing

- Verify title and description.
- Add canonical behavior if deployment context requires it.
- Add structured social-preview metadata.
- Ensure page content is meaningful in rendered HTML.

### Phase 9 completion criteria

- No horizontal overflow at target sizes.
- Keyboard-only navigation works.
- Reduced-motion mode is respected.
- Main content remains useful before client-side hydration.
- Lighthouse-style checks reveal no obvious avoidable issues.

---

# Phase 10 — Automated and visual verification

## 10.1 Static verification

Run the repository's relevant commands:

- Lint
- Type-check
- Unit/component tests
- Production build

Do not declare completion with unresolved errors introduced by the implementation.

## 10.2 Critical interaction tests

Test at minimum:

1. Hero rejects empty or unreasonably short ideas.
2. Valid hero input reaches the intended placeholder flow.
3. “Find My Next Video” opens the connection explanation.
4. Dialog can be closed by keyboard.
5. Recommendation reasoning expands and collapses.
6. Video Plan tabs switch correctly.
7. Niche selection updates example content.
8. FAQ items work by keyboard.
9. Mobile navigation is usable.

## 10.3 Browser visual QA

Use the browser control skill to run the application and inspect the actual page. Capture or inspect representative desktop and mobile states.

Review for:

- Visual hierarchy
- Spacing consistency
- Text wrapping
- Alignment
- Overlapping elements
- Unexpected scrollbars
- Hover/focus states
- Dialog placement
- Animation restraint
- Generic-looking AI tropes
- Repeated or redundant copy

Iterate after inspection. Do not rely only on source-code review.

## 10.4 Final regression check

- Rerun lint, type-check, tests, and production build after visual fixes.
- Inspect the Git diff and confirm only intended files changed.

### Phase 10 completion criteria

- All relevant checks pass, or pre-existing failures are clearly documented.
- Desktop and mobile visuals have been directly inspected.
- Critical interactions have automated or repeatable manual coverage.
- No placeholder suggests that real data was analyzed.

---

## 8. Content requirements

### Required concepts

The page must communicate all of these ideas without making every one a separate feature card:

- The product can help when the creator already has an idea.
- The product can recommend what to make when the creator has no idea.
- Channel performance affects recommendations.
- Audience behavior affects script structure.
- Current niche activity affects topic and angle selection.
- The creator can see why an idea was recommended.
- The output includes a Video Plan, not only a block of script text.
- The system learns from published results.
- Connecting YouTube unlocks deeper personalization.
- The creator remains in control of channel access.

### Prohibited positioning

Do not use these as the primary description:

- AI script generator
- AI writing tool
- YouTube analytics dashboard
- YouTube SEO tool
- AI content generator

### Avoid unverified claims

Do not add:

- Invented customer counts
- Invented customer logos
- Invented testimonials
- Guaranteed growth claims
- Fake real-time trend numbers
- Fake YouTube permission claims
- Fake performance predictions

---

## 9. Suggested initial copy directions

These are starting points, not immutable text.

### Hero

**Your next YouTube video, backed by real data.**

We learn what works on your channel and what is gaining attention in your niche—then create your next video plan and script.

### Outcome section

**From “What should I make?” to “Ready to record.”**

### Recommendation section

**Know what to make—and why.**

### Differentiation section

**Not just a prompt. A script built around your channel.**

### Personalization section

**Built for the way your audience watches.**

### Learning loop

**It gets smarter every time you publish.**

### Cross-niche section

**Made for your niche—not one type of creator.**

### Privacy section

**Your channel data stays under your control.**

### Final CTA

**Stop guessing what to make next.**

---

## 10. Design quality checklist

Before calling the page complete, answer yes to each question:

### Positioning

- Can a visitor tell this is for YouTube creators within a few seconds?
- Can they tell the product helps decide what to make?
- Can they tell it writes the resulting script?
- Can they tell channel data and niche analysis support the output?
- Does the page avoid positioning itself as a generic AI writing tool?

### Simplicity

- Is there one dominant action in the hero?
- Can a nontechnical visitor understand every primary label?
- Are advanced details hidden until requested?
- Has redundant copy been removed?

### Visual quality

- Does the design have a recognizable identity without decorative excess?
- Is the accent color used intentionally?
- Are typography and whitespace doing most of the hierarchy work?
- Does each section contain one primary visual idea?
- Does the page avoid looking like a template assembled from unrelated cards?

### Interaction quality

- Do all interactive elements have hover, focus, active, and disabled states where relevant?
- Are animations subtle and purposeful?
- Can all interactions be completed by keyboard?
- Does the page remain clear with reduced motion enabled?

### Technical quality

- Is the page primarily server-rendered?
- Are client components limited to interactive islands?
- Are content and demo data typed?
- Does the production build pass?
- Has the page been visually inspected in a browser at several viewport sizes?

---

## 11. Definition of done

The landing page is complete when:

1. All planned sections are implemented or intentionally removed with a clear product reason.
2. The hero supports both visitor entry paths.
3. The recommendation demo visibly combines channel and niche evidence.
4. The Video Plan preview demonstrates strategy, packaging, script, and recording guidance.
5. The learning loop and channel-control story are clear.
6. The page is responsive, accessible, and visually inspected.
7. Lint, type-check, relevant tests, and production build pass.
8. Placeholder functionality is honest and does not impersonate real analysis.
9. The implementation uses reusable components without unnecessary abstraction.
10. The result feels specific to this product and does not resemble a generic AI script-generator template.

---

## 12. Instructions for the implementation agent

When this plan is pasted into a new Codex task:

1. Read the full plan before editing files.
2. Inspect the repository and preserve existing user changes.
3. Briefly explain the architecture and visual direction before implementation.
4. Execute phases in order, but adapt file paths to the existing project.
5. Use the smallest relevant set of skills:
   - Use browser control for local visual and interaction QA.
   - Use visualization only if a wireframe or composition study materially improves implementation decisions.
   - Use image generation only if a necessary raster asset cannot be better created with HTML, CSS, SVG, or existing assets.
6. Prefer product-native UI demonstrations over decorative stock or AI-generated imagery.
7. Use realistic local example content and clearly label demonstrations.
8. Verify throughout implementation, not only at the end.
9. Continue iterating until the page passes functional and visual checks.
10. In the final handoff, list what was implemented, verification results, any intentional deviations from this plan, and links to the most important files.

