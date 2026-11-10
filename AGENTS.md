# AGENTS.md

For agents working in this repository. It covers two things only: how strict the code has to be, and how visual decisions are judged. Where it conflicts with a general best practice you already know, this file wins.

## 1. Code

### 1.1 Structure

- No CSS and no JavaScript in HTML: no `style` attribute, no `on*` attribute, no inline `style` or `script` block.
- Styles live in the stylesheet, behaviour in external scripts. A page loads a script only if it needs one.
- Anything that can be computed at build time is not computed in the browser. Client scripts handle only what depends on user input or device capability.
- Ask whether the content renders correctly without a script before adding one.

### 1.2 Types

- Hand-written JavaScript is strict TypeScript: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`.
- No `any`. No non-null assertions.
- An assertion is allowed only for a fact the compiler cannot see and the runtime guarantees, with the reason written next to it.
- Never use an assertion in place of a runtime guard. Declaring a value that cannot be null as "possibly null" and then asserting pushes the guard's job onto a lie.
- Browser and Node globals differ. Configure them separately where possible; where merging is not worth it, write a runtime check.
- `tsc --noEmit` has to pass.

### 1.3 Checks

- The strictest lint preset available, with type-aware rules, plus a single formatter. Both run in the code check.
- Code check = types + lint + format. Full check = code check + tests. Build and local preview run the former.
- No `!important`, no vendor prefixes, no `outline: none`.
- No TODOs, FIXMEs or placeholder implementations.
- No dead code: unused exports, variables, selectors, design variables and assets are removed.

### 1.4 Escaping and boundaries

- Templates escape every interpolation. Only values explicitly marked as markup pass through.
- Raw output produced at build time is marked trusted at the call site, not waved through because "we generated it".
- Paths, URLs, percent-decoding and request methods all need bounds: malformed input returns an error status, does not kill the process, does not escape the publish root.

### 1.5 Failure

- A missing artefact, asset or field is an error. Falling back to a path that does not exist is worse than crashing.
- Swallow an exception only where failure cannot affect correctness, and write one line saying why.
- Silent degradation is a defect, not robustness.

### 1.6 Verification

- Before and after a refactor, compare output for equivalence: normalise it (hashed names and the like) and diff byte for byte. Only then can it be called a structural change.
- Measure layout and style in a real browser: computed styles, sizes, column counts, contrast ratios. No eyeballing, no inference.
- Drive interaction in a real browser: clicks, Tab, scripts disabled, narrow viewports, both colour schemes.
- Tests assert behaviour and structure, never implementation details.
- Say what was verified and what was not, including checks that were skipped.

### 1.7 Dependencies

- Prefer a library to a rewrite, but it has to ship its own types.
- An asset that cannot be bundled, such as a module a browser loads by URL, gets its origin and load timing documented.
- One-shot initialisation is injected explicitly or written once at the single entry point. No global mutable state that might be read before it is set.

## 2. Design

Two principles. Gestalt: grouping comes from distance, similarity and shared region, not from borders and shadows. Fluid: width is the only coordinate; there is no phone layout and no desktop layout, only any width. Everything below follows from those two.

### 2.1 Colour

- Two inks, black in light and white in dark, mixed into paper at a percentage. Literal colours do not appear in rules.
- A text tone is a function of the surface under it. Page tones and surface tones come from the same ratios; change the surface and the tone follows.
- Foreground and background are therefore never paired by hand. Nothing can be forgotten, and no new surface can arrive without a correct text tone. Hovering darkens the surface one step and the text tone moves with it, with no extra rule for hover.
- To add a surface, give it an ink amount and let it derive its text. Do not give it a separate foreground.
- Neutral is the default; colour is the exception, declared in one place with its reason.
- Light and dark are not symmetric: small luminance changes read weaker on a dark ground. A one point step in light often needs three or four in dark.
- The difference between surface and page stays shallow.

### 2.2 Hierarchy

- Size, tone and space carry hierarchy, and they point the same way: the more important, the larger, the darker, the more space around it.
- Elements matching on all three are declaring themselves equals. Do not let different ranks look alike.
- Same rank, same tone. Different rank, different tone. The same kind of information cannot be dark on one page and pale on another.
- Supporting text inside a region (tags, dates, notes) must not take the heading's tone. Sharing the tone claims the same rank, and the eye moves between the two without settling. The symptom is not illegibility; it is not knowing where to look first.
- Decoration carries no meaning. Remove borders, fills and icons and the ranking still holds. Convert the page to greyscale and the reading order does not change.

### 2.3 Type

- The root font size stays at 100% and follows the reader's setting. Do not shrink it to look smaller.
- Every type step is a `clamp(min, preferred, max)`.
- Type size is the main scale. A heading that needs to be distinguished from body text cannot share its size: move it a step, or accept that it is emphasis rather than a heading.
- Line width comes from the container. Do not add a local maximum width to correct it.
- Mixed Chinese and Latin paragraphs get `text-wrap: pretty`; headings get `balance`.
- Small type and generous whitespace are not problems. Density comes from whitespace, not from font size.

### 2.4 Space

- Spacing is a short ladder with positional names, extendable at any point.
- Do not use small / medium / large. They cannot take a new step, so the gap gets filled with compensation, and a component ends up with one padding vertically and another horizontally.
- Three roles: surfaces (cards, notes, code blocks) take one value on all four sides; controls (inputs, buttons) take the next step down; chips and compact rows (tags, table cells, list rows) take a tighter vertical with a moderate horizontal.
- One role, one value. Audit by listing every padding and grouping it by role.
- Any fixed length has to answer why it does not follow the viewport.

### 2.5 Layout

- No width media queries. Use flex-wrap, `auto-fill` / `auto-fit`, and fluid minimum column widths.
- Grid minimums are `clamp`, otherwise the column count drops at some width and the layout stops being continuous.
- Every `100%` raises a question: does it touch the edge on a narrow screen? Figures, illustrations and media need a fluid inset.
- Container padding sets the floor for breathing room across the site; narrow-screen whitespace follows from its lower bound.
- DOM order is content priority. Decoration comes after content and is never reordered for looks.

### 2.6 Interaction and motion

- A transient state is a departure from rest, and the return path matches the way out: same properties, same curve, same duration. Nothing accumulates or remains.
- Only position-independent properties may transition: colour, opacity, transforms. Size and margin move content, and moved content never looks like it returned to where it started.
- Motion scales with how persistent the state is: hover gets the shortest transition, a playing state may loop, structure and reading order never animate.
- The system's reduced-motion setting turns everything off, loops included.
- Hover swaps a pair of variables, one step for the surface and one for its text. No shadow, no shift, no scale.
- Focus is always visible, with one focus colour.
- A card is not one large link. The link covers the title, so the rest of the text stays selectable.
- A script-dependent feature shows a perceptible state before it takes over, and a click before that point is not lost silently.
- The page reads without scripts; script-dependent regions carry a `noscript` note.

### 2.7 Accessibility

A floor, not a goal.

- Body contrast well above 4.5:1, visible focus ring, touch targets at least 24px as rendered.
- One `h1` per page, a hidden `h1` where there is no visible heading, no skipped levels.
- header, nav, main and footer present, the current page marked in the nav, lists carrying a readable label.
- Keep a skip-to-content link.
- No formal compliance audit is required, but these floors are not removed for aesthetic reasons.

### 2.8 Code shape

Code and visuals obey the same values: local, derivable, centralised.

- `body` carries only page-wide concerns (zero margin, minimum height, background, colour and font, wrapping). No `display`, no grid or flex. Layout belongs on the container that defines the region. Anything set globally becomes an implicit contract nobody remembers.
- Scales are defined once. Rules contain no raw values. Centralising makes the whole table comparable, scalable and extendable; scattered values turn every adjustment into a search.
- One decision is written once. The same declaration in two places becomes two decisions that drift apart.
- Selectors state intent: no positional targeting such as `:first-child`, no negative margins papering over a side effect.
- Repeated markup is worse than abstraction, and abstraction waits for the third repetition.

### 2.9 Reporting

- Exceptions to this file are collected in one place with their reason.
- Not problems, do not report: small type, low contrast between card and page, no breakpoints, no colour coding, narrow-screen content order, generous whitespace.
- Problems, always report: a fixed value that breaks fluidity; one role with different paddings; a size shared by two ranks; two ranks sharing a tone in one region; literal colours in rules; layout properties inside a transition; media touching the edge; silent fallbacks; unselectable text; a click lost before a script takes over; unused design variables or selectors.
