import { site } from "../lib/config.ts";
import { html } from "../lib/html.ts";
import type { Html } from "../lib/html.ts";

export function siteFooter(): Html {
  return html`  <footer class="site-footer">
    <div class="container">
      <p>${site.footer}</p>
    </div>
  </footer>`;
}
