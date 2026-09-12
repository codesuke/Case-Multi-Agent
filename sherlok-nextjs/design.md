---
version: "alpha"
name: "Sherlok Investigation Dossier"
description: "A warm, evidence-led investigation workspace derived from the supplied dossier reference screens."
colors:
  primary: "#24160E"
  primary-container: "#382315"
  on-primary: "#F8EBD2"
  secondary: "#745022"
  secondary-container: "#5A3B18"
  tertiary: "#E9D8BB"
  neutral: "#F4E8D0"
  neutral-variant: "#D8C4A0"
  surface: "#FBF2DE"
  surface-container: "#EEDFC2"
  surface-inverse: "#1C120C"
  on-surface: "#1E2831"
  on-surface-variant: "#5C5145"
  outline: "#B89B6E"
  outline-variant: "#D8C4A0"
  accent-teal: "#18AFA3"
  accent-teal-container: "#D5F0E8"
  accent-gold: "#F4B941"
  accent-gold-container: "#F6DEAA"
  accent-plum: "#7B4696"
  accent-plum-container: "#E9D5EA"
  success: "#006B54"
  warning: "#704A00"
  error: "#B3261E"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  h1:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.015em"
  h2:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "1.625rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  body-sm:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "0em"
  label:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.08em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  8: "32px"
  10: "40px"
  12: "48px"
components:
  app-shell:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  workspace:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
  workspace-muted:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
  workspace-dark:
    backgroundColor: "{colors.surface-inverse}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.5}"
  card-muted:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.4}"
  navigation-active:
    backgroundColor: "{colors.secondary-container}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "{spacing.3}"
  button-primary:
    backgroundColor: "{colors.accent-teal}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
  button-warning:
    backgroundColor: "{colors.accent-plum-container}"
    textColor: "{colors.accent-plum}"
    rounded: "{rounded.sm}"
    padding: "12px 20px"
  input:
    backgroundColor: "{colors.primary-container}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: "12px 16px"
  status-success:
    backgroundColor: "{colors.accent-teal-container}"
    textColor: "{colors.success}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  status-working:
    backgroundColor: "{colors.accent-gold-container}"
    textColor: "{colors.warning}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  status-review:
    backgroundColor: "{colors.accent-plum-container}"
    textColor: "{colors.accent-plum}"
    rounded: "{rounded.pill}"
    padding: "6px 10px"
  alert-error:
    backgroundColor: "{colors.surface-container}"
    textColor: "{colors.error}"
    rounded: "{rounded.sm}"
    padding: "{spacing.4}"
  divider:
    backgroundColor: "{colors.neutral-variant}"
    textColor: "{colors.on-surface-variant}"
    height: "1px"
---

## Overview

Sherlok is a desktop-first investigation workspace that feels like a well-kept detective dossier: dark, tactile framing around warm paper records. It pairs editorial authority with practical operational clarity. The visual hierarchy always directs attention to evidence, agent state, and the human decision—not decoration.

## Implementation Rules

- Use shadcn/ui components and Radix primitives as the baseline for controls, then adapt their tokens, radii, borders, and states to this dossier system. Avoid bespoke replacements for standard form controls unless the component cannot support the requirement.
- Use Framer Motion for isolated interactive UI transitions, layout changes, and state feedback. Respect `prefers-reduced-motion` and never make animation the only signal of progress or status.
- Use GSAP only for isolated decorative or scroll-driven experiences that need timeline control. Do not combine GSAP and Framer Motion in the same component tree; clean up GSAP contexts on unmount.

The supplied reference screens define three related views: an evidence workspace, a live orchestration workspace, and a proposed-verdict review. Use real investigation data and case-local evidence IDs; the names, numbers, dates, and identifiers visible in the source images are illustrative only.

## Colors

- **Walnut ink (`primary`)** frames the page chrome, sidebars, dark tables, and search controls. It should read as near-black brown, never flat black.
- **Parchment surfaces (`surface`, `surface-container`, `neutral`)** hold reading-intensive content. Preserve a subtle warm-paper grain or low-opacity texture, but never reduce legibility.
- **Antique gold (`secondary`, `accent-gold`)** signals navigation selection, progress, working states, and restrained emphasis.
- **Teal (`accent-teal`, `success`)** is the default affirmative signal: complete, verified, connected, or accepted. It is reserved for high-value state changes.
- **Plum (`accent-plum`)** marks pending human review and re-investigation actions. **Red (`error`)** is only for uncertainty, risk, or error—not routine emphasis.

## Typography

Use the display serif for the product mark, screen titles, section titles, verdict statements, and short reflective messages. Its high-contrast, literary character establishes the dossier tone. Use the sans-serif family for all operational copy, metadata, controls, tab labels, table cells, and status text.

Body text should be comfortably readable at 15px with 1.5 line height. Labels use compact uppercase tracking only for contextual metadata such as “Active investigation”; do not set long sentences in all caps. Use tabular figures for dates, elapsed times, confidence percentages, and evidence identifiers where supported.

## Layout

Use a persistent left rail (about 200–240px) and a top utility bar (about 60–72px) on wide screens. The left rail contains the wordmark, primary navigation, a short mission line, and a small system-status panel. The utility bar owns search, case selection, theme or notification controls, and the avatar.

The main workspace uses a 12-column grid with 24px gutters and 24–32px outer padding. Evidence and orchestration screens reserve a right-side rail of roughly 300px for agent state, next steps, and activity. The review screen shifts that rail to audit trail and cited evidence. Main content is a two-column card grid where supporting panels share the same visual weight as the primary content.

At widths below 1024px, collapse the right rail below the primary workspace and expose the left navigation as a drawer. Keep search accessible in the top bar. At widths below 640px, stack filters, action buttons, and decision controls vertically; retain the evidence ID beside each claim.

## Elevation & Depth

The interface is primarily flat. Separate layers with 1px warm-gold or muted-tan rules, slight tonal shifts, and a soft 0 8px 24px rgba(20, 11, 5, 0.16) shadow only when a card floats above the workspace. Avoid cool gray shadows, hard black drop shadows, glass effects, or excessive blur.

Use a quiet leather/wood texture in the dark shell and a nearly imperceptible paper grain in light panels. These are background details, not images competing with the case content.

## Shapes

Controls and cards use modest 8–12px corner radii. Pills are reserved for statuses, tags, and confidence labels. Borders are thin and warm; selected navigation has a gold left indicator plus a translucent gold-brown fill. Use simple 1.5–2px line icons with rounded joins, usually in cream, gold, teal, or ink according to context.

## Components

**Navigation.** Group destinations vertically with a leading icon and text. The active item has a gold left rule, dark-gold surface, and brighter type. Section dividers should separate persistent settings from investigation tools.

**Search and filters.** Use dark framed search fields in chrome and compact outlined filters over content. Include a leading search icon and a chevron for dropdowns. Controls should be calm and rectangular, never overly rounded.

**Dossier cards.** Light cards sit on a darker workspace. They have a thin outline, warm fill, editorial title, and generous internal padding. A source-material card combines a document thumbnail, metadata, summary, and an “Open source” action.

**Evidence table and detail.** Show evidence ID, summary, type, source reference, added date, and an overflow action. An expanded row becomes a detail card with statement, source reference, and a three-step traceability checklist. Evidence type badges distinguish observed fact from inference without relying on color alone.

**Agent workflow.** Render the pipeline as connected role cards with a clear directional flow: collection branches into independent analysis, rejoins for scrutiny, then proceeds to synthesis and human review. Completed nodes use teal check marks; working nodes use gold progress; pending review uses plum. Include a linear phase rail underneath for quick orientation.

**Activity and progress.** Progress cards expose both a percentage and plain-language count/time. Activity items are compact cards with agent, state dot, recency, event title, supporting detail, and cited evidence IDs when relevant.

**Verdict review.** Make the proposed verdict a prominent serif callout. Pair it with a confidence badge, ranked evidence-cited reasons, a clearly bounded “what remains uncertain” panel, a suggested next step, audit timeline, and cited-evidence list. Place human decision controls in a persistent bottom action bar; re-investigation requires a visible guidance-note input.

## Do's and Don'ts

Do preserve evidence traceability in every claim, activity item, and verdict rationale. Do make uncertainty explicit and visually distinct. Do use real status language such as completed, working, pending review, and verified. Do keep the human decision clearly separate from the proposed verdict.

Do not use pure white, sterile blue-gray dashboards, neon gradients, heavy glassmorphism, generic chatbot bubbles, or playful detective clichés. Do not treat confidence as certainty. Do not use color as the only indicator of evidence type, agent status, or review state. Do not hard-code reference-case content into reusable UI copy or components.
