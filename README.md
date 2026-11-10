## Requirements

Node 24 or newer. The development shell comes from the flake:

# Development

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

