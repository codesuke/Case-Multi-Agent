# Spec: Start Investigation Visual Refresh

Status: **Approved for implementation**  
Initiative: Next.js Investigation Workspace (#1)  
Screen: `/` — New investigation

## Problem

The existing Start Investigation implementation contains the required intake
controls, but its centered, rounded outer container makes the application read
as a floating component rather than a full-screen workspace. Its narrow form
column, duplicate headings, and loose vertical rhythm do not match the
approved `01-start-investigation.png` composition.

## Outcome

At desktop widths, the screen feels like an application from its first pixel:
a full-height walnut introduction rail is anchored to the viewport edge, and a
large parchment intake workspace fills the remaining area. The user can scan
the material flow—paste, add files, review settings, start—in one continuous
reading path without scrolling at a 992px-tall desktop viewport.

## Visual Contract

### Desktop (1024px and wider)

- Use a full-viewport two-column shell. The dark introduction rail is 23rem
  wide; it is not enclosed by the workspace card.
- Pin the parchment workspace to the rail edge and inset it 32px from the top,
  right, and bottom of the right-side dark field. It grows to the available
  width and height and has a 12px radius, a warm 1px border, and a restrained
  shadow.
- Do not apply a page-level maximum width, page-level rounded border, or
  page-level shadow.
- The workspace form uses the available sheet width; it must not be capped by
  a narrow reading-column max width.
- Arrange the form as four visually bounded modules in this order:
  1. Paste case material.
  2. Add case files, then selected-source rows or validation messages.
  3. Run settings and the participant-material notice.
  4. A full-width Start investigation action.
- Keep the title and product promise in the introduction rail. The form does
  not add a second page title or introductory paragraph above the first module.

### Typography

- Use the dossier serif for the wordmark, rail title, and module headings.
- At the 1586px reference width, target approximately 42px for the wordmark,
  50px for the rail title, and 22px for form-module headings.
- Use the sans-serif operational typeface for labels, instructions, metadata,
  warnings, and controls. Body copy is 15–16px with at least 1.45 line height.
- Use compact uppercase labels only for short contextual labels; do not use
  all-caps for instructional sentences.

### Controls and feedback

- Each of the first three modules has its own light parchment surface, warm
  outline, small dossier icon, serif heading, and contextual metadata aligned
  on the right where space permits.
- The textarea is a light inset field to match the approved screen mock-up.
- The dropzone is compact, light, and dashed; it presents a clear file-picker
  action as well as drag-and-drop.
- Source rows show filename, format, state, and a remove action. Source
  validation remains adjacent to its associated list.
- Run settings is a compact disclosure. It keeps the provider selector and
  never exposes credentials or model settings.
- The safety notice says that supplied participant material is investigated and
  that scan/image-only PDFs cannot be processed. It does not claim the browser
  has detected that a selected PDF is image-only.
- The primary action spans the full workspace width on desktop and mobile.

### Responsive behavior

- From 640px through 1023px, stack a dark introduction region above an inset
  workspace with 16–24px outer spacing.
- Below 640px, remove unnecessary sheet margins, stack heading metadata,
  source rows, settings, and actions, and retain touch targets of at least
  44px.
- Preserve the existing keyboard file-picker route, visible focus states,
  live source-status announcements, and non-animation loading text.

## Module Interface and Seams

`StartInvestigation` remains the single interactive module. Its interface to
the page is zero-argument rendering; it owns browser-only material input,
selected files, provider selection, and the existing starting state. The
server-rendered route composes the decorative atmosphere and this module.

The UI does not determine whether a PDF is text-based. That classification is
owned by the Case File Curator behind the existing investigation-start seam.
Until the real command adapter ships, the existing simulated start transition
is explicitly a temporary migration limitation, not visual progress.

## Acceptance Criteria

- At 1586×992, the dark rail touches the left viewport edge and the paper
  workspace occupies the remaining view without a global card frame.
- The form has no desktop `max-width` narrower than the paper workspace.
- Paste, file upload, settings, and start are visibly grouped as four modules.
- The primary action is full width.
- The empty, ready, selected-source, rejected-file, and starting states remain
  usable by keyboard and expose text feedback.
- A selected PDF is not labelled unusable based solely on its browser media
  type.
- No reference-case names, evidence IDs, or conclusions appear in reusable UI.
- `pnpm lint` and `pnpm build` pass.

## Out of Scope

- Wiring Start to the Python command route, real curation progress, and
  backend-originated PDF validation; these remain Slice 3 of the active
  workspace wiring specification.
- Changes to other workspace screens, provider configuration, or the
  investigation transport contract.
