# Design — Scripted Fox

Creator Playback is the locked visual system for the complete Scripted Fox product:
landing, authentication, dashboard, editor, ideas, projects, analytics, account,
settings, pricing, and upgrade flows. It uses familiar creator-tool cues without
copying YouTube branding or interface trade dress.

## Genre

Modern-minimal and product-led. The experience should feel like a calm media
workbench: neutral viewing surfaces, strong editorial hierarchy, a sparse warm-red
playback signal, and controls that stay secondary to the creator's work.

## Audience, use, and tone

- Audience: working YouTube creators who want a clearer next upload.
- Primary use: move from channel signals to an idea, then to a record-ready script.
- Tone: direct, capable, familiar, and low-noise.
- Enrichment: none. Product state, real data, and the script are the visual interest.

## Macrostructure family

- Marketing: Workbench — a product preview and outcome timeline carry the story.
- App: Media Workbench — a creator rail beside a wide, task-specific canvas.
- Editor: document workspace with a persistent conversational assistant.
- Authentication: Authentication Diptych — focused access card plus product proof.

## Theme

Light and dark modes share one semantic system. The first visit follows the device;
the local choice then persists across public, authentication, and app routes.

- Light paper: `oklch(98.5% 0.003 25)`
- Light surface: `oklch(99.5% 0.002 25)`
- Light muted surface: `oklch(95% 0.004 25)`
- Light ink: `oklch(18% 0.006 25)`
- Light muted text: `oklch(48% 0.006 25)`
- Light rule: `oklch(86% 0.006 25)`
- Dark paper: `oklch(13.5% 0.006 25)`
- Dark surface: `oklch(17% 0.006 25)`
- Dark muted surface: `oklch(21% 0.006 25)`
- Dark ink: `oklch(94% 0.004 25)`
- Dark muted text: `oklch(68% 0.004 25)`
- Dark rule: `oklch(29% 0.006 25)`
- Playback signal: light `oklch(58% 0.23 25)`, dark `oklch(64% 0.2 25)`

Warm red is a signal, not the primary button fill. It is reserved for progress,
active navigation marks, focus, recording/playback cues, and small data emphasis.
Primary actions use the current ink colour so the interface remains product-like.

## Typography

- Dashboard display, body, and controls: Manrope Variable, compact and highly legible.
- Marketing surfaces may retain their existing display treatment independently.
- Utility and measurements: Cascadia Mono, used only for actual data or sequence.
- Headings use sentence case. Decorative eyebrow copy is avoided.
- Dashboard page headings remain below `2.75rem`; marketing display may be larger.

## Shape and spacing

- Controls are compact pills; content panels use a consistent 1rem radius.
- The four-point spacing scale in `tokens.css` is the only spacing vocabulary.
- Pages use a wide canvas with strong inner alignment and limited nested surfaces.
- The sidebar has one exact icon slot so expanded and collapsed modes align.

## Motion and states

- Motion explains state only: theme crossfade, drawer movement, loading, and progress.
- Buttons move by at most one pixel on press; cards never lift.
- Loading appears immediately in the mounted destination route.
- Empty, unavailable, and disconnected states remain explicit and truthful.
- Reduced motion collapses spatial transitions to effectively instant feedback.

## CTA voice

- Primary: neutral ink pill with a specific verb.
- Secondary: surface pill with a visible rule.
- Signal action: warm red only when the action is inherently playback/recording.
- Quiet action: text and a Lucide icon; icon-only controls require an accessible name.

## Shared component rules

- The clapperboard mark, condensed headings, button voice, focus ring, form geometry,
  surface hierarchy, and theme switch are shared across every product route.
- Active navigation uses a soft surface plus one warm-red datum.
- Status is plain domain language, never a candy-coloured badge.
- Use surfaces only for containment; avoid card-in-card layouts.
- Lucide is the only icon family.
- Authentication never requests YouTube scopes; channel connection remains separate.

## Page-specific allowances

- Editor may use a centered document canvas and a persistent assistant panel.
- Ideas retain long horizontal evidence rows rather than generic card tiles.
- Analytics may use restrained bars when they clarify a written conclusion.
- Landing may use a 16:9 planning preview and playback timeline as its signature.

## Exports

### tokens.css

The source of truth lives in `tokens.css`. The app-facing subset is:

```css
:root {
  --app-color-paper: oklch(98.5% 0.003 25);
  --app-color-surface: oklch(99.5% 0.002 25);
  --app-color-surface-muted: oklch(95% 0.004 25);
  --app-color-ink: oklch(18% 0.006 25);
  --app-color-ink-2: oklch(32% 0.006 25);
  --app-color-muted: oklch(48% 0.006 25);
  --app-color-rule: oklch(86% 0.006 25);
  --app-color-rule-strong: oklch(72% 0.008 25);
  --app-color-accent: oklch(18% 0.006 25);
  --app-color-accent-ink: oklch(98.5% 0.003 25);
  --app-color-focus: oklch(58% 0.23 25);
  --app-color-signal: oklch(58% 0.23 25);
  --font-display: "Manrope Variable", "Segoe UI Variable Text", "Segoe UI", sans-serif;
  --font-body: "Manrope Variable", "Segoe UI Variable Text", "Segoe UI", sans-serif;
  --font-outlier: "Cascadia Mono", "Segoe UI Mono", ui-monospace, monospace;
  --radius-card: 1rem;
  --radius-input: 999px;
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --color-app-paper: oklch(98.5% 0.003 25);
  --color-app-surface: oklch(99.5% 0.002 25);
  --color-app-surface-muted: oklch(95% 0.004 25);
  --color-app-ink: oklch(18% 0.006 25);
  --color-app-muted: oklch(48% 0.006 25);
  --color-app-rule: oklch(86% 0.006 25);
  --color-app-signal: oklch(58% 0.23 25);
  --font-display: "Manrope Variable", "Segoe UI Variable Text", "Segoe UI", sans-serif;
  --font-body: "Manrope Variable", "Segoe UI Variable Text", "Segoe UI", sans-serif;
  --font-outlier: "Cascadia Mono", "Segoe UI Mono", ui-monospace, monospace;
  --radius-card: 1rem;
  --radius-input: 999px;
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "app-paper": { "$value": "oklch(98.5% 0.003 25)", "$type": "color" },
    "app-surface": { "$value": "oklch(99.5% 0.002 25)", "$type": "color" },
    "app-ink": { "$value": "oklch(18% 0.006 25)", "$type": "color" },
    "app-muted": { "$value": "oklch(48% 0.006 25)", "$type": "color" },
    "app-rule": { "$value": "oklch(86% 0.006 25)", "$type": "color" },
    "app-signal": { "$value": "oklch(58% 0.23 25)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Manrope Variable, Segoe UI Variable Text, Segoe UI, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "Manrope Variable, Segoe UI Variable Text, Segoe UI, sans-serif", "$type": "fontFamily" },
    "utility": { "$value": "Cascadia Mono, Segoe UI Mono, ui-monospace, monospace", "$type": "fontFamily" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 98.5% 0.003 25;
  --foreground: 18% 0.006 25;
  --card: 99.5% 0.002 25;
  --card-foreground: 18% 0.006 25;
  --primary: 18% 0.006 25;
  --primary-foreground: 98.5% 0.003 25;
  --secondary: 95% 0.004 25;
  --secondary-foreground: 32% 0.006 25;
  --muted: 95% 0.004 25;
  --muted-foreground: 48% 0.006 25;
  --accent: 94% 0.03 25;
  --accent-foreground: 18% 0.006 25;
  --border: 86% 0.006 25;
  --input: 86% 0.006 25;
  --ring: 58% 0.23 25;
  --radius: 1rem;
}

.dark {
  --background: 13.5% 0.006 25;
  --foreground: 94% 0.004 25;
  --card: 17% 0.006 25;
  --card-foreground: 94% 0.004 25;
  --primary: 94% 0.004 25;
  --primary-foreground: 13.5% 0.006 25;
  --secondary: 21% 0.006 25;
  --secondary-foreground: 83% 0.004 25;
  --muted: 21% 0.006 25;
  --muted-foreground: 68% 0.004 25;
  --accent: 24% 0.04 25;
  --accent-foreground: 94% 0.004 25;
  --border: 29% 0.006 25;
  --input: 29% 0.006 25;
  --ring: 64% 0.2 25;
}
```
