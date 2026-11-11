import { layout } from "../components/layout.ts";
import type { Assets } from "../lib/assets.ts";
import type { Page } from "../lib/content/index.ts";
import { html, raw } from "../lib/html.ts";

export function pagePage(page: Page, assets: Assets): string {
  return layout({
    assets,
    title: page.title,
    path: page.route.url,
    body: html`  <article>
    <header class="page-head">
      <h1>${page.title}</h1>
    </header>
    <div class="prose">
${raw(page.html)}
    </div>
  </article>`,
  });
}
