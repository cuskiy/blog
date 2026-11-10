# clog

A static blog generator for [djot](https://djot.net). Content is rendered to plain HTML at build time; the output contains no JavaScript.

## Requirements

Node 24 or newer. The development shell comes from the flake:

```sh
nix develop
```

`flake.lock` pins nixpkgs, so the shell gives the same Node and npm on every machine.

## Commands

| Command                 | What it does                                       |
| ----------------------- | -------------------------------------------------- |
| `npm run build`         | Format, lint, type-check, then render into `dist/` |
| `npm run serve`         | The same checks, then serve `dist/` on a port      |
| `npm run code`          | Format, lint TS, lint CSS, type-check — no build   |
| `npm run fmt`           | Rewrite every file with Prettier                   |
| `npm run lint`          | ESLint with the strict typed presets               |
| `npm run lint:css`      | Stylelint over the stylesheet                      |
| `npm run typecheck`     | Type-check without emitting                        |
| `npm test`              | Run the test suite with `node --test`              |
| `npm run check`         | Code checks, tests, a build, then the output audit |
| `npm run verify:output` | Check the built HTML and CSS (needs `dist/`)       |

## Layout

```
content/posts/*.dj      posts, one per file; the file name is the slug
content/memos/*.dj      memos: a date and a body, nothing else
content/pages/*.dj      extra pages, one per file; the route is /<name>/
static/                 stylesheet, favicon, avatars, midi, soundfont, robots.txt
src/                    the generator
  cli.ts                build / serve dispatch
  build.ts              the pipeline: render, bundle, hash, minify
  serve.ts              the static file server
  lib/                  no markup, no DOM: config, html, date, djot, frontmatter, manifest
  lib/content/          reading posts, pages, tracks; tags; the search index
  components/           layout, nav, footer, the shared post list
  pages/                one module per route, each composing components
  client/               browser scripts, written in TypeScript
test/                   node --test suites
dist/                   build output, git-ignored
```

## Writing a post

A post is a `.dj` file with a YAML frontmatter block. The file name becomes the URL, so it may only use lowercase letters, digits and dashes.

```djot
---
title: Djot styling reference
date: 2025-06-12
tags: Djot, Reference
summary: One sentence, used on the post card and as the meta description.
---

## Body

Ordinary djot from here on.
```

| Field     | Required | Notes                                                   |
| --------- | -------- | ------------------------------------------------------- |
| `title`   | yes      | Plain text, escaped when rendered                       |
| `date`    | yes      | `YYYY-MM-DD`, must be a real date                       |
| `tags`    | yes      | Comma separated; each one gets a page at `/tags/<tag>/` |
| `summary` | yes      | One line, plain text                                    |
| `draft`   | no       | `true` keeps the post out of the build                  |

Unknown fields, a missing field, an impossible date and tags that could escape the output directory all fail the build with the file name in the message.

Pages under `content/pages/` take `title` only, and the file name becomes the route: `love.dj` is served at `/love/`. A name the build already uses (`posts`, `tags`, `assets`, `index`, `page`, `memo`) is rejected, and the directory may hold nothing but the placeholder file: a site with no extra pages is a normal site.

`/about/` is not one of these. It is built by `src/pages/about.ts`, because its content is the contact list rather than prose.

## Writing a memo

A memo lives in `content/memos/` and has one field:

```djot
---
date: 2026-11-08
---
One or two sentences.
```

The date is the title and the sort key; the file name becomes the anchor (`/memo/#m-<name>`). Memos have no page of their own: every body renders in the list, ten per page.

## Pagination

Posts are paginated twenty at a time at `/page/<n>/`, memos ten at a time at `/memo/page/<n>/`. One component draws the navigation for both, and it renders nothing when a list fits on a single page.

## Output

The build writes into `dist.tmp` and swaps it in only after everything has rendered. A build that fails partway leaves the previous `dist/` exactly as it was, so a broken build can never be mistaken for a deployable one. The staging directory is removed at the start of the next build.

`serve` takes the port before it builds. If another server is already listening, it fails immediately with `port 3000 is already in use` instead of wiping the output that server is serving.

```
dist/index.html
dist/page/<n>/index.html
dist/posts/<slug>/index.html
dist/tags/index.html
dist/tags/<tag>/index.html
dist/memo/index.html
dist/memo/page/<n>/index.html
dist/search/index.html
dist/about/index.html
dist/links/index.html
dist/music/index.html
dist/404.html
dist/feed.xml
dist/robots.txt
dist/manifest.webmanifest
dist/sw.js
dist/assets/…
```

Every link in the output is root-absolute (`/posts/x/`, `/assets/style.css`), so the site has to be served from the root of a domain. Serving it from a subdirectory would need every template to build relative paths instead, and opening `dist/index.html` straight off the filesystem renders an unstyled page, because `/assets/style.css` then points at the filesystem root.

Tag names are percent-encoded in links but kept as-is for directory names, so `C++` becomes `/tags/C%2B%2B/` pointing at `dist/tags/C++/`.

## Deploying

`.github/workflows/deploy.yml` runs on every push to `main`, or on demand: it installs with `npm ci`, runs `npm run check`, uploads `dist/` as a Pages artifact and deploys it. Nothing is pushed to a branch, so a failed build leaves the published site untouched.

Two settings belong to the repository, not to the code:

- **Variables → `SITE_URL`**, for example `https://ity.moe`. The build reads the origin from there and fails with a clear message when it is missing or malformed, so a deploy can never publish links to a placeholder.
- **Settings → Pages → Source: GitHub Actions**, with the custom domain set next to it. The site links to itself from the root, so it has to be served from a domain root: a project path such as `https://user.github.io/clog/` would break every link.

## Feed

`dist/feed.xml` is an Atom 1.0 feed with every post in full, linked from the nav and advertised on every page:

```html
<link rel="alternate" type="application/atom+xml" href="/feed.xml" />
```

Atom needs absolute links, and a static build cannot infer its own origin, so the build reads it from the `SITE_URL` environment variable:

```sh
SITE_URL=https://ity.moe npm run build
```

`.env.example` shows the one line that belongs in a local `.env`, which the npm scripts load with `--env-file-if-exists` and git ignores. `npm run serve` fills in `http://localhost:<port>` when no origin is set, so a local preview links to itself. A missing or malformed origin fails the build instead of emitting links to a placeholder.

Dates are UTC midnight of the post date rather than build time, so rebuilding an unchanged site produces a byte-identical feed.

## Music

`/music/` plays the forty MIDIs in `static/midi/` through SpessaSynth, using the bundled `static/soundfont/GeneralUserGS.sf3` (14 MB) — nothing is fetched from a CDN. The page script is `src/client/music.ts` plus `src/client/audio.ts`, bundled to a hashed file; it builds the `AudioContext` on the first click, because browsers refuse to start audio without a gesture.

A service worker (`src/client/sw.ts`, served as `/sw.js`) keeps the soundfont and the tracks on the device. It caches data only: a cache-first script is how a stale bundle keeps running after a change.

The illustration on `/music/` is `static/music/lineart.webp`: the original run through an adaptive-threshold edge pass, with the paper dropped to full transparency so only the lines carry alpha, capped at 60% so the strokes keep their own weight. One file serves both schemes: dark mode inverts it, which flips black ink to white and leaves the alpha alone.

`src/client/oneko.ts` is loaded only by `dist/404.html`.

`/about/` loads one more: `src/client/about.ts` decodes the email address and the matrix handle, which are stored base64 encoded in `src/lib/contact.ts` and never appear as plain text in the page source. Without a script the list still renders its labels, those two values stay empty, and a `noscript` note says why.

Those are the only scripts on the site. Every other page ships none.

`/search/` filters a JSON index at `/assets/search.json`; results are built in the browser because they depend on what the reader types. Posts and memos both appear, told apart by card shape.

## About page and crawlers

`/about/` is built by `src/pages/about.ts` — no content file behind it — and is the only page that renders the contact list: Matrix, email, Codeberg and the full GPG fingerprint. It carries no visible title — the `h1` stays in the markup for the document outline and is visually hidden. The email and the handle are the two values that are decoded in the browser rather than written into the HTML.

`static/robots.txt` is copied to `dist/robots.txt` and tells every crawler to stay away. The output audit fails if the file is missing or stops disallowing everything.

## Styling

One stylesheet, no preprocessor. Type sizes, spacing, radii and the transition duration live in a single `:root` block. Nothing is measured with a media query: the grid uses `auto-fill`, the header and the tag list use `flex-wrap`, and every type step is a `clamp()`.

### Colour

Colour is derived, not picked. Two literals exist, one ink for each scheme:

```css
--ink: light-dark(#000000, #ffffff);
```

Everything else is that ink mixed into a paper at a percentage. A text tone belongs to the surface it sits on, so changing the surface moves the tone with it:

```css
--page-text: color-mix(in oklab, var(--ink) 80%, var(--page));
--surface-text: color-mix(in oklab, var(--ink) 80%, var(--surface));
```

A component declares its background and its colour together, and a state swaps the pair:

```css
.post {
  background: var(--surface);
  color: var(--surface-text);

  &:hover {
    background: var(--surface-hover);
    color: var(--surface-hover-text);
  }
}
```

The dark steps are wider than the light ones. Small luminance changes read weaker on a dark ground, so the surface sits at 2.5% ink in light and 7% in dark; the text tones run 80% and 84%.

No `opacity` and no `filter` on text ink: an alpha fade blends every tone with the background, which lands at a different contrast in each scheme. The one image drawn in ink — the line art on `/music/` — is the exception, and it is listed under Exceptions.

### Scale

Five type steps, all fluid:

```css
--text-md: clamp(0.8rem, 0.75rem + 0.22vw, 0.92rem);
```

The root font size stays at 100%, so the whole scale follows the reader's own setting; the clamps put the site at roughly four fifths of the browser default, which reads denser without shrinking the root.

Spacing is a ladder of seven steps, named by position so a new one can be inserted anywhere. One role takes one step: surfaces use one value on all four sides, controls take the next step down, chips take a tighter vertical.

No width media queries are used. Grids rely on `auto-fill` with a fluid minimum, everything else on `flex-wrap` and `clamp()`.

### Browser support

The CSS leans on three features newer than the rest of the stylesheet. Verified by rendering the built site in Firefox 158:

| Feature              | Firefox since |
| -------------------- | ------------- |
| `light-dark()`       | 120           |
| `color-mix()`        | 113           |
| native nesting (`&`) | 117           |

`text-wrap: balance` and `text-wrap: pretty` are also used; both are progressive improvements that fall back to normal wrapping where unsupported.

The head also carries `<meta name="color-scheme" content="light dark">`. Without it the browser paints a white canvas until the stylesheet arrives, which flashes in dark mode.

### Notes

The article body comes from djot, which wraps each heading and its content in a `<section>`. The `cell` renderer is overridden so table alignment becomes a class instead of an inline `style` attribute.

Links inside the body are underlined, because colour alone is not a reliable way to show that something is a link. A card gets no underline on hover: the whole surface moves one step, and that is the affordance.

The link in a card covers the title only, so the summary and the tags stay selectable and copyable. Tags are links on the card, on the post page and on `/tags/`.

## Exceptions

`AGENTS.md` is the rule; these are the deliberate departures, each with its reason.

- **No skip link.** The header carries one nav row of seven short items, and the owner asked for it to go. `main` is the only landmark below the header, so a keyboard user reaches it in at most eight Tabs.
- **Positional selectors on memo cards.** `.memo .prose > :first-child` and `:last-child` trim the body margins. A memo card is a grid item, so its body margins stay inside instead of collapsing out, and without the trim every card carries 16px of dead space above and below its text.
- **A local maximum width on the post meta line.** `--meta-max: 42ch` keeps a long tag list from running the full container, which AGENTS 2.3 otherwise rules out.
- **A dark-mode media query for images.** `filter: invert(1)` on the illustration and a slight dim on every other image live in `@media (prefers-color-scheme: dark)`, because a filter cannot read `light-dark()`. Nothing else in the stylesheet branches on the colour scheme.
- **The 404 cat styles itself in JavaScript.** `src/client/oneko.ts` injects its own element and its own positioning on the one page that loads it; the alternative was a stylesheet rule for an element that exists nowhere else.
