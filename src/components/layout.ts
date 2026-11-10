import type { Assets } from "../lib/assets.ts";
import { site } from "../lib/config.ts";
import { html } from "../lib/html.ts";
import type { Html } from "../lib/html.ts";
import { siteFooter } from "./footer.ts";
import { siteNav } from "./nav.ts";

export interface Layout {
  readonly assets: Assets;
  readonly title: string;
  readonly path: string;
  readonly body: Html;
  readonly description?: string;
  readonly heading?: string;
  readonly script?: string;
}

export function layout({ assets, title, path, body, description = site.motto, heading, script }: Layout): string {
  return html`<!doctype html>
<html lang="${site.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#141414" media="(prefers-color-scheme: dark)">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="icon" href="/assets/favicon.ico" sizes="16x16 32x32 48x48">
  <link rel="alternate" type="application/atom+xml" title="${site.title}" href="/feed.xml">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="${assets.css}">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="/">${site.title}</a>
${siteNav(path)}
    </div>
  </header>
  <main class="container">
${heading === undefined ? "" : html`  <h1 class="visually-hidden">${heading}</h1>\n`}${body}
  </main>
${siteFooter()}
${script === undefined ? "" : html`  <script type="module" src="${script}"></script>\n`}</body>
</html>
`.value;
}
