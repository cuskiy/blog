import { nav } from "../lib/config.ts";
import { html, raw } from "../lib/html.ts";
import type { Html } from "../lib/html.ts";

export function siteNav(current: string): Html {
  const items = nav.map(
    (item) =>
      html`<li><a href="${item.path}"${item.path === current ? raw(' aria-current="page"') : ""}>${item.label}</a></li>`,
  );

  return html`      <nav class="site-nav" aria-label="主导航">
        <ul>
          ${items}
        </ul>
      </nav>`;
}
