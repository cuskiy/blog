import type { Assets } from "../lib/assets.ts";
import { paper, site } from "../lib/config.ts";
import { html } from "../lib/html.ts";
import type { Html } from "../lib/html.ts";
import { siteFooter } from "./footer.ts";
import { siteNav } from "./nav.ts";

export interface Layout {
  readonly assets: Assets;
  readonly title: string;
  readonly path: string;
  // the nav entry this page belongs to, when its own address is not one
  readonly nav?: string;
  readonly body: Html;
  readonly description?: string;
  readonly heading?: string;
  readonly script?: string;
  readonly canonical?: boolean;
}

export function layout({
  assets,
  title,
  path,
  nav: navPath,
  body,
  description = site.motto,
  heading,
  script,
  canonical = true,
}: Layout): string {
  return html`<!doctype html>
<html lang="${site.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="${paper.light}" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="${paper.dark}" media="(prefers-color-scheme: dark)">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="icon" href="${assets.favicon}" sizes="16x16 32x32 48x48">
  <link rel="alternate" type="application/atom+xml" title="${site.title}" href="/feed.xml">
  <link rel="manifest" href="/manifest.webmanifest">
${canonical ? html`  <link rel="canonical" href="${site.url}${path}">\n` : ""}
  <link rel="stylesheet" href="${assets.css}">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="skip-link" href="#main">跳到正文</a>
      <a class="brand" href="/">${site.title}</a>
${siteNav(navPath ?? path)}
    </div>
  </header>
  <main class="container" id="main">
${heading === undefined ? "" : html`  <h1 class="visually-hidden">${heading}</h1>\n`}${body}
  </main>
${siteFooter()}
${script === undefined ? "" : html`  <script type="module" src="${script}"></script>\n`}</body>
</html>
`.value;
}
